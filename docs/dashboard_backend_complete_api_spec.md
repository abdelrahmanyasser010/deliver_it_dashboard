> **تنبيه:** هذا الملف كان مواصفة قديمة قبل ربط الـ Dashboard الحالي. لا تستخدم أسماء الأدوار أو العقود الموجودة فيه كمصدر حقيقة. المرجع الحالي للواجهة هو `docs/API_INTEGRATION_STATUS.md` وكود Laravel/API docs في الـ Backend.

# EduBridge Dashboard - Complete Backend API Specification

هذه الوثيقة تكمل وتحسن تحليل لوحة التحكم `edubridge_dashboard` لبناء Backend API باستخدام Laravel 11.  
التحليل هنا مبني على ملفات الواجهة الحالية، ويغطي الصفحات، الـ tabs، المودالات، الأحداث، والجداول الناقصة التي لم تكن موجودة بالكامل في الوثيقة المختصرة.

---

## 1. الملاحظات الأساسية على التحليل السابق

التحليل السابق يغطي الهيكل العام للداشبورد، لكنه غير مكتمل للأسباب التالية:

- لوحة التحكم تحتوي على صفحة `/operations` كاملة غير موثقة.
- صفحة `/messages` ليست رسائل فقط، بل تحتوي على تقويم مدرسي وفعاليات وجدولة وتذكيرات.
- صفحة `/settings` تحتوي على RBAC كامل وحسابات إدارية وإعدادات تكامل، وليس `school-profile` فقط.
- صفحة `/configurator` تحتوي على wizard و canvas تفاعلي وعمليات drag/drop وربط وفصل وحذف وتعديل داخل المخطط.
- صفحة `/analytics` تحتوي على tabs وتحويل لخطة رعاية واستدعاء ولي أمر وفتح ملف طالب.
- الـ Header يحتوي على بحث شامل، تبديل الفصل الدراسي، تبديل الدور، إشعارات، وفتح ملف الطالب.
- صفحة `/login` غير موثقة.
- كثير من العمليات الحالية تظهر كـ toast في الواجهة، لكنها في الباك إند تحتاج APIs وجداول وسجل audit.

---

## 2. الوحدات الرئيسية في النظام

1. Authentication & Sessions
2. RBAC, Roles, Permissions, Admin Accounts
3. Academic Years, Terms, Grade Levels, Sections
4. Subjects, Curricula, Evaluation Templates
5. Teachers, Teacher Assignments, Substitutions
6. Students, Parents, Family Linking
7. Attendance, Absence Warnings, Medical Excuses
8. Behavior Notes, Recommendations, Parent Summons
9. Grades, Grade Sheets, Publishing
10. Transport, Bus Routes, GPS Events, Passengers
11. Messages, Broadcasts, Templates, Scheduling
12. School Calendar & Events
13. Operations Center
14. Analytics & Early Warning
15. Notifications
16. Configurator Wizard & Visual Canvas
17. External Integrations: Sehatty, Noor, SMS, Push, Teacher App, Parent App
18. Audit Logs

---

## 3. الجداول المطلوبة

### 3.1 Users, Auth, RBAC

#### `users`
- `id`
- `name`
- `email`
- `phone`
- `password`
- `type`: `admin | teacher | parent`
- `is_active`
- `last_login_at`
- `timestamps`

#### `roles`
- `id`
- `key`: `super_admin | student_affairs | academic | system_admin`
- `label`
- `short_label`
- `description`
- `is_system`
- `timestamps`

#### `permissions`
- `id`
- `key`
- `label`
- `module`
- `description`
- `timestamps`

#### `role_permissions`
- `id`
- `role_id`
- `permission_id`
- `enabled`
- `timestamps`

#### `admin_accounts`
- `id`
- `user_id`
- `role_id`
- `status`: `active | inactive`
- `created_by_user_id`
- `timestamps`

#### `sessions`
يمكن الاعتماد على Laravel Sanctum، لكن يلزم دعم:
- active term
- current role
- device metadata

---

### 3.2 Academic Structure

#### `academic_years`
- `id`
- `name`
- `start_date`
- `end_date`
- `is_current`
- `timestamps`

#### `academic_terms`
- `id`
- `academic_year_id`
- `name`
- `term_number`: `1 | 2 | 3 | summer`
- `start_date`
- `end_date`
- `is_active`
- `timestamps`

#### `grade_levels`
- `id`
- `name`
- `stage`
- `sort_order`
- `timestamps`

#### `sections`
- `id`
- `grade_level_id`
- `name`
- `room_number`
- `capacity`
- `homeroom_teacher_id`
- `neighborhood`
- `status`: `active | archived`
- `timestamps`

#### `subjects`
- `id`
- `grade_level_id`
- `name`
- `code`
- `weekly_periods`
- `icon`
- `color`
- `is_active`
- `timestamps`

---

### 3.3 Teachers & Assignments

