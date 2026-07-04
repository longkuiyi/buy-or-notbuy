import { X, Share2, Copy, Check, Link2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { encodeShareMessages, buildShareUrl } from '../utils/share';
import type { ChatMessage } from '../types';
import './ShareModal.css';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
}

export function ShareModal({ isOpen, onClose, messages }: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setShareUrl('');
      setError('');
      return;
    }
    try {
      const encoded = encodeShareMessages(messages);
      setShareUrl(buildShareUrl(encoded));
    } catch {
      setError('对话太长，无法生成分享链接。');
    }
  }, [isOpen, messages]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('复制失败，请手动复制链接。');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h3>
            <Share2 size={18} />
            分享聊天记录
          </h3>
          <button type="button" className="share-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="share-content">
          {error ? (
            <div className="share-error">{error}</div>
          ) : shareUrl ? (
            <>
              <p className="share-hint">复制下方链接，任何人打开都能看到这份对话。</p>
              <div className="share-link-box">
                <Link2 size={16} className="share-link-icon" />
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="share-link-input"
                />
              </div>
            </>
          ) : (
            <div className="share-loading">生成链接中…</div>
          )}
        </div>

        <div className="share-actions">
          <button
            type="button"
            className="share-btn secondary"
            onClick={onClose}
          >
            关闭
          </button>
          <button
            type="button"
            className="share-btn primary"
            onClick={handleCopy}
            disabled={!shareUrl}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? '已复制' : '复制链接'}
          </button>
        </div>
      </div>
    </div>
  );
}
