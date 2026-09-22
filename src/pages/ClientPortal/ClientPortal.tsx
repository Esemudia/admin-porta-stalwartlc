import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession } from "../../auth";
import { fetchMatters, fetchDocuments, uploadDocument } from "../../api";
import logo from "../../assets/logo.png";

const fmt = (n: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
const fmtTs = (ts: string) => new Date(ts).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function ClientPortal() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");

  // Real API State
  const [cases, setCases] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCaseId, setUploadCaseId] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [m, d] = await Promise.all([fetchMatters(), fetchDocuments()]);
        // Filter by mock client ID or simply show all for MVP demonstration
        setCases(m);
        setDocuments(d);
        if (m.length > 0) setUploadCaseId(m[0]._id);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    loadData();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return alert("Select file");
    setIsUploading(true);
    try {
      await uploadDocument({
        name: uploadName,
        category: 'evidence',
        matterId: uploadCaseId,
        documentNumber: `STW-DOC-CLIENT-${Math.floor(Math.random() * 1000)}`
      }, uploadFile);
      alert("File safely transmitted to Stalwart Vault!");
      window.location.reload();
    } catch (err) { alert("Failed to upload."); }
    finally { setIsUploading(false); }
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: "◈" },
    { id: "cases", label: "My Cases", icon: "⚖" },
    { id: "documents", label: "Documents", icon: "📄" },
    { id: "upload", label: "Upload File", icon: "📤" },
  ];

  if (loading) return <div className="p-10 text-center">Loading Client Portal securely...</div>;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 lg:px-10 h-16 flex-shrink-0"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <img src={logo} alt="Stalwart Law Consult" className="h-7 w-auto object-contain" />
          <span className="font-serif text-sm font-semibold">Stalwart Law Consult</span>
          <span className="hidden lg:block text-xs font-mono px-2 py-0.5"
            style={{ background: "var(--secondary)", color: "var(--muted-foreground)", marginLeft: "4px" }}>
            CLIENT PORTAL
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Emmanuel Okafor</span>
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>e.okafor@company.com</span>
          </div>
          <button onClick={() => { clearSession(); navigate("/login"); }}
            className="text-xs px-3 py-1.5 transition-colors hover:border-[var(--primary)]"
            style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
            Sign out
          </button>
        </div>
      </header>

      {/* Tab Nav */}
      <div style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex gap-0 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-5 py-3.5 text-xs font-mono whitespace-nowrap transition-colors relative flex items-center gap-1.5"
              style={{ color: tab === t.id ? "var(--primary)" : "var(--muted-foreground)" }}>
              <span>{t.icon}</span> {t.label}
              {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--primary)" }} />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-10 py-8">

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div>
            <h1 className="font-serif text-3xl font-semibold mb-6">Good morning, Emmanuel</h1>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="p-5 bg-[var(--card)] border border-[var(--border)]">
                <div className="text-xs font-mono text-[var(--muted-foreground)] mb-3">Active Cases</div>
                <div className="text-2xl font-semibold text-[var(--primary)]">{cases.length}</div>
              </div>
              <div className="p-5 bg-[var(--card)] border border-[var(--border)]">
                <div className="text-xs font-mono text-[var(--muted-foreground)] mb-3">Documents securely held</div>
                <div className="text-2xl font-semibold text-[var(--primary)]">{documents.length}</div>
              </div>
            </div>

            <h2 className="font-serif text-xl font-semibold mb-4">Active Matters</h2>
            <div className="space-y-3">
              {cases.map((c) => (
                <div key={c._id} className="p-4 bg-[var(--card)] border border-[var(--border)]">
                  <div className="font-mono text-xs text-[var(--muted-foreground)] mb-1">Matter Reference: {c._id.slice(0, 8).toUpperCase()}</div>
                  <div className="font-serif font-semibold">{c.title || c.matterNumber}</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-2">Practice Area: {c.type || 'General Corporate'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* UPLOAD */}
        {tab === "upload" && (
          <div className="max-w-2xl">
            <h1 className="font-serif text-3xl font-semibold mb-6">Secure File Transfer</h1>
            <p className="text-sm text-[var(--muted-foreground)] mb-8">
              Upload documents securely directly to your matter workflow. This bypasses email entirely for confidentiality.
            </p>
            <form onSubmit={handleUpload} className="space-y-5 bg-[var(--card)] p-6 border border-[var(--border)] shadow-sm">
              <div>
                <label className="block text-xs font-mono text-[var(--muted-foreground)] mb-2">Select Matter *</label>
                <select value={uploadCaseId} onChange={e => setUploadCaseId(e.target.value)} required
                  className="w-full bg-[var(--background)] border border-[var(--border)] p-3 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]">
                  {cases.map(c => <option key={c._id} value={c._id}>{c.title || c.matterNumber}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-[var(--muted-foreground)] mb-2">Document Name *</label>
                <input type="text" value={uploadName} onChange={e => setUploadName(e.target.value)} required
                  placeholder="e.g. Signed Offer Letter"
                  className="w-full bg-[var(--background)] border border-[var(--border)] p-3 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]" />
              </div>
              <div>
                <label className="block text-xs font-mono text-[var(--muted-foreground)] mb-2">Physical File * (PDF, DOCX)</label>
                <input type="file" onChange={e => setUploadFile(e.target.files?.[0] || null)} required
                  className="w-full border border-[var(--border)] p-2 text-sm outline-none bg-[var(--muted)] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[var(--primary)] file:text-white" />
              </div>
              <button type="submit" disabled={isUploading}
                className="w-full bg-[var(--primary)] text-white py-3 font-medium text-sm rounded shadow-sm hover:brightness-110 disabled:opacity-50 transition-all">
                {isUploading ? "Transmitting via Vault..." : "Upload to Firm"}
              </button>
            </form>
          </div>
        )}

        {/* DOCUMENTS */}
        {tab === "documents" && (
          <div>
            <h1 className="font-serif text-3xl font-semibold mb-6">Client Document Vault</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map(d => (
                <div key={d._id} className="p-5 bg-[var(--card)] border border-[var(--border)] flex flex-col justify-between shadow-sm rounded-lg hover:border-[var(--primary)] transition-all">
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-[var(--foreground)]">
                      <span className="text-2xl text-[var(--primary)]">📄</span>
                      <span className="font-serif font-semibold text-base">{d.name}</span>
                    </div>
                    <div className="font-mono text-[11px] text-[var(--muted-foreground)] mb-4">{d.documentNumber} • {d.category}</div>
                  </div>
                  {d.fileUrl ? (
                    <a href={d.fileUrl} target="_blank" rel="noreferrer" download className="text-center block w-full bg-[var(--primary)] text-white py-2 text-xs font-medium rounded hover:brightness-110 shadow-sm transition-all">
                      Download File
                    </a>
                  ) : <span className="block w-full text-center py-2 text-xs text-[var(--muted-foreground)] bg-[var(--muted)] rounded border border-[var(--border)]">Metadata only</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CASES DIRECTORY OVERRIDE */}
        {tab === "cases" && (
          <div>
            <h1 className="font-serif text-3xl font-semibold mb-6">Matters History</h1>
            <div className="space-y-4">
              {cases.map(d => (
                <div key={d._id} className="p-5 bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-lg hover:border-[var(--primary)] transition-all">
                  <div className="font-mono text-xs text-[var(--muted-foreground)] mb-2 flex justify-between">
                    <span>Matter Reference: {d._id.slice(0, 10).toUpperCase()}</span>
                    <span className="px-2 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 rounded font-semibold">Active</span>
                  </div>
                  <div className="font-serif text-lg font-semibold text-[var(--foreground)] mb-1">{d.title || d.matterNumber}</div>
                  <div className="text-sm text-[var(--muted-foreground)]">Practice Area: <b className="font-medium text-[var(--foreground)]">{d.type || 'General Corporate'}</b></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
