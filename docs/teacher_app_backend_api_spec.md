# EduBridge Teacher App - Backend API Specification

وثيقة مواصفات الباك إند لتطبيق المعلم في منظومة EduBridge.  
هذه الوثيقة مخصصة لتطبيق المعلم، لكنها تذكر نقاط التكامل الضرورية مع تطبيق ولي الأمر/الطالب ولوحة التحكم لأن كثيرًا من أحداث المعلم تنتج عنها إشعارات وتحديثات في التطبيقات الأخرى.

---

## 1. الهدف

توفير REST API موحد لتطبيق المعلم يدعم:

- تسجيل دخول المعلم وإدارة الجلسة.
- عرض فصول المعلم وجدوله اليومي والأسبوعي.
- رصد حضور وغياب الطلاب أثناء الحصة.
- إنشاء الواجبات وإرسال إشعارات لأولياء الأمور.
- إضافة الملاحظات السلوكية ومتابعة حالتها.
- فتح محادثات مع أولياء الأمور مرتبطة بالملاحظات.
- إنشاء الاختبارات وإدخال الدرجات.
- رفع المرفقات وإرسال الإشعارات.
- مزامنة البيانات مع لوحة التحكم وتطبيق ولي الأمر.

---

## 2. Headers & Authentication

كل الطلبات بعد تسجيل الدخول تستخدم Bearer Token:

```http
Authorization: Bearer {token}
Accept-Language: ar
X-Platform: android|ios
X-App-Type: teacher
```

يفضل استخدام Laravel Sanctum أو JWT بشرط دعم:

- Access token.
- Refresh token.
- Device token لتسجيل FCM.
- إبطال جلسة جهاز واحد عند logout.

---

## 3. Response Format

### Success

```json
{
  "success": true,
  "message": "تم تنفيذ العملية بنجاح",
  "data": {},
  "meta": {}
}
```

### Error

```json
{
  "success": false,
  "message": "حدث خطأ",
  "errors": {
    "field": ["رسالة الخطأ"]
  }
}
```

---

## 4. Core Workflows

### 4.1 Assignments Workflow

1. المعلم يختار فصلًا من فصوله.
2. ينشئ واجبًا جديدًا مع عنوان، وصف، تاريخ تسليم، ومرفقات.
3. يمكنه اختيار `notify_parents = true`.
4. الخادم يحفظ الواجب والمرفقات.
5. الخادم يرسل Push Notification من نوع `new_assignment` لأولياء أمور طلاب الفصل والطلاب.
6. يظهر الواجب في تطبيق ولي الأمر/الطالب داخل Academic Hub.

### 4.2 Attendance Workflow

1. المعلم يفتح الحصة الحالية من الجدول.
2. الخادم يرجع قائمة الطلاب بحالة افتراضية `present`.
3. المعلم يعدل حالات الطلاب إلى `absent` أو `late`.
4. عند الإرسال، الخادم يحفظ السجلات.
5. الخادم يحدث نسبة حضور الطالب.
6. الخادم يرسل إشعارًا لولي الأمر فقط للطلاب الغائبين أو المتأخرين.

### 4.3 Behavior Notes Workflow

1. المعلم يفتح ملف الطالب ويضيف ملاحظة سلوكية.
2. الخادم يحفظها بحالة `open`.
3. الخادم يمكنه توليد توصيات أو ربط محتوى توعوي حسب الشدة/النوع.
4. يتم إرسال إشعار `behavior_note` لولي الأمر.
5. ولي الأمر يقر بالاطلاع، فتتحول الحالة إلى `in_progress`.
6. يمكن فتح Chat مرتبط بالملاحظة.
7. المعلم يغلق الملاحظة عند حلها وتصبح `resolved`.

### 4.4 Grades Workflow

1. المعلم ينشئ اختبارًا أو يستخدم قالب تقييم موجود.
2. يدخل درجات الطلاب.
3. الخادم يحفظ الدرجات في grade sheet.
4. حسب سياسة المدرسة:
   - إما تنشر مباشرة.
   - أو تنتظر اعتماد لوحة التحكم.
5. عند النشر يتم إرسال إشعار `grade_published`.

---

## 5. Database Tables

### 5.1 `teachers`

- `id`
- `user_id`
- `name`
- `email`
- `phone`
- `national_id`
- `specialization`
- `avatar_url`
- `active_status`: `active | on_leave | inactive`
- `max_weekly_quota`
- `current_weekly_quota`
- `kpi_score`
- `timestamps`

