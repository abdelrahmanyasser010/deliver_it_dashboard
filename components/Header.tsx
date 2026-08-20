"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search, Settings, ShieldCheck, Menu, BookOpen, X, CalendarDays } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import StudentProfileModal from "@/components/StudentProfileModal";
import { Student } from "@/data/mockData";
import { DashboardSearchItem, searchDashboard } from "@/lib/dashboardApi";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const {
    currentRole,
    showToast,
    mobileMenuOpen,
    setMobileMenuOpen,
    students,
    teachers,
    sections,
    notifications,
    markNotificationRead,
    apiStatus,
    currentSchool,
    hasApiPermission,
    academicYears,
    selectedAcademicTermId,
    setSelectedAcademicTermId,
  } = useDashboard();
  const router = useRouter();
  
  // Global Interactive Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<Student | null>(null);
  const [serverSearchResults, setServerSearchResults] = useState<DashboardSearchItem[]>([]);
  const [serverSearchLoading, setServerSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const canSearchPeople = hasApiPermission("people.view");
  const canSearchSections = hasApiPermission("academic.view");
  const canSearch = canSearchPeople || canSearchSections;

  useEffect(() => {
    const query = searchQuery.trim();
    if (apiStatus !== "live" || !canSearchPeople || query.length < 2) {
      setServerSearchResults([]);
      setServerSearchLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setServerSearchLoading(true);
      void searchDashboard(query, "all", 8)
        .then((items) => { if (!cancelled) setServerSearchResults(items); })
        .catch(() => { if (!cancelled) setServerSearchResults([]); })
        .finally(() => { if (!cancelled) setServerSearchLoading(false); });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [apiStatus, canSearchPeople, searchQuery]);



  // Filter Search Results
  const matchingStudents = apiStatus !== "live" && searchQuery.trim() ? students.filter(s => s.name.includes(searchQuery) || s.studentCode.includes(searchQuery) || s.parentName.includes(searchQuery)).slice(0, 3) : [];
  const matchingTeachers = apiStatus !== "live" && searchQuery.trim() ? teachers.filter(t => t.name.includes(searchQuery) || t.specialization.includes(searchQuery)).slice(0, 2) : [];
  const matchingSections = canSearchSections && searchQuery.trim() ? sections.filter(s => s.name.includes(searchQuery)).slice(0, 2) : [];
  const hasResults = (apiStatus === "live" ? serverSearchResults.length > 0 : matchingStudents.length > 0 || matchingTeachers.length > 0) || matchingSections.length > 0;
  const unreadNotifications = notifications.filter((item) => !item.read_at).length;
  const notificationBadge = unreadNotifications;

  const handleNotificationsClick = async () => {
    if (apiStatus !== "live") {
      showToast("الإشعارات", "تعذر تحميل الإشعارات من الخادم حالياً.", "warning");
      return;
    }

    const firstUnread = notifications.find((item) => !item.read_at);
    if (firstUnread) {
      await markNotificationRead(firstUnread.id);
    }

    showToast(
      "Dashboard notifications",
      firstUnread?.notification?.title ?? `Unread notifications: ${unreadNotifications}`,
      "info",
    );
  };

  return (
    <header className="header">
      {/* Hamburger Toggle Button for Mobile */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="mobile-menu-btn"
        style={{
          background: "transparent", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", padding: "8px 10px", color: "var(--text-dark)",
          cursor: "pointer", display: "none", alignItems: "center", justifyContent: "center",
          marginRight: -4,
        }}
        title="فتح القائمة الجانبية"
      >
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="header-search" ref={searchRef} style={{ position: "relative" }}>
        <Search size={18} color="var(--text-muted)" />
        <input
          type="text"
          placeholder={canSearch ? "ابحث عن طالب، معلم أو فصل..." : "البحث غير متاح لهذا الدور"}
          id="global-search"
          value={searchQuery}
          disabled={!canSearch}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSearchDropdown(true);
          }}
          onFocus={() => {
            if (canSearch && searchQuery.trim()) setShowSearchDropdown(true);
          }}
          style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontFamily: "Cairo, sans-serif", fontSize: 13, color: "var(--text-dark)" }}
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(""); setShowSearchDropdown(false); }}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }}
          >
            <X size={14} />
          </button>
        )}

        {/* Live Search Dropdown */}
        {showSearchDropdown && searchQuery.trim() !== "" && (
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, left: 0, minWidth: 320,
            background: "white", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.12)", zIndex: 300, overflow: "hidden", direction: "rtl",
            maxHeight: 380, overflowY: "auto",
          }}>
            {!hasResults ? (
              <div style={{ padding: "20px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                🔍 لا توجد نتائج مطابقة لـ "<strong>{searchQuery}</strong>"
              </div>
            ) : (
              <div>
                {apiStatus === "live" && (
                  <div>
                    <div style={{ padding: "8px 14px", background: "var(--bg-page)", fontSize: 11, fontWeight: 800, color: "var(--primary)", borderBottom: "1px solid var(--border-light)" }}>
                      🔎 نتائج البحث من الخادم {serverSearchLoading ? "..." : `(${serverSearchResults.length})`}
                    </div>
                    {serverSearchResults.map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        onClick={() => {
                          const student = item.type === "student" ? students.find((entry) => entry.id === item.id) : undefined;
                          if (student) setSelectedStudentForModal(student);
                          else if (item.type === "teacher") router.push(`/teachers?search=${encodeURIComponent(item.label)}`);
                          else router.push(`/students?search=${encodeURIComponent(item.label)}`);
                          setShowSearchDropdown(false);
                          setSearchQuery("");
                        }}
                        style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-light)", cursor: "pointer" }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-dark)" }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.type} {item.secondary ? `— ${item.secondary}` : ""}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Students Section */}
                {apiStatus !== "live" && matchingStudents.length > 0 && (
                  <div>
                    <div style={{ padding: "8px 14px", background: "var(--bg-page)", fontSize: 11, fontWeight: 800, color: "var(--primary)", borderBottom: "1px solid var(--border-light)" }}>
                      👨‍🎓 الطلاب ({matchingStudents.length})
                    </div>
                    {matchingStudents.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => {
                          setSelectedStudentForModal(st);
                          setShowSearchDropdown(false);
                          setSearchQuery("");
                        }}
                        style={{
                          padding: "10px 14px", borderBottom: "1px solid var(--border-light)",
                          display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-page)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: st.avatarColor + "20", color: st.avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                          {st.avatarInitials}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-dark)" }}>{st.name}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{st.sectionName} — كود: {st.studentCode}</div>
                        </div>
                        <span className="badge badge-blue" style={{ fontSize: 10 }}>عرض الملف</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Teachers Section */}
                {apiStatus !== "live" && matchingTeachers.length > 0 && (
                  <div>
                    <div style={{ padding: "8px 14px", background: "var(--bg-page)", fontSize: 11, fontWeight: 800, color: "#EA580C", borderBottom: "1px solid var(--border-light)" }}>
                      👨‍🏫 المعلمون والكوادر ({matchingTeachers.length})
                    </div>
                    {matchingTeachers.map((tch) => (
                      <div
                        key={tch.id}
                        onClick={() => {
                          router.push("/teachers");
                          setShowSearchDropdown(false);
                          setSearchQuery("");
                        }}
                        style={{
                          padding: "10px 14px", borderBottom: "1px solid var(--border-light)",
                          display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-page)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: tch.avatarColor + "20", color: tch.avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                          {tch.avatarInitials}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-dark)" }}>{tch.name}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{tch.specialization} ({tch.lessonsThisWeek} حصة)</div>
                        </div>
                        <span className="badge badge-orange" style={{ fontSize: 10 }}>شؤون المعلمين</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sections Section */}
                {matchingSections.length > 0 && (
                  <div>
                    <div style={{ padding: "8px 14px", background: "var(--bg-page)", fontSize: 11, fontWeight: 800, color: "#16A34A", borderBottom: "1px solid var(--border-light)" }}>
                      📚 الشعب والفصول ({matchingSections.length})
                    </div>
                    {matchingSections.map((sec) => (
                      <div
                        key={sec.id}
                        onClick={() => {
                          router.push("/academic");
                          setShowSearchDropdown(false);
                          setSearchQuery("");
                        }}
                        style={{
                          padding: "10px 14px", borderBottom: "1px solid var(--border-light)",
                          display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-page)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F0FDF4", color: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <BookOpen size={16} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-dark)" }}>{sec.name}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>مربي الفصل: {sec.classTeacherName} ({sec.enrolledCount} طالب)</div>
                        </div>
                        <span className="badge badge-green" style={{ fontSize: 10 }}>الفصول والمواد</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Page Title (center area) */}
      <div style={{ flex: 1, textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-dark)", lineHeight: 1.2 }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11.5, color: "var(--text-light)", fontWeight: 500 }}>
            {subtitle}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="header-actions">
        {academicYears.length > 0 && (
          <label className="role-switcher" title="السياق الأكاديمي للصفحات المرتبطة بالفصل الدراسي" style={{ gap: 6 }}>
            <CalendarDays size={14} color="#15803D" />
            <select
              aria-label="الفصل الدراسي"
              value={selectedAcademicTermId ?? ""}
              onChange={(event) => setSelectedAcademicTermId(event.target.value || null)}
              style={{
                border: 0,
                outline: 0,
                background: "transparent",
                color: "inherit",
                fontFamily: "inherit",
                fontWeight: 700,
                fontSize: 11.5,
                maxWidth: 210,
              }}
            >
              {academicYears.flatMap((year) => (year.terms ?? []).map((term) => (
                <option key={term.id} value={term.id}>
                  {year.name || "العام الدراسي"} • {term.name || "الفصل الدراسي"}{term.status === "active" ? " — الحالي" : ""}
                </option>
              )))}
            </select>
          </label>
        )}

        <div className="role-switcher" title={`${currentSchool?.name || "EduBridge"} — الدور محمل من الخادم ولا يمكن تغييره من الواجهة`}>
          <ShieldCheck size={14} color="var(--primary)" />
          <span>{currentRole.label}</span>
        </div>

        {/* Notifications */}
        <button
          className="header-btn"
          id="notifications-btn"
          title="الإشعارات اللحظية"
          onClick={() => void handleNotificationsClick()}
        >
          <Bell />
          <span className="badge">{notificationBadge}</span>
        </button>

        {/* Settings -> Link to /settings */}
        <Link href="/settings" className="header-btn" id="settings-btn" title="الإعدادات والصلاحيات">
          <Settings />
        </Link>
      </div>

      {/* Student Profile Modal Triggered from Search */}
      <StudentProfileModal student={selectedStudentForModal} onClose={() => setSelectedStudentForModal(null)} />
    </header>
  );
}
