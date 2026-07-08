import type {
  AdminMetrics,
  AuditLogEntry,
  MerchantApplication,
  RoleDefinition,
  SettlementRecord,
  UserAccount,
} from '../../domain/admin/entities';

const roles: RoleDefinition[] = [
  {
    role: 'superAdmin',
    label: 'مدير النظام',
    description: 'صلاحيات كاملة على المستخدمين، الصلاحيات، العمليات، والتسويات.',
    permissions: ['shipments.read', 'shipments.updateStatus', 'drivers.manage', 'merchants.review', 'settlements.manage', 'users.manage', 'audit.read'],
  },
  {
    role: 'operationsManager',
    label: 'مدير العمليات',
    description: 'إدارة الشحنات، تعيين المناديب، ومتابعة حالات التشغيل اليومية.',
    permissions: ['shipments.read', 'shipments.updateStatus', 'drivers.manage', 'merchants.review'],
  },
  {
    role: 'accountant',
    label: 'محاسب',
    description: 'متابعة المحافظ، تحصيلات المناديب، وتسويات التجار.',
    permissions: ['shipments.read', 'settlements.manage'],
  },
  {
    role: 'supportAgent',
    label: 'دعم العملاء',
    description: 'قراءة الشحنات ومساعدة التجار والعملاء بدون صلاحيات مالية.',
    permissions: ['shipments.read'],
  },
];

const users: UserAccount[] = [
  {
    id: 'USR-001',
    name: 'محمود عبد الرحمن',
    phone: '01011223344',
    email: 'admin@deliverit.local',
    role: 'superAdmin',
    status: 'active',
    city: 'القاهرة',
    lastSeenAt: 'اليوم 10:18 ص',
    createdAt: '1 يونيو 2026',
  },
  {
    id: 'USR-002',
    name: 'نور حسن',
    phone: '01099887766',
    email: 'ops@deliverit.local',
    role: 'operationsManager',
    status: 'active',
    city: 'الجيزة',
    lastSeenAt: 'اليوم 09:42 ص',
    createdAt: '3 يونيو 2026',
  },
  {
    id: 'USR-003',
    name: 'سلمى عادل',
    phone: '01122334455',
    email: 'accounts@deliverit.local',
    role: 'accountant',
    status: 'active',
    city: 'الإسكندرية',
    lastSeenAt: 'أمس 06:12 م',
    createdAt: '7 يونيو 2026',
  },
  {
    id: 'DRV-006',
    name: 'مصطفى جمال',
    phone: '01234567890',
    email: 'driver6@deliverit.local',
    role: 'driver',
    status: 'suspended',
    city: 'القاهرة',
    lastSeenAt: 'منذ 3 أيام',
    createdAt: '12 يونيو 2026',
  },
  {
    id: 'BRN-009',
    name: 'بيوتي ستور',
    phone: '01066778899',
    email: 'beauty@example.com',
    role: 'merchant',
    status: 'pendingReview',
    city: 'المنصورة',
    lastSeenAt: 'لم يسجل الدخول',
    createdAt: '28 يونيو 2026',
  },
];

const applications: MerchantApplication[] = [
  {
    id: 'APP-1024',
    brandName: 'Urban Wear',
    activity: 'ملابس وإكسسوارات',
    contactName: 'أحمد حسن',
    phone: '01001112233',
    email: 'urban@example.com',
    city: 'القاهرة',
    address: '15 شارع التحرير، الدقي',
    averageOrders: 85,
    status: 'pendingReview',
    submittedAt: 'اليوم 09:10 ص',
    notes: 'لديهم مخزن ثابت ونقطة استلام يومية.',
  },
  {
    id: 'APP-1023',
    brandName: 'Home Picks',
    activity: 'ديكور منزلي',
    contactName: 'منى سعيد',
    phone: '01155667788',
    email: 'home@example.com',
    city: 'الإسكندرية',
    address: 'شارع جمال عبد الناصر، المنتزه',
    averageOrders: 42,
    status: 'approved',
    submittedAt: 'أمس 04:35 م',
  },
  {
    id: 'APP-1022',
    brandName: 'Fast Gadgets',
    activity: 'إلكترونيات',
    contactName: 'كريم فؤاد',
    phone: '01233445566',
    email: 'gadgets@example.com',
    city: 'الجيزة',
    address: 'شارع الهرم',
    averageOrders: 120,
    status: 'rejected',
    submittedAt: '27 يونيو 2026',
    notes: 'بيانات تجارية غير مكتملة.',
  },
];

const settlements: SettlementRecord[] = [
  {
    id: 'SET-501',
    type: 'merchantPayout',
    ownerId: 'BRN-001',
    ownerName: 'متجر الأزياء',
    amount: 42850,
    method: 'تحويل بنكي',
    status: 'pending',
    requestedAt: 'اليوم 11:00 ص',
    reference: 'دفعة أسبوعية',
  },
  {
    id: 'SET-502',
    type: 'driverRemittance',
    ownerId: 'DRV-002',
    ownerName: 'أحمد سامي',
    amount: 13750,
    method: 'خزينة الشركة',
    status: 'approved',
    requestedAt: 'أمس 07:15 م',
    approvedBy: 'سلمى عادل',
  },
  {
    id: 'SET-503',
    type: 'merchantPayout',
    ownerId: 'BRN-003',
    ownerName: 'هوم ديكور',
    amount: 18900,
    method: 'Instapay',
    status: 'paid',
    requestedAt: '25 يونيو 2026',
    approvedBy: 'محمود عبد الرحمن',
  },
];

const auditLogs: AuditLogEntry[] = [
  {
    id: 'AUD-9001',
    actorName: 'نور حسن',
    actorRole: 'operationsManager',
    action: 'تعيين شحنات لمندوب',
    target: 'DRV-002 / 14 شحنة',
    severity: 'info',
    createdAt: 'اليوم 10:22 ص',
    ipAddress: '192.168.1.24',
  },
  {
    id: 'AUD-9002',
    actorName: 'سلمى عادل',
    actorRole: 'accountant',
    action: 'اعتماد توريد كاش',
    target: 'SET-502',
    severity: 'info',
    createdAt: 'أمس 07:40 م',
    ipAddress: '192.168.1.31',
  },
  {
    id: 'AUD-9003',
    actorName: 'محمود عبد الرحمن',
    actorRole: 'superAdmin',
    action: 'إيقاف حساب مندوب',
    target: 'DRV-006',
    severity: 'warning',
    createdAt: '27 يونيو 2026',
    ipAddress: '192.168.1.10',
  },
  {
    id: 'AUD-9004',
    actorName: 'النظام',
    actorRole: 'superAdmin',
    action: 'محاولة دخول فاشلة متكررة',
    target: 'driver6@deliverit.local',
    severity: 'critical',
    createdAt: '26 يونيو 2026',
    ipAddress: '41.33.12.90',
  },
];

export const adminMockRepository = {
  getRoles(): RoleDefinition[] {
    return roles;
  },
  getUsers(): UserAccount[] {
    return users;
  },
  getApplications(): MerchantApplication[] {
    return applications;
  },
  getSettlements(): SettlementRecord[] {
    return settlements;
  },
  getAuditLogs(): AuditLogEntry[] {
    return auditLogs;
  },
  getMetrics(): AdminMetrics {
    return {
      activeUsers: users.filter((user) => user.status === 'active').length,
      pendingApplications: applications.filter((application) => application.status === 'pendingReview').length,
      pendingSettlements: settlements.filter((settlement) => settlement.status === 'pending').length,
      criticalEvents: auditLogs.filter((log) => log.severity === 'critical').length,
    };
  },
};
