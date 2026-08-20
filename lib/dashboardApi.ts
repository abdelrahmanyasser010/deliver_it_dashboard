"use client";

import type { BehaviorNote, BroadcastMessage, BusRoute, Parent, SchoolSection, Student, Subject, Teacher } from "@/data/mockData";

const DEFAULT_API_BASE_URL = "http://alpha.edubridge.test:8000/api/v1";
const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;
export const API_BASE_URL = configuredApiBaseUrl.replace(/\/+$/, "");

const configuredTimeout = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? "15000");
export const API_TIMEOUT_MS = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 15000;
export const DASHBOARD_AUTH_EXPIRED_EVENT = "edubridge:dashboard-auth-expired";

const TOKEN_KEY = "edubridge.dashboard.access_token";
const USER_KEY = "edubridge.dashboard.user";
const SCHOOL_KEY = "edubridge.dashboard.school";
const DEVICE_ID_KEY = "edubridge.dashboard.device_id";

type ApiEnvelope<T> = {
  data?: T;
  message?: string;
  code?: string;
  errors?: unknown;
  meta?: { request_id?: string; [key: string]: unknown } | unknown;
};

type RequestBody = BodyInit | Record<string, unknown> | null | undefined;

export type DashboardApiStatus = "mock" | "loading" | "live" | "error";

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
}

export interface DashboardSchool {
  id: string;
  code: string;
  name: string;
  timezone?: string | null;
  locale?: string | null;
  currency?: string | null;
}

export interface DashboardDeviceSession {
  id: string;
  school_id?: string | null;
  device_id?: string | null;
  app_type?: string | null;
  device_name?: string | null;
  last_used_at?: string | null;
  expires_at?: string | null;
  revoked_at?: string | null;
}

export interface DashboardLoginResponse {
  token: string;
  token_type?: string;
  expires_at?: string | null;
  user: DashboardUser;
  school: DashboardSchool;
  device_session?: DashboardDeviceSession;
}

export interface DashboardMeResponse {
  user: DashboardUser;
  school: DashboardSchool;
  role?: {
    key?: string | null;
    label?: string | null;
  } | null;
  permissions?: string[];
  device_session?: DashboardDeviceSession;
}

export interface DashboardSummary {
  students?: number;
  teachers?: number;
  parents?: number;
  sections?: number;
  attendance_today?: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    rate: number;
  };
  pending?: {
    behavior_notes?: number;
    medical_excuses?: number;
    grade_appeals?: number;
    leave_permits?: number;
  };
  transport?: {
    routes?: number;
    on_route?: number;
    delayed?: number;
  };
  [key: string]: unknown;
}

export interface DashboardSearchItem {
  type: "student" | "teacher" | "parent" | string;
  id: string;
  label: string;
  secondary?: string | null;
}

export interface BackendGradeLevel {
  id: string | number;
  name?: string | null;
  code?: string | null;
  sort_order?: number | null;
  status?: string | null;
  sections?: BackendSection[];
  subjects?: BackendSubject[];
}

export interface BackendSection {
  id: string | number;
  grade_level_id?: string | number | null;
  name?: string | null;
  code?: string | null;
  room_number?: string | null;
  capacity?: number | null;
  homeroom_teacher_id?: string | number | null;
  status?: string | null;
  enrolled_count?: number | null;
  students_count?: number | null;
  class_teacher_id?: string | number | null;
  class_teacher_name?: string | null;
}

export interface BackendSubject {
  id: string | number;
  name?: string | null;
  code?: string | null;
  status?: string | null;
  weekly_periods?: number | null;
}

export interface BackendTeacher {
  id: string | number;
  central_user_id?: string | number | null;
  employee_number?: string | null;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  specialization?: string | null;
  assigned_sections?: Array<{ id?: string | number | null; name?: string | null; code?: string | null }>;
  assigned_subjects?: Array<{ id?: string | number | null; name?: string | null; code?: string | null }>;
}

export interface BackendStudent {
  id: string | number;
  central_user_id?: string | number | null;
  admission_number?: string | null;
  full_name?: string | null;
  name?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  grade_level_id?: string | number | null;
  section_id?: string | number | null;
  residential_area_id?: string | number | null;
  status?: string | null;
  parent_id?: string | number | null;
  parent_name?: string | null;
  parents?: Array<{
    id?: string | number | null;
    full_name?: string | null;
    relationship?: string | null;
  }>;
}

export interface BackendParent {
  id: string | number;
  central_user_id?: string | number | null;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  national_id_last4?: string | null;
  residential_area_id?: string | number | null;
  status?: string | null;
  children?: Array<{ id?: string | number | null; full_name?: string | null }>;
}


export interface BackendResidentialArea {
  id: string | number;
  city: string;
  name: string;
  status?: string | null;
}

export interface BackendMedicalExcuse {
  id: string | number;
  student_id?: string | number | null;
  parent_id?: string | number | null;
  file_id?: string | number | null;
  starts_on?: string | null;
  ends_on?: string | null;
  reason?: string | null;
  status?: "pending" | "approved" | "rejected" | string | null;
  reviewed_by_central_user_id?: string | number | null;
  reviewed_at?: string | null;
  review_note?: string | null;
}

export interface DashboardAcademicTerm {
  id: string;
  academic_year_id?: string | null;
  name?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  status?: string | null;
}

export interface DashboardAcademicYear {
  id: string;
  name?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  status?: string | null;
  terms?: DashboardAcademicTerm[];
}

export interface DashboardAcademicStructure {
  academic_years?: DashboardAcademicYear[];
  grade_levels?: BackendGradeLevel[];
  sections?: BackendSection[];
  subjects?: BackendSubject[];
  [key: string]: unknown;
}

export interface DashboardNotification {
  id: string;
  notification_id?: string | null;
  channel?: string | null;
  status?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  notification?: {
    type?: string | null;
    title?: string | null;
    body?: string | null;
    data?: unknown;
  } | null;
}

export interface FinanceSummary {
  total_due?: number;
  total_paid?: number;
  overdue_amount?: number;
  overdue_students?: number;
  collection_rate?: number;
  currency?: string;
  [key: string]: unknown;
}

export interface FinanceInvoice {
  id: string;
  invoice_number?: string | null;
  student_id?: string | null;
  student_name?: string | null;
  parent_name?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total?: number;
  paid?: number;
  remaining?: number;
  status?: string | null;
  currency?: string | null;
  notes?: string | null;
  lines?: Array<{ title: string; amount: number }>;
}

export interface FinancePayment {
  id: string;
  invoice_id?: string | null;
  invoice_number?: string | null;
  amount?: number;
  method?: string | null;
  paid_at?: string | null;
  reference?: string | null;
  notes?: string | null;
}

export interface FinanceDiscount {
  id: string;
  student_id?: string | null;
  student_name?: string | null;
  title?: string | null;
  amount?: number;
  type?: string | null;
  status?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  notes?: string | null;
}

export interface FinanceRefund {
  id: string;
  payment_id?: string | null;
  invoice_id?: string | null;
  amount?: number;
  currency?: string | null;
  status?: string | null;
  reason?: string | null;
  reference?: string | null;
  created_by_central_user_id?: string | null;
  created_at?: string | null;
}

export interface DashboardTransportSummary {
  routes?: number;
  on_route?: number;
  delayed?: number;
  assigned_students?: number;
}