#### `teachers`
- `id`
- `user_id`
- `name`
- `email`
- `phone`
- `national_id`
- `specialization`
- `avatar_initials`
- `avatar_color`
- `max_weekly_quota`
- `current_weekly_quota`
- `kpi_score`
- `active_status`: `active | on_leave | inactive`
- `timestamps`

#### `teacher_section_subject`
- `id`
- `teacher_id`
- `section_id`
- `subject_id`
- `allocated_periods`
- `is_homeroom`
- `academic_term_id`
- `timestamps`

#### `substitute_assignments`
- `id`
- `absent_teacher_id`
- `substitute_teacher_id`
- `section_id`
- `subject_id`
- `period_number`
- `date`
- `reason`
- `status`: `assigned | completed | cancelled`
- `created_by_user_id`
- `timestamps`

---

### 3.4 Students, Parents, Family Linking

#### `parents`
- `id`
- `user_id`
- `national_id`
- `name`
- `phone`
- `email`
- `neighborhood`
- `app_link_status`: `linked | pending | not_invited`
- `timestamps`

#### `students`
- `id`
- `student_code`
- `national_id`
- `full_name`
- `birth_date`
- `grade_level_id`
- `section_id`
- `parent_id`
- `bus_route_id`
- `avatar_initials`
- `avatar_color`
- `academic_score`
- `attendance_rate`
- `risk_level`: `low | medium | high`
- `status`: `active | transferred | archived`
- `timestamps`

#### `student_family_links`
- `id`
- `parent_id`
- `student_id`
- `relationship`
- `is_primary_guardian`
- `timestamps`

---

### 3.5 Attendance, Excuses, Permits

#### `attendance_records`
- `id`
- `student_id`
- `section_id`
- `date`
- `status`: `present | absent | late | excused`
- `source`: `teacher_app | dashboard | import`
- `notes`
- `recorded_by_user_id`
- `timestamps`

#### `absence_warnings`
- `id`
- `student_id`
- `warning_type`: `absence_limit | performance_followup | general`
- `reason`
- `sent_to_parent_id`
- `delivery_status`
- `created_by_user_id`
- `timestamps`

#### `medical_excuses`
- `id`
- `student_id`
- `absence_date`
- `hospital_name`
- `reason`
- `submitted_by_parent_id`
- `attachment_url`
- `sehatty_reference`
- `barcode_verified`
- `status`: `pending | approved | rejected`
- `reviewed_by_user_id`
- `reviewed_at`
- `rejection_reason`
- `timestamps`

#### `leave_permits`
- `id`
- `student_id`
- `parent_id`
- `request_time`
- `reason`
- `pickup_type`
- `gate_pass_code`
- `status`: `waiting_gate | released | rejected`
- `approved_by_user_id`
- `approved_at`
- `timestamps`

---

### 3.6 Behavior & Student Affairs

#### `behavior_records`
- `id`
- `student_id`
- `teacher_id`
- `section_id`
- `title`
- `excerpt`
- `description`
- `severity`: `low | medium | high`
- `status`: `open | processing | resolved`
- `points`
- `has_recommendation`
- `recorded_at`
- `approved_by_user_id`
- `approved_at`
- `resolved_by_user_id`
- `resolved_at`
- `timestamps`

#### `behavior_recommendations`
- `id`
- `behavior_record_id`
- `title`
- `description`
- `video_url`
- `created_by_user_id`
- `sent_to_parent_at`
- `timestamps`

#### `parent_summons`
- `id`
- `student_id`
- `parent_id`
- `reason`
- `meeting_date`
- `meeting_time`
- `supervisor_user_id`
- `status`: `scheduled | attended | rescheduled | cancelled`
- `reminder_sent_at`
- `created_by_user_id`
- `timestamps`

---

### 3.7 Grades

#### `evaluation_templates`
- `id`
- `academic_term_id`
- `name`
- `type`: `midterm | coursework | final | quiz`
- `max_score`
- `weight_percent`
- `date_label`
- `is_active`
- `timestamps`

#### `grade_sheets`
- `id`
- `section_id`
- `subject_id`
- `evaluation_template_id`
- `academic_term_id`
- `status`: `draft | approved | published | locked`
- `approved_by_user_id`
- `approved_at`
- `published_at`
- `timestamps`

#### `grade_entries`
- `id`
- `grade_sheet_id`
- `student_id`
- `score`
- `max_score`
- `teacher_id`
- `timestamps`

---

### 3.8 Transport

#### `bus_routes`
- `id`
- `route_name`
- `target_neighborhood`
- `driver_name`
- `driver_phone`
- `supervisor_name`
- `plate_number`
- `capacity`
- `status`: `in_school | on_route | arrived | inactive`
- `estimated_arrival`
- `timestamps`

#### `bus_route_students`
- `id`
- `bus_route_id`
- `student_id`
- `pickup_order`
- `pickup_location`
- `dropoff_location`
- `is_active`
- `timestamps`

#### `bus_tracking_events`
- `id`
- `bus_route_id`
- `lat`
- `lng`
- `speed`
- `status`
- `recorded_at`
- `timestamps`

