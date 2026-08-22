import { CheckCircle2, CircleAlert, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import './Ui.css';

export function SectionHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <div className="ui-section-header"><div><h3>{title}</h3>{description && <p>{description}</p>}</div>{actions && <div className="ui-section-actions">{actions}</div>}</div>;
}

export function MetricCard({ label, value, detail, icon: Icon, tone = 'info', onClick }: { label: string; value: string; detail?: string; icon: LucideIcon; tone?: 'info' | 'success' | 'warning' | 'danger'; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'article';
  return <Tag className={`ui-metric-card glass-card ${tone} ${onClick ? 'clickable' : ''}`} onClick={onClick}><span className="ui-metric-icon"><Icon size={19} /></span><span className="ui-metric-copy"><small>{label}</small><strong>{value}</strong>{detail && <em>{detail}</em>}</span></Tag>;
}

export function Button({ variant = 'primary', icon: Icon, children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'; icon?: LucideIcon }) {
  return <button {...props} className={`ui-button ${variant} ${className}`.trim()}>{Icon && <Icon size={15} />}{children}</button>;
}

export function StatusBadge({ label, tone = 'info' }: { label: string; tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral' }) {
  return <span className={`ui-status-badge ${tone}`}>{label}</span>;
}

export function FilterChip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return <span className="ui-filter-chip">{label}{onRemove && <button type="button" onClick={onRemove} aria-label={`إزالة ${label}`}><X size={12} /></button>}</span>;
}

function useAccessibleLayer(onClose: () => void) {
  const containerRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => {
      const container = containerRef.current;
      const preferred = container?.querySelector<HTMLElement>('[autofocus], input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])');
      (preferred ?? container)?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...container.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter((element) => !element.hasAttribute('hidden'));
      if (!focusable.length) { event.preventDefault(); container.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, []);
  return containerRef;
}

export function Modal({ title, description, children, footer, onClose, wide = false, className = '' }: { title: string; description?: string; children: ReactNode; footer?: ReactNode; onClose: () => void; wide?: boolean; className?: string }) {
  const titleId = useId();
  const descriptionId = useId();
  const ref = useAccessibleLayer(onClose);
  return <div className="ui-modal-overlay" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <section ref={ref} tabIndex={-1} className={`ui-modal glass-panel ${wide ? 'wide' : ''} ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}>
      <header><div><h3 id={titleId}>{title}</h3>{description && <p id={descriptionId}>{description}</p>}</div><button type="button" className="btn-icon sm" onClick={onClose} aria-label="إغلاق"><X size={15} /></button></header>
      <div className="ui-modal-body">{children}</div>{footer && <footer>{footer}</footer>}
    </section>
  </div>;
}

export function Drawer({ title, description, children, footer, onClose, className = '' }: { title: string; description?: string; children: ReactNode; footer?: ReactNode; onClose: () => void; className?: string }) {
  const titleId = useId();
  const descriptionId = useId();
  const ref = useAccessibleLayer(onClose);
  return <div className="ui-drawer-overlay" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <aside ref={ref} tabIndex={-1} className={`ui-drawer glass-panel ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}>
      <header><div><h3 id={titleId}>{title}</h3>{description && <p id={descriptionId}>{description}</p>}</div><button type="button" className="btn-icon" onClick={onClose} aria-label="إغلاق"><X size={18} /></button></header>
      <div className="ui-drawer-body">{children}</div>{footer && <footer>{footer}</footer>}
    </aside>
  </div>;
}

export function ConfirmDialog({ title, description, confirmLabel = 'تأكيد', cancelLabel = 'إلغاء', danger = false, onConfirm, onClose }: { title: string; description: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean; onConfirm: () => void; onClose: () => void }) {
  return <Modal title={title} description={description} onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>{cancelLabel}</Button><Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button></>}><p className="ui-confirm-copy">راجع أثر العملية قبل التأكيد؛ سيتم تسجيلها في سجل العمليات.</p></Modal>;
}

const toastIcons = { success: CheckCircle2, warning: TriangleAlert, danger: CircleAlert, info: Info };
export function ToastHost() {
  const { toasts, dismissToast } = useWorkspace();
  return <div className="ui-toast-stack" aria-live="polite" aria-atomic="false">{toasts.map((toast) => { const Icon = toastIcons[toast.tone]; return <div key={toast.id} className={`ui-toast ${toast.tone}`} role="status"><Icon size={17} /><span>{toast.message}</span><button type="button" onClick={() => dismissToast(toast.id)} aria-label="إغلاق"><X size={14} /></button></div>; })}</div>;
}
