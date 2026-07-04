import { History, Heart, Flame, Settings, Share2 } from 'lucide-react';
import './Header.css';

type PanelTab = 'history' | 'wishlist' | 'trending';

interface HeaderProps {
  onOpenPanel: (tab: PanelTab) => void;
  onOpenSettings: () => void;
  onShare: () => void;
  hasMessages: boolean;
}

const ENTRIES: { key: PanelTab; label: string; icon: typeof History }[] = [
  { key: 'history', label: '历史', icon: History },
  { key: 'wishlist', label: '心愿单', icon: Heart },
  { key: 'trending', label: '热门', icon: Flame }
];

export function Header({ onOpenPanel, onOpenSettings, onShare, hasMessages }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-toolbar">
        {ENTRIES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className="header-entry"
            onClick={() => onOpenPanel(key)}
            title={label}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="header-actions">
        {hasMessages && (
          <button
            type="button"
            className="header-action-btn"
            onClick={onShare}
            title="分享聊天记录"
          >
            <Share2 size={16} />
          </button>
        )}
        <button
          type="button"
          className="header-action-btn"
          onClick={onOpenSettings}
          title="设置"
        >
          <Settings size={16} />
        </button>
      </div>

      <h1 className="header-title">买不买 · AI决策舱</h1>
      <p className="header-subtitle">输入商品名或上传图片，AI 帮你判断值不值得买</p>
    </header>
  );
}