#### `transport_alerts`
- `id`
- `bus_route_id`
- `alert_type`: `delay | emergency | arrival`
- `message`
- `sent_by_user_id`
- `sent_at`
- `timestamps`

---

### 3.9 Messages, Calendar, Notifications

#### `broadcast_messages`
- `id`
- `title`
- `body`
- `target_type`: `all_parents | section | grade | teachers | custom`
- `target_ref_id`
- `type`: `announcement | alert | congratulations`
- `sent_by_user_id`
- `scheduled_at`
- `sent_at`
- `status`: `draft | scheduled | sent | failed`
- `reach_count`
- `timestamps`

#### `message_templates`
- `id`
- `title`
- `body`
- `type`
- `created_by_user_id`
- `timestamps`

#### `school_events`
- `id`
- `title`
- `event_date`
- `event_time`
- `location`
- `category`: `assessment | parents_council | trip | admin_holiday`
- `target_type`
- `target_ref_id`
- `status`: `scheduled | live | completed | cancelled`
- `created_by_user_id`
- `timestamps`

#### `notifications`
- `id`
- `title`
- `body`
- `type`
- `notifiable_type`
- `notifiable_id`
- `created_by_user_id`
- `timestamps`

#### `notification_deliveries`
- `id`
- `notification_id`
- `recipient_user_id`
- `channel`: `push | sms | whatsapp | email | dashboard`
- `status`: `pending | sent | failed | read`
- `read_at`
- `sent_at`
- `failure_reason`
- `timestamps`

---

### 3.10 Configurator Canvas

#### `configurator_nodes`
- `id`
- `type`: `section | bus`
- `ref_type`: `section | bus_route`
- `ref_id`
- `x`
- `y`
- `label`
- `grade_level`
- `neighborhood`
- `room_number`
- `metadata` JSON
- `created_by_user_id`
- `timestamps`

#### `configurator_connections`
- `id`
- `from_node_id`
- `to_node_id`
- `connection_type`: `section_bus`
- `color`
- `created_by_user_id`
- `timestamps`

#### `configurator_snapshots`
- `id`
- `name`
- `nodes` JSON
- `connections` JSON
- `created_by_user_id`
- `timestamps`

---

### 3.11 Integrations & Audit

#### `integration_settings`
- `id`
- `key`
- `label`
- `provider`
- `config` JSON
- `status`: `active | inactive | error`
- `last_checked_at`
- `timestamps`

#### `audit_logs`
- `id`
- `actor_user_id`
- `action`
- `module`
- `entity_type`
- `entity_id`
- `old_values` JSON
- `new_values` JSON
- `ip_address`
- `user_agent`
- `timestamps`

---

## 4. API Design Standards

كل endpoint يرجع شكل موحد:

```json
{
  "success": true,
  "message": "تم تنفيذ العملية بنجاح",
  "data": {},
  "meta": {}
}
```

في الأخطاء:

```json
{
  "success": false,
  "message": "Validation error",
  "errors": {
    "field": ["الرسالة"]
  }
}
```

### Authentication
- كل APIs بعد الدخول محمية بـ Sanctum Bearer Token.
- كل عملية تعديل تسجل في `audit_logs`.
- كل عملية إرسال إشعار تسجل في `notifications` و `notification_deliveries`.

---

## 5. Auth & Login APIs

### `POST /api/v1/auth/login`
تسجيل دخول رسمي بالبريد وكلمة المرور.

Request:
```json
{
  "email": "admin@edubridge.edu.sa",
  "password": "secret",
  "remember": true
}
```

### `POST /api/v1/auth/demo-login`
تسجيل دخول تجريبي بالدور من شاشة الـ demo.

Request:
```json
{
  "role_key": "student_affairs"
}
```

### `POST /api/v1/auth/logout`

### `GET /api/v1/auth/me`
يرجع المستخدم الحالي، الدور، الصلاحيات، الفصل الدراسي النشط.

### `POST /api/v1/auth/forgot-password`

### `POST /api/v1/auth/switch-role`
مخصص للـ demo أو super admin.

Request:
```json
{
  "role_key": "academic"
}
```

---

## 6. Header & Global APIs

### `GET /api/v1/search`
البحث الشامل في الطلاب والمعلمين والشعب.

Query:
- `q`
- `limit_students`
- `limit_teachers`
- `limit_sections`

Response:
```json
{
  "students": [],
  "teachers": [],
  "sections": []
}
```

### `POST /api/v1/settings/switch-term`
تبديل الفصل الدراسي النشط.

Request:
```json
{
  "academic_term_id": 1
}
```

### `GET /api/v1/notifications`

### `POST /api/v1/notifications/mark-all-read`

### `POST /api/v1/notifications/{id}/read`

---

## 7. Executive Dashboard APIs

### `GET /api/v1/dashboard/stats`
يرجع:
- إجمالي الطلاب
- إجمالي المعلمين
- نسبة حضور اليوم
- الملاحظات المفتوحة
- الحافلات في الطريق
- التنبيهات الحديثة
- ملخص الأداء الأكاديمي