export interface DashboardTransportRoute {
  id: string;
  route_name?: string | null;
  code?: string | null;
  plate_number?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  supervisor_name?: string | null;
  capacity?: number | null;
  status?: string | null;
  assigned_students_count?: number;
  estimated_arrival?: string | null;
  last_location?: { lat: number; lng: number; recorded_at?: string | null } | null;
}

export interface DashboardTransportPassenger {
  assignment_id: string;
  student_id: string;
  student_name?: string | null;
  admission_number?: string | null;
  section_name?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
}

export interface DashboardTransportAssignment {
  id: string;
  bus_route_id?: string | null;
  student_id?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  status?: string | null;
}

export interface DashboardTransportEvent {
  id: string;
  type?: string | null;
  summary?: string | null;
  occurred_at?: string | null;
  data?: Record<string, unknown> | null;
}

export interface SchoolSettings {
  school?: DashboardSchool;
  academic?: {
    active_academic_year_id?: string | null;
    active_term_id?: string | null;
  };
  attendance?: {
    late_after_minutes?: number;
    absence_warning_threshold?: number;
  };
  notifications?: {
    push_enabled?: boolean;
    sms_enabled?: boolean;
    email_enabled?: boolean;
  };
}

export interface SchoolIntegration {
  key: string;
  provider?: string | null;
  status?: string | null;
  masked_api_key?: string | null;
  config?: Record<string, unknown>;
  last_tested_at?: string | null;
  last_test_status?: string | null;
}

export interface AuditLog {
  id: string;
  actor?: { id?: string | null; name?: string | null; email?: string | null } | null;
  action?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  summary?: string | null;
  before?: unknown;
  after?: unknown;
  ip_address?: string | null;
  request_id?: string | null;
  created_at?: string | null;
}

export interface RbacRole {
  id?: string;
  key: string;
  label?: string;
  is_system?: boolean;
  permissions?: string[];
}

export interface RbacPermission {
  id?: string;
  key: string;
  label?: string | null;
}

export interface RbacMatrix {
  permissions: string[];
  roles: Array<{
    key: string;
    label?: string;
    is_system?: boolean;
    permissions: Record<string, boolean>;
  }>;
}

export interface DashboardAdminAccount {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role_key?: string | null;
  role_label?: string | null;
  status?: string | null;
  last_login_at?: string | null;
}

export interface DashboardBroadcast {
  id: string;
  title?: string | null;
  body?: string | null;
  type?: string | null;
  target?: { type?: string | null; ids?: string[] };
  target_label?: string | null;
  channels?: string[];
  priority?: string | null;
  status?: string | null;
  scheduled_at?: string | null;
  sent_at?: string | null;
  cancelled_at?: string | null;
  created_by?: { id?: string | null; name?: string | null; email?: string | null } | null;
  reach_count?: number;
}

export interface BroadcastDeliveryCounts {
  queued: number;
  sent: number;
  failed: number;
  read: number;
}

export interface DashboardBehaviorNote {
  id: string;
  student_id?: string | null;
  student_name?: string | null;
  admission_number?: string | null;
  section_id?: string | null;
  section_name?: string | null;
  allocation_id?: string | null;
  created_by_teacher_id?: string | null;
  title?: string | null;
  body?: string | null;
  severity?: string | null;
  status?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  version?: number;
  available_actions?: string[];
  timeline_count?: number;
  recommendations_count?: number;
}

export interface DashboardLeavePermit {
  id: string;
  student_id?: string | null;
  student_name?: string | null;
  admission_number?: string | null;
  section_id?: string | null;
  section_name?: string | null;
  parent_id?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  reason?: string | null;
  requested_leave_at?: string | null;
  status?: string | null;
  review_note?: string | null;
  gate_token_expires_at?: string | null;
  used_at?: string | null;
  available_actions?: string[];
}

export interface DashboardParentSummons {
  id: string;
  student_id: string;
  parent_id: string;
  scheduled_at?: string | null;
  reason?: string | null;
  status?: string | null;
  response?: string | null;
  response_note?: string | null;
  responded_at?: string | null;
}

export interface DashboardTeacherSubstitution {
  id: string;
  teaching_session_id: string;
  original_teacher_id: string;
  substitute_teacher_id: string;
  reason?: string | null;
  status?: string | null;
  response_note?: string | null;
  responded_at?: string | null;
}

export interface DashboardScheduleSession {
  id: string;
  session_date?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  status?: string | null;
}

export interface DashboardScheduleSlot {
  schedule_slot_id: string;
  academic_term_id?: string | null;
  allocation_id?: string | null;
  teaching_session_ids?: string[];
  sessions?: DashboardScheduleSession[];
  weekday?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  room?: string | null;
  status?: string | null;
  teacher_id?: string | null;
  teacher_name?: string | null;
  section_id?: string | null;
  section_name?: string | null;
  subject_id?: string | null;
  subject_name?: string | null;
  weekly_periods?: number | null;
}

export interface DashboardScheduleConflict {
  schedule_slot_id?: string;
  allocation_id?: string;
  weekday?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  teacher_id?: string | null;
  teacher_name?: string | null;
  section_id?: string | null;
  section_name?: string | null;
}

export interface DashboardScheduleConflictResult {
  has_conflict: boolean;
  conflicts: DashboardScheduleConflict[];
}

export interface DashboardCalendarEvent {
  id: string;
  title?: string | null;
  description?: string | null;
  type?: "event" | "holiday" | "exam" | "meeting" | "deadline" | string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  all_day?: boolean;
  audience_type?: string | null;
  audience_ids?: string[];
  location?: string | null;
  status?: string | null;
  created_by_central_user_id?: string | null;
}

export interface DashboardAssessment {
  id: string;
  academic_term_id?: string | null;
  allocation_id?: string | null;
  title?: string | null;
  type?: string | null;
  max_score?: number;
  weight?: number;
  status?: string | null;
  teacher?: { id?: string | null; full_name?: string | null };
  section?: { id?: string | null; name?: string | null; code?: string | null };
  subject?: { id?: string | null; name?: string | null; code?: string | null };
  grade_summary?: {
    expected_students?: number;
    entered_entries?: number;
    scored_entries?: number;
    missing_scores?: number;
  };
  available_actions?: string[];
  submitted_at?: string | null;
  approved_at?: string | null;
  published_at?: string | null;
  locked_at?: string | null;
  entries?: Array<{
    student?: { id?: string | null; full_name?: string | null; admission_number?: string | null };
    entry?: { id?: string | null; score?: number | null; feedback?: string | null; revision?: number } | null;
  }>;
}

export interface DashboardGradeEntry {
  id: string;
  assessment_id?: string | null;
  student_id?: string | null;
  score?: number | null;
  feedback?: string | null;
  entered_by_teacher_id?: string | null;
  revision?: number;
}

export interface DashboardDailyAttendancePeriod {
  teaching_session_id: string;
  starts_at?: string | null;
  ends_at?: string | null;
  subject_name?: string | null;
  status: "present" | "absent" | "late" | "excused" | "not_recorded" | string;
}

export interface DashboardDailyAttendanceStudent {
  student: { id: string; full_name?: string | null; admission_number?: string | null };
  section: { id: string; name?: string | null };
  summary_status: "has_absence" | "excused" | "late" | "complete" | "incomplete" | "full_day_absence" | string;
  expected_periods: number;
  recorded_periods: number;
  present_periods: number;
  absent_periods: number;
  late_periods: number;
  excused_periods: number;
  periods: DashboardDailyAttendancePeriod[];
}

