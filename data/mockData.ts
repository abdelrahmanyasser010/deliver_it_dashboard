// ============================================================
//  EduBridge Mock Data — Realistic Arabic Demo Data
//  Covers: Teachers, Students, Parents, Sections, Behavior,
//          Attendance, Bus Routes, Messages
// ============================================================

// ── Types ────────────────────────────────────────────────────

export interface SchoolSection {
  id: string;
  gradeLevelId?: string;
  name: string;
  gradeLevel: string;
  roomNumber: string;
  capacity: number;
  enrolledCount: number;
  classTeacherId: string;
  classTeacherName: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  weeklyPeriods: number;
  icon: string;
  color: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarInitials: string;
  avatarColor: string;
  specialization: string;
  assignedSections: string[];
  assignedSubjects: string[];
  kpiScore: number;
  lessonsThisWeek: number;
  notesCount: number;
  activeStatus: "active" | "inactive";
}

export interface Parent {
  id: string;
  centralUserId?: string;
  nationalId: string;
  name: string;
  phone: string;
  email: string;
  residentialAreaId?: string;
  childrenIds: string[];
}

export interface Student {
  id: string;
  studentCode: string;
  name: string;
  avatarInitials: string;
  avatarColor: string;
  gradeLevel: string;
  sectionId: string;
  sectionName: string;
  parentId: string;
  parentName: string;
  residentialAreaId?: string;
  busRouteId?: string;
  academicScore: number;
  attendanceRate: number;
  riskLevel: "low" | "medium" | "high";
}

export interface BehaviorNote {
  id: string;
  studentId: string;
  studentName: string;
  studentSection: string;
  teacherId: string;
  teacherName: string;
  title: string;
  excerpt: string;
  description: string;
  severityLabel: "منخفض" | "متوسط" | "عالي";
  statusLabel: "مفتوحة" | "قيد المعالجة" | "محلولة";
  date: string;
  hasRecommendation: boolean;
}

export interface AttendanceSummary {
  date: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  sectionBreakdown: { sectionName: string; absent: number; rate: number }[];
}

export interface BusRoute {
  id: string;
  routeName: string;
  plateNumber: string;
  driverName: string;
  driverPhone: string;
  supervisorName: string;
  capacity?: number;
  status: "in_school" | "on_route" | "arrived";
  assignedStudentsCount: number;
  estimatedArrival?: string;
}

export interface BroadcastMessage {
  id: string;
  title: string;
  body: string;
  target: string;
  sentBy: string;
  date: string;
  type: "تعميم" | "تنبيه" | "تهنئة";
  reachCount: number;
}

// ── Data ─────────────────────────────────────────────────────

export const sections: SchoolSection[] = [
  { id: "s1", name: "الصف الخامس / شعبة أ", gradeLevel: "الصف الخامس", roomNumber: "A201", capacity: 35, enrolledCount: 33, classTeacherId: "t1", classTeacherName: "الأستاذة نورة الشمري" },
  { id: "s2", name: "الصف الخامس / شعبة ب", gradeLevel: "الصف الخامس", roomNumber: "A202", capacity: 35, enrolledCount: 31, classTeacherId: "t2", classTeacherName: "الأستاذ سامي العتيبي" },
  { id: "s3", name: "الصف السادس / شعبة أ", gradeLevel: "الصف السادس", roomNumber: "B101", capacity: 35, enrolledCount: 34, classTeacherId: "t3", classTeacherName: "الأستاذة ريم الحارثي" },
  { id: "s4", name: "الصف السادس / شعبة ب", gradeLevel: "الصف السادس", roomNumber: "B102", capacity: 35, enrolledCount: 29, classTeacherId: "t4", classTeacherName: "الأستاذ خالد الزهراني" },
  { id: "s5", name: "الصف الرابع / شعبة أ", gradeLevel: "الصف الرابع", roomNumber: "C101", capacity: 35, enrolledCount: 32, classTeacherId: "t5", classTeacherName: "الأستاذة منى القحطاني" },
  { id: "s6", name: "الصف الرابع / شعبة ب", gradeLevel: "الصف الرابع", roomNumber: "C102", capacity: 35, enrolledCount: 30, classTeacherId: "t6", classTeacherName: "الأستاذ عمر السبيعي" },
];