### `GET /api/v1/dashboard/behavior-feed`

### `GET /api/v1/dashboard/attendance-breakdown`

### `GET /api/v1/dashboard/teacher-kpis`

### `GET /api/v1/dashboard/bus-live-status`

---

## 8. Configurator APIs

### Wizard

#### `GET /api/v1/configurator/bootstrap`
يجلب:
- الصفوف
- الشعب
- المعلمين
- الطلاب
- أولياء الأمور
- الحافلات
- العلاقات الحالية

#### `POST /api/v1/sections`
إنشاء شعبة.

#### `POST /api/v1/teachers`
إضافة معلم.

#### `POST /api/v1/students`
إضافة طالب وربطه بولي أمر.

#### `POST /api/v1/bus-routes`
إضافة حافلة أو خط سير.

### Visual Canvas

#### `GET /api/v1/configurator/canvas`
جلب nodes و connections المحفوظة.

#### `POST /api/v1/configurator/canvas/auto-layout`
توليد layout من البيانات الحالية.

#### `POST /api/v1/configurator/nodes`
إضافة node من drag/drop.

#### `PATCH /api/v1/configurator/nodes/{id}/position`
تحديث مكان الكارت بعد السحب.

Request:
```json
{
  "x": 60,
  "y": 120
}
```

#### `DELETE /api/v1/configurator/nodes/{id}`
حذف كارت من المخطط، ولا يحذف الكيان الأصلي إلا لو تم إرسال `delete_entity=true`.

#### `POST /api/v1/configurator/connections`
ربط فصل بحافلة.

Request:
```json
{
  "from_node_id": 1,
  "to_node_id": 2,
  "connection_type": "section_bus"
}
```

#### `DELETE /api/v1/configurator/connections/{id}`

#### `POST /api/v1/configurator/check-conflicts`
فحص:
- فصول بدون حافلات
- فصول بدون معلمين
- كثافة الطلاب
- حافلات فوق السعة

#### `POST /api/v1/configurator/sections/{section}/teachers`
إسناد معلم من لوحة التفاصيل.

#### `DELETE /api/v1/configurator/sections/{section}/teachers/{teacher}`

#### `POST /api/v1/configurator/sections/{section}/students`
تسجيل طالب داخل شعبة من لوحة التفاصيل.

#### `DELETE /api/v1/configurator/sections/{section}/students/{student}`
نقل أو إزالة طالب من الشعبة.

#### `POST /api/v1/configurator/snapshots`
حفظ snapshot للمخطط.

---

## 9. Academic APIs

### `GET /api/v1/academic/structure`
يرجع الشعب والمواد.

### `POST /api/v1/sections`

### `PUT /api/v1/sections/{id}`

### `DELETE /api/v1/sections/{id}`

### `POST /api/v1/subjects`

### `PUT /api/v1/subjects/{id}`

### `DELETE /api/v1/subjects/{id}`

### `GET /api/v1/academic/quotas`

### `POST /api/v1/academic/allocations`

### `GET /api/v1/academic/export-pdf`

---

## 10. Schedule & Substitution APIs

### `GET /api/v1/schedules`
Query:
- `section_id`
- `academic_term_id`

### `POST /api/v1/schedules/slot`
تسكين أو تعديل حصة.

### `POST /api/v1/schedules/check-conflicts`
فحص التعارضات.

### `POST /api/v1/schedules/auto-generate`

### `POST /api/v1/schedules/publish`

### `GET /api/v1/substitutions`

### `POST /api/v1/substitutions`
تكليف معلم انتظار.

Request:
```json
{
  "absent_teacher_id": 7,
  "substitute_teacher_id": 1,
  "section_id": 1,
  "period_number": 3,
  "date": "2026-07-12",
  "reason": "إجازة رسمية"
}
```

### `PATCH /api/v1/substitutions/{id}/complete`

### `PATCH /api/v1/substitutions/{id}/cancel`

---

## 11. Students & Family APIs

### `GET /api/v1/students`
Filters:
- `q`
- `section_id`
- `grade_level_id`
- `risk_level`
- `bus_route_id`
- `parent_id`

### `POST /api/v1/students`
إضافة طالب وربطه بولي الأمر.

### `GET /api/v1/students/{id}`
ملف الطالب الكامل:
- البيانات الأكاديمية
- ولي الأمر والأشقاء
- الحضور
- السلوك
- الحافلة
- الخطر

### `PUT /api/v1/students/{id}`

### `DELETE /api/v1/students/{id}`

### `POST /api/v1/students/import-excel`

### `GET /api/v1/families`
العائلات التي لديها أكثر من طالب.

### `POST /api/v1/students/{id}/send-parent-warning`
إرسال إشعار ولي الأمر من صفحة الطلاب أو ملف الطالب.

### `POST /api/v1/students/{id}/summons`
إصدار استدعاء رسمي.

---

## 12. Teachers APIs

### `GET /api/v1/teachers`
Filters:
- `q`
- `specialization`
- `active_status`

