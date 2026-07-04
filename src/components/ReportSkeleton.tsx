import './ReportSkeleton.css';

export function ReportSkeleton() {
  return (
    <div className="report-skeleton">
      <div className="skeleton-verdict shimmer" />
      <div className="skeleton-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-line title shimmer" />
            <div className="skeleton-line shimmer" />
            <div className="skeleton-line short shimmer" />
            <div className="skeleton-block shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}
