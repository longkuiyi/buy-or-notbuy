import { DASHSCOPE_API_KEY, BOCHA_API_KEY } from '../config/env';
import { parseReportFromText, parsePKReportFromText, parseBudgetReportFromText } from '../utils/jsonParser';
import { getMockReport, getMockPKReport, getMockBudgetReport } from '../utils/mockData';
import { bochaMultiSearch, formatBochaContext } from './bocha';
import type { ChatMessage, MessageContent, ReportResult } from '../types';

const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/responses';

const SYSTEM_PROMPT_BASE = `你是买不买购物决策助手，基于实时搜索结果帮用户做购物决策。

工作方式：
1. 分析用户请求：可能是单商品分析、多商品 PK，或给定预算选商品。有图片时结合图片识别商品。
2. 基于【搜索结果】回答，所有价格、平台、参数、用户评价必须能在搜索结果中找到依据。
3. 搜索未返回明确信息时，必须说明"未知"或"未找到"，禁止编造。
4. 每个关键结论后标注 [来源N]。
5. 多轮对话时结合历史上下文回答。
6. 如果商品是旧款/上一代/降价产品，请特别关注：当前售价、首发价、历史低价、是否还值得买、相比新款的核心差距。

输出要求：
- 先给出自然语言解读：像朋友一样清晰、有用地总结。排版自由，不要固定模板。可以包含段落、列表、对比表、价格走势说明等。重点突出：当前价格、降价情况、值不值得买。
- 然后必须输出一段 JSON 代码块（\`\`\`json ... \`\`\`），包含结构化信息。
- JSON 字段完全自由：根据场景自行选择最有用的字段和排版，不需要固定字段。单商品分析建议包含 price（当前价格、历史低价、首发价、降价幅度）、review（含 userReviews）、alternatives、finalAdvice；PK 建议包含 products、comparisons、winner、finalAdvice；预算选商品建议包含 budget、category、options、finalAdvice。
- 必须包含用户评价（userReviews），每条包括 source（来源平台）、sentiment（positive/neutral/negative）、summary（总结）、quote（原话摘要，可选）。
- finalAdvice.decision 必须是明确的决策建议。
- 如果用户上传了图片，先描述图片内容，再基于图片中的商品做分析。`;

const OUTPUT_FORMAT_SINGLE = `\n\n单商品分析 JSON 参考结构（字段可增删，按需排版）：\n{\n  "price": { "currentPrice": "...", "lowestPrice": "...", "originalPrice": "...", "discount": "...", "platforms": [...], "suggestion": "...", "reason": "...", "trend": [...] },\n  "review": { "pros": [...], "cons": [...], "score": 8.5, "summary": "...", "radar": {...}, "userReviews": [{"source":"京东","sentiment":"positive","summary":"...","quote":"..."}] },\n  "alternatives": [{"name":"...","price":"...","pros":"...","cons":"...","reason":"..."}],\n  "finalAdvice": { "decision": "...", "reason": "..." }\n}`;

const OUTPUT_FORMAT_PK = `\n\n多商品 PK JSON 参考结构（字段可增删，按需排版）：\n{\n  "products": [{"productName":"...","price":{...},"review":{...}}],\n  "comparisons": [{"dimension":"...","scores":{...},"winner":"..."}],\n  "winner": "...",\n  "finalAdvice": { "decision": "...", "reason": "..." }\n}`;

const OUTPUT_FORMAT_BUDGET = `\n\n预算选商品 JSON 参考结构（字段可增删，按需排版）：\n{\n  "budget": 5000,\n  "category": "手机",\n  "options": [{"name":"...","price":"...","matchScore":9,"pros":"...","cons":"...","reason":"..."}],\n  "finalAdvice": { "decision": "...", "reason": "..." }\n}`;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function validateImage(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: '请上传 jpg、png、webp 格式的图片' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: '图片大小不能超过 10MB' };
  }
  return { valid: true };
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export type ThinkingMode = 'fast' | 'deep' | 'max';
export type AnalysisMode = 'single' | 'pk' | 'budget';

