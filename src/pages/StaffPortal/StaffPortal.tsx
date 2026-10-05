import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, clearSession } from "../../auth";
import { cases as initialCases, type Case, type CaseStatus } from "../../data";
import type { UserRole } from "../../auth";
import logo from "../../assets/logo.png";

const statusColors: Record<CaseStatus, { bg: string; text: string; label: string }> = {
  active: { bg: "rgba(34,197,94,0.1)", text: "#22c55e", label: "Active" },
  pending: { bg: "rgba(234,179,8,0.1)", text: "#eab308", label: "Pending" },
  closed: { bg: "rgba(107,114,128,0.1)", text: "#6b7280", label: "Closed" },
  on_hold: { bg: "rgba(239,68,68,0.1)", text: "#ef4444", label: "On Hold" },
  archived: { bg: "rgba(168,85,247,0.12)", text: "#a855f7", label: "Archived" },
};

const STAFF_INFO: Record<string, { name: string; email: string; color: string; colorText: string; label: string }> = {
  front_desk: {
    name: "Emeka Obi",
    email: "e.obi@stalwartlc.com",
    color: "rgba(20,184,166,0.12)",
    colorText: "#2dd4bf",
    label: "FRONT DESK",
  },
  exec_secretary: {
    name: "Ngozi Amadi",
    email: "n.amadi@stalwartlc.com",
    color: "rgba(249,115,22,0.12)",
    colorText: "#fb923c",
    label: "EXEC. SECRETARY",
  },
};

const LAWYERS = ["Chukwuemeka Stalwart", "Adaeze Nwosu", "Babatunde Eze"];

type StaffTab = "cases" | "upload";

