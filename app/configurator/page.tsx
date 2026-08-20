"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import { useDashboard } from "@/context/DashboardContext";
import {
  Network, Plus, Trash2, ZoomIn, ZoomOut, Maximize,
  AlertTriangle, CheckCircle, Download, Save, Info,
  GraduationCap, Users, Bus, BookOpen, Shield, X,
  ChevronLeft, Layers, Check, ArrowRight, Sparkles, Filter,
  MapPin, SortAsc, HelpCircle, CheckSquare, ListFilter, UserPlus, Phone,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type NodeType = "section" | "bus";

interface CanvasNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  label: string;
  sublabel?: string;
  color: string;
  gradeLevel?: string;
  neighborhood?: string;
  roomNumber?: string;
  teachersCount: number;
  studentsCount: number;
  parentsCount: number;
  assignedTeachers: string[];
  assignedStudents: string[];
  driverName?: string;
  driverPhone?: string;
  plateNumber?: string;
}

interface Connection {
  id: string;
  fromId: string;
  toId: string;
  color: string;
}


// ─── Helpers ─────────────────────────────────────────────────────────────────

let nodeSeq = 3000;
const newId = () => `node_${++nodeSeq}_${Date.now()}`;

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ConfiguratorPage() {
  const {
    teachers, students, sections, busRoutes, showToast,
    canvasConfig, saveConfiguratorCanvas,
  } = useDashboard();

  // ── Top Level Directional Mode ──────────────────────────────────────────
  const [mainTab, setMainTab] = useState<"wizard" | "canvas">("canvas");
  const [focusMode, setFocusMode] = useState(false);

  // ── Canvas State ──────────────────────────────────────────────────────────
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState({ x: 30, y: 30 });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // ── Smart Filters & Sorting State ───────────────────────────────────────
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"default" | "neighborhood" | "name">("default");
  const [activeToolboxTab, setActiveToolboxTab] = useState<"sections" | "buses">("sections");

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.toggle("workspace-focus", focusMode && mainTab === "canvas");
    return () => document.body.classList.remove("workspace-focus");
  }, [focusMode, mainTab]);

  // ── Derived & Filtered ────────────────────────────────────────────────────
  const selectedNode = nodes.find(n => n.id === selectedId) ?? null;

  const filteredSections = sections.filter(sec => gradeFilter === "all" || sec.gradeLevel === gradeFilter);

  const displayNodes = nodes.filter(n => {
    if (gradeFilter === "all") return true;
    if (n.type === "section" && n.gradeLevel) return n.gradeLevel === gradeFilter;
    if (n.type === "bus") return true;
    return true;
  });

  const sortedDisplayNodes = [...displayNodes].sort((a, b) => {
    if (sortBy === "neighborhood") {
      return (a.neighborhood || "z").localeCompare(b.neighborhood || "z", "ar");
    }
    if (sortBy === "name") {
      return a.label.localeCompare(b.label, "ar");
    }
    return 0;
  });

  // ── Coordinate helper ─────────────────────────────────────────────────────
  const domCoords = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top  - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // ── Drag Logic ────────────────────────────────────────────────────────────
  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const { x, y } = domCoords(e.clientX, e.clientY);
    setDraggingId(id);
    setDragOffset({ x: x - node.x, y: y - node.y });
    setSelectedId(id);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (draggingId) {
      const { x, y } = domCoords(e.clientX, e.clientY);
      const newX = Math.round((x - dragOffset.x) / 10) * 10;
      const newY = Math.round((y - dragOffset.y) / 10) * 10;
      setNodes(prev => prev.map(n => n.id === draggingId ? { ...n, x: newX, y: newY } : n));
    } else if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan(p => ({ x: p.x + dx / 5, y: p.y + dy / 5 }));
    }
  }, [draggingId, dragOffset, isPanning, panStart, domCoords]);

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
    setIsPanning(false);
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains("canvas-bg") || (e.target as HTMLElement).tagName === "svg" || (e.target as HTMLElement).tagName === "rect") {
      setSelectedId(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  // ── Drop existing resources from Toolbox (visual layout only) ────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("nodeType") as NodeType;
    const sourceId = e.dataTransfer.getData("nodeSourceId");
    if (!type || !sourceId) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.round(((e.clientX - rect.left - pan.x) / zoom - 140) / 10) * 10;
    const y = Math.round(((e.clientY - rect.top - pan.y) / zoom - 70) / 10) * 10;
    const visualId = type === "section" ? `sec_${sourceId}` : `bus_${sourceId}`;

    const existing = nodes.find((node) => node.id === visualId);
    if (existing) {
      setNodes((prev) => prev.map((node) => node.id === visualId ? { ...node, x, y } : node));
      setSelectedId(visualId);
      showToast("تم نقل العنصر", "تم تحديث موضع العنصر داخل المخطط فقط.", "success");
      return;
    }

    if (type === "section") {
      const sec = sections.find((item) => item.id === sourceId);
      if (!sec) return;
      const sectionStudents = students.filter((student) => student.sectionId === sec.id);
      const classTeacher = teachers.find((teacher) => teacher.id === sec.classTeacherId);
      const relatedTeachers = teachers.filter((teacher) => teacher.assignedSections?.includes(sec.id));
      const assignedTeachers = relatedTeachers.length ? relatedTeachers.map((teacher) => teacher.name) : classTeacher ? [classTeacher.name] : [];
      setNodes((prev) => [...prev, {
        id: visualId, type: "section", x, y, label: sec.name, color: "#2563EB",
        gradeLevel: sec.gradeLevel, roomNumber: sec.roomNumber,
        teachersCount: assignedTeachers.length, studentsCount: sec.enrolledCount,
        parentsCount: sectionStudents.length, assignedTeachers,
        assignedStudents: sectionStudents.map((student) => student.name),
      }]);
    } else {
      const bus = busRoutes.find((item) => item.id === sourceId);
      if (!bus) return;
      const busStudents = students.filter((student) => student.busRouteId === bus.id);
      setNodes((prev) => [...prev, {
        id: visualId, type: "bus", x, y, label: bus.routeName, color: "#D97706",
        studentsCount: bus.assignedStudentsCount, teachersCount: 0, parentsCount: 0,
        assignedTeachers: [], assignedStudents: busStudents.map((student) => student.name),
        driverName: bus.driverName, driverPhone: bus.driverPhone, plateNumber: bus.plateNumber,
      }]);
    }
    setSelectedId(visualId);
    showToast("تمت إضافة العنصر للمخطط", "هذا تغيير بصري فقط ولا ينشئ أو يعدّل بيانات المدرسة.", "success");
  };

  const handleNodeClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
  };

  const deleteNode = (id: string) => {
    const node = nodes.find(n => n.id === id);
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.fromId !== id && c.toId !== id));
    if (selectedId === id) setSelectedId(null);
    showToast("تمت إزالة العنصر من المخطط", `تم إخفاء "${node?.label}" من التخطيط البصري فقط دون حذف بياناته.`, "info");
  };

  const deleteConnection = (connId: string) => {
    setConnections(prev => prev.filter(c => c.id !== connId));
    showToast("تم إخفاء الرابط من المخطط", "تم حذف خط الربط من التخطيط البصري فقط دون تغيير بيانات النقل.", "info");
  };

  const checkConflicts = () => {
    const sectionNodes = nodes.filter(n => n.type === "section");
    const issues: string[] = [];

    sectionNodes.forEach(s => {
      if (s.teachersCount === 0) issues.push(`الشعبة "${s.label}" لا يوجد بها معلمين مسندين.`);
    });

    if (issues.length === 0) {
      showToast("مراجعة المخطط", "لا توجد ملاحظات بصرية في العناصر المعروضة.", "success");
    } else {
      showToast(`ملاحظات المخطط (${issues.length})`, issues[0], "warning");
    }
  };

  // ── Auto layout from saved school data ───────────────────────────────────
  const loadFromData = () => {
    const newNodes: CanvasNode[] = [];
    const newConns: Connection[] = [];

    sections.slice(0, 12).forEach((sec, i) => {
      const sid = `sec_${sec.id}`;
      const col = i % 2;
      const row = Math.floor(i / 2);
      const sectionStudents = students.filter((student) => student.sectionId === sec.id);
      const classTeacher = teachers.find((teacher) => teacher.id === sec.classTeacherId);
      const relatedTeachers = teachers.filter((teacher) => teacher.assignedSections?.includes(sec.id));

      newNodes.push({
        id: sid,
        type: "section",
        x: 60 + col * 320,
        y: 40 + row * 180,
        label: sec.name,
        color: "#2563EB",
        gradeLevel: sec.gradeLevel,
        roomNumber: sec.roomNumber,
        teachersCount: relatedTeachers.length || (classTeacher ? 1 : 0),
        studentsCount: sec.enrolledCount,
        parentsCount: sectionStudents.length,
        assignedTeachers: relatedTeachers.length ? relatedTeachers.map((teacher) => teacher.name) : classTeacher ? [classTeacher.name] : [],
        assignedStudents: sectionStudents.map((student) => student.name),
      });
    });

    busRoutes.slice(0, 8).forEach((bus, i) => {
      const bid = `bus_${bus.id}`;
      const busStudents = students.filter((student) => student.busRouteId === bus.id);
      newNodes.push({
        id: bid,
        type: "bus",
        x: 760,
        y: 50 + i * 190,
        label: bus.routeName,
        color: "#D97706",
        studentsCount: bus.assignedStudentsCount,
        teachersCount: 0,
        parentsCount: 0,
        assignedTeachers: [],
        assignedStudents: busStudents.map((student) => student.name),
        driverName: bus.driverName,
        driverPhone: bus.driverPhone,
        plateNumber: bus.plateNumber,
      });

      const sectionIds = new Set(busStudents.map((student) => student.sectionId));
      sectionIds.forEach((sectionId) => {
        const sectionNode = newNodes.find((node) => node.id === `sec_${sectionId}`);
        if (sectionNode) {
          newConns.push({
            id: `c_${sectionNode.id}_${bid}`,
            fromId: sectionNode.id,
            toId: bid,
            color: "#D97706",
          });
        }
      });
    });

    setNodes(newNodes);
    setConnections(newConns);
    setZoom(0.9);
    setPan({ x: 30, y: 30 });
    setSelectedId(null);
    showToast("تم تحديث المخطط", "تم ترتيب البيانات الحالية بصريًا من معلومات المدرسة المتاحة.", "success");
  };

  const handleSaveCanvas = () => {
    void saveConfiguratorCanvas({
      nodes,
      connections,
      zoom,
      pan,
      filters: { gradeFilter, sortBy },
      saved_at: new Date().toISOString(),
    });
  };

  const loadSavedCanvas = () => {
    const payload = canvasConfig?.payload as Partial<{
      nodes: CanvasNode[];
      connections: Connection[];
      zoom: number;
      pan: { x: number; y: number };
      filters: { gradeFilter?: string; sortBy?: "default" | "neighborhood" | "name" };
    }> | undefined;
    const savedNodes = payload?.nodes;

    if (!canvasConfig?.exists || !Array.isArray(savedNodes)) {
      showToast("المخطط", "لا توجد نسخة محفوظة من المخطط بعد.", "warning");
      return;
    }

    setNodes(savedNodes);
    setConnections(Array.isArray(payload?.connections) ? payload.connections : []);
    if (typeof payload?.zoom === "number") setZoom(payload.zoom);
    if (payload?.pan && typeof payload.pan.x === "number" && typeof payload.pan.y === "number") {
      setPan(payload.pan);
    }
    if (payload?.filters?.gradeFilter) setGradeFilter(payload.filters.gradeFilter);
    if (payload?.filters?.sortBy) setSortBy(payload.filters.sortBy);
    setSelectedId(null);
    showToast("تم تحميل المخطط", "تمت استعادة آخر نسخة محفوظة من ترتيب المخطط.", "success");
  };

  useEffect(() => {
    if (nodes.length === 0 && mainTab === "canvas") {
      loadFromData();
    }
  }, [mainTab]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(1.8, Math.max(0.4, z - e.deltaY * 0.001)));
  };

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <div className="main-content" style={{ overflow: "hidden" }}>
        
        {/* ── Top Level Directional Header & Tabs ──────────────────────── */}
        <div className="configurator-topbar" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 24px", borderBottom: "1px solid var(--border)",
          background: "var(--bg-surface)", flexWrap: "wrap", gap: 12,
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: "linear-gradient(135deg, #2563EB, #7C3AED)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 14px rgba(37,99,235,0.25)"
            }}>
              <Network size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 17, color: "var(--text-dark)", display: "flex", alignItems: "center", gap: 8 }}>
                منشئ هيكل المدرسة
                
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>إدخال الموارد ومراجعة العلاقات بصريًا في مساحة عمل واحدة.</div>
            </div>
          </div>

          {/* TWO MAIN DIRECTIONAL TABS */}
          <div style={{
            display: "flex", background: "var(--bg-page)", padding: 4,
            borderRadius: 12, border: "1px solid var(--border)", gap: 6
          }}>
            <button
              onClick={() => setMainTab("wizard")}
              className={`btn ${mainTab === "wizard" ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "8px 18px", fontSize: 13, fontWeight: 800, gap: 8, borderRadius: 10 }}
            >
              <CheckSquare size={16} />
              إدخال الموارد
            </button>
            <button
              onClick={() => { setMainTab("canvas"); if (nodes.length === 0) loadFromData(); }}
              className={`btn ${mainTab === "canvas" ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "8px 18px", fontSize: 13, fontWeight: 800, gap: 8, borderRadius: 10 }}
            >
              <Network size={16} />
              التكوين والربط البصري
            </button>
          </div>
        </div>

        {/* ── TAB 1: VERIFIED RESOURCE SETUP ─────────────────────────── */}
        {mainTab === "wizard" && (
          <div style={{ padding: "24px 32px", overflowY: "auto", height: "calc(100vh - 134px)", background: "var(--bg-page)" }}>
            <div className="card" style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 22 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 900, color: "var(--text-dark)", marginBottom: 6 }}>تأسيس بيانات المدرسة</h2>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.8, maxWidth: 760 }}>
                    أضف وعدّل البيانات من شاشات الإدارة المعتمدة، ثم ارجع إلى التكوين والربط البصري لمراجعة الهيكل وترتيبه. لا ينشئ هذا المسار سجلات تجريبية أو بيانات غير محفوظة في النظام.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setMainTab("canvas"); loadFromData(); }}
                  className="btn btn-primary"
                  style={{ gap: 8, whiteSpace: "nowrap" }}
                >
                  <Network size={16} /> فتح الربط البصري
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                {[
                  { href: "/academic", title: "الفصول والمواد", desc: `${sections.length} شعبة مسجلة — إدارة المستويات والشعب والمواد والسعة والقاعات`, icon: <BookOpen size={22} />, color: "#2563EB" },
                  { href: "/teachers", title: "المعلمون والتوزيع الأكاديمي", desc: `${teachers.length} معلم — إدارة ملفات المعلمين والتخصصات والتوزيعات`, icon: <Users size={22} />, color: "#7C3AED" },
                  { href: "/students", title: "الطلاب وأولياء الأمور", desc: `${students.length} طالب — إدارة الطلاب والروابط العائلية وبيانات التواصل`, icon: <GraduationCap size={22} />, color: "#059669" },
                  { href: "/transport", title: "إدارة النقل المدرسي", desc: `${busRoutes.length} مسار — إدارة المسارات والحافلات والسائقين والطلاب`, icon: <Bus size={22} />, color: "#D97706" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      textDecoration: "none", padding: 18, borderRadius: 14,
                      border: "1px solid var(--border)", background: "var(--bg-surface)",
                      display: "flex", flexDirection: "column", gap: 12, minHeight: 150,
                    }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: item.color + "12", color: item.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text-dark)", marginBottom: 6 }}>{item.title}</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.7 }}>{item.desc}</div>
                    </div>
                    <span style={{ marginTop: "auto", fontSize: 12, fontWeight: 800, color: item.color }}>فتح الإدارة ←</span>
                  </Link>
                ))}
              </div>

              <div style={{ marginTop: 18, padding: "14px 16px", borderRadius: 12, background: "#F8FAFC", border: "1px solid var(--border)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.8 }}>
                <strong style={{ color: "var(--text-dark)" }}>الإضافة السريعة:</strong> تظهر داخل النماذج فقط عندما يكون العنصر المرجعي له مصدر بيانات حقيقي وصلاحية إنشاء واضحة. لذلك لا ننشئ تخصصات أو أحياء أو سجلات جديدة من قوائم تجريبية داخل هذه الشاشة.
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: VISUAL CONFIGURATION CANVAS ── */}
        {mainTab === "canvas" && (
          <div className="configurator-canvas-shell" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 134px)", overflow: "hidden" }}>
            
            {/* 🌟 SMART FILTERS & PROGRESSIVE BUILDING BAR */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 20px", background: "var(--bg-page)", borderBottom: "1px solid var(--border)",
              flexWrap: "wrap", gap: 12
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: "var(--text-dark)", display: "flex", alignItems: "center", gap: 5 }}>
                  <Filter size={15} color="var(--primary)" /> المستوى:
                </span>
                <div style={{ display: "flex", gap: 4, background: "var(--bg-surface)", padding: 3, borderRadius: 8, border: "1px solid var(--border)" }}>
                  {[
                    { id: "all", label: "كل المستويات" },
                    { id: "الصف الرابع", label: "4️⃣ الصف الرابع" },
                    { id: "الصف الخامس", label: "5️⃣ الصف الخامس" },
                    { id: "الصف السادس", label: "6️⃣ الصف السادس" },
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGradeFilter(g.id)}
                      style={{
                        padding: "6px 14px", borderRadius: 6, fontSize: 11.5, fontWeight: 800,
                        border: "none", cursor: "pointer",
                        background: gradeFilter === g.id ? "var(--primary)" : "transparent",
                        color: gradeFilter === g.id ? "#fff" : "var(--text-dark)",
                        transition: "all 0.15s", boxShadow: gradeFilter === g.id ? "0 2px 6px rgba(37,99,235,0.25)" : "none"
                      }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: "var(--text-dark)", display: "flex", alignItems: "center", gap: 5 }}>
                  <MapPin size={15} color="#D97706" /> ترتيب العناصر:
                </span>
                <select
                  className="form-select" style={{ width: 220, fontSize: 11.5, fontWeight: 700, padding: "5px 10px" }}
                  value={sortBy} onChange={(e: any) => setSortBy(e.target.value)}
                >
                  <option value="default">الترتيب الافتراضي</option>
                  <option value="neighborhood">تجميع حسب المنطقة إن توفرت</option>
                  <option value="name">الترتيب الأبجدي</option>
                </select>
              </div>
            </div>

            {/* Step-by-Step Guidance Banner */}
            <div style={{ background: "#EFF6FF", padding: "8px 20px", borderBottom: "1px solid #BFDBFE", fontSize: 11.5, color: "#1E40AF", display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: 700 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={16} color="#2563EB" />
                <span><strong>مساحة العمل البصرية:</strong> الترتيب والروابط هنا للمراجعة البصرية. التغييرات التشغيلية الحساسة لا تُطبَّق تلقائيًا بمجرد السحب.</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => setFocusMode((value) => !value)} className="btn btn-sm" style={{ background: "#fff", border: "1px solid #BFDBFE", color: "#1D4ED8", fontWeight: 800, padding: "2px 10px" }}>
                  <Maximize size={13} /> {focusMode ? "الخروج من وضع التركيز" : "توسيع مساحة العمل"}
                </button>
                <button onClick={handleSaveCanvas} className="btn btn-sm" style={{ background: "#fff", border: "1px solid #BFDBFE", color: "#1D4ED8", fontWeight: 800, padding: "2px 10px" }}>
                  <Save size={13} /> حفظ ترتيب المخطط
                </button>
                <button onClick={loadSavedCanvas} className="btn btn-sm" style={{ background: "#fff", border: "1px solid #BFDBFE", color: "#1D4ED8", fontWeight: 800, padding: "2px 10px" }}>
                  <Download size={13} /> استعادة المحفوظ
                </button>
                <button onClick={loadFromData} className="btn btn-sm" style={{ background: "#fff", border: "1px solid #BFDBFE", color: "#1D4ED8", fontWeight: 800, padding: "2px 10px" }}>
                  ترتيب تلقائي
                </button>
              </div>
            </div>

            {/* Main Canvas + Left Sidebar Container */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              
              {/* Ultra-Clean Toolbox */}
              <div style={{ width: 240, flexShrink: 0, borderLeft: "1px solid var(--border)", background: "var(--bg-surface)", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--bg-page)" }}>
                  {[
                    { id: "sections", label: `🏛️ الشعب الدراسية (${filteredSections.length})` },
                    { id: "buses", label: `🚌 خطوط النقل` },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveToolboxTab(tab.id as any)}
                      style={{
                        flex: 1, padding: "10px 4px", fontSize: 11, fontWeight: 800,
                        border: "none", background: activeToolboxTab === tab.id ? "var(--bg-surface)" : "transparent",
                        color: activeToolboxTab === tab.id ? "var(--primary)" : "var(--text-muted)",
                        borderBottom: activeToolboxTab === tab.id ? "2px solid var(--primary)" : "none",
                        cursor: "pointer"
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.5, background: "#F8FAFC", padding: 10, borderRadius: 8, border: "1px solid var(--border)", marginBottom: 6 }}>
                    <strong>اسحب العنصر إلى مساحة العمل</strong> لترتيبه بصريًا. الحذف هنا يزيله من المخطط فقط ولا يحذف السجل من قاعدة البيانات.
                  </div>

                  {activeToolboxTab === "sections" && (
                    <>
                      {filteredSections.map(sec => (
                        <div
                          key={sec.id} draggable
                          onDragStart={e => {
                            e.dataTransfer.setData("nodeType", "section");
                            e.dataTransfer.setData("nodeSourceId", sec.id);
                            e.dataTransfer.setData("nodeLabel", sec.name);
                            e.dataTransfer.setData("nodeGrade", sec.gradeLevel);
                            e.dataTransfer.setData("nodeCount", sec.enrolledCount.toString());
                          }}
                          style={{ padding: "12px", borderRadius: 12, background: "#EFF6FF", border: "1.5px solid #BFDBFE", cursor: "grab", marginBottom: 6, boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 900, color: "#1D4ED8" }}>{sec.name}</span>
                            <span className="badge badge-blue" style={{ fontSize: 10 }}>👥 {sec.enrolledCount}</span>
                          </div>
                          <div style={{ fontSize: 10.5, color: "#64748B", fontWeight: 600 }}>قاعة {sec.roomNumber} • 👨‍🏫 2 معلمين</div>
                        </div>
                      ))}
                    </>
                  )}

                  {activeToolboxTab === "buses" && (
                    <>
                      {busRoutes.map((bus, idx) => (
                        <div
                          key={bus.id} draggable
                          onDragStart={e => {
                            e.dataTransfer.setData("nodeType", "bus");
                            e.dataTransfer.setData("nodeSourceId", bus.id);
                            e.dataTransfer.setData("nodeLabel", bus.routeName);
                            e.dataTransfer.setData("nodeCount", bus.assignedStudentsCount.toString());
                          }}
                          style={{ padding: "12px", borderRadius: 12, background: "#FFFBEB", border: "1.5px solid #FDE68A", cursor: "grab", marginBottom: 6, boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 900, color: "#B45309" }}>{bus.routeName.replace("مسار ", "حافلة ")}</span>
                            <span className="badge badge-orange" style={{ fontSize: 10 }}>👥 {bus.assignedStudentsCount}</span>
                          </div>
                          <div style={{ fontSize: 10.5, color: "#92400E", fontWeight: 600 }}>السائق: {bus.driverName || "غير محدد"} • اللوحة: {bus.plateNumber || "غير محددة"}</div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Visual canvas */}
              <div
                ref={containerRef}
                className="canvas-bg"
                style={{ flex: 1, position: "relative", overflow: "hidden", background: "radial-gradient(circle at 50% 50%, #F8FAFC 0%, #EEF2FF 100%)", userSelect: "none" }}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onMouseDown={handleCanvasMouseDown}
                onWheel={handleWheel}
              >
                {/* SVG Line Layer (Background Only!) */}
                <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}>
                  <defs>
                    <pattern id="grid" x={pan.x % (20 * zoom)} y={pan.y % (20 * zoom)} width={20 * zoom} height={20 * zoom} patternUnits="userSpaceOnUse">
                      <circle cx={1} cy={1} r={1} fill="#CBD5E1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                    {connections.map(conn => {
                      const from = nodes.find(n => n.id === conn.fromId);
                      const to   = nodes.find(n => n.id === conn.toId);
                      if (!from || !to) return null;
                      if (gradeFilter !== "all" && ((from.gradeLevel && from.gradeLevel !== gradeFilter) || (to.gradeLevel && to.gradeLevel !== gradeFilter))) return null;

                      const x1 = from.x + 280; const y1 = from.y + 75;
                      const x2 = to.x;         const y2 = to.y + 75;
                      const midX = (x1 + x2) / 2; const midY = (y1 + y2) / 2;

                      return (
                        <g key={conn.id} style={{ pointerEvents: "auto" }}>
                          <path d={bezierPath(x1, y1, x2, y2)} fill="none" stroke={conn.color} strokeWidth={3.5} strokeOpacity={0.85} />
                          <circle cx={midX} cy={midY} r={11} fill="white" stroke={conn.color} strokeWidth={2.5} style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); deleteConnection(conn.id); }} />
                          <text x={midX} y={midY + 4} textAnchor="middle" fontSize={11} fill={conn.color} fontWeight="900" style={{ pointerEvents: "none" }}>✕</text>
                        </g>
                      );
                    })}
                  </g>
                </svg>

                {nodes.length === 0 && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none", gap: 16, zIndex: 5 }}>
                    <div style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", border: "2px dashed #CBD5E1", borderRadius: 20, padding: "36px 48px", textAlign: "center", maxWidth: 460, boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
                      <div style={{ fontWeight: 900, fontSize: 18, color: "#1E293B", marginBottom: 8 }}>مساحة التكوين البصري</div>
                      <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.7, marginBottom: 20 }}>
                        اعرض بيانات المدرسة المحفوظة ورتبها بصريًا. أي حذف أو سحب داخل المخطط يغيّر التخطيط البصري فقط ولا يحذف أو يعدّل السجلات التشغيلية.
                      </div>
                      <button style={{ pointerEvents: "auto" }} onClick={loadFromData} className="btn btn-primary">
                        <Download size={16} /> عرض بيانات المدرسة
                      </button>
                    </div>
                  </div>
                )}

                {/* Visual resource cards */}
                <div style={{
                  position: "absolute", left: 0, top: 0, width: "100%", height: "100%",
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "0 0", pointerEvents: "none", zIndex: 10
                }}>
                  {sortedDisplayNodes.map(node => {
                    const isSelected = node.id === selectedId;
                    const linkedBuses = connections
                      .filter((c) => c.fromId === node.id || c.toId === node.id)
                      .map((c) => nodes.find((n) => n.id === (c.fromId === node.id ? c.toId : c.fromId)))
                      .filter((n): n is CanvasNode => Boolean(n && n.type === "bus"));

                    return (
                      <div
                        key={node.id}
                        onMouseDown={e => handleNodeMouseDown(e, node.id)}
                        onClick={e => { e.stopPropagation(); handleNodeClick(e, node.id); }}
                        style={{
                          position: "absolute",
                          left: node.x, top: node.y,
                          width: node.type === "section" ? 280 : 260,
                          background: node.type === "section" ? (isSelected ? "#2563EB" : "#fff") : (isSelected ? "#D97706" : "#fff"),
                          borderRadius: 16,
                          border: `2px solid ${node.type === "section" ? (isSelected ? "#1D4ED8" : "#BFDBFE") : (isSelected ? "#B45309" : "#FDE68A")}`,
                          boxShadow: isSelected ? "0 10px 25px rgba(0,0,0,0.15)" : "0 4px 12px rgba(0,0,0,0.06)",
                          padding: 14,
                          cursor: draggingId ? "grabbing" : "grab",
                          pointerEvents: "auto",
                          transition: "border 0.15s, box-shadow 0.15s",
                          color: isSelected ? "#fff" : "var(--text-dark)",
                          zIndex: isSelected ? 20 : 10
                        }}
                      >
                        {/* Card header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${isSelected ? "rgba(255,255,255,0.2)" : "var(--border)"}` }}>
                          <span style={{ fontSize: 11.5, fontWeight: 900, color: isSelected ? "#fff" : (node.type === "section" ? "#1E40AF" : "#92400E"), display: "flex", alignItems: "center", gap: 6 }}>
                            {node.type === "section" ? <BookOpen size={14} /> : <Bus size={14} />}
                            {node.gradeLevel || "مسار نقل مدرسي"} • {node.roomNumber ? `قاعة ${node.roomNumber}` : node.plateNumber}
                          </span>
                          
                          {/* Remove from visual layout */}
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                            title="إزالة هذا الكارت من المخطط"
                            style={{
                              background: "#FEE2E2", color: "#DC2626", border: "1px solid #FECACA",
                              borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 900,
                              cursor: "pointer", display: "flex", alignItems: "center", gap: 3,
                              transition: "background 0.15s"
                            }}
                          >
                            ✕ حذف
                          </button>
                        </div>

                        {/* Title */}
                        <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 12, color: isSelected ? "#fff" : "var(--text-dark)" }}>
                          {node.label}
                        </div>

                        {/* Summary badges */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                          {node.type === "section" ? (
                            <>
                              <span style={{ background: isSelected ? "rgba(255,255,255,0.2)" : "#F5F3FF", color: isSelected ? "#fff" : "#6D28D9", border: "1px solid #DDD6FE", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                                👨‍🏫 {node.teachersCount} معلم
                              </span>
                              <span style={{ background: isSelected ? "rgba(255,255,255,0.2)" : "#ECFDF5", color: isSelected ? "#fff" : "#047857", border: "1px solid #A7F3D0", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                                🎓 {node.studentsCount} طالب
                              </span>
                              <span style={{ background: isSelected ? "rgba(255,255,255,0.2)" : "#FFFBEB", color: isSelected ? "#fff" : "#B45309", border: "1px solid #FDE68A", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                                👪 {node.parentsCount} أسرة
                              </span>
                            </>
                          ) : (
                            <>
                              <span style={{ background: isSelected ? "rgba(255,255,255,0.2)" : "#FFF", color: isSelected ? "#fff" : "#B45309", border: "1px solid #FDE68A", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                                👤 {node.driverName || "غير محدد"}
                              </span>
                              <span style={{ background: isSelected ? "rgba(255,255,255,0.2)" : "#FEF3C7", color: isSelected ? "#fff" : "#92400E", border: "1px solid #FCD34D", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                                👥 {node.studentsCount} منقول
                              </span>
                            </>
                          )}
                        </div>

                        {/* Relationships shown here are derived from saved operational data. */}
                        {node.type === "section" ? (
                          <div style={{ background: isSelected ? "rgba(0,0,0,0.15)" : "#F8FAFC", padding: 8, borderRadius: 10, border: "1px solid var(--border)" }}>
                            <div style={{ fontSize: 10.5, fontWeight: 800, color: isSelected ? "#E2E8F0" : "#64748B", marginBottom: 4 }}>مسارات النقل المرتبطة بطلاب الشعبة</div>
                            <div style={{ fontSize: 11.5, fontWeight: 800, color: isSelected ? "#fff" : "#1E293B" }}>
                              {linkedBuses.length ? linkedBuses.map((bus) => bus.label).join(" • ") : "لا توجد مسارات مرتبطة"}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 11.5, fontWeight: 800, color: isSelected ? "#fff" : "#B45309", background: isSelected ? "rgba(0,0,0,0.15)" : "#FFFBEB", padding: "6px 10px", borderRadius: 8 }}>
                            البيانات هنا للعرض والترتيب؛ إدارة المسار والطلاب تتم من شاشة النقل.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Inspector drawer */}
              {selectedNode ? (
                <div style={{ width: 310, flexShrink: 0, borderRight: "1px solid var(--border)", background: "var(--bg-surface)", overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 16, boxShadow: "-4px 0 15px rgba(0,0,0,0.03)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 900, fontSize: 15, color: "var(--text-dark)", display: "flex", alignItems: "center", gap: 6 }}>
                      {selectedNode.type === "section" ? "🏛️ إدارة كادر وطلاب الفصل" : "🚌 تفاصيل وركاب الحافلة"}
                    </div>
                    <button onClick={() => setSelectedId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={18} /></button>
                  </div>

                  <div style={{ padding: 14, borderRadius: 14, background: selectedNode.color + "14", border: `1.5px solid ${selectedNode.color}40` }}>
                    <div style={{ fontSize: 11, color: selectedNode.color, fontWeight: 800, marginBottom: 2 }}>{selectedNode.gradeLevel || "مسار نقل مدرسي"}</div>
                    <div style={{ fontWeight: 900, fontSize: 16, color: "var(--text-dark)" }}>{selectedNode.label}</div>
                    {selectedNode.type === "section" ? (
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>القاعة: {selectedNode.roomNumber || "غير محددة"}</div>
                    ) : (
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>لوحة المركبة: {selectedNode.plateNumber || "غير محددة"}</div>
                    )}
                  </div>

                  {/* Section data is read-only here; operational changes use the dedicated modules. */}
                  {selectedNode.type === "section" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ background: "var(--bg-page)", padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 12, fontWeight: 900, color: "#6D28D9", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                          <Users size={15} /> المعلمون المرتبطون ({selectedNode.assignedTeachers.length})
                        </div>
                        {selectedNode.assignedTeachers.length ? selectedNode.assignedTeachers.map((teacher) => (
                          <div key={teacher} style={{ padding: "7px 9px", borderRadius: 8, background: "var(--bg-surface)", border: "1px solid var(--border)", fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>{teacher}</div>
                        )) : <div style={{ fontSize: 11, color: "var(--text-muted)" }}>لا يوجد معلم مرتبط في البيانات الحالية.</div>}
                        <Link href="/teachers" className="btn btn-ghost btn-sm" style={{ marginTop: 8, width: "100%", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#6D28D9" }}>
                          فتح إدارة المعلمين
                        </Link>
                      </div>

                      <div style={{ background: "var(--bg-page)", padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 12, fontWeight: 900, color: "#047857", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                          <GraduationCap size={15} /> طلاب الشعبة ({selectedNode.studentsCount})
                        </div>
                        <div style={{ maxHeight: 150, overflowY: "auto" }}>
                          {selectedNode.assignedStudents.slice(0, 20).map((student) => (
                            <div key={student} style={{ padding: "7px 9px", borderRadius: 8, background: "var(--bg-surface)", border: "1px solid var(--border)", fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>{student}</div>
                          ))}
                        </div>
                        <Link href="/students" className="btn btn-ghost btn-sm" style={{ marginTop: 8, width: "100%", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#047857" }}>
                          فتح إدارة الطلاب
                        </Link>
                      </div>
                    </div>
                  )}

                  {selectedNode.type === "bus" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ background: "var(--bg-page)", padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 12, fontWeight: 900, color: "#D97706", marginBottom: 8 }}>👨‍✈️ معلومات السائق والمركبة:</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dark)", marginBottom: 4 }}>السائق: {selectedNode.driverName || "غير محدد"}</div>
                        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4 }}>رقم اللوحة: {selectedNode.plateNumber || "غير محددة"}</div>
                        <div style={{ fontSize: 11.5, color: "#059669", display: "flex", alignItems: "center", gap: 6, fontWeight: 800 }}>
                          <Phone size={14} /> رقم التواصل: {selectedNode.driverPhone || "غير محدد"}
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                    <button onClick={() => deleteNode(selectedNode.id)} className="btn btn-ghost btn-sm" style={{ justifyContent: "center", gap: 6, color: "#EF4444", fontWeight: 700, background: "#FEE2E2" }}>
                      <Trash2 size={14} /> إزالة الكارت من المخطط
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ width: 250, flexShrink: 0, borderRight: "1px solid var(--border)", background: "var(--bg-surface)", padding: 20, textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--bg-page)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👆</div>
                  <div style={{ fontWeight: 900, fontSize: 14, color: "var(--text-dark)" }}>اختر أي فصل أو حافلة</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                    اضغط على أي كارت لعرض البيانات المرتبطة به. التعديلات التشغيلية تتم من شاشة الإدارة المختصة، بينما هذه المساحة تحفظ الترتيب البصري فقط.
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
}
