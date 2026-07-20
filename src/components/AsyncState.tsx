import { AlertTriangle, PackageOpen, RefreshCcw } from 'lucide-react';
import './AsyncState.css';

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="page-skeleton" aria-label="جاري تحميل البيانات" aria-busy="true">
      <div className="skeleton-block skeleton-hero" />
      <div className="skeleton-grid">
        {Array.from({ length: rows }, (_, index) => <div key={index} className="skeleton-block skeleton-card" />)}
      </div>
      <div className="skeleton-block skeleton-table" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="async-state glass-card" role="alert">
      <AlertTriangle size={28} />
      <div>
        <strong>تعذر تحميل الصفحة</strong>
        <p>{message}</p>
      </div>
      <button className="outline-btn" onClick={onRetry}><RefreshCcw size={15} /> إعادة المحاولة</button>
    </div>
  );
}

export function EmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="async-state empty-state glass-card">
      <PackageOpen size={28} />
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {actionLabel && onAction && <button className="outline-btn" onClick={onAction}>{actionLabel}</button>}
    </div>
  );
}