interface ApiResult {
  naturalText: string;
  report: ReportResult;
  usedMock: boolean;
  error?: string;
  searchContext?: string;
  searchCount?: number;
}

function getFallbackResult(
  targetProduct: string,
  mode: AnalysisMode,
  pkProducts?: string[],
  budget?: number
): ApiResult {
  return {
    naturalText: `搜索服务暂时不可用，先用参考数据给你一份 ${targetProduct} 的分析。`,
    report:
      mode === 'pk'
        ? getMockPKReport(pkProducts as string[])
        : mode === 'budget'
          ? getMockBudgetReport(budget ?? 5000, targetProduct)
          : getMockReport(targetProduct),
    usedMock: true,
    error: 'Bocha 搜索服务未配置或调用失败'
  };
}

function buildApiMessages(
  messages: ChatMessage[],
  searchContext: string,
  mode: AnalysisMode,
  pkProducts?: string[],
  budget?: number
): { role: 'system' | 'user' | 'assistant'; content: string | MessageContent[] }[] {
  let formatHint = OUTPUT_FORMAT_SINGLE;
  if (mode === 'pk') formatHint = OUTPUT_FORMAT_PK;
  if (mode === 'budget') formatHint = OUTPUT_FORMAT_BUDGET;

  const systemContent = `${SYSTEM_PROMPT_BASE}${formatHint}\n\n【搜索结果】\n${searchContext}`;

  const apiMessages: { role: 'system' | 'user' | 'assistant'; content: string | MessageContent[] }[] = [
    { role: 'system', content: systemContent }
  ];

  for (const msg of messages) {
    if (msg.role === 'assistant') {
      apiMessages.push({ role: 'assistant', content: typeof msg.content === 'string' ? msg.content : '' });
    } else {
      apiMessages.push({ role: 'user', content: msg.content });
    }
  }

  if (mode === 'pk' && pkProducts && pkProducts.length >= 2) {
    apiMessages.push({
      role: 'user',
      content: `请对以下 ${pkProducts.length} 个商品做 PK 对比：${pkProducts.join('、')}，给出最终购买建议。`
    });
  } else if (mode === 'budget' && budget !== undefined) {
    apiMessages.push({
      role: 'user',
      content: `预算 ${budget} 元，请帮我推荐最合适的商品，并说明理由。`
    });
  }

  return apiMessages;
}

function extractResponseText(data: unknown): string {
  if (typeof data !== 'object' || data === null) return '';
  const d = data as Record<string, unknown>;
  const output = Array.isArray(d.output) ? d.output : [];
  for (const item of output) {
    if (typeof item !== 'object' || item === null) continue;
    const i = item as Record<string, unknown>;
    if (i.type !== 'message') continue;
    const content = i.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map((c: unknown) => {
        if (typeof c !== 'object' || c === null) return '';
        const cc = c as Record<string, unknown>;
        return typeof cc.text === 'string' ? cc.text : '';
      }).join('');
    }
  }
  return '';
}

