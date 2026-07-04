import { Bell } from 'lucide-react';
import './ReportVerdict.css';
import type { ShoppingReport } from '../types';

export interface WishlistPrefill {
  name: string;
  basePrice: number;
  note?: string;
  historyId?: string;
}

interface ReportVerdictProps {
  report: ShoppingReport;
  productName?: string;
  historyId?: string;
  onAddToWishlist?: (prefill: WishlistPrefill) => void;
}

export function ReportVerdict({ report, productName, historyId, onAddToWishlist }: ReportVerdictProps) {
  const decision = report.finalAdvice.decision || '再等等';
  const lower = decision.toLowerCase();

  let decisionClass = 'wait';
  let emoji = '🤔';
  if (lower.includes('买') && !lower.includes('不买')) {
    decisionClass = 'buy';
    emoji = '✅';
  } else if (lower.includes('不买')) {
    decisionClass = 'dont-buy';
    emoji = '🛑';
  }

  const score = report.review.score;
  const lowestPrice = report.price.lowestPrice;
  const lowestPlatform = report.price.lowestPlatform;

  const canWatch = onAddToWishlist && lowestPrice != null;

  const handleWatch = () => {
    if (!onAddToWishlist || lowestPrice == null) return;
    const name = productName || report.productName || '该商品';
    const note = [decision, report.finalAdvice.reason].filter(Boolean).join(' · ');
    onAddToWishlist({ name, basePrice: lowestPrice, note, historyId });
  };

  return (
    <div className={`report-verdict ${decisionClass}`}>
      <div className="verdict-main">
        <span className="verdict-emoji">{emoji}</span>
        <div className="verdict-text-block">
          <span className="verdict-label">AI 结论</span>
          <span className="verdict-decision">{decision}</span>
        </div>
      </div>

      <div className="verdict-stats">
        {score != null && (
          <div className="verdict-stat">
            <span className="verdict-stat-value">{score}</span>
            <span className="verdict-stat-label">综合评分</span>
          </div>
        )}
        {lowestPrice != null && (
          <div className="verdict-stat">
            <span className="verdict-stat-value">¥{lowestPrice.toLocaleString()}</span>
            <span className="verdict-stat-label">
              {lowestPlatform ? `${lowestPlatform}最低` : '全网最低'}
            </span>
          </div>
        )}
      </div>

      {report.finalAdvice.reason && (
        <p className="verdict-reason">{report.finalAdvice.reason}</p>
      )}

      {canWatch && (
        <button className="verdict-watch-btn" onClick={handleWatch}>
          <Bell size={15} />
          加入心愿单盯价
        </button>
      )}
    </div>
  );
}