export const subjects: Subject[] = [
  { id: "sub1", name: "الرياضيات", code: "MATH101", weeklyPeriods: 6, icon: "📐", color: "#176B9A" },
  { id: "sub2", name: "اللغة العربية", code: "ARAB101", weeklyPeriods: 7, icon: "📖", color: "#7CC341" },
  { id: "sub3", name: "العلوم", code: "SCI101", weeklyPeriods: 5, icon: "🔬", color: "#8B5CF6" },
  { id: "sub4", name: "اللغة الإنجليزية", code: "ENG101", weeklyPeriods: 5, icon: "🌐", color: "#F59E0B" },
  { id: "sub5", name: "التربية الإسلامية", code: "ISL101", weeklyPeriods: 4, icon: "☪️", color: "#10B981" },
  { id: "sub6", name: "التربية الاجتماعية", code: "SOC101", weeklyPeriods: 3, icon: "🌍", color: "#EC4899" },
  { id: "sub7", name: "التربية البدنية", code: "PE101", weeklyPeriods: 2, icon: "⚽", color: "#EF4444" },
  { id: "sub8", name: "الحاسوب", code: "COMP101", weeklyPeriods: 2, icon: "💻", color: "#6B7280" },
];

export const teachers: Teacher[] = [
  { id: "t1", name: "نورة خالد الشمري", email: "noura@edubridge.sa", phone: "0501234567", avatarInitials: "نش", avatarColor: "#7CC341", specialization: "الرياضيات", assignedSections: ["s1", "s3"], assignedSubjects: ["sub1"], kpiScore: 98, lessonsThisWeek: 12, notesCount: 5, activeStatus: "active" },
  { id: "t2", name: "سامي عبدالله العتيبي", email: "sami@edubridge.sa", phone: "0502345678", avatarInitials: "سع", avatarColor: "#176B9A", specialization: "اللغة العربية", assignedSections: ["s2", "s4"], assignedSubjects: ["sub2"], kpiScore: 94, lessonsThisWeek: 14, notesCount: 8, activeStatus: "active" },
  { id: "t3", name: "ريم محمد الحارثي", email: "reem@edubridge.sa", phone: "0503456789", avatarInitials: "رح", avatarColor: "#8B5CF6", specialization: "العلوم", assignedSections: ["s3", "s5"], assignedSubjects: ["sub3"], kpiScore: 99, lessonsThisWeek: 10, notesCount: 2, activeStatus: "active" },
  { id: "t4", name: "خالد فهد الزهراني", email: "khalid@edubridge.sa", phone: "0504567890", avatarInitials: "خز", avatarColor: "#F59E0B", specialization: "اللغة الإنجليزية", assignedSections: ["s1", "s2", "s4"], assignedSubjects: ["sub4"], kpiScore: 87, lessonsThisWeek: 15, notesCount: 12, activeStatus: "active" },
  { id: "t5", name: "منى سعد القحطاني", email: "mona@edubridge.sa", phone: "0505678901", avatarInitials: "مق", avatarColor: "#10B981", specialization: "التربية الإسلامية", assignedSections: ["s5", "s6"], assignedSubjects: ["sub5"], kpiScore: 96, lessonsThisWeek: 8, notesCount: 1, activeStatus: "active" },
  { id: "t6", name: "عمر راشد السبيعي", email: "omar@edubridge.sa", phone: "0506789012", avatarInitials: "عس", avatarColor: "#EC4899", specialization: "التربية البدنية", assignedSections: ["s1", "s2", "s3", "s4", "s5", "s6"], assignedSubjects: ["sub7"], kpiScore: 91, lessonsThisWeek: 12, notesCount: 7, activeStatus: "active" },
  { id: "t7", name: "هند علي المطيري", email: "hind@edubridge.sa", phone: "0507890123", avatarInitials: "هم", avatarColor: "#EF4444", specialization: "التربية الاجتماعية", assignedSections: ["s1", "s2", "s3"], assignedSubjects: ["sub6"], kpiScore: 78, lessonsThisWeek: 6, notesCount: 3, activeStatus: "inactive" },
  { id: "t8", name: "يوسف ناصر البلوي", email: "yousef@edubridge.sa", phone: "0508901234", avatarInitials: "يب", avatarColor: "#6B7280", specialization: "الحاسوب", assignedSections: ["s3", "s4", "s5", "s6"], assignedSubjects: ["sub8"], kpiScore: 93, lessonsThisWeek: 8, notesCount: 4, activeStatus: "active" },
];