export async function sendMessage(
  messages: ChatMessage[],
  productName?: string,
  pkProducts?: string[],
  budget?: number,
  signal?: AbortSignal,
  thinkingMode: ThinkingMode = 'fast'
): Promise<ApiResult> {
  const hasPK = Array.isArray(pkProducts) && pkProducts.length >= 2;
  const hasBudget = typeof budget === 'number' && budget > 0;
  const mode: AnalysisMode = hasPK ? 'pk' : hasBudget ? 'budget' : 'single';

  const targetProduct = productName || '该商品';

  if (!DASHSCOPE_API_KEY) {
    return {
      naturalText: `还没配置 DashScope API Key 呢，我先给你一份 ${targetProduct} 的参考数据。`,
      report:
        mode === 'pk'
          ? getMockPKReport(pkProducts as string[])
          : mode === 'budget'
            ? getMockBudgetReport(budget ?? 5000, targetProduct)
            : getMockReport(targetProduct),
      usedMock: true,
      error: '请检查 DashScope API Key 配置'
    };
  }

  if (!BOCHA_API_KEY) {
    return getFallbackResult(targetProduct, mode, pkProducts, budget);
  }

  try {
    const searchNames =
      mode === 'pk'
        ? (pkProducts as string[])
        : mode === 'budget'
          ? [targetProduct]
          : [targetProduct];

    const searchResponse = await bochaMultiSearch(searchNames, {
      count: 12,
      freshness: 'oneWeek',
      summary: true
    });

    const searchContext = formatBochaContext(searchResponse.results, searchResponse.images);

    const apiMessages = buildApiMessages(messages, searchContext, mode, pkProducts, budget);

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(new DOMException('网络超时', 'TimeoutError')),
      120000
    );

    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DASHSCOPE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'qwen3.7-plus',
        input: apiMessages,
        tools: [{ type: 'image_search' }],
        tool_choice: 'auto',
        extra_body: {
          enable_thinking: thinkingMode !== 'fast',
          ...(thinkingMode === 'max' ? { thinking_budget: 81920 } : {})
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorType = errorData.error?.type || errorData.code;
      const errorMessage = errorData.error?.message || errorData.message || `请求失败（${response.status}）`;

      if (response.status === 401 || response.status === 403) {
        return {
          naturalText: 'API Key 好像无效，先用模拟数据给你参考。',
          report:
            mode === 'pk'
              ? getMockPKReport(pkProducts as string[])
              : mode === 'budget'
                ? getMockBudgetReport(budget ?? 5000, targetProduct)
                : getMockReport(targetProduct),
          usedMock: true,
          error: '请检查 DashScope API Key 配置'
        };
      }

      if (errorType === 'Arrearage' || errorMessage.includes('in good standing')) {
        return {
          naturalText: '你的阿里云账户欠费或没有可用额度，先用模拟数据给你参考。',
          report:
            mode === 'pk'
              ? getMockPKReport(pkProducts as string[])
              : mode === 'budget'
                ? getMockBudgetReport(budget ?? 5000, targetProduct)
                : getMockReport(targetProduct),
          usedMock: true,
          error: '阿里云账户欠费，请充值或检查额度'
        };
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    const content = extractResponseText(data);

    if (!content) {
      throw new Error('API 返回内容为空');
    }

    let naturalText = content;
    let report: ReportResult | null = null;

    if (mode === 'pk') {
      const parsed = parsePKReportFromText(content, pkProducts as string[]);
      naturalText = parsed.naturalText;
      report = parsed.report;
    } else if (mode === 'budget') {
      const parsed = parseBudgetReportFromText(content, budget ?? 0);
      naturalText = parsed.naturalText;
      report = parsed.report;
    } else {
      const parsed = parseReportFromText(content);
      naturalText = parsed.naturalText;
      report = parsed.report;
    }

    return {
      naturalText: naturalText || '已经帮你整理好了分析报告。',
      report: report || (mode === 'pk' ? getMockPKReport(pkProducts as string[]) : mode === 'budget' ? getMockBudgetReport(budget ?? 5000, targetProduct) : getMockReport(targetProduct)),
      usedMock: !report,
      searchContext,
      searchCount: searchResponse.results.length
    };
  } catch (error) {
    const isAbort = error instanceof DOMException && error.name === 'AbortError';
    const isTimeout = error instanceof DOMException && error.name === 'TimeoutError';

    // 用户主动点击停止生成，直接抛出，由上层处理为安静停止
    if (isAbort) {
      throw error;
    }

    const fallbackReport =
      mode === 'pk'
        ? getMockPKReport(pkProducts as string[])
        : mode === 'budget'
          ? getMockBudgetReport(budget ?? 5000, targetProduct)
          : getMockReport(targetProduct);

    if (isTimeout) {
      return {
        naturalText: '网络超时了，先用模拟数据给你一份参考。',
        report: fallbackReport,
        usedMock: true,
        error: '网络超时，请重试'
      };
    }

    return {
      naturalText: '联网搜索遇到了点问题，先用模拟数据兜底。',
      report: fallbackReport,
      usedMock: true,
      error: error instanceof Error ? error.message : '请求失败'
    };
  }
}