export interface DashboardDailyAttendance {
  date: string;
  summary: {
    scheduled_sessions: number;
    fully_recorded_sessions: number;
    students_with_absence: number;
    students_with_late: number;
    students_complete: number;
    students_incomplete: number;
  };
  students: DashboardDailyAttendanceStudent[];
}

export interface DashboardAttendanceRiskStudent {
  student: { id: string; full_name?: string | null; admission_number?: string | null };
  section: { id: string; name?: string | null };
  unexcused_absent_periods: number;
  recorded_periods: number;
  expected_periods: number;
  attendance_percentage?: number | null;
  warning_threshold: number;
  reason: string;
}

export interface DashboardAttendanceRiskResult {
  policy: { absence_warning_threshold: number; calculation_unit: string };
  students: DashboardAttendanceRiskStudent[];
}

export interface DashboardMessageTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  type: "announcement" | "alert" | "reminder" | string;
  default_target_type?: string | null;
  is_active: boolean;
  updated_at?: string | null;
}

export interface DashboardGradeAppeal {
  id: string;
  grade_entry_id: string;
  assessment_id: string;
  assessment_title?: string | null;
  subject?: { id?: string | null; name?: string | null };
  student?: { id?: string | null; full_name?: string | null; admission_number?: string | null };
  section?: { id?: string | null; name?: string | null };
  parent?: { id?: string | null; full_name?: string | null };
  reason?: string | null;
  status?: string | null;
  current_score?: number | null;
  max_score?: number | null;
  current_feedback?: string | null;
  grade_revision?: number;
  review_note?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
}

export interface DashboardEarlyWarningStudent {
  student_id: string;
  version: string;
  score: number;
  reasons: string[];
  level: "low" | "medium" | "high" | string;
  student: { id: string; full_name?: string | null; admission_number?: string | null };
  section: { id?: string | null; name?: string | null };
}

export interface DashboardEarlyWarningResult {
  calculation_version: string;
  calculated_at: string;
  students: DashboardEarlyWarningStudent[];
}

export interface DashboardAvailableSubstitute {
  id: string;
  full_name: string;
  specialization?: string | null;
}

export interface DashboardGlobalScheduleConflict {
  types: string[];
  weekday: number;
  left: Record<string, unknown>;
  right: Record<string, unknown>;
}

export interface DashboardGlobalScheduleConflictResult {
  has_conflict: boolean;
  count: number;
  conflicts: DashboardGlobalScheduleConflict[];
}

export interface DashboardReportExport {
  export_id: string;
  report_type?: string | null;
  status?: string | null;
  download_url?: string | null;
  payload?: Record<string, unknown> | null;
  outbox_event_id?: string | null;
  requested_by_central_user_id?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
}

export interface DashboardCanvasConfig {
  id?: string | null;
  key: string;
  exists: boolean;
  name?: string | null;
  payload?: Record<string, unknown> | null;
  version?: number | null;
  updated_by_central_user_id?: string | null;
  updated_at?: string | null;
}

export class DashboardApiError extends Error {
  status: number;
  code?: string;
  errors?: unknown;
  requestId?: string;

  constructor(message: string, status: number, code?: string, errors?: unknown, requestId?: string) {
    super(message);
    this.name = "DashboardApiError";
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.requestId = requestId;
  }
}

export function dashboardErrorMessage(error: unknown): string {
  if (!(error instanceof DashboardApiError)) {
    return error instanceof Error ? error.message : "تعذر الاتصال بالخادم. حاول مرة أخرى.";
  }

  switch (error.code) {
    case "UNAUTHENTICATED":
      return "انتهت الجلسة أو لم تعد صالحة. سجّل الدخول من جديد.";
    case "APP_ACCESS_DENIED":
      return "هذا الحساب غير مصرح له بالدخول إلى لوحة الإدارة.";
    case "FORBIDDEN":
      return "لا تملك الصلاحية المطلوبة لتنفيذ هذه العملية.";
    case "VALIDATION_FAILED":
      return "راجع البيانات المدخلة ثم حاول مرة أخرى.";
    case "RATE_LIMITED":
      return "تم إرسال محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.";
    case "REQUEST_TIMEOUT":
      return "استغرق الخادم وقتًا أطول من المتوقع. حاول مرة أخرى.";
    case "NETWORK_ERROR":
      return "تعذر الوصول إلى خادم EduBridge. تحقق من الشبكة وعنوان الـ API.";
    default:
      if (error.status === 401) return "بيانات الدخول غير صحيحة أو الجلسة منتهية.";
      if (error.status === 403) return "لا تملك الصلاحية المطلوبة.";
      if (error.status >= 500) return `حدث خطأ في الخادم${error.requestId ? ` — Request ID: ${error.requestId}` : ""}.`;
      return error.message || "تعذر تنفيذ الطلب.";
  }
}

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function readJson<T>(key: string): T | null {
  const storage = getStorage();
  if (!storage) return null;

  const value = storage.getItem(key);
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(key, JSON.stringify(value));
}

export function getStoredDashboardToken() {
  return getStorage()?.getItem(TOKEN_KEY) ?? null;
}

export function getStoredDashboardAuth() {
  return {
    token: getStoredDashboardToken(),
    user: readJson<DashboardUser>(USER_KEY),
    school: readJson<DashboardSchool>(SCHOOL_KEY),
  };
}

export function hasDashboardToken() {
  return Boolean(getStoredDashboardToken());
}

export function clearDashboardAuth() {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(USER_KEY);
  storage.removeItem(SCHOOL_KEY);
}

function storeDashboardAuth(auth: DashboardLoginResponse | DashboardMeResponse) {
  const storage = getStorage();
  if (!storage) return;

  if ("token" in auth) {
    storage.setItem(TOKEN_KEY, auth.token);
  }

  writeJson(USER_KEY, auth.user);
  writeJson(SCHOOL_KEY, auth.school);
}

