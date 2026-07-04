import './FinalAdvice.css';
import type { FinalAdvice } from '../types';

interface FinalAdviceProps {
  finalAdvice: FinalAdvice;
}

export function FinalAdviceCard({ finalAdvice }: FinalAdviceProps) {
  const decision = finalAdvice.decision || '再等等';
  const lowerDecision = decision.toLowerCase();

  let decisionClass = 'wait';
  if (lowerDecision.includes('买') && !lowerDecision.includes('不买')) {
    decisionClass = 'buy';
  } else if (lowerDecision.includes('不买')) {
    decisionClass = 'dont-buy';
  }

  return (
    <div className="report-card final-advice-card">
      <div className="card-header">
        <h3 className="card-title">💡 最终建议</h3>
      </div>

      <div className={`decision-banner ${decisionClass}`}>
        <span className="decision-text">{decision}</span>
      </div>

      {finalAdvice.reason && <p className="decision-reason">{finalAdvice.reason}</p>}
    </div>
  );
}
