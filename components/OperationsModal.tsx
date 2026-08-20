"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { X, UserPlus, BookOpen, AlertTriangle, CheckCircle, Plus } from "lucide-react";
import { BackendResidentialArea, createResidentialArea, dashboardErrorMessage, fetchResidentialAreas } from "@/lib/dashboardApi";

interface ModalProps {
  type: "add_student" | "add_teacher" | "recommendation" | "summons" | null;
  targetId?: string;
  onClose: () => void;
}

export default function OperationsModal({ type, targetId, onClose }: ModalProps) {
  const {
    teachers,
    sections,
    addStudent,
    addTeacher,
    attachRecommendation,
    issueParentSummons,
    hasApiPermission,
    showToast,
  } = useDashboard();

  const [stuName, setStuName] = useState("");
  const [stuSection, setStuSection] = useState(sections[0]?.id || "");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [residentialAreas, setResidentialAreas] = useState<BackendResidentialArea[]>([]);
  const [residentialAreaId, setResidentialAreaId] = useState("");
  const [newAreaMode, setNewAreaMode] = useState(false);
  const [newAreaCity, setNewAreaCity] = useState("");
  const [newAreaName, setNewAreaName] = useState("");
  const [savingArea, setSavingArea] = useState(false);

  const teacherSpecializations = useMemo(
    () => Array.from(new Set(teachers.map((teacher) => teacher.specialization?.trim()).filter(Boolean))) as string[],
    [teachers],
  );
  const [tName, setTName] = useState("");
  const [tEmail, setTEmail] = useState("");
  const [tPhone, setTPhone] = useState("");
  const [tSpec, setTSpec] = useState(teacherSpecializations[0] || "");
  const [customSpecMode, setCustomSpecMode] = useState(false);
  const [customSpec, setCustomSpec] = useState("");

  const [recTitle, setRecTitle] = useState("خطة متابعة سلوكية");
  const [recDesc, setRecDesc] = useState("يرجى متابعة الخطة والتوصيات المرفقة والتواصل مع إدارة المدرسة عند الحاجة.");

  const [sumReason, setSumReason] = useState("متابعة حالة الطالب مع إدارة المدرسة");
  const [sumDate, setSumDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [sumTime, setSumTime] = useState("10:30");

  useEffect(() => {
    if (type !== "add_student") return;
    let cancelled = false;
    fetchResidentialAreas()
      .then((areas) => {
        if (cancelled) return;
        setResidentialAreas(areas);
        setResidentialAreaId((current) => current || String(areas[0]?.id || ""));
      })
      .catch(() => {
        if (!cancelled) setResidentialAreas([]);
      });
    return () => { cancelled = true; };
  }, [type]);

  const saveResidentialArea = async () => {
    if (!newAreaCity.trim() || !newAreaName.trim()) return;
    if (!hasApiPermission("people.manage")) {
      showToast("الصلاحيات", "لا تملك صلاحية إضافة حي سكني جديد.", "error");
      return;
    }
    setSavingArea(true);
    try {
      const area = await createResidentialArea({ city: newAreaCity.trim(), name: newAreaName.trim() });
      setResidentialAreas((prev) => [...prev.filter((item) => String(item.id) !== String(area.id)), area].sort((a, b) => `${a.city}-${a.name}`.localeCompare(`${b.city}-${b.name}`, "ar")));
      setResidentialAreaId(String(area.id));
      setNewAreaMode(false);
      setNewAreaCity("");
      setNewAreaName("");
      showToast("تمت إضافة الحي", `تمت إضافة ${area.name} في ${area.city}.`, "success");
    } catch (error) {
      showToast("تعذر إضافة الحي", dashboardErrorMessage(error), "error");
    } finally {
      setSavingArea(false);
    }
  };

  if (!type) return null;

  const selectedSection = sections.find((section) => section.id === stuSection);
  const selectedSpecialization = customSpecMode ? customSpec.trim() : tSpec.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (type === "add_student") {
      if (!selectedSection) return;
      addStudent({
        name: stuName.trim(),
        avatarInitials: stuName.split(" ").slice(0, 2).map((word) => word[0]).join(""),
        avatarColor: "#176B9A",
        gradeLevel: selectedSection.gradeLevel,
        sectionId: selectedSection.id,
        sectionName: selectedSection.name,
        parentId: "",
        parentName: parentName.trim() || "ولي الأمر",
        parentPhone: parentPhone.trim(),
        residentialAreaId: residentialAreaId || undefined,
        academicScore: 0,
        attendanceRate: 0,
        riskLevel: "low",
      });
    } else if (type === "add_teacher") {
      if (!selectedSpecialization) return;
      addTeacher({
        name: tName.trim(),
        email: tEmail.trim(),
        phone: tPhone.trim(),
        avatarInitials: tName.split(" ").slice(0, 2).map((word) => word[0]).join(""),
        avatarColor: "#7CC341",
        specialization: selectedSpecialization,
        assignedSections: [],
        assignedSubjects: [],
        activeStatus: "active",
      });
    } else if (type === "recommendation" && targetId) {
      attachRecommendation(targetId, recTitle.trim(), recDesc.trim());
    } else if (type === "summons" && targetId) {
      issueParentSummons(targetId, sumReason.trim(), sumDate, sumTime);
    }

    onClose();
  };

  const titles = {
    add_student: "تسجيل طالب جديد وربطه بولي أمره",
    add_teacher: "إضافة معلم جديد وتحديد تخصصه",
    recommendation: "إرفاق خطة متابعة لولي الأمر",
    summons: "إنشاء استدعاء رسمي لولي الأمر",
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal" style={{ maxWidth: 540, direction: "rtl" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={iconBoxStyle}>
              {(type === "add_student" || type === "add_teacher") && <UserPlus size={18} />}
              {type === "recommendation" && <BookOpen size={18} />}
              {type === "summons" && <AlertTriangle size={18} />}
            </div>
            <div>
              <div className="card-title">{titles[type]}</div>
              <div className="card-subtitle">سيتم الحفظ وفق بيانات المدرسة والصلاحيات المتاحة للحساب.</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm" aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {type === "add_student" && (
              <>
                <Field label="اسم الطالب الثلاثي">
                  <input required className="form-input" type="text" placeholder="مثال: عمر محمد القحطاني" value={stuName} onChange={(e) => setStuName(e.target.value)} />
                </Field>
                <Field label="اسم ولي الأمر">
                  <input required className="form-input" type="text" placeholder="مثال: محمد القحطاني" value={parentName} onChange={(e) => setParentName(e.target.value)} />
                </Field>
                <Field label="رقم جوال ولي الأمر">
                  <input required className="form-input" type="tel" placeholder="0501234567" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} />
                </Field>
                <Field label="الشعبة الدراسية">
                  <select required className="form-input" value={stuSection} onChange={(e) => setStuSection(e.target.value)}>
                    <option value="" disabled>اختر الشعبة</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>{section.name}</option>
                    ))}
                  </select>
                  {selectedSection && (
                    <div className="small-readable" style={{ marginTop: 6 }}>
                      المستوى: {selectedSection.gradeLevel} — السعة الحالية: {selectedSection.enrolledCount} من {selectedSection.capacity || "غير محدد"}
                    </div>
                  )}
                </Field>
                <Field label="الحي السكني للطالب وولي الأمر">
                  {!newAreaMode ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <select className="form-input" value={residentialAreaId} onChange={(e) => setResidentialAreaId(e.target.value)} style={{ flex: 1 }}>
                        <option value="">غير محدد</option>
                        {residentialAreas.map((area) => (
                          <option key={String(area.id)} value={String(area.id)}>{area.city} — {area.name}</option>
                        ))}
                      </select>
                      {hasApiPermission("people.manage") && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNewAreaMode(true)} title="إضافة حي جديد">
                          <Plus size={15} /> حي جديد
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "center" }}>
                      <input className="form-input" value={newAreaCity} onChange={(e) => setNewAreaCity(e.target.value)} placeholder="المدينة، مثال: الرياض" />
                      <input className="form-input" value={newAreaName} onChange={(e) => setNewAreaName(e.target.value)} placeholder="اسم الحي" />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" className="btn btn-primary btn-sm" disabled={savingArea || !newAreaCity.trim() || !newAreaName.trim()} onClick={saveResidentialArea}>{savingArea ? "جارٍ الحفظ..." : "إضافة"}</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNewAreaMode(false)}>إلغاء</button>
                      </div>
                    </div>
                  )}
                </Field>
                <div className="small-readable">يتم تحديد المستوى تلقائيًا من الشعبة المختارة، ويُستخدم الحي نفسه في سجل الطالب وولي الأمر عند إنشاء الربط لأول مرة.</div>
              </>
            )}

            {type === "add_teacher" && (
              <>
                <Field label="اسم المعلم">
                  <input required className="form-input" type="text" placeholder="مثال: صالح العوفي" value={tName} onChange={(e) => setTName(e.target.value)} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="البريد الإلكتروني">
                    <input required className="form-input" type="email" placeholder="name@example.com" value={tEmail} onChange={(e) => setTEmail(e.target.value)} />
                  </Field>
                  <Field label="رقم الجوال">
                    <input required className="form-input" type="tel" placeholder="0501234567" value={tPhone} onChange={(e) => setTPhone(e.target.value)} />
                  </Field>
                </div>
                <Field label="التخصص الأكاديمي">
                  {!customSpecMode ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <select required className="form-input" value={tSpec} onChange={(e) => setTSpec(e.target.value)} style={{ flex: 1 }}>
                        <option value="" disabled>اختر تخصصًا</option>
                        {teacherSpecializations.map((specialization) => (
                          <option key={specialization} value={specialization}>{specialization}</option>
                        ))}
                      </select>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCustomSpecMode(true)} title="إضافة تخصص جديد">
                        <Plus size={15} /> تخصص جديد
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input required autoFocus className="form-input" value={customSpec} onChange={(e) => setCustomSpec(e.target.value)} placeholder="اكتب التخصص الجديد" style={{ flex: 1 }} />
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setCustomSpecMode(false); setCustomSpec(""); }}>اختيار موجود</button>
                    </div>
                  )}
                  <div className="small-readable" style={{ marginTop: 6 }}>
                    التخصص يُحفظ مع ملف المعلم. توزيع المواد والشعب يتم لاحقًا من التوزيع الأكاديمي، ولا يُنشأ تلقائيًا من هذه النافذة.
                  </div>
                </Field>
              </>
            )}

            {type === "recommendation" && (
              <>
                <Field label="عنوان خطة المتابعة">
                  <input required className="form-input" type="text" value={recTitle} onChange={(e) => setRecTitle(e.target.value)} />
                </Field>
                <Field label="نص التوصية لولي الأمر">
                  <textarea required className="form-input" rows={4} value={recDesc} onChange={(e) => setRecDesc(e.target.value)} style={{ height: "auto", resize: "vertical" }} />
                </Field>
                <div className="small-readable" style={{ padding: "10px 12px", background: "var(--primary-50)", borderRadius: "var(--radius)" }}>
                  سيتم إرسال خطة المتابعة والتوصية لولي الأمر بدون مرفقات غير موجودة في النظام.
                </div>
              </>
            )}

            {type === "summons" && (
              <>
                <Field label="سبب الاستدعاء">
                  <textarea required className="form-input" rows={3} value={sumReason} onChange={(e) => setSumReason(e.target.value)} style={{ height: "auto", resize: "vertical" }} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="تاريخ المقابلة">
                    <input required className="form-input" type="date" value={sumDate} onChange={(e) => setSumDate(e.target.value)} />
                  </Field>
                  <Field label="الوقت">
                    <input required className="form-input" type="time" value={sumTime} onChange={(e) => setSumTime(e.target.value)} />
                  </Field>
                </div>
                <div className="small-readable" style={{ padding: "10px 12px", background: "var(--warning-50, #fff8e8)", borderRadius: "var(--radius)" }}>
                  سيظهر الاستدعاء داخل تطبيق ولي الأمر، ويُطلب إشعار على الهاتف عند تفعيل الإشعارات على جهازه.
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
            <button type="submit" className="btn btn-primary">
              <CheckCircle size={15} />
              {type === "add_student" && "تسجيل الطالب"}
              {type === "add_teacher" && "إضافة المعلم"}
              {type === "recommendation" && "حفظ وإرسال الخطة"}
              {type === "summons" && "إرسال الاستدعاء"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-light)", display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const iconBoxStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: "var(--radius)",
  background: "var(--primary-100)",
  color: "var(--primary)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
