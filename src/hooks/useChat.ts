import { useState, useCallback, useRef } from 'react';
import { sendMessage, validateImage, fileToBase64 } from '../services/api';
import { saveHistory, recordTrending } from '../utils/storage';
import { isPKReport, isBudgetReport } from '../types';
import type {
  ChatMessage,
  AnalysisStatus,
  ReportResult,
  ToastState,
  HistoryRecord,
  AnalysisMode
} from '../types';
import type { ThinkingMode } from '../services/api';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [currentReport, setCurrentReport] = useState<ReportResult | null>(null);
  const [currentProduct, setCurrentProduct] = useState<string>('');
  const [currentRecordId, setCurrentRecordId] = useState<string>('');
  const [currentMode, setCurrentMode] = useState<AnalysisMode>('single');
  const [thinkingMode, setThinkingMode] = useState<ThinkingMode>('fast');
  const [searchContext, setSearchContext] = useState<string>('');
  const [searchCount, setSearchCount] = useState<number>(0);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' });

  const abortRef = useRef<AbortController | null>(null);
  const stoppingRef = useRef(false);

  const showToast = useCallback((message: string, type: ToastState['type'] = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  }, []);

  const generateId = () => Math.random().toString(36).substring(2, 10);

  const persistResult = useCallback(
    (productName: string, mode: AnalysisMode, naturalText: string, report: ReportResult) => {
      const decision = isPKReport(report)
        ? report.winner || report.finalAdvice.decision
        : isBudgetReport(report)
          ? report.finalAdvice.decision
          : report.finalAdvice.decision;

      recordTrending(productName, decision);

      const record: HistoryRecord = {
        id: generateId(),
        productName,
        isPK: mode === 'pk',
        isBudget: mode === 'budget',
        mode,
        naturalText,
        report,
        createdAt: Date.now()
      };
      setCurrentRecordId(record.id);
      saveHistory(record).catch(() => undefined);
    },
    []
  );

  const stopGeneration = useCallback(() => {
    stoppingRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('idle');
  }, []);

  const runAnalysis = useCallback(
    async (params: {
      mode: AnalysisMode;
      text?: string;
      products?: string[];
      productImages?: (File | null)[];
      budget?: number;
      category?: string;
      imageFile?: File;
    }) => {
      const { mode, text = '', products, productImages, budget, category, imageFile } = params;

      const isPK = mode === 'pk';
      const isBudget = mode === 'budget';
      const firstText = isPK ? products?.[0] || '' : text;
      const hasImage = !!imageFile || (productImages?.some(Boolean) ?? false);
      if (!firstText.trim() && !hasImage && !isBudget) return;
      if (isBudget && (typeof budget !== 'number' || budget <= 0)) return;

      stoppingRef.current = false;
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setStatus('searching');
      setCurrentMode(mode);

      const displayText = isPK
        ? `PK：${products?.join(' vs ') || ''}`
        : isBudget
          ? `预算 ${budget} 元买${category || '商品'}`
          : firstText.trim();
      const productName = displayText || currentProduct || '该商品';

      let userContent:
        | string
        | { type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }[] = displayText;
      let imageUrl: string | undefined;

      if (imageFile) {
        const validation = validateImage(imageFile);
        if (!validation.valid) {
          showToast(validation.error || '图片格式不支持', 'error');
          setStatus('error');
          return;
        }

        imageUrl = await fileToBase64(imageFile);
        userContent = [
          {
            type: 'text',
            text: firstText.trim() || '帮我识别这个商品并分析是否值得购买'
          },
          { type: 'image_url', image_url: { url: imageUrl } }
        ];
      } else if (isPK && (productImages?.some(Boolean) ?? false)) {
        const validImages = await Promise.all(
          (productImages ?? []).map(async (file, index) => {
            if (!file) return null;
            const validation = validateImage(file);
            if (!validation.valid) {
              showToast(`${file.name}: ${validation.error || '图片格式不支持'}`, 'error');
              return null;
            }
            return { index, url: await fileToBase64(file) };
          })
        );

        const imageEntries = validImages.filter((item): item is { index: number; url: string } => item !== null);

        if (imageEntries.length === 0) {
          setStatus('error');
          return;
        }

        const productList = products
          ?.map((name, i) => `${i + 1}. ${name}${imageEntries.some((e) => e.index === i) ? '（含图片）' : ''}`)
          .join('\n');

        userContent = [
          {
            type: 'text',
            text: `请对比以下商品：\n${productList}\n\n${firstText.trim() || '请结合图片进行 PK 分析。'}`
          },
          ...imageEntries.map((entry) => ({ type: 'image_url' as const, image_url: { url: entry.url } }))
        ];
      }

      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: userContent,
        timestamp: new Date(),
        imageUrl
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setCurrentProduct(productName);

      const statusTimer = setInterval(() => {
        setStatus((prev) => {
          if (prev === 'searching') return 'analyzing';
          if (prev === 'analyzing') return 'generating';
          return prev;
        });
      }, 5000);

      try {
        const result = await sendMessage(
          updatedMessages,
          productName,
          isPK ? products : undefined,
          isBudget ? budget : undefined,
          abortRef.current.signal,
          thinkingMode
        );
        clearInterval(statusTimer);

        if (result.error) {
          showToast(result.error, 'error');
        } else if (result.usedMock) {
          showToast('已自动切换模拟数据', 'info');
        }

        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: result.naturalText,
          timestamp: new Date(),
          report: result.report
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setCurrentReport(result.report);
        setSearchContext(result.searchContext || '');
        setSearchCount(result.searchCount || 0);
        setStatus('done');
        persistResult(productName, mode, result.naturalText, result.report);
      } catch (error) {
        clearInterval(statusTimer);
        const isUserStop = stoppingRef.current && error instanceof DOMException && error.name === 'AbortError';
        if (isUserStop) {
          setStatus('idle');
          stoppingRef.current = false;
        } else {
          setStatus('error');
          showToast(error instanceof Error ? error.message : '分析失败', 'error');
        }
      }
    },
    [messages, currentProduct, showToast, persistResult, thinkingMode]
  );

  const sendFollowUp = useCallback(
    async (text: string, imageFile?: File) => {
      if (!text.trim() && !imageFile) return;

      stoppingRef.current = false;
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      let userContent: ChatMessage['content'] = text.trim();
      let imageUrl: string | undefined;

      if (imageFile) {
        const validation = validateImage(imageFile);
        if (!validation.valid) {
          showToast(validation.error || '图片格式不支持', 'error');
          return;
        }
        imageUrl = await fileToBase64(imageFile);
        userContent = [
          { type: 'text', text: text.trim() || '请结合图片回答。' },
          { type: 'image_url', image_url: { url: imageUrl } }
        ];
      }

      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: userContent,
        timestamp: new Date(),
        imageUrl
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setStatus('analyzing');

      try {
        const result = await sendMessage(
          updatedMessages,
          currentProduct,
          currentMode === 'pk' ? currentProduct.split(' vs ') : undefined,
          currentMode === 'budget' ? extractBudget(currentProduct) : undefined,
          abortRef.current.signal,
          thinkingMode
        );

        if (result.error) {
          showToast(result.error, 'error');
        }

        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: result.naturalText,
          timestamp: new Date(),
          report: result.report
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setCurrentReport(result.report);
        setSearchContext(result.searchContext || '');
        setSearchCount(result.searchCount || 0);
        setStatus('done');
      } catch (error) {
        const isUserStop = stoppingRef.current && error instanceof DOMException && error.name === 'AbortError';
        if (isUserStop) {
          setStatus('idle');
          stoppingRef.current = false;
        } else {
          setStatus('error');
          showToast(error instanceof Error ? error.message : '追问失败', 'error');
        }
      }
    },
    [messages, currentProduct, currentMode, showToast, thinkingMode]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setStatus('idle');
    setCurrentReport(null);
    setCurrentProduct('');
    setCurrentRecordId('');
    setCurrentMode('single');
    setSearchContext('');
    setSearchCount(0);
  }, []);

  const loadRecord = useCallback((record: HistoryRecord) => {
    setMessages([
      {
        id: generateId(),
        role: 'user',
        content: record.isPK
          ? `PK：${record.productName}`
          : record.isBudget
            ? record.productName
            : record.productName,
        timestamp: new Date(record.createdAt)
      },
      {
        id: generateId(),
        role: 'assistant',
        content: record.naturalText,
        timestamp: new Date(record.createdAt),
        report: record.report
      }
    ]);
    setCurrentReport(record.report);
    setCurrentProduct(record.productName);
    setCurrentRecordId(record.id);
    setCurrentMode(record.mode || (record.isPK ? 'pk' : record.isBudget ? 'budget' : 'single'));
    setStatus('done');
  }, []);

  const loadSharedMessages = useCallback((sharedMessages: ChatMessage[]) => {
    setMessages(sharedMessages);
    const lastAssistant = sharedMessages.findLast((m) => m.role === 'assistant');
    setCurrentReport(lastAssistant?.report || null);
    setCurrentProduct('');
    setCurrentRecordId('');
    setCurrentMode('single');
    setStatus('done');
  }, []);

  return {
    messages,
    status,
    currentReport,
    currentProduct,
    currentRecordId,
    currentMode,
    thinkingMode,
    searchContext,
    searchCount,
    toast,
    runAnalysis,
    sendFollowUp,
    stopGeneration,
    reset,
    loadRecord,
    loadSharedMessages,
    setThinkingMode,
    showToast,
    setToast
  };
}

function extractBudget(text: string): number | undefined {
  const match = text.match(/预算\s*(\d+)\s*元/);
  return match ? parseInt(match[1], 10) : undefined;
}
