import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession } from "../../auth";
import { cases as initialCases, staffMembers as initialStaff, type Case, type CaseStatus, type StaffMember, type StaffRole } from "../../data";
import logo from "../../assets/logo.png";

const statusColors: Record<CaseStatus, { bg: string; text: string; label: string }> = {
  active: { bg: "rgba(34,197,94,0.1)", text: "#22c55e", label: "Active" },
  pending: { bg: "rgba(234,179,8,0.1)", text: "#eab308", label: "Pending" },
  closed: { bg: "rgba(107,114,128,0.1)", text: "#6b7280", label: "Closed" },
  on_hold: { bg: "rgba(239,68,68,0.1)", text: "#ef4444", label: "On Hold" },
};

const roleColors: Record<StaffRole, { bg: string; text: string; label: string }> = {
  lawyer: { bg: "rgba(99,102,241,0.1)", text: "#818cf8", label: "Lawyer" },
  front_desk: { bg: "rgba(20,184,166,0.1)", text: "#2dd4bf", label: "Front Desk" },
  exec_secretary: { bg: "rgba(249,115,22,0.1)", text: "#fb923c", label: "Exec. Secretary" },
};

type AdminTab = "overview" | "staff" | "cases" | "add_staff";
type ConfirmAction = { type: "delete_staff"; staff: StaffMember } | null;