### `POST /api/v1/teachers`

### `GET /api/v1/teachers/{id}`

### `PUT /api/v1/teachers/{id}`

### `PATCH /api/v1/teachers/{id}/status`

### `PUT /api/v1/teachers/{id}/homeroom`

### `GET /api/v1/teachers/{id}/kpi`

### `GET /api/v1/teachers/{id}/schedule`

---

## 13. Attendance APIs

### `GET /api/v1/attendance/summary`

### `GET /api/v1/attendance/section/{section}`
Query:
- `date`

### `POST /api/v1/attendance/batch-save`

### `POST /api/v1/attendance/notify-absent`

### `POST /api/v1/attendance/warnings`
إرسال إنذار حرمان.

### `GET /api/v1/attendance/at-risk`
قائمة الطلاب أصحاب حضور أقل من الحد.

### `GET /api/v1/medical-excuses`

### `POST /api/v1/medical-excuses`
من تطبيق ولي الأمر غالبا.

### `PATCH /api/v1/medical-excuses/{id}/approve`

### `PATCH /api/v1/medical-excuses/{id}/reject`

### `POST /api/v1/medical-excuses/{id}/verify-sehatty`

---

## 14. Operations Center APIs

هذه الصفحة غير موجودة في الوثيقة السابقة ويجب اعتبارها وحدة مستقلة.

### `GET /api/v1/operations/summary`
يرجع:
- طلبات الاستئذان المعلقة
- الأعذار الطبية المعلقة
- الاستدعاءات المجدولة
- تكليفات الانتظار اليوم

### Leave Permits

#### `GET /api/v1/leave-permits`

#### `POST /api/v1/leave-permits`
من تطبيق ولي الأمر.

#### `PATCH /api/v1/leave-permits/{id}/approve`
الموافقة وإبلاغ الأمن.

#### `PATCH /api/v1/leave-permits/{id}/reject`

### Medical Excuses

#### `GET /api/v1/medical-excuses`

#### `PATCH /api/v1/medical-excuses/{id}/approve`

#### `PATCH /api/v1/medical-excuses/{id}/reject`

### Parent Summons

#### `GET /api/v1/parent-summons`

#### `POST /api/v1/parent-summons`

#### `POST /api/v1/parent-summons/{id}/send-reminder`

#### `PATCH /api/v1/parent-summons/{id}/attended`

#### `PATCH /api/v1/parent-summons/{id}/reschedule`

### Substitutions

#### `GET /api/v1/substitutions`

#### `POST /api/v1/substitutions`

---

## 15. Grades APIs

### `GET /api/v1/evaluation-templates`

### `POST /api/v1/evaluation-templates`

### `GET /api/v1/grades`
Query:
- `section_id`
- `template_id`
- `subject_id`
- `academic_term_id`

### `POST /api/v1/grades/save-sheet`

### `POST /api/v1/grades/approve-section`
اعتماد درجات شعبة لقالب معين.

Request:
```json
{
  "section_id": 1,
  "template_id": "midterm"
}
```

### `POST /api/v1/grades/publish`

### `POST /api/v1/grades/re-publish`

### `POST /api/v1/grades/export-pdf`

### `POST /api/v1/grades/lock-sheet`

---

## 16. Behavior APIs

### `GET /api/v1/behavior`
Filters:
- `student_id`
- `status`
- `severity`
- `section_id`

### `POST /api/v1/behavior`
من تطبيق المعلم أو الداشبورد.

### `PATCH /api/v1/behavior/{id}/approve`
اعتماد وتوجيه لولي الأمر.

### `POST /api/v1/behavior/{id}/recommendations`
إرفاق خطة علاجية وفيديو.

### `PATCH /api/v1/behavior/{id}/resolve`
إغلاق الملف.

### `POST /api/v1/behavior/{id}/summons`
إصدار استدعاء مرتبط بالملاحظة.

---

## 17. Transport APIs

### `GET /api/v1/bus-routes`

### `POST /api/v1/bus-routes`

### `GET /api/v1/bus-routes/{id}`
يشمل:
- بيانات السائق
- الطلاب
- الحالة
- آخر GPS

### `PUT /api/v1/bus-routes/{id}`

### `DELETE /api/v1/bus-routes/{id}`

### `GET /api/v1/bus-routes/{id}/passengers`

### `POST /api/v1/bus-routes/{id}/passengers`

### `DELETE /api/v1/bus-routes/{id}/passengers/{student}`

### `POST /api/v1/bus-routes/{id}/contact-driver`
تسجيل محاولة الاتصال أو فتح رابط اتصال.

### `POST /api/v1/bus-routes/{id}/delay-alert`
تنبيه تأخر لأولياء الأمور.

### `GET /api/v1/bus-routes/live-map`

### `POST /api/v1/bus-routes/{id}/tracking-events`
من جهاز السائق أو التطبيق.

---

## 18. Messages & Calendar APIs

### Broadcasts

#### `GET /api/v1/messages`

