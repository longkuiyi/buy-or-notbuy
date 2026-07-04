import { useState, useEffect, useCallback } from 'react';
import { X, History, Heart, Flame, Trash2, Bell, TrendingDown, Search } from 'lucide-react';
import {
  getAllHistory,
  deleteHistory,
  clearHistory,
  getTrending,
  deleteTrendingItem,
  clearTrending
} from '../utils/storage';
import { useWishlist } from '../hooks/useWishlist';
import { isPKReport } from '../types';
import type { HistoryRecord, TrendingItem } from '../types';
import './SidePanel.css';

type PanelTab = 'history' | 'wishlist' | 'trending';

interface WishlistPrefill {
  name: string;
  basePrice: number;
  note?: string;
  historyId?: string;
}

interface SidePanelProps {
  isOpen: boolean;
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  onClose: () => void;
  onLoadRecord: (record: HistoryRecord) => void;
  onLoadRecordById: (historyId: string) => void;
  onAnalyze: (params: {
    mode: import('../types').AnalysisMode;
    text?: string;
    products?: string[];
    budget?: number;
    category?: string;
    imageFile?: File;
  }) => void;
  showToast: (message: string, type?: 'error' | 'info' | 'success') => void;
  prefill?: WishlistPrefill | null;
  onPrefillConsumed?: () => void;
}

const TABS: { key: PanelTab; label: string; icon: typeof History }[] = [
  { key: 'history', label: '历史', icon: History },
  { key: 'wishlist', label: '心愿单', icon: Heart },
  { key: 'trending', label: '热门', icon: Flame }
];