export const students: Student[] = [
  { id: "st1", studentCode: "STU-10021", name: "أحمد محمد الغامدي", avatarInitials: "أغ", avatarColor: "#176B9A", gradeLevel: "الصف الخامس", sectionId: "s1", sectionName: "الصف الخامس / شعبة أ", parentId: "p1", parentName: "محمد الغامدي", busRouteId: "b1", academicScore: 92, attendanceRate: 97, riskLevel: "low" },
  { id: "st2", studentCode: "STU-10022", name: "سارة عبدالله المالكي", avatarInitials: "سم", avatarColor: "#7CC341", gradeLevel: "الصف الخامس", sectionId: "s1", sectionName: "الصف الخامس / شعبة أ", parentId: "p2", parentName: "عبدالله المالكي", academicScore: 98, attendanceRate: 100, riskLevel: "low" },
  { id: "st3", studentCode: "STU-10023", name: "فيصل سعد الدوسري", avatarInitials: "فد", avatarColor: "#EF4444", gradeLevel: "الصف الخامس", sectionId: "s2", sectionName: "الصف الخامس / شعبة ب", parentId: "p3", parentName: "سعد الدوسري", busRouteId: "b2", academicScore: 61, attendanceRate: 74, riskLevel: "high" },
  { id: "st4", studentCode: "STU-10024", name: "لينا خالد الحربي", avatarInitials: "لح", avatarColor: "#8B5CF6", gradeLevel: "الصف الخامس", sectionId: "s2", sectionName: "الصف الخامس / شعبة ب", parentId: "p4", parentName: "خالد الحربي", academicScore: 85, attendanceRate: 93, riskLevel: "low" },
  { id: "st5", studentCode: "STU-10025", name: "تركي ناصر القرني", avatarInitials: "تق", avatarColor: "#F59E0B", gradeLevel: "الصف السادس", sectionId: "s3", sectionName: "الصف السادس / شعبة أ", parentId: "p5", parentName: "ناصر القرني", busRouteId: "b1", academicScore: 77, attendanceRate: 88, riskLevel: "medium" },
  { id: "st6", studentCode: "STU-10026", name: "نوف عمر العنزي", avatarInitials: "نع", avatarColor: "#10B981", gradeLevel: "الصف السادس", sectionId: "s3", sectionName: "الصف السادس / شعبة أ", parentId: "p6", parentName: "عمر العنزي", academicScore: 94, attendanceRate: 99, riskLevel: "low" },
  { id: "st7", studentCode: "STU-10027", name: "راشد إبراهيم الشهري", avatarInitials: "رش", avatarColor: "#EC4899", gradeLevel: "الصف السادس", sectionId: "s4", sectionName: "الصف السادس / شعبة ب", parentId: "p7", parentName: "إبراهيم الشهري", busRouteId: "b3", academicScore: 55, attendanceRate: 69, riskLevel: "high" },
  { id: "st8", studentCode: "STU-10028", name: "دانا فهد السلمي", avatarInitials: "دس", avatarColor: "#176B9A", gradeLevel: "الصف الرابع", sectionId: "s5", sectionName: "الصف الرابع / شعبة أ", parentId: "p8", parentName: "فهد السلمي", academicScore: 89, attendanceRate: 95, riskLevel: "low" },
  { id: "st9", studentCode: "STU-10029", name: "بدر عليّ المطيري", avatarInitials: "بم", avatarColor: "#7CC341", gradeLevel: "الصف الرابع", sectionId: "s6", sectionName: "الصف الرابع / شعبة ب", parentId: "p9", parentName: "علي المطيري", busRouteId: "b2", academicScore: 73, attendanceRate: 82, riskLevel: "medium" },
  { id: "st10", studentCode: "STU-10030", name: "ميس صالح الجهني", avatarInitials: "مج", avatarColor: "#8B5CF6", gradeLevel: "الصف الرابع", sectionId: "s5", sectionName: "الصف الرابع / شعبة أ", parentId: "p2", parentName: "عبدالله المالكي", academicScore: 96, attendanceRate: 100, riskLevel: "low" },
];