#### `POST /api/v1/messages/broadcast`

#### `POST /api/v1/messages/schedule`
جدولة الإرسال.

#### `POST /api/v1/messages/{id}/resend`

#### `GET /api/v1/message-templates`

#### `POST /api/v1/message-templates`

#### `GET /api/v1/message-templates/default`
القالب الجاهز المستخدم في الواجهة.

### Calendar Events

#### `GET /api/v1/school-events`

#### `POST /api/v1/school-events`

Request:
```json
{
  "title": "مجلس الآباء والمعلمين",
  "event_date": "2026-07-18",
  "event_time": "05:00 مساءً - 08:00 مساءً",
  "location": "مسرح المدرسة",
  "category": "parents_council",
  "target_type": "all_parents"
}
```

#### `PUT /api/v1/school-events/{id}`

#### `DELETE /api/v1/school-events/{id}`

#### `POST /api/v1/school-events/{id}/send-reminder`

---

## 19. Analytics APIs

### `GET /api/v1/analytics/health-index`

### `GET /api/v1/analytics/early-warning`
يرجع الطلاب أصحاب `risk_level = medium/high` مع تشخيص تربوي.

### `POST /api/v1/analytics/interventions`
إحالة للموجه الطلابي وإدراج خطة رعاية.

Request:
```json
{
  "student_id": 3,
  "plan_type": "student_care",
  "notes": "انخفاض درجات وغياب متكرر"
}
```

### `POST /api/v1/analytics/students/{student}/summons`

### `GET /api/v1/analytics/sections-performance`

### `GET /api/v1/analytics/teacher-kpis`

### `GET /api/v1/analytics/export`

---

## 20. Settings APIs

### RBAC

#### `GET /api/v1/settings/rbac`
يرجع الأدوار والصلاحيات والمصفوفة.

#### `PATCH /api/v1/settings/rbac/permissions`
تحديث صلاحية واحدة.

Request:
```json
{
  "role_key": "student_affairs",
  "permission_key": "can_manage_attendance",
  "enabled": true
}
```

#### `POST /api/v1/settings/rbac/save-matrix`
حفظ واعتماد المصفوفة.

### Admin Accounts

#### `GET /api/v1/admin-accounts`

#### `POST /api/v1/admin-accounts`

#### `PATCH /api/v1/admin-accounts/{id}/role`

#### `PATCH /api/v1/admin-accounts/{id}/status`

#### `DELETE /api/v1/admin-accounts/{id}`

### Integrations

#### `GET /api/v1/settings/integrations`

#### `PUT /api/v1/settings/integrations/{key}`

#### `POST /api/v1/settings/integrations/{key}/test`

Integrations:
- `teacher_app_api`
- `parent_app_api`
- `sehatty_verify`
- `sms_gateway_unifonic`
- `noor_sync`

### School Profile

#### `GET /api/v1/settings/school-profile`

#### `PUT /api/v1/settings/school-profile`

---

## 21. Event Matrix

