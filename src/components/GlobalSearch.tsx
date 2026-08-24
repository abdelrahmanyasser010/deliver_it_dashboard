import { Search, Store, Truck, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../infrastructure/api/client';
import { asRecord } from '../infrastructure/api/mappers';
import { friendlyApiMessage } from '../infrastructure/api/errors';
import { Modal } from './ui/Ui';

interface SearchShipment { id: string; trackingNumber: string; status: string; }
interface SearchMerchant { id: string; name: string; status: string; }
interface SearchResults { shipments: SearchShipment[]; merchants: SearchMerchant[]; }
const EMPTY: SearchResults = { shipments: [], merchants: [] };

function mapResults(value: unknown): SearchResults {
  const root = asRecord(value);
  const shipments = Array.isArray(root.shipments) ? root.shipments.map((item) => {
    const row = asRecord(item);
    return { id: String(row.id ?? ''), trackingNumber: String(row.tracking_number ?? row.id ?? ''), status: String(row.operational_status ?? '') };
  }).filter((item) => item.id) : [];
  const merchants = Array.isArray(root.merchants) ? root.merchants.map((item) => {
    const row = asRecord(item);
    return { id: String(row.id ?? ''), name: String(row.name ?? '—'), status: String(row.status ?? '') };
  }).filter((item) => item.id) : [];
  return { shipments, merchants };
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const normalized = query.trim();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen(true); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Focus once per open. Results never remount the input and never force focus per keystroke.
  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open || normalized.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void api.get<unknown>('/api/v1/global-search', { query: { q: normalized }, signal: controller.signal, retries: 0 })
        .then((response) => setResults(mapResults(response.data)))
        .catch((cause) => {
          if (!controller.signal.aborted) { setResults(EMPTY); setError(friendlyApiMessage(cause)); }
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, normalized]);

  const total = results.shipments.length + results.merchants.length;
  const close = () => { setOpen(false); setQuery(''); setResults(EMPTY); setError(null); };
  const go = (path: string) => { close(); navigate(path); };

  return <>
    <button className="global-search-trigger" onClick={() => setOpen(true)}><Search size={16}/><span>بحث شامل</span><kbd>Ctrl K</kbd></button>
    {open && <Modal title="البحث الشامل" description="ابحث برقم الشحنة أو بيانات المستلم أو اسم التاجر." onClose={close} wide className="global-search-modal">
      <div className="global-search-input"><Search size={19}/><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="اكتب حرفين على الأقل..." aria-label="البحث الشامل" autoComplete="off" />{query && <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="مسح"><X size={15}/></button>}</div>
      {normalized.length < 2 ? <div className="global-search-empty">ابدأ بكتابة رقم شحنة أو اسم تاجر أو بيانات مستلم.</div>
        : loading ? <div className="global-search-empty">جارٍ البحث…</div>
        : error ? <div className="global-search-empty">{error}</div>
        : total === 0 ? <div className="global-search-empty">لا توجد نتائج مطابقة.</div>
        : <div className="global-results">
          {results.shipments.length > 0 && <SearchGroup title="الشحنات" icon={<Truck size={16}/>}>{results.shipments.map((item) => <button key={item.id} onClick={() => go(`/shipments?shipment=${encodeURIComponent(item.id)}`)}><span><strong>{item.trackingNumber}</strong><small>{item.status || 'شحنة'}</small></span></button>)}</SearchGroup>}
          {results.merchants.length > 0 && <SearchGroup title="التجار" icon={<Store size={16}/>}>{results.merchants.map((item) => <button key={item.id} onClick={() => go(`/merchants?merchant=${encodeURIComponent(item.id)}`)}><span><strong>{item.name}</strong><small>{item.status || 'تاجر'}</small></span></button>)}</SearchGroup>}
        </div>}
    </Modal>}
  </>;
}

function SearchGroup({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="global-result-group"><h4>{icon}{title}</h4><div>{children}</div></section>;
}