export default function StaffPortal() {
  const navigate = useNavigate();
  const session = getSession();
  const role = session?.role ?? "front_desk";
  const info = STAFF_INFO[role] ?? STAFF_INFO.front_desk;
  const [cases, setCases] = useState<Case[]>(initialCases);
  const [tab, setTab] = useState<StaffTab>("cases");
  const [viewCase, setViewCase] = useState<Case | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const handleUpload = (newCase: Case) => {
    setCases((prev) => [newCase, ...prev]);
    setTab("cases");
    showToast("Case file uploaded successfully.");
  };

  const handleStatusChange = (id: string, status: CaseStatus) => {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    if (viewCase?.id === id) setViewCase((prev) => (prev ? { ...prev, status } : prev));
    showToast("Case status updated.");
  };

  const filtered = filterStatus === "all" ? cases : cases.filter((c) => c.status === filterStatus);

  if (viewCase) {
    const live = cases.find(c => c.id === viewCase.id) ?? viewCase;
    return <CaseReadView c={live} onBack={() => setViewCase(null)} onLogout={() => { clearSession(); navigate("/login"); }} staffName={info.name} />;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3 text-sm font-medium"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-6 lg:px-10 h-16 flex-shrink-0"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <img src={logo} alt="Stalwart Law Consult" className="h-7 w-auto object-contain" />
          <span className="font-serif text-sm font-semibold">Stalwart Law Consult</span>
          <span className="hidden lg:block text-xs font-mono px-2 py-0.5 ml-1"
            style={{ background: info.color, color: info.colorText }}>
            {info.label}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>{info.name}</span>
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{info.email}</span>
          </div>
          <button onClick={() => setTab("upload")}
            className="hidden lg:flex items-center gap-2 px-4 py-2 text-sm font-medium transition-opacity"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
            + Upload Case
          </button>
          <button onClick={() => { clearSession(); navigate("/login"); }} className="text-xs px-3 py-1.5"
            style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
            Sign out
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-6xl w-full mx-auto px-6 lg:px-10 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>
            Hello, {info.name.split(" ")[0]}
          </h1>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {cases.length} matters on file · {cases.filter(c => c.status === "active").length} active
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {(["active", "pending", "on_hold", "closed", "archived"] as CaseStatus[]).map((s) => {
            const sc = statusColors[s];
            const count = cases.filter(c => c.status === s).length;
            return (
              <button key={s} onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
                className="p-5 text-left transition-all"
                style={{
                  background: filterStatus === s ? sc.bg : "var(--card)",
                  border: `1px solid ${filterStatus === s ? sc.text : "var(--border)"}`,
                }}>
                <div className="text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>{sc.label}</div>
                <div className="font-serif text-2xl font-semibold" style={{ color: sc.text }}>{count}</div>
              </button>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-6" style={{ borderBottom: "1px solid var(--border)" }}>
          {([
            { key: "cases", label: "All Cases" },
            { key: "upload", label: "+ Upload Case" },
          ] as { key: StaffTab; label: string }[]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-5 py-3 text-sm font-medium transition-colors relative"
              style={{ color: tab === t.key ? "var(--primary)" : "var(--muted-foreground)" }}>
              {t.label}
              {tab === t.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--primary)" }} />
              )}
            </button>
          ))}
        </div>

        {/* Cases list */}
        {tab === "cases" && (
          <div className="space-y-3">
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>No cases match this filter.</p>
            )}
            {filtered.map((c) => {
              const sc = statusColors[c.status];
              return (
                <button key={c.id} onClick={() => setViewCase(c)}
                  className="w-full text-left p-5 transition-all"
                  style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <span className="font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>{c.caseNumber}</span>
                        <select
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStatusChange(c.id, e.target.value as CaseStatus)}
                          value={c.status}
                          className="text-xs px-2 py-0.5 font-mono outline-none cursor-pointer"
                          style={{ background: sc.bg, color: sc.text, border: "none", appearance: "none" }}
                        >
                          <option value="active" style={{ background: "var(--card)", color: "#22c55e" }}>Active</option>
                          <option value="pending" style={{ background: "var(--card)", color: "#eab308" }}>Pending</option>
                          <option value="on_hold" style={{ background: "var(--card)", color: "#ef4444" }}>On Hold</option>
                          <option value="closed" style={{ background: "var(--card)", color: "#6b7280" }}>Closed</option>
                          <option value="archived" style={{ background: "var(--card)", color: "#a855f7" }}>Archived</option>
                        </select>
                        <span className="text-xs px-2 py-0.5" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>{c.type}</span>
                      </div>
                      <div className="font-serif text-base font-semibold mb-1" style={{ color: "var(--foreground)" }}>{c.title}</div>
                      <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        Attorney: {c.attorney} · Client: {c.clientName} · Filed by: {c.uploadedBy}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-xs flex-shrink-0">
                      <div>
                        <div className="font-mono mb-0.5" style={{ color: "var(--muted-foreground)" }}>Filed</div>
                        <div style={{ color: "var(--foreground)" }}>{c.filedDate}</div>
                      </div>
                      {c.nextHearing && (
                        <div>
                          <div className="font-mono mb-0.5" style={{ color: "var(--muted-foreground)" }}>Hearing</div>
                          <div style={{ color: "var(--primary)" }}>{c.nextHearing}</div>
                        </div>
                      )}
                      <span style={{ color: "var(--muted-foreground)" }}>View →</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Upload form */}
        {tab === "upload" && (
          <StaffUploadForm
            uploaderName={info.name}
            onUpload={handleUpload}
            onCancel={() => setTab("cases")}
          />
        )}
      </div>
    </div>
  );
}

function CaseReadView({ c, onBack, onLogout, staffName }: { c: Case; onBack: () => void; onLogout: () => void; staffName: string }) {
  const sc = statusColors[c.status];
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <header className="flex items-center justify-between px-6 lg:px-10 h-16 flex-shrink-0"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <img src={logo} alt="Stalwart Law Consult" className="h-7 w-auto object-contain" />
          <span className="font-serif text-sm font-semibold">Staff Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-sm transition-colors" style={{ color: "var(--muted-foreground)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}>
            ← Back
          </button>
          <button onClick={onLogout} className="text-xs px-3 py-1.5"
            style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
            Sign out
          </button>
        </div>
      </header>
      <div className="flex-1 max-w-4xl w-full mx-auto px-6 lg:px-10 py-8">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <span className="font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>{c.caseNumber}</span>
          <span className="text-xs px-2 py-0.5 font-mono" style={{ background: sc.bg, color: sc.text }}>{sc.label}</span>
          <span className="text-xs px-2 py-0.5" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>Read-only view</span>
        </div>
        <h1 className="font-serif text-2xl lg:text-3xl font-semibold mb-4" style={{ color: "var(--foreground)" }}>{c.title}</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 p-5"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          {[
            { label: "Attorney", value: c.attorney },
            { label: "Practice Area", value: c.type },
            { label: "Client", value: c.clientName },
            { label: "Next Hearing", value: c.nextHearing ?? "Not scheduled" },
          ].map((m) => (
            <div key={m.label}>
              <div className="text-xs font-mono mb-1" style={{ color: "var(--muted-foreground)" }}>{m.label}</div>
              <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{m.value}</div>
            </div>
          ))}
        </div>
        <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--muted-foreground)" }}>{c.description}</p>
        <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
          Case Updates ({c.updates.length})
        </h2>
        {c.updates.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No updates posted yet.</p>
        ) : (
          <div className="relative">
            <div className="absolute left-2 top-0 bottom-0 w-px" style={{ background: "var(--border)" }} />
            <div className="space-y-4 pl-8">
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
    </div>
  );
}