export default function SuperAdminPortal() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [cases, setCases] = useState<Case[]>(initialCases);
  const [toast, setToast] = useState("");
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [viewCase, setViewCase] = useState<Case | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const deleteStaff = (id: string) => {
    setStaff((prev) => prev.filter((s) => s.id !== id));
    setConfirm(null);
    showToast("Staff member removed.");
  };

  const toggleActive = (id: string) => {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
    showToast("Staff status updated.");
  };

  const addStaff = (member: StaffMember) => {
    setStaff((prev) => [member, ...prev]);
    setTab("staff");
    showToast("Staff member added successfully.");
  };

  const handleStatusChange = (id: string, status: CaseStatus) => {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    if (viewCase?.id === id) setViewCase((v) => v ? { ...v, status } : v);
    showToast("Case status updated.");
  };

  const lawyers = staff.filter((s) => s.role === "lawyer");
  const support = staff.filter((s) => s.role !== "lawyer");

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3 text-sm font-medium shadow-lg"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
          {toast}
        </div>
      )}

      {/* Confirm modal */}
      {confirm && confirm.type === "delete_staff" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-md p-8" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <h3 className="font-serif text-xl font-semibold mb-2" style={{ color: "var(--foreground)" }}>
              Remove Staff Member?
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
              <strong style={{ color: "var(--foreground)" }}>{confirm.staff.name}</strong> will be permanently removed from the system. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteStaff(confirm.staff.id)}
                className="flex-1 py-2.5 text-sm font-medium"
                style={{ background: "#ef4444", color: "#fff" }}>
                Remove
              </button>
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 py-2.5 text-sm"
                style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-6 lg:px-10 h-16 flex-shrink-0"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <img src={logo} alt="Stalwart Law Consult" className="h-7 w-auto object-contain" />
          <span className="font-serif text-sm font-semibold">Stalwart Law Consult</span>
          <span className="hidden lg:block text-xs font-mono px-2 py-0.5 ml-1"
            style={{ background: "rgba(201,168,76,0.15)", color: "var(--primary)" }}>
            SUPER ADMIN
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setTab("add_staff")}
            className="hidden lg:flex items-center gap-2 px-4 py-2 text-sm font-medium transition-opacity"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
            + Add Staff
          </button>
          <button onClick={() => { clearSession(); navigate("/login"); }} className="text-xs px-3 py-1.5"
            style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar nav */}
        <nav className="hidden lg:flex flex-col w-52 flex-shrink-0 py-6 px-4 gap-1"
          style={{ background: "var(--card)", borderRight: "1px solid var(--border)" }}>
          {([
            { key: "overview", icon: "▦", label: "Overview" },
            { key: "staff", icon: "👥", label: "Staff & Lawyers" },
            { key: "cases", icon: "⚖", label: "All Cases" },
            { key: "add_staff", icon: "+", label: "Add Staff" },
          ] as { key: AdminTab; icon: string; label: string }[]).map((item) => (
            <button key={item.key} onClick={() => setTab(item.key)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors"
              style={{
                background: tab === item.key ? "rgba(201,168,76,0.08)" : "transparent",
                color: tab === item.key ? "var(--primary)" : "var(--muted-foreground)",
                borderLeft: tab === item.key ? "2px solid var(--primary)" : "2px solid transparent",
              }}>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8">

            {/* Mobile tab row */}
            <div className="flex gap-2 mb-6 overflow-x-auto lg:hidden" style={{ scrollbarWidth: "none" }}>
              {["overview", "staff", "cases", "add_staff"].map((t) => (
                <button key={t} onClick={() => setTab(t as AdminTab)}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-medium capitalize"
                  style={tab === t
                    ? { background: "var(--primary)", color: "var(--primary-foreground)" }
                    : { border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
                  {t.replace("_", " ")}
                </button>
              ))}
            </div>

            {/* OVERVIEW */}
            {tab === "overview" && (
              <div>
                <h1 className="font-serif text-3xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>
                  System Overview
                </h1>
                <p className="text-sm mb-8" style={{ color: "var(--muted-foreground)" }}>
                  Firm-wide snapshot as of {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
                </p>

                {/* KPI grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                  {[
                    { label: "Total Cases", value: cases.length, accent: false },
                    { label: "Active Cases", value: cases.filter(c => c.status === "active").length, accent: true },
                    { label: "Lawyers", value: lawyers.length, accent: false },
                    { label: "Support Staff", value: support.length, accent: false },
                  ].map((k) => (
                    <div key={k.label} className="p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                      <div className="text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>{k.label}</div>
                      <div className="font-serif text-3xl font-semibold" style={{ color: k.accent ? "var(--primary)" : "var(--foreground)" }}>
                        {k.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Case status breakdown */}
                <div className="grid lg:grid-cols-2 gap-8 mb-10">
                  <div>
                    <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
                      Case Status Breakdown
                    </h2>
                    <div className="space-y-2">
                      {(["active", "pending", "on_hold", "closed"] as CaseStatus[]).map((s) => {
                        const sc = statusColors[s];
                        const count = cases.filter(c => c.status === s).length;
                        const pct = cases.length ? Math.round((count / cases.length) * 100) : 0;
                        return (
                          <div key={s} className="flex items-center gap-4 p-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                            <span className="text-xs font-mono w-20" style={{ color: sc.text }}>{sc.label}</span>
                            <div className="flex-1 h-1.5" style={{ background: "var(--border)" }}>
                              <div className="h-full transition-all" style={{ width: `${pct}%`, background: sc.text }} />
                            </div>
                            <span className="font-mono text-xs w-8 text-right" style={{ color: "var(--muted-foreground)" }}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Staff summary */}
                  <div>
                    <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
                      Staff Summary
                    </h2>
                    <div className="space-y-2">
                      {staff.map((s) => {
                        const rc = roleColors[s.role];
                        return (
                          <div key={s.id} className="flex items-center gap-4 p-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                            <div className="w-8 h-8 flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ background: rc.bg, color: rc.text }}>
                              {s.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>{s.name}</div>
                              <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{s.email}</div>
                            </div>
                            <span className="text-xs px-2 py-0.5 font-mono flex-shrink-0" style={{ background: rc.bg, color: rc.text }}>
                              {rc.label}
                            </span>
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.active ? "#22c55e" : "#6b7280" }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Recent cases */}
                <div>
                  <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
                    Recent Cases
                  </h2>
                  <div className="space-y-2">
                    {cases.slice(0, 4).map((c) => {
                      const sc = statusColors[c.status];
                      return (
                        <div key={c.id} className="flex items-center gap-4 p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                          <span className="text-xs px-2 py-0.5 font-mono flex-shrink-0" style={{ background: sc.bg, color: sc.text }}>{sc.label}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-serif text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>{c.title}</div>
                            <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{c.caseNumber} · {c.attorney}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STAFF MANAGEMENT */}
            {tab === "staff" && (
              <div>
                <div className="flex items-end justify-between mb-8">
                  <div>
                    <h1 className="font-serif text-3xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>
                      Staff & Lawyers
                    </h1>
                    <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                      {staff.length} total · {staff.filter(s => s.active).length} active
                    </p>
                  </div>
                  <button onClick={() => setTab("add_staff")}
                    className="px-4 py-2 text-sm font-medium transition-opacity"
                    style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
                    + Add Staff
                  </button>
                </div>

                {/* Lawyers section */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                    <span className="text-xs font-mono tracking-widest" style={{ color: "var(--muted-foreground)" }}>LAWYERS ({lawyers.length})</span>
                    <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                  </div>
                  <div className="space-y-3">
                    {lawyers.map((s) => <StaffCard key={s.id} member={s} onDelete={() => setConfirm({ type: "delete_staff", staff: s })} onToggle={() => toggleActive(s.id)} />)}
                  </div>
                </div>

                {/* Support staff */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                    <span className="text-xs font-mono tracking-widest" style={{ color: "var(--muted-foreground)" }}>SUPPORT STAFF ({support.length})</span>
                    <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                  </div>
                  <div className="space-y-3">
                    {support.map((s) => <StaffCard key={s.id} member={s} onDelete={() => setConfirm({ type: "delete_staff", staff: s })} onToggle={() => toggleActive(s.id)} />)}
                  </div>
                </div>
              </div>
            )}

            {/* ALL CASES */}
            {tab === "cases" && !viewCase && (
              <div>
                <h1 className="font-serif text-3xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>
                  All Cases
                </h1>
                <p className="text-sm mb-8" style={{ color: "var(--muted-foreground)" }}>
                  {cases.length} matters across all attorneys
                </p>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  {(["active", "pending", "on_hold", "closed"] as CaseStatus[]).map((s) => {
                    const sc = statusColors[s];
                    return (
                      <div key={s} className="p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                        <div className="font-mono text-2xl font-semibold mb-1" style={{ color: sc.text }}>
                          {cases.filter(c => c.status === s).length}
                        </div>
                        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{sc.label}</div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ border: "1px solid var(--border)" }}>
                  <div className="hidden lg:grid grid-cols-12 gap-3 px-5 py-3 text-xs font-mono"
                    style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-2">Case No.</div>
                    <div className="col-span-3">Title</div>
                    <div className="col-span-2">Attorney</div>
                    <div className="col-span-2">Uploaded By</div>
                    <div className="col-span-2">Next Hearing</div>
                  </div>
                  {cases.map((c, i) => {
                    const sc = statusColors[c.status];
                    return (
                      <button key={c.id} onClick={() => setViewCase(c)}
                        className="w-full text-left flex flex-col lg:grid lg:grid-cols-12 gap-2 lg:gap-3 px-5 py-4 transition-colors"
                        style={{ borderBottom: i < cases.length - 1 ? "1px solid var(--border)" : "none", background: "var(--background)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--card)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--background)")}>
                        <div className="col-span-1 flex items-center">
                          <span className="text-xs px-2 py-0.5 font-mono" style={{ background: sc.bg, color: sc.text }}>{sc.label}</span>
                        </div>
                        <div className="col-span-2 flex items-center font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>{c.caseNumber}</div>
                        <div className="col-span-3 flex items-center">
                          <div>
                            <div className="font-serif text-sm font-semibold" style={{ color: "var(--foreground)" }}>{c.title}</div>
                            <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{c.type}</div>
                          </div>
                        </div>
                        <div className="col-span-2 flex items-center text-xs" style={{ color: "var(--muted-foreground)" }}>{c.attorney}</div>
                        <div className="col-span-2 flex items-center text-xs" style={{ color: "var(--muted-foreground)" }}>{c.uploadedBy}</div>
                        <div className="col-span-2 flex items-center text-xs" style={{ color: c.nextHearing ? "var(--primary)" : "var(--muted-foreground)" }}>
                          {c.nextHearing ?? "—"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CASE DETAIL (admin) */}
            {tab === "cases" && viewCase && (
              <AdminCaseDetail
                c={cases.find(c => c.id === viewCase.id) ?? viewCase}
                onBack={() => setViewCase(null)}
                onStatusChange={handleStatusChange}
              />
            )}

            {/* ADD STAFF */}
            {tab === "add_staff" && (
              <AddStaffForm onAdd={addStaff} onCancel={() => setTab("staff")} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function StaffCard({ member, onDelete, onToggle }: { member: StaffMember; onDelete: () => void; onToggle: () => void }) {
  const rc = roleColors[member.role];
  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-5"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="w-10 h-10 flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{ background: rc.bg, color: rc.text }}>
        {member.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap mb-0.5">
          <span className="font-serif text-base font-semibold" style={{ color: "var(--foreground)" }}>{member.name}</span>
          <span className="text-xs px-2 py-0.5 font-mono" style={{ background: rc.bg, color: rc.text }}>{rc.label}</span>
          <span className="text-xs px-2 py-0.5 font-mono"
            style={{ background: member.active ? "rgba(34,197,94,0.1)" : "rgba(107,114,128,0.1)", color: member.active ? "#22c55e" : "#6b7280" }}>
            {member.active ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{member.email} · {member.phone}</div>
        {member.specialisation && (
          <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>Focus: {member.specialisation}</div>
        )}
        <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          Joined {member.joinedDate}{member.role === "lawyer" ? ` · ${member.casesHandled} cases handled` : ""}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={onToggle}
          className="px-3 py-1.5 text-xs transition-colors"
          style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
          {member.active ? "Deactivate" : "Activate"}
        </button>
        <button onClick={onDelete}
          className="px-3 py-1.5 text-xs transition-colors"
          style={{ border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
          Remove
        </button>
      </div>
    </div>
  );
}

function AddStaffForm({ onAdd, onCancel }: { onAdd: (m: StaffMember) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", role: "lawyer" as StaffRole, specialisation: "", joinedDate: new Date().toISOString().split("T")[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      id: `s${Date.now()}`,
      name: form.name,
      email: form.email,
      phone: form.phone,
      role: form.role,
      specialisation: form.specialisation || undefined,
      joinedDate: form.joinedDate,
      casesHandled: 0,
      active: true,
    });
  };

  const inp = "w-full px-4 py-3 text-sm outline-none transition-colors";
  const inpStyle = { background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" };
  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => (e.currentTarget.style.borderColor = "var(--primary)");
  const blur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => (e.currentTarget.style.borderColor = "var(--border)");

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold mb-2" style={{ color: "var(--foreground)" }}>Add Staff Member</h1>
      <p className="text-sm mb-8" style={{ color: "var(--muted-foreground)" }}>
        New staff will receive login credentials via email.
      </p>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
        <div className="grid lg:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Full Name *</label>
            <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Amaka Okafor" className={inp} style={inpStyle} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Email Address *</label>
            <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="a.okafor@stalwartlc.com" className={inp} style={inpStyle} onFocus={focus} onBlur={blur} />
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Phone Number *</label>
            <input required type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="+234 803 000 0000" className={inp} style={inpStyle} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Role *</label>
            <select required value={form.role} onChange={e => setForm({ ...form, role: e.target.value as StaffRole })}
              className={inp} style={inpStyle} onFocus={focus} onBlur={blur}>
              <option value="lawyer">Lawyer</option>
              <option value="front_desk">Front Desk Officer</option>
              <option value="exec_secretary">Executive Secretary</option>
            </select>
          </div>
        </div>
        {form.role === "lawyer" && (
          <div>
            <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Specialisation</label>
            <input type="text" value={form.specialisation} onChange={e => setForm({ ...form, specialisation: e.target.value })}
              placeholder="e.g. Civil Litigation, Energy Law" className={inp} style={inpStyle} onFocus={focus} onBlur={blur} />
          </div>
        )}
        <div>
          <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Start Date</label>
          <input type="date" value={form.joinedDate} onChange={e => setForm({ ...form, joinedDate: e.target.value })}
            className={inp} style={inpStyle} onFocus={focus} onBlur={blur} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 py-3 text-sm font-medium transition-opacity"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
            Add Staff Member
          </button>
          <button type="button" onClick={onCancel} className="px-6 py-3 text-sm"
            style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function AdminCaseDetail({ c, onBack, onStatusChange }: { c: Case; onBack: () => void; onStatusChange: (id: string, s: CaseStatus) => void }) {
  const sc = statusColors[c.status];
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm mb-6 transition-colors"
        style={{ color: "var(--muted-foreground)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}>
        ← All cases
      </button>
      <div className="flex flex-col lg:flex-row lg:items-start gap-6 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <span className="font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>{c.caseNumber}</span>
            <span className="text-xs px-2 py-0.5 font-mono" style={{ background: sc.bg, color: sc.text }}>{sc.label}</span>
          </div>
          <h2 className="font-serif text-2xl lg:text-3xl font-semibold mb-2" style={{ color: "var(--foreground)" }}>{c.title}</h2>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {c.attorney} · {c.type} · Filed {c.filedDate} · Uploaded by {c.uploadedBy}
          </p>
        </div>
        <div>
          <div className="text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Change Status</div>
          <div className="flex gap-2 flex-wrap">
            {(["active", "pending", "on_hold", "closed"] as CaseStatus[]).map((s) => {
              const sc2 = statusColors[s];
              return (
                <button key={s} onClick={() => onStatusChange(c.id, s)}
                  className="text-xs px-3 py-1.5 font-mono"
                  style={c.status === s
                    ? { background: sc2.bg, color: sc2.text, border: `1px solid ${sc2.text}` }
                    : { background: "var(--card)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
                  {sc2.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <p className="text-sm leading-relaxed mb-8 max-w-2xl" style={{ color: "var(--muted-foreground)" }}>{c.description}</p>
      <h3 className="font-serif text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>Case Timeline</h3>
      {c.updates.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No updates posted.</p>
      ) : (
        <div className="relative">
          <div className="absolute left-2 top-0 bottom-0 w-px" style={{ background: "var(--border)" }} />
          <div className="space-y-5 pl-8">
            {c.updates.map((u, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-6 top-1.5 w-2.5 h-2.5"
                  style={{ background: i === 0 ? "var(--primary)" : "var(--border)" }} />
                <div className="p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div className="flex justify-between mb-1">
                    <span className="font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>{u.date}</span>
                    <span className="text-xs" style={{ color: "var(--primary)" }}>{u.author}</span>
                  </div>
                  <div className="font-semibold text-sm mb-1" style={{ color: "var(--foreground)" }}>{u.title}</div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{u.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