### 5.2 `teacher_section_subject`

- `id`
- `teacher_id`
- `section_id`
- `subject_id`
- `academic_term_id`
- `allocated_periods`
- `is_homeroom`
- `timestamps`

### 5.3 `teaching_sessions`

يمثل الحصة الفعلية من جدول المعلم.

- `id`
- `teacher_id`
- `section_id`
- `subject_id`
- `schedule_id`
- `academic_term_id`
- `date`
- `day_of_week`
- `period_number`
- `starts_at`
- `ends_at`
- `status`: `scheduled | active | completed | cancelled`
- `timestamps`

### 5.4 `attendance_records`

- `id`
- `teaching_session_id`
- `student_id`
- `section_id`
- `teacher_id`
- `date`
- `status`: `present | absent | late | excused`
- `notes`
- `submitted_at`
- `timestamps`

### 5.5 `attendance_drafts`

- `id`
- `teaching_session_id`
- `teacher_id`
- `records` JSON
- `last_saved_at`
- `timestamps`

### 5.6 `assignments`

- `id`
- `teacher_id`
- `section_id`
- `subject_id`
- `title`
- `description`
- `due_date`
- `notify_parents`
- `status`: `draft | published | archived`
- `published_at`
- `timestamps`

### 5.7 `assignment_attachments`

- `id`
- `assignment_id`
- `file_name`
- `file_url`
- `mime_type`
- `size`
- `timestamps`

### 5.8 `behavior_notes`

- `id`
- `student_id`
- `teacher_id`
- `section_id`
- `title`
- `description`
- `severity`: `low | medium | high`
- `status`: `open | in_progress | resolved`
- `visibility` JSON
- `parent_acknowledged_at`
- `resolved_at`
- `timestamps`

### 5.9 `behavior_note_timeline`

- `id`
- `behavior_note_id`
- `actor_user_id`
- `event_type`: `created | parent_acknowledged | message_sent | recommendation_added | resolved`
- `payload` JSON
- `created_at`

### 5.10 `behavior_recommendations`

- `id`
- `behavior_note_id`
- `title`
- `description`
- `video_url`
- `source`: `system | supervisor | teacher`
- `timestamps`

### 5.11 `chats`

- `id`
- `behavior_note_id`
- `teacher_id`
- `parent_id`
- `student_id`
- `status`: `open | closed`
- `last_message_at`
- `timestamps`

### 5.12 `chat_messages`

- `id`
- `chat_id`
- `sender_user_id`
- `message`
- `attachment_url`
- `read_at`
- `timestamps`

### 5.13 `exams`

- `id`
- `teacher_id`
- `section_id`
- `subject_id`
- `academic_term_id`
- `title`
- `description`
- `exam_date`
- `max_score`
- `status`: `draft | published | locked`
- `timestamps`

### 5.14 `exam_grades`

- `id`
- `exam_id`
- `student_id`
- `score`
- `notes`
- `timestamps`

### 5.15 Shared Tables

هذه الجداول مشتركة مع الداشبورد وتطبيق ولي الأمر:

- `users`
- `students`
- `parents`
- `sections`
- `subjects`
- `schedules`
- `notifications`
- `notification_deliveries`
- `device_tokens`
- `files`
- `audit_logs`

---

## 6. Authentication APIs

### `POST /api/v1/teacher/auth/login`

Request:

```json
{
  "identifier": "teacher@edubridge.sa",
  "password": "secret"
}
```

Response:

```json
{
  "token": "access_token",
  "refresh_token": "refresh_token",
  "teacher": {
    "id": 1,
    "name": "نورة الشمري",
    "specialization": "الرياضيات"
  }
}
```

### `POST /api/v1/teacher/auth/logout`

### `POST /api/v1/teacher/auth/refresh-token`

### `GET /api/v1/teacher/auth/me`

---

## 7. Profile & Device APIs

### `GET /api/v1/teacher/profile`

### `PATCH /api/v1/teacher/profile`

### `POST /api/v1/teacher/profile/avatar`

### `PATCH /api/v1/teacher/profile/language`

### `POST /api/v1/teacher/devices`

Request:

```json
{
  "fcm_token": "device_token",
  "platform": "android",
  "device_name": "Samsung"
}
```

### `DELETE /api/v1/teacher/devices/{id}`

