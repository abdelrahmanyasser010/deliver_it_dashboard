import type { DashboardStats, Driver, Merchant, Shipment, ShipmentStatus } from '../../domain/logistics/entities';
import { calculateDashboardStats } from '../../domain/logistics/analytics';

interface LogisticsSnapshot {
  shipments: Shipment[];
  drivers: Driver[];
  merchants: Merchant[];
  stats: DashboardStats;
}

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

const governorates = ['القاهرة', 'الجيزة', 'الإسكندرية', 'المنصورة', 'أسيوط'];
const cities = ['مدينة نصر', 'المعادي', 'هليوبوليس', 'شبرا', 'الهرم', 'المنتزه', 'الدقي'];
const merchantNames = ['متجر الأزياء', 'إلكترونيات بلس', 'هوم ديكور', 'سبورتي', 'جمال وعناية'];
const driverNames = ['محمد علي', 'أحمد سامي', 'علي حسن', 'خالد إبراهيم', 'ياسر عمر'];
const customerNames = ['سارة محمود', 'عمرو خالد', 'منة الله أحمد', 'كريم إبراهيم', 'نهى سالم', 'طارق محمد', 'دينا علي'];

function createSeededRandom(seed: number) {
  let state = seed;

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const random = createSeededRandom(20260707);

function randomBetween(min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randomChoice<T>(items: T[]): T {
  return items[Math.floor(random() * items.length)];
}

function generateDate(daysAgo: number): string {
  const date = new Date('2026-07-07T10:00:00');
  date.setDate(date.getDate() - daysAgo);

  return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
}

const drivers: Driver[] = driverNames.map((name, index) => ({
  id: `DRV-${String(index + 1).padStart(3, '0')}`,
  name,
  phone: `0${randomBetween(10, 12)}${randomBetween(10000000, 99999999)}`,
  zone: randomChoice(governorates),
  shipmentsCount: randomBetween(5, 25),
  pendingCash: randomBetween(1000, 15000),
  deliveredToday: randomBetween(2, 12),
  status: random() > 0.2 ? 'active' : 'off',
}));

const merchants: Merchant[] = merchantNames.map((name, index) => ({
  id: `BRN-${String(index + 1).padStart(3, '0')}`,
  name,
  phone: `0${randomBetween(10, 12)}${randomBetween(10000000, 99999999)}`,
  logoUrl: '',
  shipmentsCount: randomBetween(20, 150),
  pendingSettlement: randomBetween(3000, 50000),
  totalOrderValue: randomBetween(50000, 500000),
  joinedAt: generateDate(randomBetween(30, 365)),
}));

const shipments: Shipment[] = Array.from({ length: 48 }, (_, index) => {
  const total = randomBetween(200, 2000);
  const driverIndex = randomBetween(0, drivers.length - 1);
  const merchantIndex = randomBetween(0, merchants.length - 1);
  const driver = drivers[driverIndex];
  const merchant = merchants[merchantIndex];

  return {
    id: `SHP-${String(index + 1).padStart(4, '0')}`,
    trackingNumber: `DLV202607${String(index + 1).padStart(4, '0')}`,
    customerName: randomChoice(customerNames),
    customerPhone: `0${randomBetween(10, 12)}${randomBetween(10000000, 99999999)}`,
    governorate: randomChoice(governorates),
    city: randomChoice(cities),
    address: `شارع ${randomBetween(1, 50)} بناية ${randomBetween(1, 20)}`,
    status: randomChoice(statuses),
    paymentType: random() > 0.3 ? 'cashOnDelivery' : 'prepaid',
    total,
    deliveryFee: randomBetween(25, 80),
    discount: randomBetween(0, 50),
    collectedCash: total,
    items: [{ name: 'منتج تجريبي', quantity: randomBetween(1, 3), price: total }],
    driverId: driver.id,
    driverName: driver.name,
    merchantId: merchant.id,
    merchantName: merchant.name,
    createdAt: generateDate(randomBetween(0, 14)),
    settlementStatus: random() > 0.5 ? 'settled' : 'unsettled',
  };
});

const snapshot: LogisticsSnapshot = {
  shipments,
  drivers,
  merchants,
  stats: calculateDashboardStats(shipments, drivers, merchants),
};

export const logisticsMockRepository = {
  getSnapshot(): LogisticsSnapshot {
    return snapshot;
  },
};
