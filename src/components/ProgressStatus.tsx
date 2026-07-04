import './ProgressStatus.css';
import type { AnalysisStatus } from '../types';

interface ProgressStatusProps {
  status: AnalysisStatus;
}

const STEPS: { key: Exclude<AnalysisStatus, 'idle' | 'done' | 'error'>; label: string }[] = [
  { key: 'searching', label: '正在联网搜索...' },
  { key: 'analyzing', label: '正在分析价格数据...' },
  { key: 'generating', label: '生成报告中...' }
];

export function ProgressStatus({ status }: ProgressStatusProps) {
  if (status === 'idle' || status === 'done' || status === 'error') return null;

  const activeIndex = STEPS.findIndex((s) => s.key === status);

  return (
    <div className="progress-status">
      <div className="progress-steps">
        {STEPS.map((step, index) => (
          <div key={step.key} className="progress-step">
            <div
              className={`progress-dot ${index <= activeIndex ? 'active' : ''} ${
                index < activeIndex ? 'completed' : ''
              }`}
            />
            {index < STEPS.length - 1 && (
              <div className={`progress-line ${index < activeIndex ? 'active' : ''}`} />
            )}
          </div>
        ))}
      </div>
      <p className="progress-label">{STEPS[Math.max(0, activeIndex)].label}</p>
    </div>
  );
}