| الواجهة | الحدث | API | Method | ملاحظات |
|---|---|---|---|---|
| Login | دخول رسمي | `/api/v1/auth/login` | POST | يرجع token + user + role |
| Login | دخول سريع تجريبي | `/api/v1/auth/demo-login` | POST | demo فقط |
| Login | إظهار/إخفاء كلمة المرور | Frontend only | - | لا يحتاج API |
| Header | البحث الشامل | `/api/v1/search?q=` | GET | طلاب/معلمين/شعب |
| Header | فتح ملف طالب من البحث | `/api/v1/students/{id}` | GET | يفتح modal |
| Header | نتيجة معلم | `/api/v1/teachers?q=` | GET | ثم توجيه للصفحة |
| Header | تبديل الترم | `/api/v1/settings/switch-term` | POST | يحفظ في الجلسة |
| Header | تبديل الدور | `/api/v1/auth/switch-role` | POST | demo/super admin |
| Header | جرس الإشعارات | `/api/v1/notifications` | GET | مركز التنبيهات |
| Sidebar | تسجيل الخروج | `/api/v1/auth/logout` | POST | ثم `/login` |
| Dashboard | KPIs | `/api/v1/dashboard/stats` | GET | المؤشرات العامة |
| Configurator | تبديل wizard/canvas | Frontend only | - | حالة واجهة |
| Configurator | إضافة شعبة | `/api/v1/sections` | POST | من wizard |
| Configurator | إضافة معلم | `/api/v1/teachers` | POST | من wizard |
| Configurator | تسجيل طالب | `/api/v1/students` | POST | مع ولي الأمر |
| Configurator | إضافة حافلة | `/api/v1/bus-routes` | POST | خط سير |
| Configurator | توليد مخطط | `/api/v1/configurator/canvas/auto-layout` | POST | nodes/connections |
| Configurator | سحب كارت للمخطط | `/api/v1/configurator/nodes` | POST | node |
| Configurator | تحريك كارت | `/api/v1/configurator/nodes/{id}/position` | PATCH | x/y |
| Configurator | ربط فصل بحافلة | `/api/v1/configurator/connections` | POST | connection |
| Configurator | فصل رابط | `/api/v1/configurator/connections/{id}` | DELETE | unlink |
| Configurator | حذف كارت | `/api/v1/configurator/nodes/{id}` | DELETE | visual only by default |
| Configurator | إسناد معلم لفصل | `/api/v1/configurator/sections/{section}/teachers` | POST | inspector |
| Configurator | حذف معلم من فصل | `/api/v1/configurator/sections/{section}/teachers/{teacher}` | DELETE | inspector |
| Configurator | تسجيل طالب داخل شعبة | `/api/v1/configurator/sections/{section}/students` | POST | inspector |
| Academic | إضافة شعبة | `/api/v1/sections` | POST | |
| Academic | إضافة مادة | `/api/v1/subjects` | POST | |
| Schedule | اختيار شعبة | `/api/v1/schedules?section_id=` | GET | |
| Schedule | تفاصيل حصة | `/api/v1/schedules/slot/{id}` | GET | أو من البيانات المحملة |
| Schedule | فحص تعارضات | `/api/v1/schedules/check-conflicts` | POST | |
| Schedule | تكليف انتظار | `/api/v1/substitutions` | POST | |
| Students | بحث وتصفية | `/api/v1/students` | GET | q/risk |
| Students | تسجيل طالب جديد | `/api/v1/students` | POST | modal |
| Students | فتح ملف طالب | `/api/v1/students/{id}` | GET | modal |
| Students | إرسال إنذار | `/api/v1/students/{id}/send-parent-warning` | POST | |
| Students | إصدار استدعاء | `/api/v1/students/{id}/summons` | POST | |
| Teachers | بحث وتصفية | `/api/v1/teachers` | GET | q/specialization |
| Teachers | إضافة معلم | `/api/v1/teachers` | POST | modal |
| Teachers | إسناد احتياط | `/api/v1/substitutions` | POST | |
| Attendance | ملخص الحضور | `/api/v1/attendance/summary` | GET | |
| Attendance | اختيار شعبة | `/api/v1/attendance/section/{id}` | GET | |
| Attendance | إنذار حرمان | `/api/v1/attendance/warnings` | POST | |
| Attendance | فتح الأعذار | `/api/v1/medical-excuses` | GET | عبر operations |
| Operations | تبويب أذونات الخروج | `/api/v1/leave-permits` | GET | |
| Operations | اعتماد إذن خروج | `/api/v1/leave-permits/{id}/approve` | PATCH | إشعار الأمن |
| Operations | تبويب الأعذار الطبية | `/api/v1/medical-excuses` | GET | |
| Operations | اعتماد عذر طبي | `/api/v1/medical-excuses/{id}/approve` | PATCH | تعديل الحضور |
| Operations | رفض عذر طبي | `/api/v1/medical-excuses/{id}/reject` | PATCH | إشعار ولي الأمر |
| Operations | تبويب الاستدعاءات | `/api/v1/parent-summons` | GET | |
| Operations | إرسال تذكير استدعاء | `/api/v1/parent-summons/{id}/send-reminder` | POST | |
| Operations | تبويب حصص الانتظار | `/api/v1/substitutions` | GET | |
| Operations | إصدار تكليف انتظار | `/api/v1/substitutions` | POST | |
| Grades | اختيار قالب تقييم | `/api/v1/grades?template_id=` | GET | |
| Grades | اختيار شعبة | `/api/v1/grades?section_id=` | GET | |
| Grades | تصدير PDF | `/api/v1/grades/export-pdf` | POST | |
| Grades | اعتماد ونشر | `/api/v1/grades/approve-section` | POST | |
| Behavior | تبويبات الحالة | `/api/v1/behavior?status=` | GET | |
| Behavior | اعتماد ملاحظة | `/api/v1/behavior/{id}/approve` | PATCH | إشعار ولي الأمر |
| Behavior | إرفاق خطة علاجية | `/api/v1/behavior/{id}/recommendations` | POST | |
| Behavior | إغلاق ملاحظة | `/api/v1/behavior/{id}/resolve` | PATCH | |
| Transport | عرض خطوط النقل | `/api/v1/bus-routes` | GET | |
| Transport | عرض ركاب حافلة | `/api/v1/bus-routes/{id}/passengers` | GET | |
| Transport | فتح ملف طالب | `/api/v1/students/{id}` | GET | |
| Transport | اتصال بالسائق | `/api/v1/bus-routes/{id}/contact-driver` | POST | log |
| Transport | تنبيه تأخر | `/api/v1/bus-routes/{id}/delay-alert` | POST | إشعار أهالي |
| Messages | إرسال تعميم | `/api/v1/messages/broadcast` | POST | |
| Messages | جدولة إرسال | `/api/v1/messages/schedule` | POST | |
| Messages | استخدام قالب | `/api/v1/message-templates/default` | GET | |
| Messages | إضافة فعالية | `/api/v1/school-events` | POST | |
| Messages | تذكير فعالية | `/api/v1/school-events/{id}/send-reminder` | POST | |
| Analytics | الإنذار المبكر | `/api/v1/analytics/early-warning` | GET | |
| Analytics | إحالة لخطة رعاية | `/api/v1/analytics/interventions` | POST | |
| Analytics | استدعاء ولي أمر | `/api/v1/analytics/students/{id}/summons` | POST | |
| Analytics | مقارنة الشعب | `/api/v1/analytics/sections-performance` | GET | |
| Analytics | مؤشرات المعلمين | `/api/v1/analytics/teacher-kpis` | GET | |
| Settings | حفظ RBAC | `/api/v1/settings/rbac/save-matrix` | POST | |
| Settings | تعديل صلاحية | `/api/v1/settings/rbac/permissions` | PATCH | |
| Settings | إضافة حساب إداري | `/api/v1/admin-accounts` | POST | |
| Settings | تغيير دور حساب | `/api/v1/admin-accounts/{id}/role` | PATCH | |
| Settings | اختبار تكامل | `/api/v1/settings/integrations/{key}/test` | POST | |

