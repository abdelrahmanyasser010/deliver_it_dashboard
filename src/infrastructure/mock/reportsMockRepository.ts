import type { AccountingSnapshot, ReportsSnapshot } from '../../domain/reports/entities';

const reportsSnapshot: ReportsSnapshot = {
  orderValueTrend: [
    { day: 'السبت', orders: 42, orderValue: 61200, shippingFees: 3150, returns: 4 },
    { day: 'الأحد', orders: 56, orderValue: 84200, shippingFees: 4200, returns: 5 },
    { day: 'الاثنين', orders: 61, orderValue: 91800, shippingFees: 4575, returns: 3 },
    { day: 'الثلاثاء', orders: 48, orderValue: 72300, shippingFees: 3600, returns: 7 },
    { day: 'الأربعاء', orders: 69, orderValue: 104500, shippingFees: 5175, returns: 4 },
    { day: 'الخميس', orders: 73, orderValue: 113200, shippingFees: 5475, returns: 6 },
    { day: 'الجمعة', orders: 38, orderValue: 55800, shippingFees: 2850, returns: 2 },
  ],
  driverPerformance: [
    { driverId: 'DRV-001', driverName: 'محمد علي', zone: 'مدينة نصر', assigned: 82, delivered: 71, returned: 5, delayed: 6, collectedCash: 72400, successRate: 86 },
    { driverId: 'DRV-002', driverName: 'أحمد سامي', zone: 'القاهرة الجديدة', assigned: 76, delivered: 63, returned: 8, delayed: 9, collectedCash: 64850, successRate: 83 },
    { driverId: 'DRV-004', driverName: 'خالد إبراهيم', zone: 'الهرم', assigned: 58, delivered: 44, returned: 6, delayed: 11, collectedCash: 39500, successRate: 76 },
    { driverId: 'DRV-005', driverName: 'ياسر عمر', zone: 'الدقي', assigned: 49, delivered: 42, returned: 3, delayed: 4, collectedCash: 42100, successRate: 86 },
  ],
  governorates: [
    { governorate: 'القاهرة', total: 184, delivered: 151, inTransit: 18, returned: 9, delayed: 13, avgDeliveryHours: 18 },
    { governorate: 'الجيزة', total: 126, delivered: 93, inTransit: 17, returned: 11, delayed: 16, avgDeliveryHours: 25 },
    { governorate: 'الإسكندرية', total: 72, delivered: 59, inTransit: 6, returned: 4, delayed: 5, avgDeliveryHours: 22 },
    { governorate: 'الدقهلية', total: 39, delivered: 31, inTransit: 4, returned: 3, delayed: 2, avgDeliveryHours: 28 },
  ],
  funnel: [
    { label: 'بانتظار الاستلام', count: 48, tone: 'warning' },
    { label: 'وصل مكتب الشحن', count: 91, tone: 'info' },
    { label: 'جاري التجهيز', count: 37, tone: 'info' },
    { label: 'مع المندوب', count: 64, tone: 'info' },
    { label: 'تم التوصيل', count: 334, tone: 'success' },
    { label: 'مرتجع / فشل', count: 41, tone: 'danger' },
  ],
  delays: [
    { id: 'DLY-01', shipmentId: 'SHP-2003', merchantName: 'متجر الأزياء', driverName: 'محمد علي', governorate: 'القاهرة', reason: 'تأخر عن موعد التسليم المتفق عليه', lateByHours: 9, severity: 'medium' },
    { id: 'DLY-02', shipmentId: 'SHP-2010', merchantName: 'هوم ديكور', driverName: 'خالد إبراهيم', governorate: 'الجيزة', reason: 'لم يتم الاستلام من التاجر في الموعد', lateByHours: 14, severity: 'high' },
    { id: 'DLY-03', shipmentId: 'SHP-2020', merchantName: 'إلكترونيات بلس', governorate: 'الدقهلية', reason: 'لم يعين مندوب بعد', lateByHours: 11, severity: 'medium' },
  ],
};

const accountingSnapshot: AccountingSnapshot = {
  closeSummary: {
    month: 'يونيو ٢٠٢٦',
    status: 'readyToClose',
    grossOrderValue: 623000,
    codCollected: 418500,
    shippingRevenue: 38250,
    returnFees: 6400,
    merchantPayouts: 361800,
    driverRemittances: 397000,
    driverEarnings: 26800,
    operatingExpenses: 18750,
    netCompanyRevenue: 25700,
    cashVariance: 1250,
  },
  budget: [
    { label: 'إيرادات الشحن', actual: 38250, budget: 35000 },
    { label: 'رسوم المرتجعات', actual: 6400, budget: 5000 },
    { label: 'أتعاب المناديب', actual: 26800, budget: 24000 },
    { label: 'مصروفات تشغيل', actual: 18750, budget: 20000 },
    { label: 'صافي الشركة', actual: 25700, budget: 22000 },
  ],
  ledger: [
    { id: 'LED-901', date: '٣٠ يونيو', account: 'خزينة التحصيل', description: 'تحصيلات مناديب', debit: 397000, credit: 0, status: 'posted' },
    { id: 'LED-902', date: '٣٠ يونيو', account: 'مستحقات التجار', description: 'مستحقات التجار', debit: 0, credit: 361800, status: 'posted' },
    { id: 'LED-903', date: '٣٠ يونيو', account: 'إيراد الشحن', description: 'إيراد شحنات الشهر', debit: 0, credit: 38250, status: 'posted' },
    { id: 'LED-904', date: '٣٠ يونيو', account: 'أتعاب المناديب', description: 'أتعاب المناديب', debit: 26800, credit: 0, status: 'pending' },
    { id: 'LED-905', date: '٣٠ يونيو', account: 'فرق التحصيل', description: 'فرق التحصيل يحتاج مراجعة', debit: 1250, credit: 0, status: 'pending' },
  ],
  checklist: [
    { id: 'CLS-1', label: 'اعتماد كل تحديثات المناديب', done: true },
    { id: 'CLS-2', label: 'مطابقة توريدات التحصيل مع المحافظ', done: false },
    { id: 'CLS-3', label: 'اعتماد تسويات التجار', done: true },
    { id: 'CLS-4', label: 'مراجعة المرتجعات ورسومها', done: false },
    { id: 'CLS-5', label: 'مراجعة حركات الحسابات النهائية', done: false },
  ],
};

export const reportsMockRepository = {
  getReports(): ReportsSnapshot {
    return reportsSnapshot;
  },
  getAccounting(): AccountingSnapshot {
    return accountingSnapshot;
  },
};



