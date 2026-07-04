import { BOCHA_API_KEY } from '../config/env';

const BOCHA_WEB_SEARCH_URL = 'https://api.bochaai.com/v1/web-search';
const BOCHA_AI_SEARCH_URL = 'https://api.bochaai.com/v1/ai-search';

// 电商/测评权威站点，命中时提升排序权重
const TRUSTED_DOMAINS = [
  'smzdm.com',
  'zhihu.com',
  'jd.com',
  'tmall.com',
  'taobao.com',
  'pinduoduo.com',
  'suning.com',
  'gome.com.cn',
  'zol.com.cn',
  'pconline.com.cn',
  'ithome.com',
  'sspai.com',
  'weibo.com',
  'xiaohongshu.com',
  'bilibili.com',
  'douyin.com',
  'kuaishou.com'
];

// 低质量/营销站点，直接过滤
const BLACKLIST_DOMAINS = [
  '1688.com',
  'alibaba.com',
  'youtube.com',
  'twitter.com',
  'facebook.com',
  'instagram.com',
  'tiktok.com'
];

export interface BochaImageResult {
  contentUrl: string;
  hostPageUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

export interface BochaWebPage {
  id: string;
  name: string;
  url: string;
  snippet?: string;
  summary?: string;
  siteName?: string;
  dateLastCrawled?: string;
}

export interface BochaSearchResult {
  queryContext?: { originalQuery: string };
  webPages?: {
    totalEstimatedMatches: number;
    value: BochaWebPage[];
  };
  images?: {
    value: BochaImageResult[];
  };
  modalCards?: unknown[];
}

export type BochaSearchType = 'web' | 'ai' | 'image';

export interface BochaSearchOptions {
  query: string;
  count?: number;
  freshness?: 'oneDay' | 'oneWeek' | 'oneMonth' | 'oneYear' | 'noLimit';
  summary?: boolean;
  searchType?: BochaSearchType;
}

export interface BochaSearchResponse {
  results: BochaWebPage[];
  images: BochaImageResult[];
  raw: BochaSearchResult;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isTrustedDomain(url: string): boolean {
  const domain = getDomain(url);
  return TRUSTED_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d));
}

function isBlacklistedDomain(url: string): boolean {
  const domain = getDomain(url);
  return BLACKLIST_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d));
}

function normalizeProductName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '');
}

function isProductRelevant(page: BochaWebPage, productNames: string[]): boolean {
  const text = `${page.name} ${page.summary || ''} ${page.snippet || ''}`;
  return nameAppearsIn(text, productNames);
}

function nameAppearsIn(text: string, productNames: string[]): boolean {
  const lowerText = text.toLowerCase();
  return productNames.some((name) => {
    if (lowerText.includes(name.toLowerCase())) return true;
    const normalized = normalizeProductName(name);
    if (lowerText.includes(normalized)) return true;
    const tokens = name.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
    return tokens.length >= 2 && tokens.every((token) => lowerText.includes(token));
  });
}

function scoreResult(page: BochaWebPage, productNames: string[]): number {
  let score = 0;
  const title = page.name.toLowerCase();
  const summary = (page.summary || page.snippet || '').toLowerCase();
  const fullText = `${title} ${summary}`;
  const confusingKeywords = getConfusingKeywords(productNames).map((k) => k.toLowerCase());

  // 标题包含商品名加分
  if (nameAppearsIn(title, productNames)) {
    score += 10;
  }

  // 摘要包含商品名加分
  if (nameAppearsIn(summary, productNames)) {
    score += 5;
  }

  // 权威站点加分
  if (isTrustedDomain(page.url)) {
    score += 8;
  }

  // 包含价格关键词加分
  if (/\d+\s*元|\d+\s*块|价格|售价|到手价|百亿补贴/.test(summary)) {
    score += 3;
  }

  // 包含评测关键词加分
  if (/评测|体验|测评|优缺点|值得买|种草|拔草/.test(summary)) {
    score += 3;
  }

  // 包含混淆关键词（如下一代产品）扣分
  for (const keyword of confusingKeywords) {
    if (fullText.includes(keyword)) {
      score -= 15;
      break;
    }
  }

  return score;
}

async function bochaRequest(
  url: string,
  options: BochaSearchOptions
): Promise<BochaSearchResult> {
  if (!BOCHA_API_KEY) {
    throw new Error('Bocha API Key 未配置');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${BOCHA_API_KEY}`
    },
    body: JSON.stringify({
      query: options.query,
      count: options.count ?? 10,
      freshness: options.freshness ?? 'oneWeek',
      summary: options.summary ?? true
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Bocha 搜索失败（${response.status}）${errorText}`);
  }

  const data = await response.json();
  return (data.data ?? data) as BochaSearchResult;
}

export async function bochaWebSearch(options: BochaSearchOptions): Promise<BochaSearchResponse> {
  const result = await bochaRequest(BOCHA_WEB_SEARCH_URL, options);
  const pages = result.webPages?.value ?? [];

  return {
    results: pages.map((page, index) => ({
      ...page,
      id: page.id || `bocha-web-${index}`
    })),
    images: result.images?.value ?? [],
    raw: result
  };
}