export function getDashboardDeviceId() {
  const storage = getStorage();
  if (!storage) return "";

  const existing = storage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  if (!globalThis.crypto?.randomUUID) {
    throw new Error("crypto.randomUUID is required to create dashboard device_id.");
  }

  const deviceId = globalThis.crypto.randomUUID();
  storage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

function makeUrl(path: string, params?: Record<string, string | number | boolean | null | undefined>) {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

async function apiRequest<T>(
  path: string,
  options: Omit<RequestInit, "body"> & {
    body?: RequestBody;
    params?: Record<string, string | number | boolean | null | undefined>;
    auth?: boolean;
  } = {},
): Promise<T> {
  const { body, params, auth = true, headers, signal: callerSignal, ...requestOptions } = options;
  const token = getStoredDashboardToken();
  const requestHeaders = new Headers(headers);
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  requestHeaders.set("Accept", "application/json");
  if (!requestHeaders.has("X-Request-ID") && globalThis.crypto?.randomUUID) {
    requestHeaders.set("X-Request-ID", globalThis.crypto.randomUUID());
  }

  let requestBody: BodyInit | null | undefined;
  if (body && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof URLSearchParams)) {
    requestHeaders.set("Content-Type", "application/json");
    requestBody = JSON.stringify(body);
  } else {
    requestBody = body as BodyInit | null | undefined;
  }

  if (auth && token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(makeUrl(path, params), {
      ...requestOptions,
      body: requestBody,
      headers: requestHeaders,
      signal: controller.signal,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

    if (!response.ok) {
      const meta = payload?.meta && typeof payload.meta === "object" ? payload.meta as { request_id?: string } : undefined;
      const apiError = new DashboardApiError(
        payload?.message ?? `Dashboard API request failed with status ${response.status}.`,
        response.status,
        payload?.code,
        payload?.errors,
        meta?.request_id,
      );

      if (auth && response.status === 401) {
        clearDashboardAuth();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(DASHBOARD_AUTH_EXPIRED_EVENT));
        }
      }

      throw apiError;
    }

    if (payload && Object.prototype.hasOwnProperty.call(payload, "data")) {
      return payload.data as T;
    }

    return payload as T;
  } catch (error) {
    if (error instanceof DashboardApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new DashboardApiError("Request timed out.", 0, "REQUEST_TIMEOUT");
    }
    throw new DashboardApiError(
      error instanceof Error ? error.message : "Network request failed.",
      0,
      "NETWORK_ERROR",
    );
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function loginDashboard(email: string, password: string) {
  const result = await apiRequest<DashboardLoginResponse>("/dashboard/auth/login", {
    auth: false,
    method: "POST",
    body: {
      email,
      password,
      device_id: getDashboardDeviceId(),
      device_name: "EduBridge Dashboard Web",
    },
  });

  storeDashboardAuth(result);
  return result;
}

export async function refreshDashboardIdentity() {
  const result = await apiRequest<DashboardMeResponse>("/auth/me");
  storeDashboardAuth(result);
  return result;
}

export async function logoutDashboard() {
  try {
    await apiRequest<void>("/auth/logout", { method: "POST" });
  } finally {
    clearDashboardAuth();
  }
}

export function fetchDeviceSessions() {
  return apiRequest<DashboardDeviceSession[]>("/auth/device-sessions");
}

export function revokeDeviceSession(id: string) {
  return apiRequest<void>(`/auth/device-sessions/${id}/revoke`, { method: "POST" });
}

export function updatePushToken(token: string, platform = "web") {
  return apiRequest<void>("/auth/device/push-token", {
    method: "PUT",
    body: { token, platform },
  });
}

export function fetchDashboardSummary() {
  return apiRequest<DashboardSummary>("/admin/dashboard/summary");
}

export function searchDashboard(query: string, type: "all" | "teachers" | "parents" | "students" = "all", perPage = 10) {
  return apiRequest<DashboardSearchItem[]>("/admin/search", {
    params: { q: query, type, per_page: perPage },
  });
}

export function fetchAcademicStructure() {
  return apiRequest<DashboardAcademicStructure>("/academic/structure");
}

export function createGradeLevel(body: { name: string; code: string; sort_order?: number; status?: "active" | "archived" }) {
  return apiRequest<BackendGradeLevel>("/grade-levels", { method: "POST", body });
}

export function createSection(body: {
  grade_level_id: string;
  name: string;
  code: string;
  room_number?: string | null;
  capacity?: number | null;
  homeroom_teacher_id?: string | null;
}) {
  return apiRequest<BackendSection>("/sections", { method: "POST", body });
}

export function updateSection(id: string, body: Partial<{
  grade_level_id: string;
  name: string;
  code: string;
  room_number: string | null;
  capacity: number | null;
  homeroom_teacher_id: string | null;
}>) {
  return apiRequest<BackendSection>(`/sections/${id}`, { method: "PATCH", body });
}

export function createSubject(body: {
  name: string;
  code: string;
  grade_level_ids?: string[];
  weekly_periods?: number | null;
}) {
  return apiRequest<BackendSubject>("/subjects", { method: "POST", body });
}

export function updateSubject(id: string, body: Partial<{
  name: string;
  code: string;
  grade_level_ids: string[];
  weekly_periods: number | null;
}>) {
  return apiRequest<BackendSubject>(`/subjects/${id}`, { method: "PATCH", body });
}

export function fetchTeachers(params?: { page?: number; per_page?: number; search?: string }) {
  return apiRequest<BackendTeacher[]>("/teachers", { params });
}

export function createTeacher(body: {
  employee_number: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  specialization?: string | null;
  status?: "active" | "archived";
  section_ids?: string[];
  subject_ids?: string[];
}) {
  return apiRequest<BackendTeacher>("/teachers", { method: "POST", body });
}

export function fetchStudents(params?: { page?: number; per_page?: number; search?: string }) {
  return apiRequest<BackendStudent[]>("/students", { params });
}

export function createStudent(body: {
  admission_number: string;
  full_name: string;
  date_of_birth?: string | null;
  gender?: "male" | "female" | "other" | null;
  grade_level_id: string;
  section_id?: string | null;
  residential_area_id?: string | null;
  status?: "active" | "archived";
  parent_ids?: string[];
}) {
  return apiRequest<BackendStudent>("/students", { method: "POST", body });
}

export function fetchParents(params?: { page?: number; per_page?: number; search?: string }) {
  return apiRequest<BackendParent[]>("/parents", { params });
}

export function createParent(body: {
  full_name: string;
  email?: string | null;
  phone: string;
  national_id_last4?: string | null;
  residential_area_id?: string | null;
  status?: "active" | "archived";
}) {
  return apiRequest<BackendParent>("/parents", { method: "POST", body });
}

export function fetchResidentialAreas() {
  return apiRequest<BackendResidentialArea[]>("/residential-areas");
}

export function createResidentialArea(body: { city: string; name: string }) {
  return apiRequest<BackendResidentialArea>("/residential-areas", { method: "POST", body });
}

export function fetchNotifications(params?: { page?: number; per_page?: number }) {
  return apiRequest<DashboardNotification[]>("/notifications", { params });
}

export function markNotificationRead(id: string) {
  return apiRequest<DashboardNotification | void>(`/notifications/${id}/read`, { method: "POST" });
}

export function fetchMedicalExcuses(params?: { page?: number; per_page?: number }) {
  return apiRequest<BackendMedicalExcuse[]>("/medical-excuses", { params });
}

export function approveMedicalExcuse(id: string, review_note?: string) {
  return apiRequest<BackendMedicalExcuse>(`/medical-excuses/${id}/approve`, {
    method: "POST",
    body: { review_note: review_note ?? null },
  });
}

export function rejectMedicalExcuse(id: string, review_note: string) {
  return apiRequest<BackendMedicalExcuse>(`/medical-excuses/${id}/reject`, {
    method: "POST",
    body: { review_note },
  });
}

export function publishBehaviorNote(id: string, note?: string) {
  return apiRequest<unknown>(`/behavior-notes/${id}/publish`, {
    method: "POST",
    body: { note: note ?? null },
  });
}

export function resolveBehaviorNote(id: string, note?: string) {
  return apiRequest<unknown>(`/behavior-notes/${id}/resolve`, {
    method: "POST",
    body: { note: note ?? null },
  });
}

export function addBehaviorRecommendation(id: string, body: string) {
  return apiRequest<unknown>(`/behavior-notes/${id}/recommendations`, {
    method: "POST",
    body: { body },
  });
}

export function createParentSummons(body: {
  student_id: string;
  parent_id: string;
  scheduled_at: string;
  reason: string;
}) {
  return apiRequest<{
    id: string;
    student_id?: string;
    parent_id?: string;
    scheduled_at?: string;
    reason?: string;
    status?: string;
  }>("/parent-summons", { method: "POST", body });
}

export function approveLeavePermit(id: string, review_note?: string) {
  return apiRequest<unknown>(`/leave-permits/${id}/approve`, {
    method: "POST",
    body: { review_note: review_note ?? null },
  });
}

export function rejectLeavePermit(id: string, review_note: string) {
  return apiRequest<unknown>(`/leave-permits/${id}/reject`, {
    method: "POST",
    body: { review_note },
  });
}

export function createTeacherSubstitution(body: {
  teaching_session_id: string;
  substitute_teacher_id: string;
  reason?: string;
}) {
  return apiRequest<{ id?: string | number; status?: string }>("/teacher-substitutions", { method: "POST", body });
}

export function fetchDashboardParentSummons() {
  return apiRequest<DashboardParentSummons[]>("/dashboard/parent-summons");
}

export function fetchDashboardTeacherSubstitutions() {
  return apiRequest<DashboardTeacherSubstitution[]>("/dashboard/teacher-substitutions");
}

export function fetchDashboardBehaviorNotes(params?: {
  page?: number;
  per_page?: number;
  status?: string;
  severity?: string;
  student_id?: string;
  section_id?: string;
  from?: string;
  to?: string;
}) {
  return apiRequest<DashboardBehaviorNote[]>("/dashboard/behavior-notes", { params });
}

export function fetchDashboardLeavePermits(params?: {
  page?: number;
  per_page?: number;
  status?: string;
  student_id?: string;
  section_id?: string;
  from?: string;
  to?: string;
}) {
  return apiRequest<DashboardLeavePermit[]>("/dashboard/leave-permits", { params });
}

export function fetchDashboardSchedules(params?: {
  page?: number;
  per_page?: number;
  academic_term_id?: string;
  section_id?: string;
  teacher_id?: string;
  weekday?: number;
  from?: string;
  to?: string;
}) {
  return apiRequest<DashboardScheduleSlot[]>("/dashboard/schedules", { params });
}

export function checkScheduleConflicts(body: {
  academic_term_id: string;
  allocation_id: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
  ignore_slot_id?: string | null;
}) {
  return apiRequest<DashboardScheduleConflictResult>("/dashboard/schedules/conflicts/check", {
    method: "POST",
    body,
  });
}

export function fetchCalendarEvents(params?: {
  page?: number;
  per_page?: number;
  type?: string;
  status?: string;
  from?: string;
  to?: string;
}) {
  return apiRequest<DashboardCalendarEvent[]>("/dashboard/calendar/events", { params });
}

export function createCalendarEvent(body: {
  title: string;
  description?: string | null;
  type: "event" | "holiday" | "exam" | "meeting" | "deadline";
  starts_at: string;
  ends_at?: string | null;
  all_day?: boolean;
  audience_type: "all" | "grade_level" | "section" | "roles" | "custom_users";
  audience_ids?: string[];
  location?: string | null;
}) {
  return apiRequest<DashboardCalendarEvent>("/dashboard/calendar/events", { method: "POST", body });
}

export function updateCalendarEvent(
  id: string,
  body: Partial<{
    title: string;
    description: string | null;
    type: "event" | "holiday" | "exam" | "meeting" | "deadline";
    starts_at: string;
    ends_at: string | null;
    all_day: boolean;
    audience_type: "all" | "grade_level" | "section" | "roles" | "custom_users";
    audience_ids: string[];
    location: string | null;
  }>,
) {
  return apiRequest<DashboardCalendarEvent>(`/dashboard/calendar/events/${id}`, { method: "PATCH", body });
}

export function deleteCalendarEvent(id: string) {
  return apiRequest<DashboardCalendarEvent>(`/dashboard/calendar/events/${id}`, { method: "DELETE" });
}

export function fetchDashboardAssessments(params?: {
  page?: number;
  per_page?: number;
  status?: string;
  academic_term_id?: string;
  teacher_id?: string;
  section_id?: string;
  subject_id?: string;
  type?: string;
  from?: string;
  to?: string;
}) {
  return apiRequest<DashboardAssessment[]>("/dashboard/assessments", { params });
}

export function fetchDashboardAssessment(id: string) {
  return apiRequest<DashboardAssessment>(`/dashboard/assessments/${id}`);
}

export function updateDashboardAssessmentGrades(
  assessmentId: string,
  body: {
    entries: Array<{
      student_id: string | number;
      score?: number | null;
      feedback?: string | null;
      note?: string | null;
      revision?: number | null;
    }>;
  },
) {
  return apiRequest<DashboardGradeEntry[]>(`/dashboard/assessments/${assessmentId}/grades`, {
    method: "PUT",
    body,
  });
}

export function requestAssessmentGradeExport(assessmentId: string) {
  return apiRequest<DashboardReportExport>(`/dashboard/assessments/${assessmentId}/exports`, {
    method: "POST",
  });
}

export function fetchReportExport(exportId: string) {
  return apiRequest<DashboardReportExport>(`/dashboard/reports/exports/${encodeURIComponent(exportId)}`);
}

export function approveAssessment(id: string) {
  return apiRequest<DashboardAssessment>(`/assessments/${id}/approve`, { method: "POST" });
}

export function publishAssessment(id: string) {
  return apiRequest<DashboardAssessment>(`/assessments/${id}/publish`, { method: "POST" });
}

export function lockAssessment(id: string) {
  return apiRequest<DashboardAssessment>(`/assessments/${id}/lock`, { method: "POST" });
}

export function fetchDashboardDailyAttendance(params?: { date?: string; section_id?: string; status?: string; q?: string }) {
  return apiRequest<DashboardDailyAttendance>("/dashboard/attendance/daily", { params });
}

export function fetchDashboardAttendanceAtRisk(params: { academic_term_id: string; section_id?: string; q?: string; per_page?: number }) {
  return apiRequest<DashboardAttendanceRiskResult>("/dashboard/attendance/at-risk", { params });
}

export function fetchDashboardMessageTemplates(params?: { active_only?: boolean }) {
  return apiRequest<DashboardMessageTemplate[]>("/dashboard/message-templates", { params });
}

export function createDashboardMessageTemplate(body: Omit<DashboardMessageTemplate, "id" | "updated_at">) {
  return apiRequest<DashboardMessageTemplate>("/dashboard/message-templates", { method: "POST", body });
}

export function updateDashboardMessageTemplate(id: string, body: Partial<Omit<DashboardMessageTemplate, "id" | "updated_at">>) {
  return apiRequest<DashboardMessageTemplate>(`/dashboard/message-templates/${id}`, { method: "PATCH", body });
}

export function deleteDashboardMessageTemplate(id: string) {
  return apiRequest<void>(`/dashboard/message-templates/${id}`, { method: "DELETE" });
}

export function fetchDashboardGradeAppeals(params?: { status?: string; assessment_id?: string; section_id?: string; student_id?: string; per_page?: number }) {
  return apiRequest<DashboardGradeAppeal[]>("/dashboard/grade-appeals", { params });
}

export function approveDashboardGradeAppeal(id: string, review_note?: string | null) {
  return apiRequest<unknown>(`/grade-appeals/${id}/approve`, { method: "POST", body: { review_note: review_note ?? null } });
}

export function rejectDashboardGradeAppeal(id: string, review_note?: string | null) {
  return apiRequest<unknown>(`/grade-appeals/${id}/reject`, { method: "POST", body: { review_note: review_note ?? null } });
}

export function correctDashboardGradeAppeal(id: string, body: { score: number; feedback?: string | null; correction_reason: string; revision: number }) {
  return apiRequest<unknown>(`/grade-appeals/${id}/correct`, { method: "POST", body });
}

export function fetchDashboardEarlyWarnings(params?: { section_id?: string; q?: string; min_score?: number }) {
  return apiRequest<DashboardEarlyWarningResult>("/dashboard/analytics/early-warnings", { params });
}

export function fetchAvailableSubstitutes(teachingSessionId: string) {
  return apiRequest<DashboardAvailableSubstitute[]>(`/dashboard/teaching-sessions/${teachingSessionId}/available-substitutes`);
}

export function checkGlobalScheduleConflicts(academicTermId: string) {
  return apiRequest<DashboardGlobalScheduleConflictResult>("/dashboard/schedules/conflicts", { params: { academic_term_id: academicTermId } });
}

export function fetchCanvasConfig(key: string) {
  return apiRequest<DashboardCanvasConfig>(`/dashboard/canvas-configs/${encodeURIComponent(key)}`);
}

export function saveCanvasConfig(
  key: string,
  body: { name?: string | null; payload: Record<string, unknown>; expected_version?: number | null },
) {
  return apiRequest<DashboardCanvasConfig>(`/dashboard/canvas-configs/${encodeURIComponent(key)}`, {
    method: "PUT",
    body,
  });
}

export function fetchFinanceSummary() {
  return apiRequest<FinanceSummary>("/dashboard/finance/summary");
}

export function fetchFinanceInvoices(params?: {
  page?: number;
  per_page?: number;
  student_id?: string;
  status?: string;
  from?: string;
  to?: string;
}) {
  return apiRequest<FinanceInvoice[]>("/dashboard/finance/invoices", { params });
}

export function createFinanceInvoice(body: {
  student_id: string | number;
  issue_date: string;
  due_date: string;
  currency?: string | null;
  discount?: number | null;
  tax?: number | null;
  notes?: string | null;
  lines: Array<{ title: string; amount: number }>;
}) {
  return apiRequest<FinanceInvoice>("/dashboard/finance/invoices", { method: "POST", body });
}

export function updateFinanceInvoice(
  id: string,
  body: Partial<{
    issue_date: string;
    due_date: string;
    currency: string;
    discount: number | null;
    tax: number | null;
    status: "open" | "partial" | "overdue" | "cancelled";
    notes: string | null;
    lines: Array<{ title: string; amount: number }>;
  }>,
) {
  return apiRequest<FinanceInvoice>(`/dashboard/finance/invoices/${id}`, { method: "PATCH", body });
}

export function deleteFinanceInvoice(id: string) {
  return apiRequest<FinanceInvoice>(`/dashboard/finance/invoices/${id}`, { method: "DELETE" });
}

export function fetchFinancePayments(params?: {
  page?: number;
  per_page?: number;
  invoice_id?: string;
  method?: string;
  from?: string;
  to?: string;
}) {
  return apiRequest<FinancePayment[]>("/dashboard/finance/payments", { params });
}

export function createFinancePayment(body: {
  invoice_id: string | number;
  amount: number;
  method: "cash" | "bank_transfer" | "card" | "online" | "cheque";
  paid_at: string;
  reference?: string | null;
  notes?: string | null;
}) {
  return apiRequest<FinancePayment>("/dashboard/finance/payments", { method: "POST", body });
}

export function fetchFinanceDiscounts(params?: {
  page?: number;
  per_page?: number;
  student_id?: string;
  status?: string;
  type?: string;
}) {
  return apiRequest<FinanceDiscount[]>("/dashboard/finance/discounts", { params });
}

export function createFinanceDiscount(body: {
  student_id?: string | number | null;
  title: string;
  amount: number;
  type?: "fixed" | "percentage" | null;
  status?: "active" | "archived" | null;
  valid_from?: string | null;
  valid_until?: string | null;
  notes?: string | null;
}) {
  return apiRequest<FinanceDiscount>("/dashboard/finance/discounts", { method: "POST", body });
}

export function updateFinanceDiscount(
  id: string,
  body: Partial<{
    student_id: string | number | null;
    title: string;
    amount: number;
    type: "fixed" | "percentage";
    status: "active" | "archived";
    valid_from: string | null;
    valid_until: string | null;
    notes: string | null;
  }>,
) {
  return apiRequest<FinanceDiscount>(`/dashboard/finance/discounts/${id}`, { method: "PATCH", body });
}

export function deleteFinanceDiscount(id: string) {
  return apiRequest<FinanceDiscount>(`/dashboard/finance/discounts/${id}`, { method: "DELETE" });
}

export function fetchFinanceRefunds(params?: {
  page?: number;
  per_page?: number;
  payment_id?: string;
  invoice_id?: string;
  from?: string;
  to?: string;
}) {
  return apiRequest<FinanceRefund[]>("/dashboard/finance/refunds", { params });
}

export function createFinanceRefund(
  paymentId: string,
  body: { amount: number; reason: string; reference?: string | null },
) {
  return apiRequest<FinanceRefund>(`/dashboard/finance/payments/${paymentId}/refunds`, {
    method: "POST",
    body,
  });
}

export function fetchFinanceCollectionsReport(params?: { from?: string; to?: string }) {
  return apiRequest<unknown>("/dashboard/finance/reports/collections", { params });
}

export function fetchFinanceOutstandingReport(params?: { from?: string; to?: string }) {
  return apiRequest<unknown>("/dashboard/finance/reports/outstanding", { params });
}

export function fetchTransportSummary() {
  return apiRequest<DashboardTransportSummary>("/dashboard/transport/summary");
}

export function fetchTransportRoutes(params?: { page?: number; per_page?: number; status?: string }) {
  return apiRequest<DashboardTransportRoute[]>("/dashboard/transport/routes", { params });
}

export function createTransportRoute(body: {
  name: string;
  code: string;
  capacity: number;
  driver_name?: string | null;
  plate_number?: string | null;
  driver_phone?: string | null;
  supervisor_name?: string | null;
  estimated_arrival_time?: string | null;
}) {
  return apiRequest<DashboardTransportRoute>("/dashboard/transport/routes", { method: "POST", body });
}

export function updateTransportRoute(
  routeId: string,
  body: Partial<{
    name: string;
    code: string;
    capacity: number;
    driver_name: string | null;
    plate_number: string | null;
    driver_phone: string | null;
    supervisor_name: string | null;
    estimated_arrival_time: string | null;
  }>,
) {
  return apiRequest<DashboardTransportRoute>(`/dashboard/transport/routes/${routeId}`, { method: "PATCH", body });
}

export function deleteTransportRoute(routeId: string) {
  return apiRequest<DashboardTransportRoute>(`/dashboard/transport/routes/${routeId}`, { method: "DELETE" });
}

export function assignTransportStudent(
  routeId: string,
  body: { student_id: string | number; valid_from: string; valid_until?: string | null },
) {
  return apiRequest<DashboardTransportAssignment>(`/dashboard/transport/routes/${routeId}/assignments`, {
    method: "POST",
    body,
  });
}

export function updateTransportAssignment(
  routeId: string,
  assignmentId: string,
  body: Partial<{ valid_from: string; valid_until: string | null; status: "active" | "archived" }>,
) {
  return apiRequest<DashboardTransportAssignment>(
    `/dashboard/transport/routes/${routeId}/assignments/${assignmentId}`,
    { method: "PATCH", body },
  );
}

export function deleteTransportAssignment(routeId: string, assignmentId: string) {
  return apiRequest<DashboardTransportAssignment>(
    `/dashboard/transport/routes/${routeId}/assignments/${assignmentId}`,
    { method: "DELETE" },
  );
}

export function fetchTransportPassengers(routeId: string) {
  return apiRequest<DashboardTransportPassenger[]>(`/dashboard/transport/routes/${routeId}/passengers`);
}

export function fetchTransportEvents(routeId: string) {
  return apiRequest<DashboardTransportEvent[]>(`/dashboard/transport/routes/${routeId}/events`);
}

export function sendTransportDelayAlert(
  routeId: string,
  body: { message: string; delay_minutes: number; channels?: string[]; bus_trip_id?: string | number | null },
) {
  return apiRequest<{ id: string; route_id: string; type?: string; message?: string; delay_minutes?: number; channels?: string[] }>(
    `/dashboard/transport/routes/${routeId}/delay-alert`,
    { method: "POST", body },
  );
}

export function logTransportDriverContact(
  routeId: string,
  body: { outcome: "called" | "no_answer" | "message_sent" | "wrong_number"; notes?: string },
) {
  return apiRequest<{ id: string; route_id: string; driver_phone?: string; outcome?: string; notes?: string }>(
    `/dashboard/transport/routes/${routeId}/contact-driver-log`,
    { method: "POST", body },
  );
}

export function fetchSchoolSettings() {
  return apiRequest<SchoolSettings>("/dashboard/school/settings");
}

export function updateSchoolSettings(body: Partial<SchoolSettings>) {
  return apiRequest<SchoolSettings>("/dashboard/school/settings", { method: "PATCH", body });
}

export function fetchSchoolIntegrations() {
  return apiRequest<SchoolIntegration[]>("/dashboard/school/integrations");
}

export function updateSchoolIntegration(
  integration: string,
  body: { provider?: string | null; status?: string | null; api_key?: string; config?: Record<string, unknown> },
) {
  return apiRequest<SchoolIntegration>(`/dashboard/school/integrations/${integration}`, { method: "PATCH", body });
}

export function testSchoolIntegration(integration: string) {
  return apiRequest<{ key: string; status: string; message: string }>(
    `/dashboard/school/integrations/${integration}/test`,
    { method: "POST" },
  );
}

export function fetchAuditLogs(params?: {
  page?: number;
  per_page?: number;
  actor_id?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  from?: string;
  to?: string;
}) {
  return apiRequest<AuditLog[]>("/dashboard/audit-logs", { params });
}

export function fetchRbacRoles() {
  return apiRequest<RbacRole[]>("/dashboard/rbac/roles");
}

export function createRbacRole(body: { key: string; name: string; permissions?: string[] }) {
  return apiRequest<RbacRole>("/dashboard/rbac/roles", { method: "POST", body });
}

export function fetchRbacPermissions() {
  return apiRequest<RbacPermission[]>("/dashboard/rbac/permissions");
}

export function fetchRbacMatrix() {
  return apiRequest<RbacMatrix>("/dashboard/rbac/matrix");
}

export function updateRbacMatrix(body: { roles: Array<{ key: string; permissions: string[] }> }) {
  return apiRequest<RbacMatrix>("/dashboard/rbac/matrix", { method: "PATCH", body });
}

export function fetchDashboardAdminAccounts() {
  return apiRequest<DashboardAdminAccount[]>("/dashboard/admin-accounts");
}

export function createDashboardAdminAccount(body: {
  name: string;
  email: string;
  password?: string;
  role_key: string;
  status?: "active" | "suspended";
}) {
  return apiRequest<DashboardAdminAccount>("/dashboard/admin-accounts", { method: "POST", body });
}

export function updateDashboardAdminRole(accountId: string, role_key: string) {
  return apiRequest<DashboardAdminAccount>(`/dashboard/admin-accounts/${accountId}/role`, {
    method: "PATCH",
    body: { role_key },
  });
}

export function updateDashboardAdminStatus(accountId: string, status: "active" | "suspended") {
  return apiRequest<DashboardAdminAccount>(`/dashboard/admin-accounts/${accountId}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export function fetchBroadcasts(params?: { page?: number; per_page?: number; status?: string; type?: string }) {
  return apiRequest<DashboardBroadcast[]>("/dashboard/broadcasts", { params });
}

export function createBroadcast(body: {
  title: string;
  body: string;
  type: "announcement" | "alert" | "reminder";
  target: { type: string; ids?: string[] };
  channels: string[];
  scheduled_at?: string | null;
  priority?: "low" | "normal" | "high" | "urgent";
}) {
  return apiRequest<DashboardBroadcast>("/dashboard/broadcasts", { method: "POST", body });
}

export function sendBroadcastNow(id: string) {
  return apiRequest<DashboardBroadcast>(`/dashboard/broadcasts/${id}/send`, { method: "POST" });
}

export function cancelBroadcast(id: string) {
  return apiRequest<DashboardBroadcast>(`/dashboard/broadcasts/${id}/cancel`, { method: "POST" });
}

export function fetchBroadcastDeliveries(id: string) {
  return apiRequest<BroadcastDeliveryCounts>(`/dashboard/broadcasts/${id}/deliveries`);
}

const avatarColors = ["#176B9A", "#7CC341", "#8B5CF6", "#F59E0B", "#10B981", "#EC4899"];
const subjectIcons = ["📘", "📗", "📙", "📕", "🧪", "💻"];

function toId(value: string | number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "ED";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function normalizedStatus(status?: string | null): "active" | "inactive" {
  if (status === "inactive" || status === "disabled" || status === "suspended") return "inactive";
  return "active";
}

export function mapApiSubjects(subjects: BackendSubject[] = []): Subject[] {
  return subjects.map((subject, index) => ({
    id: toId(subject.id),
    name: text(subject.name, "Unnamed subject"),
    code: text(subject.code, `SUB-${index + 1}`),
    weeklyPeriods: subject.weekly_periods ?? 0,
    icon: subjectIcons[index % subjectIcons.length],
    color: avatarColors[index % avatarColors.length],
  }));
}

export function mapApiSections(
  sections: BackendSection[] = [],
  gradeLevels: BackendGradeLevel[] = [],
): SchoolSection[] {
  return sections.map((section) => {
    const grade = gradeLevels.find((item) => toId(item.id) === toId(section.grade_level_id));
    const gradeName = text(grade?.name, text(grade?.code, "Unassigned grade"));
    const sectionName = text(section.name, text(section.code, "Unnamed section"));

    return {
      id: toId(section.id),
      gradeLevelId: toId(section.grade_level_id),
      name: gradeName && !sectionName.includes(gradeName) ? `${gradeName} / ${sectionName}` : sectionName,
      gradeLevel: gradeName,
      roomNumber: text(section.room_number, text(section.code, "-")),
      capacity: section.capacity ?? 0,
      enrolledCount: section.enrolled_count ?? section.students_count ?? 0,
      classTeacherId: toId(section.homeroom_teacher_id ?? section.class_teacher_id),
      classTeacherName: text(section.class_teacher_name, "Unassigned teacher"),
    };
  });
}

export function mapApiTeachers(teachers: BackendTeacher[] = []): Teacher[] {
  return teachers.map((teacher, index) => {
    const name = text(teacher.full_name, text(teacher.name, "Unnamed teacher"));

    return {
      id: toId(teacher.id),
      name,
      email: text(teacher.email, ""),
      phone: text(teacher.phone, ""),
      avatarInitials: initials(name),
      avatarColor: avatarColors[index % avatarColors.length],
      specialization: text(teacher.specialization, "Unassigned"),
      assignedSections: (teacher.assigned_sections ?? []).map((item) => toId(item.id)).filter(Boolean),
      assignedSubjects: (teacher.assigned_subjects ?? []).map((item) => toId(item.id)).filter(Boolean),
      kpiScore: 0,
      lessonsThisWeek: 0,
      notesCount: 0,
      activeStatus: normalizedStatus(teacher.status),
    };
  });
}

export function mapApiParents(parents: BackendParent[] = []): Parent[] {
  return parents.map((parent) => {
    const name = text(parent.full_name, text(parent.name, "Unnamed parent"));

    return {
      id: toId(parent.id),
      centralUserId: toId(parent.central_user_id),
      nationalId: parent.national_id_last4 ? `****${parent.national_id_last4}` : "",
      name,
      phone: text(parent.phone, ""),
      email: text(parent.email, ""),
      residentialAreaId: toId(parent.residential_area_id) || undefined,
      childrenIds: (parent.children ?? []).map((child) => toId(child.id)).filter(Boolean),
    };
  });
}

export function parentsFromStudents(students: Student[]): Parent[] {
  const parentsById = new Map<string, Parent>();

  students.forEach((student) => {
    const id = student.parentId || `parent-${student.id}`;
    const existing = parentsById.get(id);
    if (existing) {
      existing.childrenIds.push(student.id);
      return;
    }

    parentsById.set(id, {
      id,
      nationalId: "",
      name: student.parentName || "Unnamed parent",
      phone: "",
      email: "",
      childrenIds: [student.id],
    });
  });

  return Array.from(parentsById.values());
}

export function mapApiStudents(
  students: BackendStudent[] = [],
  sections: SchoolSection[] = [],
  parents: Parent[] = [],
): Student[] {
  return students.map((student, index) => {
    const name = text(student.full_name, text(student.name, "Unnamed student"));
    const section = sections.find((item) => item.id === toId(student.section_id));
    const resourceParent = student.parents?.[0];
    const parentId = toId(resourceParent?.id) || toId(student.parent_id);
    const parent = parents.find((item) => item.id === parentId);
    const parentName = text(resourceParent?.full_name, text(student.parent_name, parent?.name ?? "Unassigned parent"));

    return {
      id: toId(student.id),
      studentCode: text(student.admission_number, `STU-${student.id}`),
      name,
      avatarInitials: initials(name),
      avatarColor: avatarColors[index % avatarColors.length],
      gradeLevel: section?.gradeLevel ?? "Unassigned grade",
      sectionId: toId(student.section_id),
      sectionName: section?.name ?? "Unassigned section",
      parentId: parent?.id ?? parentId,
      parentName,
      residentialAreaId: toId(student.residential_area_id) || parent?.residentialAreaId || undefined,
      academicScore: 0,
      attendanceRate: 0,
      riskLevel: "low",
    };
  });
}

export function mapApiMedicalExcuses(
  excuses: BackendMedicalExcuse[] = [],
  students: Student[] = [],
  parents: Parent[] = [],
  sections: SchoolSection[] = [],
): Array<{
  id: string;
  studentId: string;
  studentName: string;
  sectionName: string;
  absenceDate: string;
  hospitalName: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  submittedBy: string;
}> {
  return excuses.map((excuse) => {
    const studentId = toId(excuse.student_id);
    const parentId = toId(excuse.parent_id);
    const student = students.find((item) => item.id === studentId);
    const parent = parents.find((item) => item.id === parentId || item.id === student?.parentId);
    const section = sections.find((item) => item.id === student?.sectionId);
    const status: "pending" | "approved" | "rejected" =
      excuse.status === "approved" || excuse.status === "rejected"
        ? excuse.status
        : "pending";

    return {
      id: toId(excuse.id),
      studentId,
      studentName: student?.name ?? `Student ${studentId || "-"}`,
      sectionName: student?.sectionName ?? section?.name ?? "Unassigned section",
      absenceDate: excuse.starts_on ?? excuse.ends_on ?? "",
      hospitalName: "Medical excuse",
      reason: text(excuse.reason, "No reason provided"),
      status,
      submittedBy: parent?.name ?? `Parent ${parentId || "-"}`,
    };
  });
}

function behaviorSeverityLabel(severity?: string | null): BehaviorNote["severityLabel"] {
  if (severity === "high" || severity === "severe") return "عالي";
  if (severity === "medium") return "متوسط";
  return "منخفض";
}

function behaviorStatusLabel(status?: string | null): BehaviorNote["statusLabel"] {
  if (status === "resolved") return "محلولة";
  if (status === "published" || status === "acknowledged" || status === "pending_review") return "قيد المعالجة";
  return "مفتوحة";
}

export function mapApiBehaviorNotes(notes: DashboardBehaviorNote[] = []): BehaviorNote[] {
  return notes.map((note) => ({
    id: note.id,
    studentId: toId(note.student_id),
    studentName: text(note.student_name, "Unassigned student"),
    studentSection: text(note.section_name, "Unassigned section"),
    teacherId: toId(note.created_by_teacher_id),
    teacherName: "Teacher",
    title: text(note.title, "Behavior note"),
    excerpt: text(note.body, "").slice(0, 120),
    description: text(note.body, ""),
    severityLabel: behaviorSeverityLabel(note.severity),
    statusLabel: behaviorStatusLabel(note.status),
    date: (note.created_at ?? new Date().toISOString()).split("T")[0],
    hasRecommendation: (note.recommendations_count ?? 0) > 0,
  }));
}

function mapTransportStatus(status?: string | null): BusRoute["status"] {
  if (status === "on_route" || status === "active" || status === "delayed") return "on_route";
  if (status === "arrived" || status === "completed") return "arrived";
  return "in_school";
}

export function mapApiTransportRoutes(routes: DashboardTransportRoute[] = []): BusRoute[] {
  return routes.map((route) => ({
    id: route.id,
    routeName: text(route.route_name, text(route.code, `Route ${route.id}`)),
    plateNumber: text(route.plate_number, "-"),
    driverName: text(route.driver_name, "غير محدد"),
    driverPhone: text(route.driver_phone, ""),
    supervisorName: text(route.supervisor_name, "غير محدد"),
    capacity: route.capacity ?? undefined,
    status: mapTransportStatus(route.status),
    assignedStudentsCount: route.assigned_students_count ?? 0,
    estimatedArrival: route.estimated_arrival ?? undefined,
  }));
}

function mapBroadcastType(type?: string | null): BroadcastMessage["type"] {
  if (type === "alert") return "تنبيه";
  if (type === "reminder") return "تعميم";
  return "تعميم";
}

export function mapApiBroadcasts(broadcasts: DashboardBroadcast[] = []): BroadcastMessage[] {
  return broadcasts.map((broadcast) => ({
    id: broadcast.id,
    title: text(broadcast.title, "Untitled broadcast"),
    body: text(broadcast.body, ""),
    target: text(broadcast.target_label, broadcast.target?.type ?? "all"),
    sentBy: text(broadcast.created_by?.name, "Dashboard"),
    date: (broadcast.sent_at ?? broadcast.scheduled_at ?? new Date().toISOString()).split("T")[0],
    type: mapBroadcastType(broadcast.type),
    reachCount: broadcast.reach_count ?? 0,
  }));
}
