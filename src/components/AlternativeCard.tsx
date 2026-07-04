import './AlternativeCard.css';
import type { AlternativeProduct } from '../types';

interface AlternativeCardProps {
  alternatives: AlternativeProduct[];
}

export function AlternativeCard({ alternatives }: AlternativeCardProps) {
  return (
    <div className="report-card alternative-card">
      <div className="card-header">
        <h3 className="card-title">🔄 竞品对比</h3>
      </div>

      <div className="alternatives-list">
        {alternatives.map((alt, index) => (
          <div key={index} className="alternative-item">
            <div className="alternative-title">
              <h4>{alt.name}</h4>
              {alt.price && <span className="alt-price">{alt.price}</span>}
            </div>
            <div className="alt-detail">
              {alt.pros && (
                <p>
                  <span className="alt-label alt-pro-label">优势</span>
                  {alt.pros}
                </p>
              )}
              {alt.cons && (
                <p>
                  <span className="alt-label alt-con-label">劣势</span>
                  {alt.cons}
                </p>
              )}
              {alt.reason && (
                <p>
                  <span className="alt-label alt-reason-label">建议</span>
                  {alt.reason}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