---

## 8. My Classes APIs

### `GET /api/v1/teacher/classes`

يرجع كل الفصول المرتبطة بالمعلم مع المادة وعدد الطلاب.

### `GET /api/v1/teacher/classes/active-now`

يرجع الفصل الذي له حصة حالية الآن.

### `GET /api/v1/teacher/classes/{section}/students`

Query:
- `include=performance,attendance,bus,parent`

يرجع:
- بيانات الطلاب.
- ولي الأمر.
- نسبة الحضور.
- المعدل الأكاديمي.
- risk level.

### `GET /api/v1/teacher/students/{student}`

ملف طالب مختصر للمعلم.

---

## 9. Schedule APIs

### `GET /api/v1/teacher/schedule`

Query:
- `week_start`
- `academic_term_id`

### `GET /api/v1/teacher/schedule/today`

### `GET /api/v1/teacher/schedule/current-session`

### `GET /api/v1/teacher/sessions/{session}`

تفاصيل حصة واحدة:
- الفصل.
- المادة.
- الطلاب.
- حالة رصد الحضور.
- الواجبات المرتبطة.

---

## 10. Attendance APIs

### `GET /api/v1/teacher/attendance/session/{session}/students`

يرجع قائمة الطلاب للحصة الحالية، كلهم `present` افتراضيًا لو لا يوجد draft أو submit سابق.

Response:

```json
{
  "session": {
    "id": 501,
    "section_name": "الصف الخامس / شعبة أ",
    "subject_name": "الرياضيات",
    "period_number": 3
  },
  "students": [
    {
      "id": 1001,
      "name": "أحمد محمد",
      "status": "present"
    }
  ]
}
```

### `POST /api/v1/teacher/attendance/submit`

Request:

```json
{
  "session_id": 501,
  "records": [
    { "student_id": 1001, "status": "present" },
    { "student_id": 1002, "status": "absent" },
    { "student_id": 1003, "status": "late", "notes": "تأخر 10 دقائق" }
  ],
  "notify_parents": true
}
```

Rules:
- لا يمكن للمعلم إرسال حضور لحصة لا تخصه.
- لا يمكن إرسال الرصد مرتين إلا بصلاحية تعديل.
- `absent` يرسل `attendance_absent`.
- `late` يرسل `attendance_late`.

### `POST /api/v1/teacher/attendance/draft`

يحفظ مسودة رصد الغياب.

### `GET /api/v1/teacher/attendance/history`

Query:
- `section_id`
- `date_from`
- `date_to`

---

## 11. Assignments APIs

### `POST /api/v1/teacher/assignments`

Request:

```json
{
  "section_id": 101,
  "subject_id": 5,
  "title": "حل تدريبات النحو",
  "description": "حل الأسئلة من صفحة 20 إلى 23",
  "due_date": "2026-07-18",
  "attachments": ["file_id_1"],
  "notify_parents": true
}
```

### `GET /api/v1/teacher/assignments`

Query:
- `section_id`
- `subject_id`
- `status`

### `GET /api/v1/teacher/assignments/{assignment}`

### `PATCH /api/v1/teacher/assignments/{assignment}`

### `DELETE /api/v1/teacher/assignments/{assignment}`

### `POST /api/v1/teacher/assignments/{assignment}/publish`

### `POST /api/v1/teacher/assignments/{assignment}/notify`

إعادة إرسال إشعار الواجب.

---

## 12. Behavior Notes APIs

### `POST /api/v1/teacher/behavior-notes`

Request:

```json
{
  "student_id": 1003,
  "section_id": 101,
  "title": "ألفاظ غير مؤدبة",
  "description": "استخدم الطالب ألفاظاً غير مناسبة أثناء الفسحة",
  "severity": "high",
  "visibility": ["parents", "teachers"]
}
```

### `GET /api/v1/teacher/behavior-notes`

Query:
- `status`
- `severity`
- `student_id`
- `section_id`

### `GET /api/v1/teacher/behavior-notes/{note}`

يرجع:
- تفاصيل الملاحظة.
- timeline.
- التوصيات.
- المحادثة المرتبطة إن وجدت.

### `PATCH /api/v1/teacher/behavior-notes/{note}/status`

Request:

```json
{
  "status": "resolved"
}
```

### `POST /api/v1/teacher/behavior-notes/{note}/recommendations`

إضافة توصية من المعلم، أو قبول توصية مولدة من النظام.

