import { X, Sun, Moon, Monitor } from 'lucide-react';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark' | 'auto';
  onThemeChange: (theme: 'light' | 'dark' | 'auto') => void;
}

export function SettingsModal({ isOpen, onClose, theme, onThemeChange }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h3>设置</h3>
          <button type="button" className="settings-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="settings-section">
          <h4>外观</h4>
          <div className="theme-options">
            <button
              type="button"
              className={`theme-option ${theme === 'light' ? 'active' : ''}`}
              onClick={() => onThemeChange('light')}
            >
              <Sun size={18} />
              <span>浅色</span>
            </button>
            <button
              type="button"
              className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => onThemeChange('dark')}
            >
              <Moon size={18} />
              <span>深色</span>
            </button>
            <button
              type="button"
              className={`theme-option ${theme === 'auto' ? 'active' : ''}`}
              onClick={() => onThemeChange('auto')}
            >
              <Monitor size={18} />
              <span>跟随系统</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
