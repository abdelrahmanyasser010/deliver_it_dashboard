import { Banknote, Search, Store, Truck, UserRound, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDrivers, useLogisticsDashboard, useMerchants } from '../application/logistics/useLogisticsData';
import { useWorkspace } from '../context/WorkspaceContext';
import { canAccessRoute } from '../context/workspaceAccess';
import { Modal } from './ui/Ui';
import { formatCurrency, statusConfig } from '../utils/helpers';

export function GlobalSearch() {
  const navigate = useNavigate();
  const { shipments } = useLogisticsDashboard();
  const { drivers } = useDrivers();
  const { merchants } = useMerchants();
  const { role } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLocaleLowerCase('ar-EG');

  const results = useMemo(() => {
    if (normalized.length < 2) return { shipments: [], drivers: [], merchants: [] };
    const includes = (...values: Array<string | undefined>) => values.some((value) => value?.toLocaleLowerCase('ar-EG').includes(normalized));
    return {
      shipments: shipments.filter((item) => includes(item.id, item.trackingNumber, item.customerName, item.customerPhone, item.merchantName, item.driverName, item.address)).slice(0, 6),
      drivers: canAccessRoute(role, '/drivers') ? drivers.filter((item) => includes(item.id, item.name, item.phone, item.zone)).slice(0, 4) : [],
      merchants: canAccessRoute(role, '/merchants') ? merchants.filter((item) => includes(item.id, item.name, item.phone, item.branchName)).slice(0, 4) : [],
    };
  }, [normalized, shipments, drivers, merchants, role]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'k') { event.preventDefault(); setOpen(true); }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const total = results.shipments.length + results.drivers.length + results.merchants.length;
  const go = (path: string) => { setOpen(false); setQuery(''); navigate(path); };

  return <>
    <button className="global-search-trigger" onClick={() => setOpen(true)}><Search size={16}/><span>بحث شامل</span><kbd>Ctrl K</kbd></button>
    {open && <Modal title="البحث الشامل" description="ابحث برقم الشحنة أو الهاتف أو العميل أو التاجر أو المندوب." onClose={() => setOpen(false)} wide>
      <div className="global-search-input"><Search size={19}/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="اكتب حرفين على الأقل..." />{query && <button onClick={() => setQuery('')} aria-label="مسح"><X size={15}/></button>}</div>
      {normalized.length < 2 ? <div className="global-search-empty">ابدأ بكتابة رقم شحنة، هاتف، اسم عميل، تاجر أو مندوب.</div> : total === 0 ? <div className="global-search-empty">لا توجد نتائج مطابقة.</div> : <div className="global-results">
        {results.shipments.length > 0 && <SearchGroup title="الشحنات" icon={<Truck size={16}/>}>{results.shipments.map((item) => <button key={item.id} onClick={() => go(`/shipments?shipment=${item.id}`)}><span><strong>{item.id} — {item.customerName}</strong><small>{item.merchantName} · {statusConfig[item.status].label}</small></span><em>{formatCurrency(item.total)}</em></button>)}</SearchGroup>}
        {results.drivers.length > 0 && <SearchGroup title="المناديب" icon={<UserRound size={16}/>}>{results.drivers.map((item) => <button key={item.id} onClick={() => go(`/drivers?driver=${item.id}`)}><span><strong>{item.name}</strong><small>{item.id} · {item.zone}</small></span><em>{item.phone}</em></button>)}</SearchGroup>}
        {results.merchants.length > 0 && <SearchGroup title="التجار" icon={<Store size={16}/>}>{results.merchants.map((item) => <button key={item.id} onClick={() => go(`/merchants?merchant=${item.id}`)}><span><strong>{item.name}</strong><small>{item.id} · {item.branchName}</small></span><em>{formatCurrency(item.pendingSettlement)}</em></button>)}</SearchGroup>}
        {canAccessRoute(role, '/settlements') && <button className="global-settlement-shortcut" onClick={() => go('/settlements')}><Banknote size={16}/> البحث داخل التسويات والتحصيلات</button>}
      </div>}
    </Modal>}
  </>;
}

function SearchGroup({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="global-result-group"><h4>{icon}{title}</h4><div>{children}</div></section>;
}
