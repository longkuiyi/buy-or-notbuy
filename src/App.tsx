import { useRef, useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { SearchInput } from './components/SearchInput';
import { ProgressStatus } from './components/ProgressStatus';
import { PriceCard } from './components/PriceCard';
import { ReviewCard } from './components/ReviewCard';
import { AlternativeCard } from './components/AlternativeCard';
import { FinalAdviceCard } from './components/FinalAdvice';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { ExportButton } from './components/ExportButton';
import { PKReportView } from './components/PKReportView';
import { BudgetReportView } from './components/BudgetReportView';
import { SidePanel } from './components/SidePanel';
import { ReportVerdict } from './components/ReportVerdict';
import type { WishlistPrefill } from './components/ReportVerdict';
import { ReportSkeleton } from './components/ReportSkeleton';
import { SearchDebugPanel } from './components/SearchDebugPanel';
import { CameraModal } from './components/CameraModal';
import { SettingsModal } from './components/SettingsModal';
import { ShareModal } from './components/ShareModal';
import { useChat } from './hooks/useChat';
import { getHistoryById } from './utils/storage';
import { decodeShareMessages } from './utils/share';
import { isPKReport, isBudgetReport } from './types';
import type { AnalysisMode } from './types';
import './App.css';

type PanelTab = 'history' | 'wishlist' | 'trending';
type Theme = 'light' | 'dark' | 'auto';

function App() {
  const {
    messages,
    status,
    currentReport,
    currentProduct,
    currentRecordId,
    thinkingMode,
    searchContext,
    searchCount,
    toast,
    runAnalysis,
    sendFollowUp,
    stopGeneration,
    loadRecord,
    loadSharedMessages,
    setThinkingMode,
    showToast
  } = useChat();

  const reportRef = useRef<HTMLDivElement>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>('history');
  const [wishlistPrefill, setWishlistPrefill] = useState<WishlistPrefill | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<AnalysisMode>('single');
  const [cameraCallback, setCameraCallback] = useState<((file: File) => void) | null>(null);
  const [followUpCameraOpen, setFollowUpCameraOpen] = useState(false);
  const [followUpCameraCallback, setFollowUpCameraCallback] = useState<((file: File) => void) | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('app-theme') as Theme) || 'auto';
  });

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme === 'auto') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.add('light');
      }
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash.startsWith('share=')) return;
    const encoded = hash.slice(6);
    const sharedMessages = decodeShareMessages(encoded);
    if (sharedMessages && sharedMessages.length > 0) {
      loadSharedMessages(sharedMessages);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  const openPanel = (tab: PanelTab) => {
    setPanelTab(tab);
    setPanelOpen(true);
  };

  const handleAddToWishlist = (prefill: WishlistPrefill) => {
    setWishlistPrefill(prefill);
    setPanelTab('wishlist');
    setPanelOpen(true);
  };

  const handleLoadRecordById = async (historyId: string) => {
    const record = await getHistoryById(historyId);
    if (!record) {
      showToast('原始分析记录已被删除', 'error');
      return;
    }
    loadRecord(record);
    setPanelOpen(false);
  };

  const handleOpenCamera = useCallback((mode: AnalysisMode, onCapture: (file: File) => void) => {
    setCameraMode(mode);
    setCameraCallback(() => onCapture);
    setCameraOpen(true);
  }, []);

  const handleCameraCapture = useCallback((file: File) => {
    cameraCallback?.(file);
    setCameraOpen(false);
    setCameraCallback(null);
  }, [cameraCallback]);

  const handleOpenFollowUpCamera = useCallback((onCapture: (file: File) => void) => {
    setFollowUpCameraCallback(() => onCapture);
    setFollowUpCameraOpen(true);
  }, []);

  const handleFollowUpCameraCapture = useCallback((file: File) => {
    followUpCameraCallback?.(file);
    setFollowUpCameraOpen(false);
    setFollowUpCameraCallback(null);
  }, [followUpCameraCallback]);

  const isAnalyzing = status !== 'idle' && status !== 'done' && status !== 'error';
  const showReport = currentReport && status !== 'idle';

  return (
    <div className="app">
      <div className="app-container">
        <Header
          onOpenPanel={openPanel}
          onOpenSettings={() => setSettingsOpen(true)}
          onShare={() => setShareOpen(true)}
          hasMessages={messages.length > 0}
        />

        <SearchInput
          onAnalyze={runAnalysis}
          onStop={stopGeneration}
          isAnalyzing={isAnalyzing}
          thinkingMode={thinkingMode}
          onThinkingModeChange={setThinkingMode}
          onOpenCamera={handleOpenCamera}
        />

        <ProgressStatus status={status} />

        {isAnalyzing && !showReport && <ReportSkeleton />}

        <MessageList messages={messages} />

        <SearchDebugPanel searchContext={searchContext} searchCount={searchCount} />

        {showReport && (
          <div className="report-export-wrapper">
            <div className="report-export-header">
              <ExportButton
                targetRef={reportRef}
                filename={
                  currentProduct ||
                  (isPKReport(currentReport)
                    ? 'PK 对比报告'
                    : isBudgetReport(currentReport)
                      ? '预算推荐报告'
                      : '购物决策报告')
                }
              />
            </div>
            <div ref={reportRef} className="report-export-body">
              {isPKReport(currentReport) ? (
                <PKReportView report={currentReport} />
              ) : isBudgetReport(currentReport) ? (
                <BudgetReportView report={currentReport} />
              ) : (
                <>
                  <ReportVerdict
                    report={currentReport}
                    productName={currentProduct}
                    historyId={currentRecordId}
                    onAddToWishlist={handleAddToWishlist}
                  />
                  <div className="report-grid">
                    <PriceCard priceAnalysis={currentReport.price} />
                    <ReviewCard reviewSummary={currentReport.review} />
                    <AlternativeCard alternatives={currentReport.alternatives} />
                    <FinalAdviceCard finalAdvice={currentReport.finalAdvice} />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="chat-section">
            <ChatInput
              onSend={sendFollowUp}
              disabled={isAnalyzing}
              onOpenCamera={handleOpenFollowUpCamera}
            />
          </div>
        )}

        {toast.show && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
      </div>

      <SidePanel
        isOpen={panelOpen}
        activeTab={panelTab}
        onTabChange={setPanelTab}
        onClose={() => setPanelOpen(false)}
        onLoadRecord={loadRecord}
        onLoadRecordById={handleLoadRecordById}
        onAnalyze={runAnalysis}
        showToast={showToast}
        prefill={wishlistPrefill}
        onPrefillConsumed={() => setWishlistPrefill(null)}
      />

      <CameraModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
        mode={cameraMode}
      />

      <CameraModal
        isOpen={followUpCameraOpen}
        onClose={() => setFollowUpCameraOpen(false)}
        onCapture={handleFollowUpCameraCapture}
        mode="single"
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
      />

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        messages={messages}
      />
    </div>
  );
}

export default App;