export async function bochaAISearch(options: BochaSearchOptions): Promise<BochaSearchResponse> {
  const result = await bochaRequest(BOCHA_AI_SEARCH_URL, options);
  const pages = result.webPages?.value ?? [];

  return {
    results: pages.map((page, index) => ({
      ...page,
      id: page.id || `bocha-ai-${index}`
    })),
    images: result.images?.value ?? [],
    raw: result
  };
}

export async function bochaSearch(options: BochaSearchOptions): Promise<BochaSearchResponse> {
  const type = options.searchType ?? 'web';

  if (type === 'ai') {
    return bochaAISearch(options);
  }

  return bochaWebSearch(options);
}

function buildSearchQueries(productNames: string[], isPK: boolean): string[] {
  if (isPK) {
    return [
      `${productNames.join(' ')} 对比 评测 价格`,
      `${productNames.join(' ')} 哪个好 优缺点`,
      `${productNames.join(' ')} 参数 配置`,
      `${productNames.join(' ')} 降价 优惠 历史价格`
    ];
  }

  const [name] = productNames;
  return [
    `${name} 价格 京东 淘宝 拼多多`,
    `${name} 评测 体验 优缺点 真实`,
    `${name} 参数 配置 规格`,
    `${name} 降价 历史价格 二手 优惠`,
    `${name} 还值得买吗 旧款`
  ];
}

function getConfusingKeywords(productNames: string[]): string[] {
  const confusing: string[] = [];
  for (const name of productNames) {
    const match = name.match(/(\D+)(\d+)/);
    if (match) {
      const prefix = match[1].trim();
      const version = parseInt(match[2], 10);
      // 排除下一代，例如 iPhone 16 -> iPhone 17
      confusing.push(`${prefix}${version + 1}`);
      confusing.push(`${prefix} ${version + 1}`);
    }
  }
  return confusing;
}

export async function bochaMultiSearch(
  productNames: string[],
  options: Omit<BochaSearchOptions, 'query'> = {}
): Promise<BochaSearchResponse> {
  const isPK = productNames.length >= 2;
  const queries = buildSearchQueries(productNames, isPK);

  const freshnessList: Array<BochaSearchOptions['freshness']> = [
    options.freshness ?? 'oneWeek',
    'oneMonth',
    'oneYear'
  ];

  const webResults = await Promise.all(
    queries.flatMap((query) =>
      freshnessList.map((freshness) =>
        bochaWebSearch({
          query,
          count: 6,
          freshness,
          summary: options.summary ?? true
        }).catch(() => ({ results: [], images: [], raw: {} as BochaSearchResult }))
      )
    )
  );

  const aiResult = await bochaAISearch({
    query: isPK
      ? `${productNames.join(' ')} 对比评测`
      : `${productNames[0]} 价格评测`,
    count: 8,
    freshness: options.freshness ?? 'oneMonth',
    summary: options.summary ?? true
  }).catch(() => ({ results: [], images: [], raw: {} as BochaSearchResult }));

  const allPages: BochaWebPage[] = [];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  for (const result of [...webResults, aiResult]) {
    for (const page of result.results) {
      const normalizedTitle = page.name.replace(/\s+/g, '').toLowerCase();
      if (!seenUrls.has(page.url) && !seenTitles.has(normalizedTitle)) {
        seenUrls.add(page.url);
        seenTitles.add(normalizedTitle);
        allPages.push(page);
      }
    }
  }

  const confusingKeywords = getConfusingKeywords(productNames).map((k) => k.toLowerCase());

  const filteredPages = allPages
    .filter((page) => !isBlacklistedDomain(page.url))
    .filter((page) => isProductRelevant(page, productNames))
    .filter((page) => !confusingKeywords.some((k) => page.name.toLowerCase().includes(k)))
    .sort((a, b) => scoreResult(b, productNames) - scoreResult(a, productNames));

  const seenImages = new Set<string>();
  const allImages: BochaImageResult[] = [];

  for (const result of [...webResults, aiResult]) {
    for (const img of result.images) {
      if (!seenImages.has(img.contentUrl)) {
        seenImages.add(img.contentUrl);
        allImages.push(img);
      }
    }
  }

  return {
    results: filteredPages.slice(0, options.count ?? 12),
    images: allImages.slice(0, 6),
    raw: {
      queryContext: { originalQuery: queries.join(' | ') },
      webPages: {
        totalEstimatedMatches: filteredPages.length,
        value: filteredPages
      },
      images: { value: allImages }
    }
  };
}

export function formatBochaContext(
  results: BochaWebPage[],
  images?: BochaImageResult[]
): string {
  if (results.length === 0) {
    return '未找到相关搜索结果，请基于已有知识谨慎回答，并明确告知用户价格可能不准确。';
  }

  const textContext = results
    .map((page, index) => {
      const parts = [
        `[来源${index + 1}] ${page.name}`,
        page.summary || page.snippet || '',
        `URL: ${page.url}`
      ];
      return parts.filter(Boolean).join('\n');
    })
    .join('\n\n---\n\n');

  if (!images || images.length === 0) {
    return textContext;
  }

  const imageContext = images
    .map(
      (img, index) =>
        `[图片${index + 1}] ${img.contentUrl}${img.hostPageUrl ? ` (来源: ${img.hostPageUrl})` : ''}`
    )
    .join('\n');

  return `${textContext}\n\n【相关图片】\n${imageContext}`;
}