export function SidePanel({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  onLoadRecord,
  onLoadRecordById,
  onAnalyze,
  showToast,
  prefill,
  onPrefillConsumed
}: SidePanelProps) {
  return (
    <>
      <div className={`panel-backdrop ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <aside className={`side-panel ${isOpen ? 'open' : ''}`}>
        <div className="panel-header">
          <div className="panel-tabs">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                className={`panel-tab ${activeTab === key ? 'active' : ''}`}
                onClick={() => onTabChange(key)}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
          <button className="panel-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="panel-body">
          {activeTab === 'history' && (
            <HistoryTab isOpen={isOpen} onLoadRecord={onLoadRecord} onClose={onClose} showToast={showToast} />
          )}
          {activeTab === 'wishlist' && (
            <WishlistTab
              isOpen={isOpen}
              showToast={showToast}
              prefill={prefill}
              onPrefillConsumed={onPrefillConsumed}
              onLoadRecordById={onLoadRecordById}
            />
          )}
          {activeTab === 'trending' && (
            <TrendingTab isOpen={isOpen} onAnalyze={onAnalyze} onClose={onClose} showToast={showToast} />
          )}
        </div>
      </aside>
    </>
  );
}

/* ---------------- 历史 ---------------- */

function HistoryTab({
  isOpen,
  onLoadRecord,
  onClose,
  showToast
}: {
  isOpen: boolean;
  onLoadRecord: (record: HistoryRecord) => void;
  onClose: () => void;
  showToast: SidePanelProps['showToast'];
}) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);

  const load = useCallback(async () => {
    setRecords(await getAllHistory());
  }, []);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteHistory(id);
    load();
  };

  const handleClear = async () => {
    await clearHistory();
    load();
    showToast('已清空历史记录', 'info');
  };

  if (records.length === 0) {
    return <EmptyState icon={<History size={32} />} text="还没有分析记录，去搜一个商品试试吧" />;
  }

  return (
    <div className="panel-list">
      <div className="panel-list-actions">
        <span className="panel-count">共 {records.length} 条</span>
        <button className="panel-clear-btn" onClick={handleClear}>
          清空
        </button>
      </div>
      {records.map((record) => {
        const decision = isPKReport(record.report)
          ? record.report.winner || record.report.finalAdvice.decision
          : record.report.finalAdvice.decision;
        return (
          <div
            key={record.id}
            className="history-item"
            onClick={() => {
              onLoadRecord(record);
              onClose();
            }}
          >
            <div className="history-item-main">
              <div className="history-item-top">
                {record.isPK && <span className="history-pk-tag">PK</span>}
                {record.isBudget && <span className="history-budget-tag">预算</span>}
                <span className="history-name">{record.productName}</span>
              </div>
              <div className="history-item-bottom">
                {decision && <span className="history-decision">{decision}</span>}
                <span className="history-time">{formatTime(record.createdAt)}</span>
              </div>
            </div>
            <button className="history-delete" onClick={(e) => handleDelete(e, record.id)}>
              <Trash2 size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- 心愿单 ---------------- */

function WishlistTab({
  isOpen,
  showToast,
  prefill,
  onPrefillConsumed,
  onLoadRecordById
}: {
  isOpen: boolean;
  showToast: SidePanelProps['showToast'];
  prefill?: WishlistPrefill | null;
  onPrefillConsumed?: () => void;
  onLoadRecordById: (historyId: string) => void;
}) {
  const { items, addItem, removeItem, checkPrices, refresh } = useWishlist();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [base, setBase] = useState('');
  const [note, setNote] = useState('');
  const [historyId, setHistoryId] = useState<string | undefined>(undefined);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen, refresh]);

  useEffect(() => {
    if (isOpen && prefill) {
      setName(prefill.name);
      setBase(String(prefill.basePrice));
      setTarget(String(Math.round(prefill.basePrice * 0.9)));
      setNote(prefill.note || '');
      setHistoryId(prefill.historyId);
      onPrefillConsumed?.();
    }
  }, [isOpen, prefill, onPrefillConsumed]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetPrice = parseFloat(target);
    const basePrice = parseFloat(base);
    if (!name.trim() || isNaN(targetPrice) || isNaN(basePrice)) {
      showToast('请填写商品名、当前价和心理价位', 'error');
      return;
    }
    await addItem(name, targetPrice, basePrice, note, historyId);
    setName('');
    setTarget('');
    setBase('');
    setNote('');
    setHistoryId(undefined);
    showToast('已加入心愿单', 'success');
  };

  const handleCheck = async () => {
    setChecking(true);
    const reached = await checkPrices();
    setChecking(false);
    if (reached.length > 0) {
      const first = reached[0];
      const extra = first.note ? `——当初 AI 说：${first.note}` : '';
      showToast(`🔔 ${reached.map((r) => r.productName).join('、')} 已降到心理价位！${extra}`, 'success');
    } else {
      showToast('检查完成，暂无商品降到心理价位', 'info');
    }
  };

  return (
    <div className="panel-list">
      <form className="wishlist-form" onSubmit={handleAdd}>
        <input
          className="wishlist-input"
          placeholder="商品名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="wishlist-price-row">
          <input
            className="wishlist-input"
            placeholder="当前价 ¥"
            type="number"
            value={base}
            onChange={(e) => setBase(e.target.value)}
          />
          <input
            className="wishlist-input"
            placeholder="心理价位 ¥"
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </div>
        <button type="submit" className="wishlist-add-btn">
          <Heart size={15} />
          加入心愿单
        </button>
      </form>

      {items.length > 0 && (
        <button className="wishlist-check-btn" onClick={handleCheck} disabled={checking}>
          <Bell size={15} />
          {checking ? '检查中…' : '检查降价'}
        </button>
      )}

      {items.length === 0 ? (
        <EmptyState icon={<Heart size={32} />} text="心愿单空空的，加入商品持续帮你盯价" />
      ) : (
        items.map((item) => {
          const progress = Math.min(
            100,
            Math.max(
              0,
              ((item.basePrice - item.currentPrice) / Math.max(1, item.basePrice - item.targetPrice)) * 100
            )
          );
          const down = item.currentPrice < item.basePrice;
          return (
            <div key={item.id} className={`wishlist-item ${item.reached ? 'reached' : ''}`}>
              <div className="wishlist-item-header">
                <span className="wishlist-item-name">{item.productName}</span>
                <button className="history-delete" onClick={() => removeItem(item.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="wishlist-prices">
                <span className={`wishlist-current ${down ? 'down' : ''}`}>
                  {down && <TrendingDown size={13} />}
                  ¥{item.currentPrice.toLocaleString()}
                </span>
                <span className="wishlist-target">目标 ¥{item.targetPrice.toLocaleString()}</span>
              </div>
              <div className="wishlist-progress">
                <div
                  className="wishlist-progress-bar"
                  style={{ width: `${item.reached ? 100 : progress}%` }}
                />
              </div>
              {item.note && (
                <button
                  type="button"
                  className={`wishlist-note ${item.historyId ? 'clickable' : ''}`}
                  onClick={() => item.historyId && onLoadRecordById(item.historyId)}
                  disabled={!item.historyId}
                >
                  <span className="wishlist-note-label">当初 AI 说</span>
                  {item.note}
                  {item.historyId && <span className="wishlist-note-link">查看完整分析 →</span>}
                </button>
              )}
              {item.reached && <span className="wishlist-reached-tag">🎯 已达心理价位</span>}
            </div>
          );
        })
      )}
    </div>
  );
}

/* ---------------- 热门榜 ---------------- */

function TrendingTab({
  isOpen,
  onAnalyze,
  onClose,
  showToast
}: {
  isOpen: boolean;
  onAnalyze: (params: {
    mode: import('../types').AnalysisMode;
    text?: string;
    products?: string[];
    budget?: number;
    category?: string;
    imageFile?: File;
  }) => void;
  onClose: () => void;
  showToast: SidePanelProps['showToast'];
}) {
  const [items, setItems] = useState<TrendingItem[]>([]);

  const load = useCallback(() => {
    setItems(getTrending());
  }, []);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  const handleDelete = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    deleteTrendingItem(name);
    load();
  };

  const handleClear = () => {
    clearTrending();
    load();
    showToast('已清空热门榜', 'info');
  };

  if (items.length === 0) {
    return <EmptyState icon={<Flame size={32} />} text="还没有热门商品，多搜几次就会上榜啦" />;
  }

  return (
    <div className="panel-list">
      <div className="panel-list-actions">
        <span className="panel-count">共 {items.length} 条</span>
        <button className="panel-clear-btn" onClick={handleClear}>
          清空
        </button>
      </div>
      {items.map((item, index) => (
        <div
          key={item.productName}
          className="trending-item"
          onClick={() => {
            onAnalyze({ mode: 'single', text: item.productName });
            onClose();
          }}
        >
          <span className={`trending-rank rank-${index + 1}`}>{index + 1}</span>
          <div className="trending-main">
            <span className="trending-name">{item.productName}</span>
            {item.lastDecision && <span className="trending-decision">{item.lastDecision}</span>}
          </div>
          <div className="trending-meta">
            <span className="trending-count">{item.count}次</span>
            <button
              type="button"
              className="history-delete"
              onClick={(e) => handleDelete(e, item.productName)}
              title="删除"
            >
              <Trash2 size={15} />
            </button>
            <Search size={14} className="trending-search-icon" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- 通用 ---------------- */

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="panel-empty">
      <div className="panel-empty-icon">{icon}</div>
      <p>{text}</p>
    </div>
  );
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}天前`;

  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
