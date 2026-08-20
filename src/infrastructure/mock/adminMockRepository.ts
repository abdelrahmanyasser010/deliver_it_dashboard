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
    role: 'superAdmin', label: 'مدير النظام', systemRole: true, sensitivity: 'critical',
    description: 'إدارة المنصة والهوية والصلاحيات مع صلاحيات تشغيل ومالية كاملة.',
    permissions: ['shipments.read','shipments.assignDriver','shipments.confirmIntake','driverUpdates.review','driverUpdates.approve','driverUpdates.reject','returns.receive','returns.assign','exceptions.create','drivers.read','drivers.manage','merchants.read','merchants.review','settlements.read','settlements.prepare','settlements.review','settlements.approve','settlements.pay','remittances.read','remittances.reconcile','remittances.approve','journal.read','journal.post','journal.reverse','accounting.periodClose','accounting.periodReopen','reports.read','users.manage','audit.read'],
  },
  {
    role: 'operationsManager', label: 'مدير العمليات', systemRole: true, sensitivity: 'high',
    description: 'إدارة دورة التشغيل واعتماد تقارير المناديب والاستثناءات بدون دفع تسويات.',
    permissions: ['shipments.read','shipments.assignDriver','shipments.confirmIntake','driverUpdates.review','driverUpdates.approve','driverUpdates.reject','returns.receive','returns.assign','exceptions.create','drivers.read','drivers.manage','merchants.read','merchants.review','reports.read'],
  },
  {
    role: 'dispatcher', label: 'مسؤول التوزيع', systemRole: true, sensitivity: 'normal',
    description: 'تجهيز مجموعات التوصيل وإسناد الشحنات للمناديب داخل النطاق المسموح.',
    permissions: ['shipments.read','shipments.assignDriver','drivers.read','reports.read'],
  },
  {
    role: 'warehouse', label: 'مسؤول المخزن', systemRole: true, sensitivity: 'normal',
    description: 'تأكيد دخول الشحنات بالباركود واستلام المرتجعات بالمخزن.',
    permissions: ['shipments.read','shipments.confirmIntake','returns.receive'],
  },
  {
    role: 'accountant', label: 'محاسب', systemRole: true, sensitivity: 'critical',
    description: 'مطابقة التحصيلات وإعداد ومراجعة التسويات والقيود المالية.',
    permissions: ['shipments.read','merchants.read','settlements.read','settlements.prepare','settlements.review','settlements.approve','remittances.read','remittances.reconcile','remittances.approve','journal.read','journal.post','reports.read'],
  },
  {
    role: 'supportAgent', label: 'خدمة العملاء', systemRole: true, sensitivity: 'normal',
    description: 'متابعة الشحنات والاستثناءات والمحادثات بدون صلاحيات مالية أو تغيير حالة عام.',
    permissions: ['shipments.read','exceptions.create','merchants.read'],
  },
  {
    role: 'auditor', label: 'مراجع / قراءة فقط', systemRole: true, sensitivity: 'high',
    description: 'قراءة التقارير والقيود وسجل التدقيق بدون صلاحيات تنفيذية.',
    permissions: ['shipments.read','merchants.read','settlements.read','remittances.read','journal.read','reports.read','audit.read'],
  },
];

const users: UserAccount[] = [
  { id: 'USR-001', name: 'محمود عبد الرحمن', phone: '01011223344', email: 'admin@deliverit.local', role: 'superAdmin', status: 'active', city: 'القاهرة', lastSeenAt: 'اليوم 10:18 ص', lastLoginAt: 'اليوم 08:51 ص', createdAt: '1 يونيو 2026', scopeType: 'tenant', scopeLabel: 'كل الشركة', jobTitle: 'مدير النظام', mfaEnabled: true, activeSessions: 2 },
  { id: 'USR-002', name: 'نور حسن', phone: '01099887766', email: 'ops@deliverit.local', role: 'operationsManager', status: 'active', city: 'الجيزة', lastSeenAt: 'اليوم 09:42 ص', lastLoginAt: 'اليوم 08:40 ص', createdAt: '3 يونيو 2026', scopeType: 'tenant', scopeLabel: 'كل التشغيل', jobTitle: 'مدير العمليات', mfaEnabled: true, activeSessions: 1 },
  { id: 'USR-003', name: 'سلمى عادل', phone: '01122334455', email: 'accounts@deliverit.local', role: 'accountant', status: 'active', city: 'الإسكندرية', lastSeenAt: 'أمس 06:12 م', lastLoginAt: 'أمس 09:03 ص', createdAt: '7 يونيو 2026', scopeType: 'tenant', scopeLabel: 'كل الشركة', jobTitle: 'محاسب أول', mfaEnabled: true, activeSessions: 1 },
  { id: 'USR-004', name: 'سارة محمد', phone: '01055667788', email: 'support@deliverit.local', role: 'supportAgent', status: 'invited', city: 'القاهرة', lastSeenAt: 'لم يسجل الدخول', createdAt: '16 أغسطس 2026', scopeType: 'branch', scopeLabel: 'فرع القاهرة', jobTitle: 'خدمة عملاء', mfaEnabled: false, activeSessions: 0 },
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
    action: 'اعتماد توريد تحصيل',
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

