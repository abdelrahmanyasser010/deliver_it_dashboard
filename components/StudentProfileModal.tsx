"use client";

import React from "react";
import { useDashboard } from "@/context/DashboardContext";
import { Student } from "@/data/mockData";
import {
  X, GraduationCap, Bus, Shield, ClipboardCheck,
  BarChart3, Phone, UserCheck, Users, Calendar, FileText,
  TrendingUp, TrendingDown,
} from "lucide-react";

interface Props {
  student: Student | null;
  onClose: () => void;
}

function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{
      background: color + "12", border: `1px solid ${color}30`,
      borderRadius: "var(--radius)", padding: "10px 14px", textAlign: "center",
    }}>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function StudentProfileModal({ student, onClose }: Props) {
  const { students, behaviorNotes, busRoutes, sendParentWarning, apiStatus, hasApiPermission } = useDashboard();
  const canSendNotification = hasApiPermission("broadcasts.send");

  if (!student) return null;

  // Family siblings — same parentId
  const siblings = students.filter(s => s.parentId === student.parentId && s.id !== student.id);

  // This student's behavior notes
  const studentNotes = behaviorNotes.filter(n => n.studentId === student.id);

  // Bus route
  const bus = busRoutes.find(b => b.id === student.busRouteId);

  // Risk color
  const riskColor = apiStatus === "live" ? "var(--text-muted)" : student.riskLevel === "high" ? "var(--danger)" : student.riskLevel === "medium" ? "var(--warning)" : "var(--green)";
  const riskLabel = apiStatus === "live" ? "غير متاح" : student.riskLevel === "high" ? "خطر عالي" : student.riskLevel === "medium" ? "متابعة" : "مستقر";

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(18, 60, 86, 0.45)",
      backdropFilter: "blur(5px)", zIndex: 1000, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: "var(--bg-surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)", width: "100%", maxWidth: 680,
        maxHeight: "90vh", overflow: "hidden", direction: "rtl",
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column",
        animation: "modalZoom 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>

        {/* Header */}
        <div style={{
          padding: "18px 22px", borderBottom: "1px solid var(--border-light)",
          background: "var(--bg-page)", display: "flex", alignItems: "center", gap: 14, flexShrink: 0,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: student.avatarColor + "20", color: student.avatarColor,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 800, flexShrink: 0,
          }}>{student.avatarInitials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-dark)" }}>{student.name}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>{student.studentCode}</span>
              <span className="badge badge-gray" style={{ fontSize: 11 }}>{student.sectionName}</span>
              <span className={`badge ${apiStatus === "live" ? "badge-gray" : student.riskLevel === "high" ? "badge-red" : student.riskLevel === "medium" ? "badge-orange" : "badge-green"}`}>
                <span className="dot" />{riskLabel}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", flexShrink: 0 }}>
            <X size={20} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div style={{ overflow: "auto", flex: 1, padding: "18px 22px" }}>

          {/* Stats Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            <StatPill label="المعدل الأكاديمي" value={apiStatus === "live" ? "—" : `${student.academicScore}%`} color={apiStatus === "live" ? "var(--text-muted)" : student.academicScore >= 85 ? "var(--green)" : student.academicScore >= 70 ? "var(--warning)" : "var(--danger)"} />
            <StatPill label="نسبة الحضور" value={apiStatus === "live" ? "—" : `${student.attendanceRate}%`} color={apiStatus === "live" ? "var(--text-muted)" : student.attendanceRate >= 90 ? "var(--green)" : "var(--danger)"} />
            <StatPill label="الملاحظات السلوكية" value={studentNotes.length} color={studentNotes.length === 0 ? "var(--green)" : studentNotes.some(n => n.severityLabel === "عالي") ? "var(--danger)" : "var(--warning)"} />
          </div>

          {/* Info Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>

            {/* Academic Info */}
            <div style={{ background: "var(--bg-page)", borderRadius: "var(--radius)", padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-light)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <GraduationCap size={14} /> البيانات الأكاديمية
              </div>
              {[
                { label: "المرحلة الدراسية", value: student.gradeLevel },
                { label: "الفصل الدراسي", value: student.sectionName },
                { label: "الرقم المدرسي", value: student.studentCode },
                { label: "سنة التسجيل", value: apiStatus === "live" ? "—" : "2024 / 2025" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < 3 ? "1px solid var(--border-light)" : "none" }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dark)" }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Parent & Family Info */}
            <div style={{ background: "var(--bg-page)", borderRadius: "var(--radius)", padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-light)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <Users size={14} /> ولي الأمر والعائلة
              </div>
              {[
                { label: "اسم ولي الأمر", value: student.parentName },
                { label: "حالة الربط", value: student.parentName !== "—" ? "ولي أمر مرتبط" : "غير مرتبط" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border-light)" }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: i === 1 ? "var(--green)" : "var(--text-dark)" }}>{row.value}</span>
                </div>
              ))}
              {siblings.length > 0 ? (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>أشقاء في نفس المدرسة ({siblings.length}):</div>
                  {siblings.map(sib => (
                    <div key={sib.id} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "4px 8px", borderRadius: "var(--radius-sm)",
                      background: sib.avatarColor + "12", marginBottom: 4,
                    }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: sib.avatarColor + "25", color: sib.avatarColor,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 800,
                      }}>{sib.avatarInitials}</div>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-dark)" }}>{sib.name}</span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", marginRight: "auto" }}>{sib.sectionName}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>لا يوجد أشقاء مسجلون في المدرسة</div>
              )}
            </div>
          </div>

          {/* Bus Info */}
          <div style={{
            background: bus ? "#EFF6FF" : "var(--bg-page)",
            border: `1px solid ${bus ? "#BFDBFE" : "var(--border)"}`,
            borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 20,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <Bus size={22} color={bus ? "#176B9A" : "var(--text-muted)"} />
            {bus ? (
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 13.5, color: "var(--primary)" }}>{bus.routeName}</div>
                <div style={{ fontSize: 12, color: "var(--text-light)", marginTop: 3 }}>
                  السائق: {bus.driverName} — اللوحة: {bus.plateNumber}
                </div>
              </div>
            ) : (
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>الطالب لا يستخدم حافلة المدرسة — يأتي مع ولي أمره</span>
            )}
          </div>

          {/* Behavior Notes */}
          {studentNotes.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dark)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <Shield size={14} color="var(--danger)" /> الملاحظات السلوكية المسجلة ({studentNotes.length})
              </div>
              {studentNotes.map((note, idx) => (
                <div key={note.id} style={{
                  padding: "10px 14px", borderRadius: "var(--radius-sm)",
                  borderRight: `4px solid ${note.severityLabel === "عالي" ? "var(--danger)" : note.severityLabel === "متوسط" ? "var(--warning)" : "var(--green)"}`,
                  background: "var(--bg-page)", marginBottom: idx < studentNotes.length - 1 ? 8 : 0,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-dark)" }}>{note.title}</span>
                    <span className={`badge ${note.severityLabel === "عالي" ? "badge-red" : note.severityLabel === "متوسط" ? "badge-orange" : "badge-green"}`}>
                      {note.severityLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-light)" }}>{note.excerpt}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{note.teacherName} — {note.date}</div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {canSendNotification && <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => { sendParentWarning(student.id, "مراجعة الأداء العام"); onClose(); }}
              className="btn btn-outline btn-sm"
              style={{ flex: 1, justifyContent: "center" }}
            >
              <Phone size={14} /> إرسال إشعار لولي الأمر
            </button>
          </div>}
        </div>

        <style jsx global>{`
          @keyframes modalZoom {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}