---

## 22. صلاحيات RBAC المطلوبة

الصلاحيات المستخدمة فعليا في الواجهة:

- `can_manage_behavior`
- `can_manage_attendance`
- `can_manage_academic`
- `can_manage_grades`
- `can_manage_operations`
- `can_manage_fleet`
- `can_manage_rbac`
- `can_send_broadcasts`

اقتراح صلاحيات إضافية للباك إند:

- `can_view_dashboard`
- `can_manage_students`
- `can_manage_teachers`
- `can_manage_configurator`
- `can_manage_calendar`
- `can_manage_integrations`
- `can_export_reports`
- `can_impersonate_demo_roles`

---

## 23. قواعد Business Logic مهمة

### Attendance
- اعتماد عذر طبي يحول سجل الغياب إلى `excused`.
- رفض عذر طبي يرسل إشعار لولي الأمر.
- إنذار الحرمان يسجل في `absence_warnings` ويرسل Push/SMS.

### Behavior
- الملاحظات عالية الخطورة يفضل ألا تنشر مباشرة إلا بعد:
  - اعتماد إداري
  - أو إرفاق خطة علاجية
  - أو إصدار استدعاء
- إغلاق الملاحظة يرسل إشعار للمعلم وولي الأمر.

### Grades
- لا تظهر الدرجات في تطبيق ولي الأمر إلا بعد `approved/published`.
- يمكن إعادة إرسال إشعار الاعتماد لو كانت منشورة بالفعل.
- كل قالب تقييم له وزن ودرجة عظمى.

### Operations
- إذن الخروج عند اعتماده يولد/يفعل `gate_pass_code`.
- تكليف الانتظار يرسل إشعار لتطبيق المعلم.
- تذكير الاستدعاء يسجل آخر وقت إرسال لتجنب spam.

### Transport
- تنبيه التأخر يرسل فقط للطلاب المرتبطين بالمسار.
- حالة الحافلة تؤثر على عرض الخريطة والتطبيق.

### Configurator
- حذف node من المخطط لا يعني حذف الكيان الأصلي إلا بخيار صريح.
- ربط section بـ bus في canvas يجب أن ينعكس على `sections.bus_route_id` أو جدول ربط مناسب.
- `auto-layout` لا يغير البيانات الأساسية، فقط المخطط.

---

## 24. أولويات تنفيذ Laravel

### Phase 1 - Core
1. Auth + Sanctum
2. Users/Roles/Permissions/Admin Accounts
3. Academic Years/Terms/Sections/Subjects
4. Students/Parents/Teachers
5. Dashboard Stats

### Phase 2 - Daily Operations
1. Attendance
2. Medical Excuses
3. Leave Permits
4. Parent Summons
5. Substitutions
6. Notifications

### Phase 3 - Academic Control
1. Schedules
2. Grades Templates
3. Grade Sheets
4. Publishing & PDF Export
5. Teacher KPIs

### Phase 4 - Communication & Transport
1. Broadcasts
2. Message Templates
3. School Events
4. Bus Routes
5. Tracking & Delay Alerts

### Phase 5 - Configurator & Analytics
1. Configurator Nodes/Connections
2. Auto-layout
3. Early Warning
4. Interventions
5. Reports and exports

---

## 25. النتيجة

هذه النسخة تغطي الصفحات التالية:

- `/login`
- `/`
- `/configurator`
- `/operations`
- `/students`
- `/teachers`
- `/academic`
- `/schedule`
- `/behavior`
- `/attendance`
- `/grades`
- `/transport`
- `/messages`
- `/analytics`
- `/settings`

وتغطي العناصر المشتركة:

- Header
- Sidebar
- Student Profile Modal
- Operations Modal
- Toast/Notifications
- RBAC Permission Gates

بالتالي هذه الوثيقة أقرب لأن تكون مرجع بناء الباك إند الكامل للداشبورد الحالي، وليست مجرد ملخص عام.