export const behaviorNotes: BehaviorNote[] = [
  { id: "bn1", studentId: "st3", studentName: "فيصل سعد الدوسري", studentSection: "الصف الخامس / شعبة ب", teacherId: "t2", teacherName: "سامي العتيبي", title: "تصرف عدواني تجاه زملائه", excerpt: "رصد المعلم حادثة شجار في الفسحة أسفرت عن إيذاء زميل.", description: "قام الطالب فيصل بمشادة كلامية ثم جسدية مع زميله خلال الفسحة وأسفر ذلك عن كدمة بسيطة للزميل. تم الفصل فورياً وأُبلغ مشرف الدور.", severityLabel: "عالي", statusLabel: "قيد المعالجة", date: "2026-07-06", hasRecommendation: true },
  { id: "bn2", studentId: "st7", studentName: "راشد إبراهيم الشهري", studentSection: "الصف السادس / شعبة ب", teacherId: "t4", teacherName: "خالد الزهراني", title: "تغيب متكرر بدون عذر", excerpt: "الطالب غاب 6 أيام خلال الشهر الحالي بدون تقديم أي عذر رسمي.", description: "سُجّل غياب الطالب في 6 أيام متفرقة خلال شهر يوليو، ولم يُقدّم ولي الأمر أي مبرر لبعض هذه الأيام. يتطلب الأمر تواصلاً فورياً مع ولي الأمر.", severityLabel: "عالي", statusLabel: "مفتوحة", date: "2026-07-05", hasRecommendation: false },
  { id: "bn3", studentId: "st5", studentName: "تركي ناصر القرني", studentSection: "الصف السادس / شعبة أ", teacherId: "t6", teacherName: "عمر السبيعي", title: "إخلال بنظام حصة التربية البدنية", excerpt: "الطالب رفض المشاركة وأزعج بقية الطلاب.", description: "خلال حصة التربية البدنية رفض الطالب المشاركة في التمارين وجلس جانباً وأخذ يصدر أصواتاً مزعجة مما أخل بسير الحصة.", severityLabel: "متوسط", statusLabel: "مفتوحة", date: "2026-07-06", hasRecommendation: false },
  { id: "bn4", studentId: "st9", studentName: "بدر علي المطيري", studentSection: "الصف الرابع / شعبة ب", teacherId: "t1", teacherName: "نورة الشمري", title: "ضعف الانتباه والتركيز", excerpt: "الطالب يُظهر نمطاً متكرراً من التشتت وعدم استيعاب الشرح.", description: "لوحظ على الطالب خلال حصص الرياضيات الأسبوعية أنه يُشتّت تفكيره بسرعة ولا يستجيب للشرح المعتاد. يُوصى بتقييم تربوي.", severityLabel: "متوسط", statusLabel: "قيد المعالجة", date: "2026-07-04", hasRecommendation: true },
  { id: "bn5", studentId: "st1", studentName: "أحمد محمد الغامدي", studentSection: "الصف الخامس / شعبة أ", teacherId: "t3", teacherName: "ريم الحارثي", title: "أداء متميز وتفوق في العلوم", excerpt: "الطالب حصل على أعلى علامة في الاختبار التجريبي وساعد زملاءه.", description: "أظهر الطالب أحمد مستوى متميزاً في اختبار الوحدة الثالثة من العلوم وحصل على 100% وقدّم مساعدة لزملائه.", severityLabel: "منخفض", statusLabel: "محلولة", date: "2026-07-03", hasRecommendation: false },
  { id: "bn6", studentId: "st3", studentName: "فيصل سعد الدوسري", studentSection: "الصف الخامس / شعبة ب", teacherId: "t4", teacherName: "خالد الزهراني", title: "عدم إتمام الواجبات المنزلية", excerpt: "لم يُقدم الطالب واجبه للمرة الرابعة هذا الشهر.", description: "يتكرر نمط عدم تسليم الواجبات مع هذا الطالب بشكل ملحوظ مما يؤثر سلباً على متابعة المادة وتراكم الفهم.", severityLabel: "متوسط", statusLabel: "مفتوحة", date: "2026-07-02", hasRecommendation: false },
];

