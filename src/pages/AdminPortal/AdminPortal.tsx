import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession } from "../../auth";
import logo from "../../assets/logo.png";
import {
  cases as initialCases,
  invoices,
  clients,
  staffMembers,
  caseDocuments,
  type Case,
  type CaseStatus,
  type Client,
} from "../../data";

const statusColors: Record<CaseStatus, { bg: string; text: string; label: string }> = {
  active: { bg: "rgba(34,197,94,0.1)", text: "#22c55e", label: "Active" },
  pending: { bg: "rgba(234,179,8,0.1)", text: "#eab308", label: "Pending" },
  closed: { bg: "rgba(107,114,128,0.1)", text: "#6b7280", label: "Closed" },
  on_hold: { bg: "rgba(239,68,68,0.1)", text: "#ef4444", label: "On Hold" },
  archived: { bg: "rgba(168,85,247,0.12)", text: "#a855f7", label: "Archived" },
};

const invoiceColors: Record<string, { bg: string; text: string }> = {
  paid: { bg: "rgba(34,197,94,0.1)", text: "#22c55e" },
  pending: { bg: "rgba(234,179,8,0.1)", text: "#eab308" },
  overdue: { bg: "rgba(239,68,68,0.1)", text: "#ef4444" },
};

const docTypeColors: Record<string, { bg: string; text: string; label: string }> = {
  pleading: { bg: "rgba(99,102,241,0.1)", text: "#818cf8", label: "Pleading" },
  court_order: { bg: "rgba(234,179,8,0.1)", text: "#eab308", label: "Court Order" },
  brief: { bg: "rgba(59,130,246,0.1)", text: "#60a5fa", label: "Brief" },
  correspondence: { bg: "rgba(107,114,128,0.1)", text: "#9ca3af", label: "Correspondence" },
  evidence: { bg: "rgba(239,68,68,0.1)", text: "#f87171", label: "Evidence" },
  contract: { bg: "rgba(34,197,94,0.1)", text: "#4ade80", label: "Contract" },
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

type AdminSection = "cases" | "clients" | "invoices" | "staff";
type AdminView = "list" | "upload" | "case";

export default function AdminPortal() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<Case[]>(initialCases);
  const [section, setSection] = useState<AdminSection>("cases");
  const [view, setView] = useState<AdminView>("list");
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const filtered = filterStatus === "all" ? cases : cases.filter((c) => c.status === filterStatus);

  const handleStatusChange = (id: string, status: CaseStatus) => {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    if (selectedCase?.id === id) setSelectedCase((prev) => (prev ? { ...prev, status } : prev));
    showToast("Case status updated.");
  };

  const handleAddUpdate = (id: string, title: string, description: string) => {
    const update = { date: new Date().toISOString().split("T")[0], title, description, author: "Admin" };
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, updates: [update, ...c.updates] } : c)));
    if (selectedCase?.id === id) {
      setSelectedCase((prev) => (prev ? { ...prev, updates: [update, ...prev.updates] } : prev));
    }
    showToast("Progress update posted.");
  };

  const handleUpload = (newCase: Case) => {
    setCases((prev) => [newCase, ...prev]);
    showToast("Case uploaded successfully.");
    setView("list");
  };

  if (view === "upload") {
    return <UploadCase onBack={() => setView("list")} onUpload={handleUpload} onLogout={() => { clearSession(); navigate("/login"); }} />;
  }

  if (view === "case" && selectedCase) {
    const liveCase = cases.find((c) => c.id === selectedCase.id) ?? selectedCase;
    return (
      <CaseManager
        c={liveCase}
        onBack={() => { setView("list"); setSelectedCase(null); }}
        onStatusChange={handleStatusChange}
        onAddUpdate={handleAddUpdate}
        onLogout={() => { clearSession(); navigate("/login"); }}
      />
    );
  }

  // revenue stats
  const totalRevenue = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const totalOverdue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);

  const navItems: { id: AdminSection; label: string }[] = [
    { id: "cases", label: "Cases" },
    { id: "clients", label: "Clients" },
    { id: "invoices", label: "Invoices" },
    { id: "staff", label: "Staff" },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-5 py-3 text-sm font-medium"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <header
        className="flex items-center justify-between px-6 lg:px-10 h-16 flex-shrink-0"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <img src={logo} alt="Stalwart Law Consult" className="h-7 w-auto object-contain" />
          <span className="font-serif text-sm font-semibold">Stalwart Law Consult</span>
          <span
            className="hidden lg:block text-xs font-mono px-2 py-0.5"
            style={{ background: "rgba(201,168,76,0.15)", color: "var(--primary)", marginLeft: "4px" }}
          >
            ADMIN PORTAL
          </span>
        </div>
        <div className="flex items-center gap-3">
          {section === "cases" && (
            <button
              onClick={() => setView("upload")}
              className="hidden lg:flex items-center gap-2 px-4 py-2 text-sm font-medium transition-opacity"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              + Upload Case
            </button>
          )}
          <button
            onClick={() => { clearSession(); navigate("/login"); }}
            className="text-xs px-3 py-1.5 transition-colors"
            style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Section nav */}
      <div style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex">
          {navItems.map((n) => (
            <button
              key={n.id}
              onClick={() => setSection(n.id)}
              className="px-6 py-3.5 text-xs font-mono transition-colors relative"
              style={{ color: section === n.id ? "var(--primary)" : "var(--muted-foreground)" }}
            >
              {n.label}
              {section === n.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--primary)" }} />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-10 py-8">

        {/* ── CASES SECTION ── */}
        {section === "cases" && (
          <div>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
              <div>
                <h1 className="font-serif text-3xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>
                  Case Management
                </h1>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {cases.length} total matters · {cases.filter((c) => c.status === "active").length} active
                </p>
              </div>
              <button
                onClick={() => setView("upload")}
                className="lg:hidden px-5 py-2.5 text-sm font-medium"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                + Upload Case
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {(["active", "pending", "on_hold", "closed", "archived"] as CaseStatus[]).map((s) => {
                const sc = statusColors[s];
                const count = cases.filter((c) => c.status === s).length;
                return (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
                    className="p-5 text-left transition-all"
                    style={{
                      background: filterStatus === s ? sc.bg : "var(--card)",
                      border: `1px solid ${filterStatus === s ? sc.text : "var(--border)"}`,
                    }}
                  >
                    <div className="text-2xl font-semibold font-mono mb-1" style={{ color: sc.text }}>{count}</div>
                    <div className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>{sc.label}</div>
                  </button>
                );
              })}
            </div>

            {/* Cases table */}
            <div style={{ border: "1px solid var(--border)" }}>
              <div
                className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 text-xs font-mono"
                style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", color: "var(--muted-foreground)" }}
              >
                <div className="col-span-1">Status</div>
                <div className="col-span-2">Case No.</div>
                <div className="col-span-3">Title</div>
                <div className="col-span-2">Attorney</div>
                <div className="col-span-2">Court / Type</div>
                <div className="col-span-1">Hearing</div>
                <div className="col-span-1">Docs</div>
              </div>

              {filtered.length === 0 && (
                <div className="py-16 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
                  No cases match this filter.
                </div>
              )}

              {filtered.map((c, idx) => {
                const sc = statusColors[c.status];
                const docCount = caseDocuments.filter((d) => d.caseId === c.id).length;
                return (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCase(c); setView("case"); }}
                    className="w-full text-left flex flex-col lg:grid lg:grid-cols-12 gap-2 lg:gap-4 px-5 py-4 transition-colors"
                    style={{
                      borderBottom: idx < filtered.length - 1 ? "1px solid var(--border)" : "none",
                      background: "var(--background)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--card)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "var(--background)")}
                  >
                    <div className="col-span-1 flex items-center">
                      <select
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStatusChange(c.id, e.target.value as CaseStatus)}
                        value={c.status}
                        className="text-xs px-2 py-0.5 font-mono outline-none cursor-pointer"
                        style={{
                          background: sc.bg,
                          color: sc.text,
                          border: "none",
                          appearance: "none",
                        }}
                      >
                        <option value="active" style={{ background: "var(--card)", color: "#22c55e" }}>Active</option>
                        <option value="pending" style={{ background: "var(--card)", color: "#eab308" }}>Pending</option>
                        <option value="on_hold" style={{ background: "var(--card)", color: "#ef4444" }}>On Hold</option>
                        <option value="closed" style={{ background: "var(--card)", color: "#6b7280" }}>Closed</option>
                        <option value="archived" style={{ background: "var(--card)", color: "#a855f7" }}>Archived</option>
                      </select>
                    </div>
                    <div className="col-span-2 flex items-center font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>{c.caseNumber}</div>
                    <div className="col-span-3 flex items-center">
                      <div>
                        <div className="font-serif text-sm font-semibold" style={{ color: "var(--foreground)" }}>{c.title}</div>
                        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{c.clientName}</div>
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center text-xs" style={{ color: "var(--muted-foreground)" }}>{c.attorney}</div>
                    <div className="col-span-2 flex items-center text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {c.court ? c.court.split("—")[0].trim() : c.type}
                    </div>
                    <div className="col-span-1 flex items-center text-xs font-mono" style={{ color: c.nextHearing ? "var(--primary)" : "var(--muted-foreground)" }}>
                      {c.nextHearing ?? "—"}
                    </div>
                    <div className="col-span-1 flex items-center font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>{docCount}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CLIENTS SECTION ── */}
        {section === "clients" && (
          <div>
            <div className="mb-8">
              <h1 className="font-serif text-3xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>Clients</h1>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{clients.length} registered clients</p>
            </div>

            {/* Client KPIs */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: "Total Clients", value: clients.length.toString(), mono: true },
                { label: "Active Clients", value: clients.filter((c) => c.activeCases > 0).length.toString(), mono: true },
                { label: "Total Billed", value: fmt(clients.reduce((s, c) => s + c.totalBilled, 0)), mono: false },
              ].map((k) => (
                <div key={k.label} className="p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div className="text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>{k.label}</div>
                  <div className="text-2xl font-semibold" style={{ color: k.mono ? "var(--primary)" : "var(--foreground)", fontFamily: k.mono ? "var(--font-jetbrains)" : "var(--font-playfair)" }}>
                    {k.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ border: "1px solid var(--border)" }}>
              <div
                className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 text-xs font-mono"
                style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", color: "var(--muted-foreground)" }}
              >
                <div className="col-span-3">Name</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-2">Phone</div>
                <div className="col-span-1">Cases</div>
                <div className="col-span-1">Since</div>
                <div className="col-span-1 text-right">Billed</div>
                <div className="col-span-1 text-right">Owed</div>
              </div>
              {clients.length === 0 && (
                <div className="py-16 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
                  No clients registered yet.
                </div>
              )}
              {clients.map((cl: Client, idx) => (
                <div
                  key={cl.id}
                  className="flex flex-col lg:grid lg:grid-cols-12 gap-2 lg:gap-4 px-5 py-4"
                  style={{ borderBottom: idx < clients.length - 1 ? "1px solid var(--border)" : "none", background: "var(--background)" }}
                >
                  <div className="col-span-3 flex items-center gap-2">
                    <div
                      className="w-7 h-7 flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: "var(--secondary)", color: "var(--primary)" }}
                    >
                      {cl.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{cl.name}</div>
                      {cl.company && <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{cl.company}</div>}
                    </div>
                  </div>
                  <div className="col-span-3 flex items-center text-xs" style={{ color: "var(--muted-foreground)" }}>{cl.email}</div>
                  <div className="col-span-2 flex items-center text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>{cl.phone}</div>
                  <div className="col-span-1 flex items-center font-mono text-sm font-semibold" style={{ color: "var(--primary)" }}>{cl.activeCases}</div>
                  <div className="col-span-1 flex items-center text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>{cl.joinedDate.slice(0, 7)}</div>
                  <div className="col-span-1 flex items-center justify-end text-xs font-semibold font-serif" style={{ color: "var(--foreground)" }}>
                    {fmt(cl.totalBilled)}
                  </div>
                  <div className="col-span-1 flex items-center justify-end text-xs font-semibold" style={{ color: cl.outstanding > 0 ? "#ef4444" : "#22c55e" }}>
                    {cl.outstanding > 0 ? fmt(cl.outstanding) : "Clear"}
                  </div>
                </div>
              ))}
            </div>

            {/* Per-client case breakdown */}
            {clients.length > 0 && (
              <div className="mt-8">
                <h2 className="font-serif text-xl font-semibold mb-4" style={{ color: "var(--foreground)" }}>Case Breakdown by Client</h2>
              {clients.map((cl) => {
                const clientCases = cases.filter((c) => c.clientId === cl.id);
                if (clientCases.length === 0) return null;
                return (
                  <div key={cl.id} className="mb-6">
                    <div className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>{cl.name}</div>
                    <div className="space-y-2">
                      {clientCases.map((c) => {
                        const sc = statusColors[c.status];
                        return (
                          <div
                            key={c.id}
                            className="flex items-center gap-4 px-4 py-3"
                            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                          >
                            <span className="text-xs px-2 py-0.5 font-mono" style={{ background: sc.bg, color: sc.text }}>{sc.label}</span>
                            <span className="font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>{c.caseNumber}</span>
                            <span className="font-serif text-sm flex-1" style={{ color: "var(--foreground)" }}>{c.title}</span>
                            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{c.attorney}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        )}

        {/* ── INVOICES SECTION ── */}
        {section === "invoices" && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="font-serif text-3xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>Invoices & Revenue</h1>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{invoices.length} invoices across all matters</p>
              </div>
              <button
                onClick={() => navigate("/internal/billing")}
                className="px-4 py-2 text-xs font-mono font-medium rounded transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                <span>💳 Open Full Billing Dashboard</span>
                <span>→</span>
              </button>
            </div>

            {/* Revenue KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Gross Revenue", value: fmt(totalRevenue), color: "var(--foreground)" },
                { label: "Collected", value: fmt(totalPaid), color: "#22c55e" },
                { label: "Pending", value: fmt(invoices.filter((i) => i.status === "pending").reduce((s, i) => s + i.amount, 0)), color: "#eab308" },
                { label: "Overdue", value: fmt(totalOverdue), color: "#ef4444" },
              ].map((k) => (
                <div key={k.label} className="p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div className="text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>{k.label}</div>
                  <div className="font-serif text-xl font-semibold" style={{ color: k.color }}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Collection rate bar */}
            <div className="p-5 mb-8" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>COLLECTION RATE</span>
                <span className="font-serif text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  {totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 w-full" style={{ background: "var(--secondary)" }}>
                <div
                  className="h-2 transition-all"
                  style={{ width: `${totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0}%`, background: "#22c55e" }}
                />
              </div>
            </div>

            {/* Invoice table */}
            <div style={{ border: "1px solid var(--border)" }}>
              <div
                className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 text-xs font-mono"
                style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", color: "var(--muted-foreground)" }}
              >
                <div className="col-span-1">Status</div>
                <div className="col-span-1">Invoice</div>
                <div className="col-span-3">Description</div>
                <div className="col-span-2">Client</div>
                <div className="col-span-2">Matter</div>
                <div className="col-span-1">Issued</div>
                <div className="col-span-1">Due</div>
                <div className="col-span-1 text-right">Amount</div>
              </div>
              {invoices.length === 0 && (
                <div className="py-16 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
                  No invoices issued yet.
                </div>
              )}
              {invoices.map((inv, idx) => {
                const ic = invoiceColors[inv.status];
                const relCase = cases.find((c) => c.id === inv.caseId);
                const relClient = clients.find((c) => c.id === inv.clientId);
                return (
                  <div
                    key={inv.id}
                    className="flex flex-col lg:grid lg:grid-cols-12 gap-2 lg:gap-4 px-5 py-4"
                    style={{ borderBottom: idx < invoices.length - 1 ? "1px solid var(--border)" : "none", background: "var(--background)" }}
                  >
                    <div className="col-span-1 flex items-center">
                      <span className="text-xs px-2 py-0.5 font-mono capitalize" style={{ background: ic.bg, color: ic.text }}>{inv.status}</span>
                    </div>
                    <div className="col-span-1 flex items-center font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>{inv.id.toUpperCase()}</div>
                    <div className="col-span-3 flex items-center text-xs" style={{ color: "var(--foreground)" }}>{inv.description}</div>
                    <div className="col-span-2 flex items-center text-xs" style={{ color: "var(--muted-foreground)" }}>{relClient?.name ?? "—"}</div>
                    <div className="col-span-2 flex items-center text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>{relCase?.caseNumber ?? "—"}</div>
                    <div className="col-span-1 flex items-center text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>{inv.issuedDate}</div>
                    <div className="col-span-1 flex items-center text-xs font-mono" style={{ color: inv.status === "overdue" ? "#ef4444" : "var(--muted-foreground)" }}>{inv.dueDate}</div>
                    <div className="col-span-1 flex items-center justify-end font-serif text-sm font-semibold" style={{ color: "var(--primary)" }}>
                      {fmt(inv.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STAFF SECTION ── */}
        {section === "staff" && (
          <div>
            <div className="mb-8">
              <h1 className="font-serif text-3xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>Staff Directory</h1>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{staffMembers.length} staff members</p>
            </div>
            <div className="grid lg:grid-cols-3 gap-5">
              {staffMembers.length === 0 && (
                <div className="py-16 text-center text-sm col-span-3" style={{ color: "var(--muted-foreground)" }}>
                  No staff members registered yet.
                </div>
              )}
              {staffMembers.map((s) => {
                const roleLabel: Record<string, string> = {
                  lawyer: "Lawyer",
                  front_desk: "Front Desk",
                  exec_secretary: "Exec. Secretary",
                };
                const roleColor: Record<string, { bg: string; text: string }> = {
                  lawyer: { bg: "rgba(201,168,76,0.15)", text: "var(--primary)" },
                  front_desk: { bg: "rgba(107,114,128,0.1)", text: "#9ca3af" },
                  exec_secretary: { bg: "rgba(99,102,241,0.1)", text: "#818cf8" },
                };
                const rc = roleColor[s.role];
                return (
                  <div key={s.id} className="p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-10 h-10 flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                      >
                        {s.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-serif text-sm font-semibold" style={{ color: "var(--foreground)" }}>{s.name}</div>
                        <span className="text-xs px-2 py-0.5 font-mono" style={{ background: rc.bg, color: rc.text }}>{roleLabel[s.role]}</span>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs">
                      {[
                        { label: "Email", value: s.email },
                        { label: "Phone", value: s.phone },
                        { label: "Joined", value: s.joinedDate },
                        ...(s.specialisation ? [{ label: "Specialisation", value: s.specialisation }] : []),
                        ...(s.role === "lawyer" ? [{ label: "Cases Handled", value: s.casesHandled.toString() }] : []),
                      ].map((f) => (
                        <div key={f.label} className="flex gap-2">
                          <span className="font-mono w-28 flex-shrink-0" style={{ color: "var(--muted-foreground)" }}>{f.label}</span>
                          <span style={{ color: "var(--foreground)" }}>{f.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 flex items-center gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: s.active ? "#22c55e" : "#6b7280" }} />
                      <span className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>
                        {s.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── CaseManager ─── */
function CaseManager({
  c,
  onBack,
  onStatusChange,
  onAddUpdate,
  onLogout,
}: {
  c: Case;
  onBack: () => void;
  onStatusChange: (id: string, s: CaseStatus) => void;
  onAddUpdate: (id: string, title: string, description: string) => void;
  onLogout: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [innerTab, setInnerTab] = useState<"timeline" | "documents">("timeline");
  const sc = statusColors[c.status];
  const caseDocs = caseDocuments.filter((d) => d.caseId === c.id);

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    onAddUpdate(c.id, title.trim(), description.trim());
    setTitle("");
    setDescription("");
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <header
        className="flex items-center justify-between px-6 lg:px-10 h-16 flex-shrink-0"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <img src={logo} alt="Stalwart Law Consult" className="h-7 w-auto object-contain" />
          <span className="font-serif text-sm font-semibold">Admin Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-sm transition-colors"
            style={{ color: "var(--muted-foreground)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
          >
            ← All cases
          </button>
          <button onClick={onLogout} className="text-xs px-3 py-1.5" style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
            Sign out
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-5xl w-full mx-auto px-6 lg:px-10 py-8">
        {/* Case header */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-6 mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <span className="font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>{c.caseNumber}</span>
              <span className="text-xs px-2 py-0.5 font-mono" style={{ background: sc.bg, color: sc.text }}>{sc.label}</span>
            </div>
            <h1 className="font-serif text-2xl lg:text-3xl font-semibold mb-2" style={{ color: "var(--foreground)" }}>{c.title}</h1>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              {c.attorney} · {c.type} · Filed {c.filedDate}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {c.status !== "archived" ? (
              <button
                onClick={() => onStatusChange(c.id, "archived")}
                className="px-4 py-2 text-xs font-mono font-bold rounded flex items-center gap-2 transition-all shadow-sm"
                style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7", border: "1px solid #a855f7" }}
                title="Archive this case into Cold Storage at any time"
              >
                <span>🗄️</span> Archive Case
              </button>
            ) : (
              <button
                onClick={() => onStatusChange(c.id, "active")}
                className="px-4 py-2 text-xs font-mono font-bold rounded flex items-center gap-2 transition-all shadow-sm"
                style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid #22c55e" }}
                title="Restore this case from archive to active status"
              >
                <span>↩️</span> Restore Case
              </button>
            )}

            <div>
              <div className="text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Update Status</div>
              <div className="flex gap-2 flex-wrap">
                {(["active", "pending", "on_hold", "closed", "archived"] as CaseStatus[]).map((s) => {
                  const sc2 = statusColors[s];
                  return (
                    <button
                      key={s}
                      onClick={() => onStatusChange(c.id, s)}
                      className="text-xs px-3 py-1.5 font-mono transition-all"
                      style={
                        c.status === s
                          ? { background: sc2.bg, color: sc2.text, border: `1px solid ${sc2.text}` }
                          : { background: "var(--card)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }
                      }
                    >
                      {sc2.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Extended meta */}
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-0 mb-6"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          {[
            { label: "Client", value: c.clientName },
            { label: "Court / Tribunal", value: c.court ?? "N/A" },
            { label: "Opposing Party", value: c.opposingParty ?? "N/A" },
            { label: "Claim Value", value: c.claimValue ? fmt(c.claimValue) : "N/A" },
          ].map((m, i) => (
            <div key={m.label} className="p-4" style={{ borderLeft: i > 0 ? "1px solid var(--border)" : "none" }}>
              <div className="text-xs font-mono mb-1" style={{ color: "var(--muted-foreground)" }}>{m.label}</div>
              <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Inner tabs */}
        <div className="flex gap-0 mb-6" style={{ borderBottom: "1px solid var(--border)" }}>
          {([
            { id: "timeline" as const, label: `Timeline (${c.updates.length})` },
            { id: "documents" as const, label: `Documents (${caseDocs.length})` },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setInnerTab(t.id)}
              className="px-5 py-3 text-sm font-medium transition-colors relative"
              style={{ color: innerTab === t.id ? "var(--primary)" : "var(--muted-foreground)" }}
            >
              {t.label}
              {innerTab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--primary)" }} />}
            </button>
          ))}
        </div>

        {innerTab === "timeline" && (
          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2">
              <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>Post Progress Update</h2>
              <form onSubmit={handlePost} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Update Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Pre-trial conference completed"
                    className="w-full px-4 py-3 text-sm outline-none"
                    style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>Details</label>
                  <textarea
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the development in detail for the client..."
                    className="w-full px-4 py-3 text-sm outline-none resize-none"
                    style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 text-sm font-medium transition-opacity"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  Post Update
                </button>
              </form>
            </div>
            <div className="lg:col-span-3">
              <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
                Case Timeline ({c.updates.length})
              </h2>
              {c.updates.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No updates posted yet.</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-2 top-0 bottom-0 w-px" style={{ background: "var(--border)" }} />
                  <div className="space-y-5 pl-8">
                    {c.updates.map((u, i) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-6 top-1.5 w-2.5 h-2.5" style={{ background: i === 0 ? "var(--primary)" : "var(--border)" }} />
                        <div className="p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                          <div className="flex items-center justify-between mb-2">
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
        )}

        {innerTab === "documents" && (
          <div className="space-y-3">
            {caseDocs.length === 0 && (
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No documents uploaded for this matter.</p>
            )}
            {caseDocs.map((doc) => {
              const dt = docTypeColors[doc.type];
              return (
                <div key={doc.id} className="flex items-center gap-4 p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <span className="text-2xl" style={{ opacity: 0.6 }}>📄</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold mb-0.5" style={{ color: "var(--foreground)" }}>{doc.name}</div>
                    <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      Uploaded by {doc.uploadedBy} · {doc.uploadedDate}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 font-mono" style={{ background: dt.bg, color: dt.text }}>{dt.label}</span>
                  <span className="text-xs font-mono flex-shrink-0" style={{ color: "var(--muted-foreground)" }}>
                    {doc.sizeKb >= 1000 ? `${(doc.sizeKb / 1000).toFixed(1)} MB` : `${doc.sizeKb} KB`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── UploadCase ─── */
function UploadCase({ onBack, onUpload, onLogout }: { onBack: () => void; onUpload: (c: Case) => void; onLogout: () => void }) {
  const [form, setForm] = useState({
    title: "",
    type: "Business & Corporate",
    attorney: "Chukwuemeka Stalwart",
    clientName: "",
    clientId: "cl001",
    court: "",
    opposingParty: "",
    claimValue: "",
    filedDate: new Date().toISOString().split("T")[0],
    nextHearing: "",
    description: "",
    status: "pending" as CaseStatus,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `c${Date.now()}`;
    const caseNumber = `SLC/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 9000) + 1000)}`;
    onUpload({
      id,
      caseNumber,
      title: form.title,
      type: form.type,
      attorney: form.attorney,
      clientName: form.clientName,
      clientId: form.clientId,
      court: form.court || undefined,
      opposingParty: form.opposingParty || undefined,
      claimValue: form.claimValue ? Number(form.claimValue) : undefined,
      filedDate: form.filedDate,
      nextHearing: form.nextHearing || null,
      description: form.description,
      status: form.status,
      uploadedBy: "Admin",
      updates: [],
    });
  };

  const F = (label: string, children: React.ReactNode) => (
    <div>
      <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted-foreground)" }}>{label}</label>
      {children}
    </div>
  );

  const ic = "w-full px-4 py-3 text-sm outline-none";
  const is = { background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" };
  const fo = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => (e.currentTarget.style.borderColor = "var(--primary)");
  const bl = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => (e.currentTarget.style.borderColor = "var(--border)");

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <header className="flex items-center justify-between px-6 lg:px-10 h-16 flex-shrink-0" style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <img src={logo} alt="Stalwart Law Consult" className="h-7 w-auto object-contain" />
          <span className="font-serif text-sm font-semibold">Admin Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-sm" style={{ color: "var(--muted-foreground)" }} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}>← Back to cases</button>
          <button onClick={onLogout} className="text-xs px-3 py-1.5" style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>Sign out</button>
        </div>
      </header>

      <div className="flex-1 max-w-3xl w-full mx-auto px-6 lg:px-10 py-8">
        <h1 className="font-serif text-3xl font-semibold mb-2" style={{ color: "var(--foreground)" }}>Upload New Case</h1>
        <p className="text-sm mb-8" style={{ color: "var(--muted-foreground)" }}>A case number will be auto-generated on submission.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {F("Case Title *", <input required type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Okafor v. Delta Petroleum Ltd" className={ic} style={is} onFocus={fo} onBlur={bl} />)}

          <div className="grid lg:grid-cols-2 gap-5">
            {F("Practice Area *", (
              <select required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={ic} style={is} onFocus={fo} onBlur={bl}>
                {["Business & Corporate", "Civil Litigation", "Intellectual Property", "Energy & Natural Resources", "Admiralty / Maritime", "Start-Ups"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            ))}
            {F("Lead Attorney *", (
              <select required value={form.attorney} onChange={(e) => setForm({ ...form, attorney: e.target.value })} className={ic} style={is} onFocus={fo} onBlur={bl}>
                {["Chukwuemeka Stalwart", "Adaeze Nwosu", "Babatunde Eze"].map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {F("Client Name *", <input required type="text" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="Full name of client or company" className={ic} style={is} onFocus={fo} onBlur={bl} />)}
            {F("Court / Tribunal", <input type="text" value={form.court} onChange={(e) => setForm({ ...form, court: e.target.value })} placeholder="e.g. Federal High Court, Lagos" className={ic} style={is} onFocus={fo} onBlur={bl} />)}
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {F("Opposing Party", <input type="text" value={form.opposingParty} onChange={(e) => setForm({ ...form, opposingParty: e.target.value })} placeholder="Leave blank for non-contentious matters" className={ic} style={is} onFocus={fo} onBlur={bl} />)}
            {F("Claim Value (NGN)", <input type="number" value={form.claimValue} onChange={(e) => setForm({ ...form, claimValue: e.target.value })} placeholder="Leave blank if N/A" className={ic} style={is} onFocus={fo} onBlur={bl} />)}
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            {F("Initial Status", (
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CaseStatus })} className={ic} style={is} onFocus={fo} onBlur={bl}>
                {(["pending", "active", "on_hold", "closed", "archived"] as CaseStatus[]).map((s) => <option key={s} value={s}>{statusColors[s].label}</option>)}
              </select>
            ))}
            {F("Filed Date", <input type="date" value={form.filedDate} onChange={(e) => setForm({ ...form, filedDate: e.target.value })} className={ic} style={is} onFocus={fo} onBlur={bl} />)}
            {F("Next Hearing Date", <input type="date" value={form.nextHearing} onChange={(e) => setForm({ ...form, nextHearing: e.target.value })} className={ic} style={is} onFocus={fo} onBlur={bl} />)}
          </div>

          {F("Case Description *", (
            <textarea required rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the nature of the matter, parties involved, and key facts..." className={`${ic} resize-none`} style={is} onFocus={fo} onBlur={bl} />
          ))}

          <div className="flex gap-4 pt-2">
            <button type="submit" className="flex-1 py-3 text-sm font-medium tracking-wide transition-opacity" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
              Upload Case
            </button>
            <button type="button" onClick={onBack} className="px-6 py-3 text-sm transition-colors" style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--primary)")} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