### `POST /api/v1/teacher/behavior-notes/{note}/open-chat`

يفتح أو يرجع المحادثة المرتبطة بالملاحظة.

---

## 13. Chat APIs

### `GET /api/v1/teacher/chats`

يرجع محادثات المعلم مع أولياء الأمور، وغالبًا تكون مرتبطة بملاحظة سلوكية.

### `GET /api/v1/teacher/chats/{chat}/messages`

Query:
- `before_id`
- `limit`

### `POST /api/v1/teacher/chats/{chat}/messages`

Request:

```json
{
  "message": "نرجو متابعة الأمر في المنزل.",
  "attachment_file_id": null
}
```

### `PATCH /api/v1/teacher/chats/{chat}/read`

### `PATCH /api/v1/teacher/chats/{chat}/close`

---

## 14. Exams & Grades APIs

### `POST /api/v1/teacher/exams`

Request:

```json
{
  "section_id": 101,
  "subject_id": 5,
  "title": "اختبار منتصف الفصل",
  "exam_date": "2026-07-20",
  "max_score": 100
}
```

### `GET /api/v1/teacher/exams`

Query:
- `section_id`
- `subject_id`
- `status`

### `GET /api/v1/teacher/exams/{exam}`

### `PATCH /api/v1/teacher/exams/{exam}`

### `POST /api/v1/teacher/exams/{exam}/grades`

Request:

```json
{
  "grades": [
    { "student_id": 1001, "score": 88 },
    { "student_id": 1002, "score": 95 }
  ],
  "publish": false
}
```

### `POST /api/v1/teacher/exams/{exam}/publish`

ينشر الدرجات أو يرسلها للداشبورد للاعتماد حسب إعدادات المدرسة.

### `POST /api/v1/teacher/exams/{exam}/lock`

---

## 15. Files APIs

### `POST /api/v1/teacher/files`

رفع ملف مرفق لواجب أو محادثة أو توصية.

Form-data:
- `file`
- `purpose`: `assignment | chat | behavior_recommendation | avatar`

### `DELETE /api/v1/teacher/files/{file}`

---

## 16. Notifications APIs

### `GET /api/v1/teacher/notifications`

### `PATCH /api/v1/teacher/notifications/{notification}/read`

### `PATCH /api/v1/teacher/notifications/read-all`

### Notification Types

- `attendance_absent`
- `attendance_late`
- `new_assignment`
- `behavior_note`
- `behavior_acknowledged`
- `new_message`
- `grade_published`
- `substitute_assignment`
- `school_event`

---

## 17. Shared Parent/Student Integration

هذه endpoints لا يستخدمها المعلم مباشرة، لكنها تتأثر بأحداث المعلم:

### Parent sees assignments

- `GET /api/v1/parent/students/{student}/assignments`
- `GET /api/v1/parent/students/{student}/assignments/pending`

### Parent sees attendance

- `GET /api/v1/parent/students/{student}/attendance`
- `GET /api/v1/parent/students/{student}/attendance/summary`

### Parent acknowledges behavior note

- `POST /api/v1/parent/behavior-notes/{note}/acknowledge`

Request:

```json
{
  "acknowledged": true,
  "parent_comment": "تم الاطلاع وسأتابع ابني"
}
```

### Parent chat reply

- `POST /api/v1/parent/chats/{chat}/messages`

---

## 18. Event Matrix

