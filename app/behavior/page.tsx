"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OperationsModal from "@/components/OperationsModal";
import { useDashboard } from "@/context/DashboardContext";
import { Shield, CheckCircle, PlusCircle, BookOpen, Check } from "lucide-react";

export default function BehaviorPage() {
  const { behaviorNotes, approveBehaviorNote, resolveBehaviorNote, hasApiPermission } = useDashboard();
  const canPublish = hasApiPermission("behavior.publish");
  const canReview = hasApiPermission("behavior.review");
  const canResolve = hasApiPermission("behavior.resolve");
  const [modalTargetId, setModalTargetId] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "open" | "processing" | "resolved">("open");

  const openCount = behaviorNotes.filter(n => n.statusLabel === "مفتوحة").length;
  const processingCount = behaviorNotes.filter(n => n.statusLabel === "قيد المعالجة").length;
  const resolvedCount = behaviorNotes.filter(n => n.statusLabel === "محلولة").length;

  const filteredNotes = behaviorNotes.filter(n => {
    if (activeTab === "open") return n.statusLabel === "مفتوحة";
    if (activeTab === "processing") return n.statusLabel === "قيد المعالجة";
    if (activeTab === "resolved") return n.statusLabel === "محلولة";
    return true;
  });

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <div className="main-content">
        <Header title="السلوك والمتابعة" subtitle="مراجعة الملاحظات السلوكية المرفوعة من المعلمين واعتمادها لإشعار ولي الأمر" />
        <main className="page-body">

          {/* Severity explanation / alert */}
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", padding: "16px 20px", marginBottom: 20,
            display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap",
          }}>
            <Shield size={24} color="var(--primary)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text-dark)", marginBottom: 4 }}>
                نظام حوكمة لائحة السلوك والمتابعة (التدخل التربوي)
              </div>
              <div style={{ fontSize: 12, color: "var(--text-light)", lineHeight: 1.6 }}>
                الملاحظات ذات الخطورة العالية تحتاج مراجعة شؤون الطلاب قبل نشرها لولي الأمر، ويمكن إضافة خطة متابعة أو استدعاء ولي الأمر عند الحاجة.
              </div>
            </div>
            <a href="/operations" className="btn btn-primary btn-sm">
              الانتقال للطلبات والاستدعاءات
            </a>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 18, borderBottom: "1px solid var(--border)", paddingBottom: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => setActiveTab("open")}
              className={`btn ${activeTab === "open" ? "btn-primary" : "btn-ghost"}`}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              ملاحظات بانتظار الاعتماد <span className="badge badge-red" style={{ background: activeTab === "open" ? "rgba(255,255,255,0.2)" : undefined, color: activeTab === "open" ? "white" : undefined }}>{openCount}</span>
            </button>
            <button
              onClick={() => setActiveTab("processing")}
              className={`btn ${activeTab === "processing" ? "btn-primary" : "btn-ghost"}`}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              قيد المعالجة والمتابعة <span className="badge badge-orange" style={{ background: activeTab === "processing" ? "rgba(255,255,255,0.2)" : undefined, color: activeTab === "processing" ? "white" : undefined }}>{processingCount}</span>
            </button>
            <button
              onClick={() => setActiveTab("resolved")}
              className={`btn ${activeTab === "resolved" ? "btn-primary" : "btn-ghost"}`}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              تم حلها وإغلاقها <span className="badge badge-green" style={{ background: activeTab === "resolved" ? "rgba(255,255,255,0.2)" : undefined, color: activeTab === "resolved" ? "white" : undefined }}>{resolvedCount}</span>
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`btn ${activeTab === "all" ? "btn-primary" : "btn-ghost"}`}
            >
              جميع السجلات ({behaviorNotes.length})
            </button>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">الملاحظات السلوكية المرصودة</div>
                <div className="card-subtitle">عرض الملاحظات ({filteredNotes.length}) في هذا التبويب</div>
              </div>
              
            </div>
            <div style={{ padding: "8px 0" }}>
              {filteredNotes.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                  ✨ لا توجد ملاحظات سلوكية في هذه القائمة حالياً.
                </div>
              ) : filteredNotes.map((note, idx) => (
                <div
                  key={note.id}
                  className="feed-item"
                  style={{ borderBottom: idx < behaviorNotes.length - 1 ? "1px solid var(--border-light)" : "none" }}
                >
                  {/* Severity indicator */}
                  <div style={{
                    width: 4, borderRadius: 4, alignSelf: "stretch", flexShrink: 0,
                    background: note.severityLabel === "عالي" ? "var(--danger)" : note.severityLabel === "متوسط" ? "var(--warning)" : "var(--green)",
                  }} />

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-dark)" }}>{note.title}</span>
                      <span className={`badge ${note.severityLabel === "عالي" ? "badge-red" : note.severityLabel === "متوسط" ? "badge-orange" : "badge-green"}`}>
                        <span className="dot" />{note.severityLabel}
                      </span>
                      <span className={`badge ${note.statusLabel === "مفتوحة" ? "badge-red" : note.statusLabel === "قيد المعالجة" ? "badge-orange" : "badge-green"}`}>
                        {note.statusLabel}
                      </span>
                      {note.hasRecommendation && (
                        <span className="badge badge-green" style={{ background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" }}>
                          مرفق خطة متابعة
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 13, color: "var(--text-dark)", lineHeight: 1.7, marginBottom: 8, background: "var(--bg-page)", padding: "10px 14px", borderRadius: "var(--radius-sm)", borderRight: "3px solid var(--border)" }}>
                      "{note.excerpt}"
                    </div>

                    <div style={{ display: "flex", gap: 16, fontSize: 11.5, color: "var(--text-muted)", flexWrap: "wrap" }}>
                      <span>👤 الطالب: <strong style={{ color: "var(--text-dark)" }}>{note.studentName}</strong></span>
                      <span>🏫 الشعبة: {note.studentSection}</span>
                      <span>👨‍🏫 راصد الملاحظة: {note.teacherName}</span>
                      <span>📅 التاريخ: {note.date}</span>
                    </div>
                  </div>

                  {/* Interactive Action Buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                    {note.statusLabel === "مفتوحة" && (canPublish || canReview) ? (
                      <>
                        {canPublish && <button
                          onClick={() => approveBehaviorNote(note.id)}
                          className="btn btn-green btn-sm"
                          style={{ justifyContent: "center" }}
                        >
                          <CheckCircle size={14} /> اعتماد وتوجيه لولي الأمر
                        </button>}
                        {canReview && !note.hasRecommendation && (
                          <button
                            onClick={() => { setModalTargetId(note.id); setModalOpen(true); }}
                            className="btn btn-outline btn-sm"
                            style={{ justifyContent: "center" }}
                          >
                            <PlusCircle size={14} /> إرفاق خطة متابعة
                          </button>
                        )}
                      </>
                    ) : note.statusLabel === "قيد المعالجة" && (canResolve || canReview) ? (
                      <>
                        {canResolve && <button
                          onClick={() => resolveBehaviorNote(note.id)}
                          className="btn btn-primary btn-sm"
                          style={{ justifyContent: "center", background: "var(--primary)" }}
                        >
                          <Check size={14} /> إغلاق الملف وحل الملاحظة
                        </button>}
                        {canReview && !note.hasRecommendation && (
                          <button
                            onClick={() => { setModalTargetId(note.id); setModalOpen(true); }}
                            className="btn btn-outline btn-sm"
                            style={{ justifyContent: "center" }}
                          >
                            <PlusCircle size={14} /> إرفاق خطة متابعة
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="badge badge-green" style={{ padding: "8px 12px" }}>
                        ✓ تم إغلاق الملاحظة ومعالجتها
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>

      <OperationsModal
        type={canReview && modalOpen ? "recommendation" : null}
        targetId={modalTargetId}
        onClose={() => { setModalOpen(false); setModalTargetId(undefined); }}
      />
    </div>
  );
}