export const attendanceSummary: AttendanceSummary = {
  date: "2026-07-06",
  total: 189,
  present: 175,
  absent: 10,
  late: 4,
  excused: 0,
  sectionBreakdown: [
    { sectionName: "الخامس / أ", absent: 2, rate: 93.9 },
    { sectionName: "الخامس / ب", absent: 4, rate: 87.1 },
    { sectionName: "السادس / أ", absent: 1, rate: 97.1 },
    { sectionName: "السادس / ب", absent: 2, rate: 93.1 },
    { sectionName: "الرابع / أ", absent: 0, rate: 100 },
    { sectionName: "الرابع / ب", absent: 1, rate: 96.7 },
  ],
};

export const busRoutes: BusRoute[] = [
  { id: "b1", routeName: "مسار حي الياسمين", plateNumber: "أ ب ج - 1234", driverName: "عادل محمد الرشيدي", driverPhone: "0511234567", supervisorName: "نوال السالم", status: "in_school", assignedStudentsCount: 28 },
  { id: "b2", routeName: "مسار حي النزهة", plateNumber: "د هـ و - 5678", driverName: "ياسر فهد العمري", driverPhone: "0512345678", supervisorName: "أمل الجبرين", status: "on_route", assignedStudentsCount: 32, estimatedArrival: "3:45 م" },
  { id: "b3", routeName: "مسار حي العليا", plateNumber: "ز ح ط - 9012", driverName: "طارق سعود الشراري", driverPhone: "0513456789", supervisorName: "دلال العسيري", status: "arrived", assignedStudentsCount: 25 },
  { id: "b4", routeName: "مسار حي السليمانية", plateNumber: "ي ك ل - 3456", driverName: "منصور علي الغامدي", driverPhone: "0514567890", supervisorName: "هالة الزبيدي", status: "in_school", assignedStudentsCount: 21 },
];

export const messages: BroadcastMessage[] = [
  { id: "m1", title: "إجازة اليوم الوطني السعودي 🇸🇦", body: "تُعلم إدارة المدرسة بمناسبة اليوم الوطني المجيد أن الدراسة ستتوقف يوم الخميس 23 سبتمبر. كل عام والمملكة بخير.", target: "جميع أولياء الأمور", sentBy: "الإدارة المدرسية", date: "2026-07-05", type: "تعميم", reachCount: 847 },
  { id: "m2", title: "تنبيه: انصراف مبكر الأحد القادم", body: "نُذكّر بأن الانصراف يوم الأحد سيكون في الساعة 12:00 ظهراً بسبب الاجتماعات التربوية الفصلية.", target: "جميع أولياء الأمور", sentBy: "الإدارة المدرسية", date: "2026-07-04", type: "تنبيه", reachCount: 823 },
  { id: "m3", title: "تهنئة: المتفوقون في اختبار الرياضيات 🏆", body: "تُهنئ الإدارة الطالبة سارة المالكي والطالب أحمد الغامدي على حصولهما على العلامة الكاملة في اختبار الرياضيات.", target: "الصف الخامس / شعبة أ", sentBy: "الأستاذة نورة الشمري", date: "2026-07-03", type: "تهنئة", reachCount: 33 },
  { id: "m4", title: "تذكير: موعد تسليم أذونات الرحلة المدرسية", body: "آخر موعد لتسليم أذونات الرحلة المدرسية إلى متحف الحضارة هو الأربعاء 8 يوليو. برجاء الالتزام بالموعد.", target: "الصف السادس", sentBy: "وكيل شؤون الطلاب", date: "2026-07-02", type: "تنبيه", reachCount: 63 },
];

// ── Summary Stats ─────────────────────────────────────────────

export const dashboardStats = {
  totalStudents: 189,
  totalTeachers: 8,
  attendanceToday: 92.6,
  pendingBehaviorNotes: 4,
  openAlerts: 7,
  busesOnRoute: 1,
  avgAcademicScore: 82.4,
  newEnrollmentsThisWeek: 3,
};
