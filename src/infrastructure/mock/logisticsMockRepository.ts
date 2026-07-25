import { calculateDashboardStats } from '../../domain/logistics/analytics';
import type {
  Driver,
  Merchant,
  Shipment,
  ShipmentFinancialStatus,
  PaymentType,
  ShipmentPriority,
  ShipmentStatus,
  ShipmentTaskStatus,
} from '../../domain/logistics/entities';
import type { LogisticsRepository, LogisticsSnapshot } from '../../domain/logistics/repository';

const statuses: ShipmentStatus[] = [
  'receivedAtOffice',
  'deliveredToDriver',
  'inTransit',
  'delivered',
  'postponed',
  'failedToDeliver',
  'returned',
  'readyToShip',
];

const governorates = ['القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'أسيوط'];
const cities = ['مدينة نصر', 'المعادي', 'هليوبوليس', 'شبرا', 'الهرم', 'المنتزه', 'الدقي'];
const merchantNames = ['متجر الأزياء', 'إلكترونيات بلس', 'هوم ديكور', 'سبورتي', 'جمال وعناية'];
const customerNames = ['سارة محمود', 'عمرو خالد', 'منة الله أحمد', 'كريم إبراهيم', 'نهى سالم', 'طارق محمد', 'دينا علي'];

function createSeededRandom(seed: number) {
  let state = seed;

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const random = createSeededRandom(20260720);
const randomBetween = (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min;
const randomChoice = <T,>(items: readonly T[]): T => items[Math.floor(random() * items.length)];

function relativeIso({ days = 0, hours = 0, minutes = 0 }: { days?: number; hours?: number; minutes?: number }) {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setDate(date.getDate() + days);
  date.setHours(date.getHours() + hours);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function joinedDate(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
}

const drivers: Driver[] = [
  { id: 'DRV-001', name: 'محمد علي', phone: '01011223344', zone: 'مدينة نصر', shipmentsCount: 8, pendingCash: 12800, deliveredToday: 9, status: 'active', availability: 'busy', capacity: 12, activeLoad: 8, shiftEndsAt: relativeIso({ hours: 5 }), lastLocationUpdateAt: relativeIso({ minutes: -3 }), successRate: 94 },
  { id: 'DRV-002', name: 'أحمد سامي', phone: '01122334455', zone: 'القاهرة الجديدة', shipmentsCount: 5, pendingCash: 6200, deliveredToday: 7, status: 'active', availability: 'available', capacity: 10, activeLoad: 5, shiftEndsAt: relativeIso({ hours: 6 }), lastLocationUpdateAt: relativeIso({ minutes: -7 }), successRate: 90 },
  { id: 'DRV-003', name: 'علي حسن', phone: '01233445566', zone: 'الإسكندرية', shipmentsCount: 0, pendingCash: 0, deliveredToday: 0, status: 'off', availability: 'offline', capacity: 9, activeLoad: 0, shiftEndsAt: relativeIso({ hours: 2 }), lastLocationUpdateAt: relativeIso({ hours: -9 }), successRate: 86 },
  { id: 'DRV-004', name: 'خالد إبراهيم', phone: '01044556677', zone: 'الهرم', shipmentsCount: 7, pendingCash: 17400, deliveredToday: 6, status: 'active', availability: 'busy', capacity: 9, activeLoad: 7, shiftEndsAt: relativeIso({ hours: 4 }), lastLocationUpdateAt: relativeIso({ minutes: -18 }), successRate: 82 },
  { id: 'DRV-005', name: 'ياسر عمر', phone: '01155667788', zone: 'الدقي', shipmentsCount: 4, pendingCash: 3900, deliveredToday: 8, status: 'active', availability: 'available', capacity: 8, activeLoad: 4, shiftEndsAt: relativeIso({ hours: 5 }), lastLocationUpdateAt: relativeIso({ minutes: -5 }), successRate: 91 },
];

const merchants: Merchant[] = merchantNames.map((name, index) => ({
  id: `BRN-${String(index + 1).padStart(3, '0')}`,
  name,
  phone: `010${String(11223344 + index * 10101)}`,
  logoUrl: '',
  shipmentsCount: 44 + index * 21,
  pendingSettlement: 8500 + index * 7700,
  totalOrderValue: 92000 + index * 68400,
  joinedAt: joinedDate(90 + index * 48),
  branchName: index % 2 === 0 ? 'الفرع الرئيسي' : 'مخزن القاهرة',
  settlementCycle: index % 3 === 0 ? 'daily' : index % 3 === 1 ? 'twiceWeekly' : 'weekly',
  priorityLevel: index < 2 ? 'priority' : 'standard',
}));

interface ShipmentSeed {
  id: string;
  status: ShipmentStatus;
  taskStatus: ShipmentTaskStatus;
  financialStatus: ShipmentFinancialStatus;
  priority: ShipmentPriority;
  createdAt: string;
  lastUpdatedAt: string;
  statusChangedAt: string;
  expectedDeliveryAt?: string;
  driverIndex?: number;
  total: number;
  collectedCash?: number;
  remittedCash?: number;
  attemptCount?: number;
  exceptionReason?: string;
  paymentType?: PaymentType;
}

const scenarioSeeds: ShipmentSeed[] = [
  { id: 'SHP-0001', status: 'receivedAtOffice', taskStatus: 'needsDriverAssignment', financialStatus: 'awaitingCollection', priority: 'urgent', createdAt: relativeIso({ hours: -7 }), lastUpdatedAt: relativeIso({ hours: -5 }), statusChangedAt: relativeIso({ hours: -5 }), expectedDeliveryAt: relativeIso({ hours: -1 }), total: 1850, exceptionReason: 'بلا مندوب وتجاوزت موعد التوزيع الداخلي' },
  { id: 'SHP-0002', status: 'inTransit', taskStatus: 'needsStatusApproval', financialStatus: 'awaitingCollection', priority: 'high', createdAt: relativeIso({ days: -1, hours: -4 }), lastUpdatedAt: relativeIso({ minutes: -24 }), statusChangedAt: relativeIso({ hours: -4 }), expectedDeliveryAt: relativeIso({ hours: 2 }), driverIndex: 0, total: 920, exceptionReason: 'المندوب أرسل إثبات تسليم ويحتاج اعتمادًا' },
  { id: 'SHP-0003', status: 'failedToDeliver', taskStatus: 'needsCustomerService', financialStatus: 'awaitingCollection', priority: 'high', createdAt: relativeIso({ days: -2 }), lastUpdatedAt: relativeIso({ hours: -3 }), statusChangedAt: relativeIso({ hours: -3 }), expectedDeliveryAt: relativeIso({ hours: -12 }), driverIndex: 3, total: 1350, attemptCount: 2, exceptionReason: 'العميل لا يرد بعد محاولتين' },
  { id: 'SHP-0004', status: 'returned', taskStatus: 'needsReturnProcessing', financialStatus: 'notDue', priority: 'urgent', createdAt: relativeIso({ days: -4 }), lastUpdatedAt: relativeIso({ hours: -9 }), statusChangedAt: relativeIso({ hours: -9 }), driverIndex: 4, total: 760, attemptCount: 2, exceptionReason: 'مرتجع ينتظر التسليم للتاجر' },
  { id: 'SHP-0005', status: 'delivered', taskStatus: 'needsFinancialReview', financialStatus: 'discrepancy', priority: 'urgent', createdAt: relativeIso({ days: -1 }), lastUpdatedAt: relativeIso({ minutes: -42 }), statusChangedAt: relativeIso({ minutes: -42 }), driverIndex: 0, total: 2200, collectedCash: 2000, remittedCash: 0, attemptCount: 1, exceptionReason: 'فرق تحصيل ٢٠٠ ج.م عن المبلغ المتوقع' },
  { id: 'SHP-0006', status: 'delivered', taskStatus: 'none', financialStatus: 'remitted', priority: 'normal', paymentType: 'cashOnDelivery', createdAt: relativeIso({ days: -1, hours: -2 }), lastUpdatedAt: relativeIso({ hours: -1 }), statusChangedAt: relativeIso({ hours: -1 }), driverIndex: 1, total: 640, collectedCash: 640, remittedCash: 640, attemptCount: 1 },
  { id: 'SHP-0007', status: 'readyToShip', taskStatus: 'needsPickup', financialStatus: 'notDue', priority: 'high', createdAt: relativeIso({ minutes: -55 }), lastUpdatedAt: relativeIso({ minutes: -55 }), statusChangedAt: relativeIso({ minutes: -55 }), expectedDeliveryAt: relativeIso({ days: 1 }), total: 410 },
  { id: 'SHP-0008', status: 'postponed', taskStatus: 'needsCustomerService', financialStatus: 'awaitingCollection', priority: 'normal', createdAt: relativeIso({ days: -2 }), lastUpdatedAt: relativeIso({ hours: -2 }), statusChangedAt: relativeIso({ hours: -2 }), expectedDeliveryAt: relativeIso({ days: 1 }), driverIndex: 4, total: 1090, attemptCount: 1, exceptionReason: 'مؤجلة بطلب العميل إلى الغد' },
  { id: 'SHP-0009', status: 'deliveredToDriver', taskStatus: 'none', financialStatus: 'awaitingCollection', priority: 'normal', createdAt: relativeIso({ hours: -5 }), lastUpdatedAt: relativeIso({ hours: -2 }), statusChangedAt: relativeIso({ hours: -2 }), expectedDeliveryAt: relativeIso({ hours: 5 }), driverIndex: 2, total: 570 },
  { id: 'SHP-0010', status: 'delivered', taskStatus: 'none', financialStatus: 'inSettlement', priority: 'high', createdAt: relativeIso({ hours: -8 }), lastUpdatedAt: relativeIso({ minutes: -15 }), statusChangedAt: relativeIso({ minutes: -15 }), driverIndex: 1, total: 3120, collectedCash: 3120, remittedCash: 3120, attemptCount: 1 },
];

function buildShipment(seed: ShipmentSeed, index: number): Shipment {
  const merchant = merchants[index % merchants.length];
  const driver = seed.driverIndex === undefined ? undefined : drivers[seed.driverIndex % drivers.length];
  const deliveryFee = randomBetween(35, 85);
  const discount = randomChoice([0, 0, 0, 20, 35]);
  const paymentType = seed.paymentType ?? (index % 5 === 0 ? 'prepaid' as const : 'cashOnDelivery' as const);
  const expectedCollection = paymentType === 'cashOnDelivery' ? seed.total : 0;

  return {
    id: seed.id,
    trackingNumber: `DLV${seed.id.replace(/\D/g, '').padStart(8, '0')}`,
    customerName: customerNames[index % customerNames.length],
    customerPhone: `01${index % 3}${String(10000000 + index * 17291).slice(-8)}`,
    governorate: governorates[index % governorates.length],
    city: cities[index % cities.length],
    address: `شارع ${randomBetween(1, 50)}، عمارة ${randomBetween(1, 20)}، الدور ${randomBetween(1, 8)}`,
    status: seed.status,
    taskStatus: seed.taskStatus,
    financialStatus: paymentType === 'prepaid' ? 'notDue' : seed.financialStatus,
    priority: seed.priority,
    paymentType,
    total: seed.total,
    deliveryFee,
    discount,
    collectedCash: paymentType === 'prepaid' ? 0 : seed.collectedCash ?? 0,
    expectedCollection,
    remittedCash: paymentType === 'prepaid' ? 0 : seed.remittedCash ?? 0,
    items: seed.id === 'SHP-0002'
      ? [
          { id: `${seed.id}-I1`, name: 'قميص قطني', quantity: 1, price: 500 },
          { id: `${seed.id}-I2`, name: 'بنطلون جينز', quantity: 1, price: 280 },
          { id: `${seed.id}-I3`, name: 'حزام', quantity: 1, price: Math.max(40, seed.total - deliveryFee + discount - 780) },
        ]
      : [{ id: `${seed.id}-I1`, name: index % 2 === 0 ? 'منتج رئيسي' : 'طلب متجر', quantity: randomBetween(1, 3), price: seed.total - deliveryFee + discount }],
    driverId: driver?.id,
    driverName: driver?.name,
    merchantId: merchant.id,
    merchantName: merchant.name,
    createdAt: seed.createdAt,
    lastUpdatedAt: seed.lastUpdatedAt,
    statusChangedAt: seed.statusChangedAt,
    expectedDeliveryAt: seed.expectedDeliveryAt,
    attemptCount: seed.attemptCount ?? 0,
    exceptionReason: seed.exceptionReason,
    settlementStatus: seed.financialStatus === 'settled' ? 'settled' : 'unsettled',
  };
}

const generatedSeeds: ShipmentSeed[] = Array.from({ length: 38 }, (_, offset) => {
  const index = offset + scenarioSeeds.length;
  const status = randomChoice(statuses);
  const driverIndex = ['readyToShip', 'receivedAtOffice'].includes(status) && random() > 0.5 ? undefined : randomBetween(0, drivers.length - 1);
  const delivered = status === 'delivered';
  const returned = status === 'returned';
  const paymentExpected = randomBetween(250, 2400);
  const createdDaysAgo = randomBetween(0, 10);
  const updateHoursAgo = randomBetween(1, 30);
  const taskStatus: ShipmentTaskStatus = status === 'receivedAtOffice' && driverIndex === undefined
    ? 'needsDriverAssignment'
    : returned
      ? 'needsReturnProcessing'
      : status === 'failedToDeliver'
        ? 'needsCustomerService'
        : 'none';
  const financialStatus: ShipmentFinancialStatus = delivered ? randomChoice(['collected', 'remitted', 'inSettlement', 'settled'] as const) : 'awaitingCollection';
  const collectedCash = delivered ? paymentExpected : 0;
  const remittedCash = delivered && ['remitted', 'inSettlement', 'settled'].includes(financialStatus) ? collectedCash : 0;

  return {
    id: `SHP-${String(index + 1).padStart(4, '0')}`,
    status,
    taskStatus,
    financialStatus,
    priority: randomChoice(['normal', 'normal', 'normal', 'high'] as const),
    createdAt: relativeIso({ days: -createdDaysAgo, hours: -randomBetween(0, 12) }),
    lastUpdatedAt: relativeIso({ hours: -updateHoursAgo }),
    statusChangedAt: relativeIso({ hours: -updateHoursAgo }),
    expectedDeliveryAt: delivered || returned ? undefined : relativeIso({ days: randomChoice([-1, 0, 1] as const), hours: randomBetween(-5, 12) }),
    driverIndex,
    total: paymentExpected,
    collectedCash,
    remittedCash,
    attemptCount: ['failedToDeliver', 'postponed', 'returned'].includes(status) ? randomBetween(1, 3) : delivered ? 1 : 0,
    exceptionReason: taskStatus === 'needsDriverAssignment' ? 'تنتظر تعيين مندوب توصيل' : taskStatus === 'needsReturnProcessing' ? 'تحتاج استكمال دورة المرتجع' : undefined,
  };
});

const shipments = [...scenarioSeeds, ...generatedSeeds].map(buildShipment);

const snapshot: LogisticsSnapshot = {
  shipments,
  drivers,
  merchants,
  stats: calculateDashboardStats(shipments, drivers, merchants),
};

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const logisticsMockRepository: LogisticsRepository = {
  async getSnapshot(): Promise<LogisticsSnapshot> {
    await wait(240);
    return structuredClone(snapshot);
  },
};