function StaffUploadForm({ uploaderName, onUpload, onCancel }: {
  uploaderName: string;
  onUpload: (c: Case) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: "", type: "Civil Litigation", clientName: "", attorney: LAWYERS[0],
    filedDate: new Date().toISOString().split("T")[0], nextHearing: "", description: "", status: "pending" as CaseStatus,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpload({
      id: `c${Date.now()}`,
      caseNumber: `SLC/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 9000) + 1000)}`,
      title: form.title, type: form.type, attorney: form.attorney, uploadedBy: uploaderName,
      clientName: form.clientName, clientId: `cl${Date.now()}`, filedDate: form.filedDate, nextHearing: form.nextHearing || null,
      description: form.description, status: form.status, updates: [],
    });
  };

  const inp = "w-full px-4 py-3 text-sm outline-none";
  const inpStyle = { background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" };
  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    (e.currentTarget.style.borderColor = "var(--primary)");
  const blur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    (e.currentTarget.style.borderColor = "var(--border)");

  return (
    <div>
      <h2 className="font-serif text-2xl font-semibold mb-2" style={{ color: "var(--foreground)" }}>Upload New Case File</h2>
      <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
        You can assign the case to any lawyer. Uploaded by: <strong style={{ color: "var(--foreground)" }}>{uploaderName}</strong>
      </p>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
        <div>
          <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Case Title *</label>
          <input required type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Adeyemi v. Lagos Port Authority" className={inp} style={inpStyle} onFocus={focus} onBlur={blur} />
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Practice Area *</label>
            <select required value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className={inp} style={inpStyle} onFocus={focus} onBlur={blur}>
              {["Business & Corporate", "Civil Litigation", "Intellectual Property", "Energy & Natural Resources", "Admiralty / Maritime", "Start-Ups"].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Assign to Lawyer *</label>
            <select required value={form.attorney} onChange={e => setForm({ ...form, attorney: e.target.value })}
              className={inp} style={inpStyle} onFocus={focus} onBlur={blur}>
              {LAWYERS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Client Name *</label>
            <input required type="text" value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })}
              placeholder="Full name or company" className={inp} style={inpStyle} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Initial Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as CaseStatus })}
              className={inp} style={inpStyle} onFocus={focus} onBlur={blur}>
              {(["pending", "active"] as CaseStatus[]).map(s => (
                <option key={s} value={s}>{{ pending: "Pending", active: "Active", on_hold: "On Hold", closed: "Closed" }[s]}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Filed Date</label>
            <input type="date" value={form.filedDate} onChange={e => setForm({ ...form, filedDate: e.target.value })}
              className={inp} style={inpStyle} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Next Hearing Date</label>
            <input type="date" value={form.nextHearing} onChange={e => setForm({ ...form, nextHearing: e.target.value })}
              className={inp} style={inpStyle} onFocus={focus} onBlur={blur} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Case Description *</label>
          <textarea required rows={5} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Nature of the matter, parties involved, key facts..."
            className={`${inp} resize-none`} style={inpStyle} onFocus={focus} onBlur={blur} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 py-3 text-sm font-medium transition-opacity"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
            Upload Case File
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
