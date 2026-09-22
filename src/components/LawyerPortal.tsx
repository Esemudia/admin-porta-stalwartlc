import { useState } from "react";
import { cases as initialCases, type Case, type CaseStatus, type CaseUpdate } from "../data";
import logo from "../assets/logo.png";

const statusColors: Record<CaseStatus, { bg: string; text: string; label: string }> = {
  active: { bg: "rgba(34,197,94,0.1)", text: "#22c55e", label: "Active" },
  pending: { bg: "rgba(234,179,8,0.1)", text: "#eab308", label: "Pending" },
  closed: { bg: "rgba(107,114,128,0.1)", text: "#6b7280", label: "Closed" },
  on_hold: { bg: "rgba(239,68,68,0.1)", text: "#ef4444", label: "On Hold" },
};

const LAWYER_NAME = "Chukwuemeka Stalwart";

type LawyerTab = "my_cases" | "all_cases" | "upload";

interface Props { onLogout: () => void; }

export default function LawyerPortal({ onLogout }: Props) {
  const [cases, setCases] = useState<Case[]>(initialCases);
  const [tab, setTab] = useState<LawyerTab>("my_cases");
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const myCases = cases.filter((c) => c.attorney === LAWYER_NAME);

  const handleUpload = (newCase: Case) => {
    setCases((prev) => [newCase, ...prev]);
    setTab("my_cases");
    showToast("Case file uploaded successfully.");
  };

  const handleAddUpdate = (caseId: string, update: CaseUpdate) => {
    setCases((prev) => prev.map((c) => c.id === caseId ? { ...c, updates: [update, ...c.updates] } : c));
    if (selectedCase?.id === caseId) setSelectedCase((prev) => prev ? { ...prev, updates: [update, ...prev.updates] } : prev);
    showToast("Progress update posted.");
  };

  const handleStatusChange = (caseId: string, status: CaseStatus) => {
    setCases((prev) => prev.map((c) => c.id === caseId ? { ...c, status } : c));
    if (selectedCase?.id === caseId) setSelectedCase((prev) => prev ? { ...prev, status } : prev);
    showToast("Case status updated.");
  };

  if (selectedCase) {
    const live = cases.find(c => c.id === selectedCase.id) ?? selectedCase;
    return (
      <CaseDetail
        c={live}
        onBack={() => setSelectedCase(null)}
        onAddUpdate={handleAddUpdate}
        onStatusChange={handleStatusChange}
        onLogout={onLogout}
      />
    );
  }

  const displayCases = tab === "my_cases" ? myCases : cases;

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
            style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}>LAWYER</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>{LAWYER_NAME}</span>
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>c.stalwart@stalwartlc.com</span>
          </div>
          <button onClick={() => setTab("upload")}
            className="hidden lg:flex items-center gap-2 px-4 py-2 text-sm font-medium transition-opacity"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
            + Upload Case
          </button>
          <button onClick={onLogout} className="text-xs px-3 py-1.5"
            style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
            Sign out
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-6xl w-full mx-auto px-6 lg:px-10 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>
            Welcome, {LAWYER_NAME.split(" ")[0]}
          </h1>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {myCases.filter(c => c.status === "active").length} active matters assigned to you
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "My Cases", value: myCases.length },
            { label: "Active", value: myCases.filter(c => c.status === "active").length },
            { label: "Pending", value: myCases.filter(c => c.status === "pending").length },
            { label: "Closed", value: myCases.filter(c => c.status === "closed").length },
          ].map((s, i) => (
            <div key={s.label} className="p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>{s.label}</div>
              <div className="font-serif text-2xl font-semibold" style={{ color: i === 1 ? "var(--primary)" : "var(--foreground)" }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-6" style={{ borderBottom: "1px solid var(--border)" }}>
          {([
            { key: "my_cases", label: "My Cases" },
            { key: "all_cases", label: "All Firm Cases" },
            { key: "upload", label: "+ Upload Case" },
          ] as { key: LawyerTab; label: string }[]).map((t) => (
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

        {/* Case list */}
        {(tab === "my_cases" || tab === "all_cases") && (
          <div className="space-y-3">
            {displayCases.length === 0 && (
              <p className="text-sm py-8 text-center" style={{ color: "var(--muted-foreground)" }}>
                No cases assigned to you yet.
              </p>
            )}
            {displayCases.map((c) => {
              const sc = statusColors[c.status];
              const isOwn = c.attorney === LAWYER_NAME;
              return (
                <button key={c.id} onClick={() => setSelectedCase(c)}
                  className="w-full text-left p-5 transition-all"
                  style={{ background: "var(--card)", border: `1px solid ${isOwn && tab === "all_cases" ? "rgba(201,168,76,0.3)" : "var(--border)"}` }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = isOwn && tab === "all_cases" ? "rgba(201,168,76,0.3)" : "var(--border)")}>
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <span className="font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>{c.caseNumber}</span>
                        <span className="text-xs px-2 py-0.5 font-mono" style={{ background: sc.bg, color: sc.text }}>{sc.label}</span>
                        {tab === "all_cases" && isOwn && (
                          <span className="text-xs px-2 py-0.5 font-mono" style={{ background: "rgba(201,168,76,0.12)", color: "var(--primary)" }}>Mine</span>
                        )}
                      </div>
                      <div className="font-serif text-base font-semibold mb-1" style={{ color: "var(--foreground)" }}>{c.title}</div>
                      <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {c.type} · {c.attorney} · Client: {c.clientName}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-xs flex-shrink-0">
                      <div>
                        <div className="font-mono mb-0.5" style={{ color: "var(--muted-foreground)" }}>Filed</div>
                        <div style={{ color: "var(--foreground)" }}>{c.filedDate}</div>
                      </div>
                      {c.nextHearing && (
                        <div>
                          <div className="font-mono mb-0.5" style={{ color: "var(--muted-foreground)" }}>Next Hearing</div>
                          <div style={{ color: "var(--primary)" }}>{c.nextHearing}</div>
                        </div>
                      )}
                      <div style={{ color: "var(--muted-foreground)" }}>{c.updates.length} update{c.updates.length !== 1 ? "s" : ""} →</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Upload form */}
        {tab === "upload" && (
          <UploadCaseForm
            lawyerName={LAWYER_NAME}
            onUpload={handleUpload}
            onCancel={() => setTab("my_cases")}
          />
        )}
      </div>
    </div>
  );
}

function CaseDetail({ c, onBack, onAddUpdate, onStatusChange, onLogout }: {
  c: Case;
  onBack: () => void;
  onAddUpdate: (id: string, u: CaseUpdate) => void;
  onStatusChange: (id: string, s: CaseStatus) => void;
  onLogout: () => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const sc = statusColors[c.status];
  const isOwn = c.attorney === LAWYER_NAME;

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !desc.trim()) return;
    onAddUpdate(c.id, {
      date: new Date().toISOString().split("T")[0],
      title: title.trim(),
      description: desc.trim(),
      author: LAWYER_NAME,
    });
    setTitle(""); setDesc("");
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <header className="flex items-center justify-between px-6 lg:px-10 h-16 flex-shrink-0"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <img src={logo} alt="Stalwart Law Consult" className="h-7 w-auto object-contain" />
          <span className="font-serif text-sm font-semibold">Lawyer Portal</span>
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

      <div className="flex-1 max-w-5xl w-full mx-auto px-6 lg:px-10 py-8">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <span className="font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>{c.caseNumber}</span>
              <span className="text-xs px-2 py-0.5 font-mono" style={{ background: sc.bg, color: sc.text }}>{sc.label}</span>
              {!isOwn && <span className="text-xs px-2 py-0.5" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>Read-only</span>}
            </div>
            <h1 className="font-serif text-2xl lg:text-3xl font-semibold mb-2" style={{ color: "var(--foreground)" }}>{c.title}</h1>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              {c.attorney} · {c.type} · Filed {c.filedDate}
            </p>
          </div>
          {isOwn && (
            <div className="flex-shrink-0">
              <div className="text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Update Status</div>
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
          )}
        </div>

        <p className="text-sm leading-relaxed mb-8 max-w-2xl" style={{ color: "var(--muted-foreground)" }}>{c.description}</p>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Post update — only for own cases */}
          {isOwn && (
            <div className="lg:col-span-2">
              <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>Post Update</h2>
              <form onSubmit={handlePost} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Title</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Witness statements exchanged"
                    className="w-full px-4 py-3 text-sm outline-none"
                    style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
                </div>
                <div>
                  <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Details</label>
                  <textarea rows={5} value={desc} onChange={e => setDesc(e.target.value)}
                    placeholder="Describe the development for the client..."
                    className="w-full px-4 py-3 text-sm outline-none resize-none"
                    style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
                </div>
                <button type="submit" className="w-full py-3 text-sm font-medium transition-opacity"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
                  Post Update
                </button>
              </form>
            </div>
          )}

          {/* Timeline */}
          <div className={isOwn ? "lg:col-span-3" : "lg:col-span-5"}>
            <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
              Timeline ({c.updates.length})
            </h2>
            {c.updates.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No updates yet.</p>
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
        </div>
      </div>
    </div>
  );
}

function UploadCaseForm({ lawyerName, onUpload, onCancel }: {
  lawyerName: string;
  onUpload: (c: Case) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: "", type: "Civil Litigation", clientName: "",
    filedDate: new Date().toISOString().split("T")[0], nextHearing: "", description: "", status: "pending" as CaseStatus,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpload({
      id: `c${Date.now()}`,
      caseNumber: `SLC/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 9000) + 1000)}`,
      title: form.title, type: form.type, attorney: lawyerName, uploadedBy: lawyerName,
      clientName: form.clientName, clientId: "mock", filedDate: form.filedDate, nextHearing: form.nextHearing || null,
      description: form.description, status: form.status, updates: [],
    });
  };

  const inp = "w-full px-4 py-3 text-sm outline-none";
  const inpStyle = { background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" };

  return (
    <div>
      <h2 className="font-serif text-2xl font-semibold mb-2" style={{ color: "var(--foreground)" }}>Upload New Case File</h2>
      <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
        You will be auto-assigned as lead attorney. A case number is generated on submission.
      </p>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
        <div>
          <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Case Title *</label>
          <input required type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Adeyemi v. Lagos Port Authority" className={inp} style={inpStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Practice Area *</label>
            <select required value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className={inp} style={inpStyle}>
              {["Business & Corporate", "Civil Litigation", "Intellectual Property", "Energy & Natural Resources", "Admiralty / Maritime", "Start-Ups"].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Client Name *</label>
            <input required type="text" value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })}
              placeholder="Full name or company" className={inp} style={inpStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
          </div>
        </div>
        <div className="grid lg:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as CaseStatus })}
              className={inp} style={inpStyle}>
              {(["pending", "active", "on_hold"] as CaseStatus[]).map(s => (
                <option key={s} value={s}>{{ pending: "Pending", active: "Active", on_hold: "On Hold", closed: "Closed" }[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Filed Date</label>
            <input type="date" value={form.filedDate} onChange={e => setForm({ ...form, filedDate: e.target.value })}
              className={inp} style={inpStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
          </div>
          <div>
            <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Next Hearing</label>
            <input type="date" value={form.nextHearing} onChange={e => setForm({ ...form, nextHearing: e.target.value })}
              className={inp} style={inpStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Case Description *</label>
          <textarea required rows={5} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Nature of the matter, parties, key facts..."
            className={`${inp} resize-none`} style={inpStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
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