| الشاشة | الحدث | API | Method | النتيجة |
|---|---|---|---|---|
| Login | تسجيل دخول | `/api/v1/teacher/auth/login` | POST | token + profile |
| Login | تسجيل خروج | `/api/v1/teacher/auth/logout` | POST | إبطال token |
| Home | بيانات المعلم | `/api/v1/teacher/auth/me` | GET | profile + permissions |
| Classes | عرض فصولي | `/api/v1/teacher/classes` | GET | قائمة الفصول |
| Classes | الفصل الحالي | `/api/v1/teacher/classes/active-now` | GET | حصة الآن |
| Classes | طلاب فصل | `/api/v1/teacher/classes/{section}/students` | GET | طلاب وأداء |
| Schedule | الجدول الأسبوعي | `/api/v1/teacher/schedule` | GET | جدول |
| Schedule | جدول اليوم | `/api/v1/teacher/schedule/today` | GET | حصص اليوم |
| Schedule | الحصة الحالية | `/api/v1/teacher/schedule/current-session` | GET | session |
| Attendance | فتح رصد الحصة | `/api/v1/teacher/attendance/session/{session}/students` | GET | قائمة الطلاب |
| Attendance | حفظ مسودة | `/api/v1/teacher/attendance/draft` | POST | draft |
| Attendance | إرسال واعتماد | `/api/v1/teacher/attendance/submit` | POST | حفظ + إشعار |
| Assignments | إنشاء واجب | `/api/v1/teacher/assignments` | POST | واجب + إشعار |
| Assignments | واجبات فصل | `/api/v1/teacher/assignments?section_id=` | GET | قائمة |
| Assignments | تعديل واجب | `/api/v1/teacher/assignments/{id}` | PATCH | تحديث |
| Assignments | حذف واجب | `/api/v1/teacher/assignments/{id}` | DELETE | حذف/أرشفة |
| Behavior | إضافة ملاحظة | `/api/v1/teacher/behavior-notes` | POST | note + notification |
| Behavior | ملاحظاتي | `/api/v1/teacher/behavior-notes` | GET | قائمة |
| Behavior | تغيير الحالة | `/api/v1/teacher/behavior-notes/{id}/status` | PATCH | open/in_progress/resolved |
| Behavior | فتح Chat | `/api/v1/teacher/behavior-notes/{id}/open-chat` | POST | chat |
| Chat | رسائل محادثة | `/api/v1/teacher/chats/{chat}/messages` | GET | messages |
| Chat | إرسال رسالة | `/api/v1/teacher/chats/{chat}/messages` | POST | message + notification |
| Exams | إنشاء اختبار | `/api/v1/teacher/exams` | POST | exam |
| Exams | إدخال درجات | `/api/v1/teacher/exams/{exam}/grades` | POST | grades |
| Exams | نشر درجات | `/api/v1/teacher/exams/{exam}/publish` | POST | parent notification |
| Files | رفع مرفق | `/api/v1/teacher/files` | POST | file_id |
| Notifications | قراءة التنبيهات | `/api/v1/teacher/notifications` | GET | notifications |

---

## 19. Enums

### Attendance Status

| Value | Arabic |
|---|---|
| `present` | حاضر |
| `absent` | غائب |
| `late` | متأخر |
| `excused` | غائب بعذر |

### Behavior Severity

| Value | Arabic |
|---|---|
| `low` | منخفض |
| `medium` | متوسط |
| `high` | عالي |

### Behavior Status

| Value | Arabic |
|---|---|
| `open` | مفتوحة |
| `in_progress` | قيد المعالجة |
| `resolved` | محلولة |

### Assignment Status

| Value | Arabic |
|---|---|
| `draft` | مسودة |
| `published` | منشور |
| `archived` | مؤرشف |

### Exam Status

| Value | Arabic |
|---|---|
| `draft` | مسودة |
| `published` | منشور |
| `locked` | مقفل |

---

## 20. Permissions

صلاحيات مقترحة لتطبيق المعلم:

- `teacher_view_classes`
- `teacher_view_schedule`
- `teacher_submit_attendance`
- `teacher_manage_assignments`
- `teacher_create_behavior_notes`
- `teacher_resolve_behavior_notes`
- `teacher_chat_with_parents`
- `teacher_manage_exams`
- `teacher_submit_grades`
- `teacher_upload_files`

---

## 21. Audit & Security Rules

- أي إرسال حضور يسجل في `audit_logs`.
- أي نشر واجب أو درجة أو ملاحظة يرسل notification delivery logs.
- المعلم لا يستطيع الوصول إلا لفصوله وطلابه.
- المعلم لا يستطيع تعديل درجات بعد `locked`.
- حذف الواجب يفضل أن يكون soft delete أو archive لو تم نشره بالفعل.
- ملفات الرفع يجب أن تمر بفحص النوع والحجم.
- كل Chat يجب أن يكون مرتبطًا بمعلم وولي أمر وطالب ضمن علاقة صحيحة.

---

## 22. Implementation Priority

### Phase 1
- Auth
- Profile
- My Classes
- Schedule
- Attendance submit/draft

### Phase 2
- Assignments
- File upload
- Notifications

### Phase 3
- Behavior Notes
- Parent acknowledgment integration
- Chat

### Phase 4
- Exams
- Grades
- Publishing/approval workflow

### Phase 5
- KPIs
- Reports
- Offline sync support
