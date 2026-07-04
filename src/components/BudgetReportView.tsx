import { Wallet, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { BudgetReport } from '../types';
import './BudgetReportView.css';

interface BudgetReportViewProps {
  report: BudgetReport;
}

export function BudgetReportView({ report }: BudgetReportViewProps) {
  return (
    <div className="budget-report">
      <div className="budget-header">
        <div className="budget-icon">
          <Wallet size={24} />
        </div>
        <div className="budget-info">
          <h2 className="budget-title">预算 {report.budget} 元推荐</h2>
          {report.category && <span className="budget-category">{report.category}</span>}
        </div>
      </div>

      <div className="budget-options">
        {report.options.map((option, index) => (
          <div
            key={index}
            className={`budget-option ${index === 0 ? 'budget-option-best' : ''}`}
          >
            <div className="budget-option-header">
              <span className="budget-option-rank">#{index + 1}</span>
              <h3 className="budget-option-name">{option.name}</h3>
              <span className="budget-option-price">{option.price || '价格未知'}</span>
            </div>

            <div className="budget-option-score">
              <span className="budget-score-label">匹配度</span>
              <div className="budget-score-bar">
                <div
                  className="budget-score-fill"
                  style={{ width: `${option.matchScore * 10}%` }}
                />
              </div>
              <span className="budget-score-value">{option.matchScore}/10</span>
            </div>

            <div className="budget-option-tags">
              <span className="budget-tag budget-tag-pros">
                <CheckCircle2 size={12} />
                {option.pros}
              </span>
              <span className="budget-tag budget-tag-cons">
                <AlertCircle size={12} />
                {option.cons}
              </span>
            </div>

            <p className="budget-option-reason">{option.reason}</p>
          </div>
        ))}
      </div>

      <div className="budget-final-advice">
        <TrendingUp size={18} />
        <div>
          <strong>最终建议：{report.finalAdvice.decision || '暂无明确建议'}</strong>
          <p>{report.finalAdvice.reason || ''}</p>
        </div>
      </div>
    </div>
  );
}
