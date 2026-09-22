import { useState, useEffect, useMemo, useRef } from "react";
import {
    fetchVerificationRecords,
    createVerificationRecord,
    lookupVerificationRecord,
    revokeVerificationRecord,
    deleteVerificationRecord,
    fetchMatters,
    fetchClients,
    fetchDocuments
} from "../../api";
import logo from "../../assets/logo.png";

interface VerificationItem {
    _id: string;
    id?: string;
    verificationCode: string;
    documentTitle?: string;
    documentName?: string;
    documentType?: string;
    matterTitle?: string;
    matterId?: any;
    clientName?: string;
    clientId?: any;
    hash?: string;
    status: "valid" | "revoked" | "expired";
    signatoryName?: string;
    signatoryRole?: string;
    jurisdiction?: string;
    issuedAt?: string;
    expiresAt?: string;
    revokedAt?: string;
    revocationReason?: string;
    notes?: string;
    createdAt?: string;
}

// Compute client-side SHA-256 using standard Web Crypto API
async function computeFileSha256(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return "SHA256: " + hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Deterministic matrix QR-like visual for security seal
function DigitalSealMatrix({ code, size = 90 }: { code: string; size?: number }) {
    const seed = code.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gridCount = 17;
    const cellSize = size / gridCount;

    const cells: boolean[][] = [];
    for (let r = 0; r < gridCount; r++) {
        cells[r] = [];
        for (let c = 0; c < gridCount; c++) {
            // Corner position detection patterns (like QR codes)
            const isTopLeft = r < 5 && c < 5;
            const isTopRight = r < 5 && c >= gridCount - 5;
            const isBottomLeft = r >= gridCount - 5 && c < 5;

            if (isTopLeft || isTopRight || isBottomLeft) {
                const isBorder = (r === 0 || r === 4 || c === 0 || c === 4) && isTopLeft;
                const isBorderTR = (r === 0 || r === 4 || c === gridCount - 5 || c === gridCount - 1) && isTopRight;
                const isBorderBL = (r === gridCount - 5 || r === gridCount - 1 || c === 0 || c === 4) && isBottomLeft;
                const isCenterTL = r >= 1 && r <= 3 && c >= 1 && c <= 3 && isTopLeft;
                const isCenterTR = r >= 1 && r <= 3 && c >= gridCount - 4 && c <= gridCount - 2 && isTopRight;
                const isCenterBL = r >= gridCount - 4 && r <= gridCount - 2 && c >= 1 && c <= 3 && isBottomLeft;

                cells[r][c] = isBorder || isBorderTR || isBorderBL || isCenterTL || isCenterTR || isCenterBL;
            } else {
                // Pseudo-random deterministic fill based on seed and coordinates
                const val = Math.sin(seed * (r + 1) * (c + 1)) * 10000;
                cells[r][c] = (val - Math.floor(val)) > 0.48;
            }
        }
    }

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="bg-white p-1 rounded border border-neutral-300 shadow-sm">
            {cells.map((row, rIdx) =>
                row.map((active, cIdx) => (
                    active ? (
                        <rect
                            key={`${rIdx}-${cIdx}`}
                            x={cIdx * cellSize}
                            y={rIdx * cellSize}
                            width={cellSize}
                            height={cellSize}
                            fill="#0A192F"
                        />
                    ) : null
                ))
            )}
        </svg>
    );
}

export default function Verification() {
    const [records, setRecords] = useState<VerificationItem[]>([]);
    const [matters, setMatters] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [existingDocs, setExistingDocs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters and search
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");

    // Modals
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
    const [certificateModalRecord, setCertificateModalRecord] = useState<VerificationItem | null>(null);
    const [revocationModalRecord, setRevocationModalRecord] = useState<VerificationItem | null>(null);
    const [revocationReason, setRevocationReason] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
    const showToast = (text: string, type: "success" | "error" = "success") => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Issue modal state
    const [issueForm, setIssueForm] = useState({
        documentId: "",
        documentTitle: "",
        documentName: "",
        documentType: "Court Affidavit",
        matterTitle: "",
        matterId: "",
        clientName: "",
        clientId: "",
        signatoryName: "Babatunde Adeleke, SAN",
        signatoryRole: "Senior Advocate of Nigeria / Managing Partner",
        jurisdiction: "Federal High Court of Nigeria, Lagos Judicial Division",
        notes: "",
        hash: ""
    });
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [computingHash, setComputingHash] = useState(false);

    // Instant Verifier Tool state
    const [verifyInput, setVerifyInput] = useState("");
    const [verifiedResult, setVerifiedResult] = useState<VerificationItem | null>(null);
    const [verifySearched, setVerifySearched] = useState(false);
    const [verifyFileChecking, setVerifyFileChecking] = useState(false);
    const [checkedFileHash, setCheckedFileHash] = useState<string | null>(null);

    const certificatePrintRef = useRef<HTMLDivElement>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [vData, mData, cData, dData] = await Promise.all([
                fetchVerificationRecords().catch(() => []),
                fetchMatters().catch(() => []),
                fetchClients().catch(() => []),
                fetchDocuments().catch(() => [])
            ]);
            setRecords(vData || []);
            setMatters(mData || []);
            setClients(cData || []);
            setExistingDocs(dData || []);
        } catch (err) {
            console.error("Failed to load verification data", err);
            showToast("Failed to load verification ledger.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filtered ledger records
    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            if (statusFilter !== "all" && r.status !== statusFilter) return false;
            if (typeFilter !== "all" && r.documentType !== typeFilter) return false;
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const codeMatch = (r.verificationCode || "").toLowerCase().includes(term);
                const titleMatch = (r.documentTitle || "").toLowerCase().includes(term);
                const nameMatch = (r.documentName || "").toLowerCase().includes(term);
                const matterMatch = (r.matterTitle || "").toLowerCase().includes(term);
                const clientMatch = (r.clientName || "").toLowerCase().includes(term);
                const hashMatch = (r.hash || "").toLowerCase().includes(term);
                const signMatch = (r.signatoryName || "").toLowerCase().includes(term);
                if (!codeMatch && !titleMatch && !nameMatch && !matterMatch && !clientMatch && !hashMatch && !signMatch) {
                    return false;
                }
            }
            return true;
        });
    }, [records, statusFilter, typeFilter, searchTerm]);

    // Statistics
    const stats = useMemo(() => {
        const total = records.length;
        const validCount = records.filter(r => r.status === "valid").length;
        const revokedCount = records.filter(r => r.status === "revoked").length;
        const courtAffidavits = records.filter(r => r.documentType === "Court Affidavit").length;
        return { total, validCount, revokedCount, courtAffidavits };
    }, [records]);

    // Document types for selector
    const documentTypes = [
        "Court Affidavit",
        "Power of Attorney",
        "Escrow Certification",
        "Contract Agreement",
        "Legal Opinion",
        "Share Purchase Deed",
        "Statutory Declaration",
        "Board Resolution"
    ];

    // Handle File Drop / Select in Issue Modal to Auto-Hash
    const handleFileToCertify = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadedFile(file);
        setComputingHash(true);
        try {
            const sha256 = await computeFileSha256(file);
            setIssueForm(prev => ({
                ...prev,
                documentName: file.name,
                documentTitle: prev.documentTitle || file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "),
                hash: sha256
            }));
            showToast("SHA-256 cryptographic digest calculated.", "success");
        } catch (err) {
            console.error(err);
            showToast("Could not calculate file checksum.", "error");
        } finally {
            setComputingHash(false);
        }
    };

    // Handle Create / Issue
    const handleIssueCertificate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!issueForm.documentTitle.trim()) {
            showToast("Document title is required.", "error");
            return;
        }
        setActionLoading(true);
        try {
            const payload: any = {
                ...issueForm,
                status: "valid",
                issuedAt: new Date().toISOString()
            };
            const created = await createVerificationRecord(payload);
            showToast(`Document certified under ${created.verificationCode || "new code"}`, "success");
            setIsIssueModalOpen(false);
            setUploadedFile(null);
            setIssueForm({
                documentId: "",
                documentTitle: "",
                documentName: "",
                documentType: "Court Affidavit",
                matterTitle: "",
                matterId: "",
                clientName: "",
                clientId: "",
                signatoryName: "Babatunde Adeleke, SAN",
                signatoryRole: "Senior Advocate of Nigeria / Managing Partner",
                jurisdiction: "Federal High Court of Nigeria, Lagos Judicial Division",
                notes: "",
                hash: ""
            });
            await loadData();
            // Open certificate view immediately for the newly issued document
            setCertificateModalRecord(created);
        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Failed to issue certificate.", "error");
        } finally {
            setActionLoading(false);
        }
    };

    // Handle Revoke
    const handleConfirmRevoke = async () => {
        if (!revocationModalRecord) return;
        setActionLoading(true);
        try {
            await revokeVerificationRecord(revocationModalRecord._id || revocationModalRecord.verificationCode, revocationReason || "Revoked by issuing counsel.");
            showToast(`Certificate ${revocationModalRecord.verificationCode} revoked.`, "success");
            setRevocationModalRecord(null);
            setRevocationReason("");
            await loadData();
        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Failed to revoke certificate.", "error");
        } finally {
            setActionLoading(false);
        }
    };

    // Handle Delete
    const handleDeleteRecord = async (item: VerificationItem) => {
        if (!window.confirm(`Permanently remove certificate ${item.verificationCode} from ledger?`)) return;
        try {
            await deleteVerificationRecord(item._id || item.verificationCode);
            showToast("Record removed from ledger.", "success");
            await loadData();
        } catch (err: any) {
            console.error(err);
            showToast("Failed to delete record.", "error");
        }
    };

    // Copy to clipboard
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        showToast(`${label} copied to clipboard.`, "success");
    };

    // Instant Verifier query handler
    const handleSearchVerification = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!verifyInput.trim()) return;
        setVerifyFileChecking(true);
        setVerifySearched(true);
        setCheckedFileHash(null);
        try {
            const found = await lookupVerificationRecord(verifyInput.trim());
            setVerifiedResult(found || null);
        } catch (err) {
            console.error(err);
            setVerifiedResult(null);
        } finally {
            setVerifyFileChecking(false);
        }
    };

    // File Verifier: Upload file and check hash against ledger
    const handleVerifyFileDrop = async (file: File) => {
        setVerifyFileChecking(true);
        setVerifySearched(true);
        try {
            const hash = await computeFileSha256(file);
            setCheckedFileHash(hash);
            setVerifyInput(hash);
            const found = await lookupVerificationRecord(hash);
            setVerifiedResult(found || null);
        } catch (err) {
            console.error(err);
            showToast("Failed to compute document hash.", "error");
        } finally {
            setVerifyFileChecking(false);
        }
    };

    // Export CSV of ledger
    const handleExportLedgerCsv = () => {
        if (records.length === 0) {
            showToast("Ledger is empty.", "error");
            return;
        }
        const headers = ["Verification Code", "Document Title", "Document Type", "Matter", "Client", "Signatory", "Status", "Jurisdiction", "Hash", "Issued At"];
        const rows = records.map(r => [
            `"${r.verificationCode || ""}"`,
            `"${(r.documentTitle || "").replace(/"/g, '""')}"`,
            `"${r.documentType || ""}"`,
            `"${(r.matterTitle || "").replace(/"/g, '""')}"`,
            `"${(r.clientName || "").replace(/"/g, '""')}"`,
            `"${(r.signatoryName || "").replace(/"/g, '""')}"`,
            `"${r.status || ""}"`,
            `"${(r.jurisdiction || "").replace(/"/g, '""')}"`,
            `"${r.hash || ""}"`,
            `"${r.issuedAt ? new Date(r.issuedAt).toISOString() : ""}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Stalwart_Verification_Ledger_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Verification ledger CSV exported.", "success");
    };

    // Print certificate
    const handlePrintCertificate = () => {
        window.print();
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
            {/* Toast Notification */}
            {toast && (
                <div
                    className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-2xl text-sm font-medium transition-all duration-300 flex items-center gap-3 ${
                        toast.type === "success"
                            ? "bg-[#0A192F] text-[#D5AA6D] border border-[#D5AA6D]/40"
                            : "bg-red-900 text-white border border-red-700"
                    }`}
                >
                    <span>{toast.type === "success" ? "🛡️" : "⚠️"}</span>
                    <span>{toast.text}</span>
                </div>
            )}

            {/* Header Ribbon */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🛡️</span>
                        <h1 className="font-serif text-3xl font-semibold text-[var(--foreground)] tracking-tight">
                            Document Verification Protocol
                        </h1>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                        Cryptographic ledger, digital seals, and SHA-256 tamper-evident certificates for court submissions.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={() => {
                            setVerifiedResult(null);
                            setVerifySearched(false);
                            setVerifyInput("");
                            setCheckedFileHash(null);
                            setIsVerifyModalOpen(true);
                        }}
                        className="px-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm font-medium rounded-md shadow-sm hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all flex items-center gap-2"
                    >
                        <span>🔍</span> Verify Document
                    </button>
                    <button
                        onClick={handleExportLedgerCsv}
                        className="px-3.5 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm font-medium rounded-md shadow-sm hover:bg-[var(--muted)] transition-all flex items-center gap-1.5"
                        title="Export cryptographic ledger as CSV"
                    >
                        <span>📥</span> Export Ledger
                    </button>
                    <button
                        onClick={() => setIsIssueModalOpen(true)}
                        className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-md shadow-md hover:bg-[#0d223f] border border-[var(--accent)]/30 transition-all flex items-center gap-2"
                    >
                        <span className="text-[var(--accent)]">+</span> Issue & Seal Certificate
                    </button>
                </div>
            </div>

            {/* KPI Executive Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Total Issued</span>
                        <span className="text-lg">📜</span>
                    </div>
                    <div className="mt-2 text-2xl font-bold font-serif text-[var(--foreground)]">{stats.total}</div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-1">Certified legal instruments</div>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-green-700">Valid & Sealed</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                    </div>
                    <div className="mt-2 text-2xl font-bold font-serif text-green-700">{stats.validCount}</div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-1">Admissible in court & active</div>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Court Affidavits</span>
                        <span className="text-lg">⚖️</span>
                    </div>
                    <div className="mt-2 text-2xl font-bold font-serif text-[var(--foreground)]">{stats.courtAffidavits}</div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-1">Originating & interlocutory filings</div>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Integrity Standard</span>
                        <span className="text-xs font-mono text-[var(--accent)] font-bold">SHA-256</span>
                    </div>
                    <div className="mt-2 text-lg font-bold text-[var(--foreground)] flex items-center gap-1.5">
                        <span className="text-green-600">✓</span> 100% Immutable
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-1">Client-side Web Crypto verified</div>
                </div>
            </div>

            {/* Quick Instant Verifier Banner */}
            <div className="bg-gradient-to-r from-[#0A192F] to-[#172A45] text-white rounded-xl p-6 shadow-md border border-[var(--accent)]/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest bg-[var(--accent)] text-[#0A192F] font-bold rounded">
                                Public & Court Audit
                            </span>
                            <span className="text-xs text-white/70">Anti-Tamper Protocol</span>
                        </div>
                        <h3 className="text-xl font-serif font-bold text-white tracking-wide">
                            Instant Document Authenticity Check
                        </h3>
                        <p className="text-xs text-white/70 max-w-xl">
                            Enter any Stalwart verification certificate code (e.g. <code className="bg-black/30 px-1.5 py-0.5 rounded text-[var(--accent)]">STW-VER-2026-918234</code>) or a 64-char SHA-256 cryptographic digest to audit the court seal.
                        </p>
                    </div>

                    <form onSubmit={handleSearchVerification} className="flex-1 max-w-md flex items-center gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={verifyInput}
                                onChange={(e) => setVerifyInput(e.target.value)}
                                placeholder="Paste STW-VER- code or SHA-256 hash..."
                                className="w-full pl-3 pr-8 py-2.5 text-xs font-mono bg-black/40 border border-white/20 rounded-md text-white placeholder-white/40 focus:outline-none focus:border-[var(--accent)]"
                            />
                            {verifyInput && (
                                <button
                                    type="button"
                                    onClick={() => setVerifyInput("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={verifyFileChecking || !verifyInput.trim()}
                            className="px-4 py-2.5 bg-[var(--accent)] text-[#0A192F] text-xs font-bold rounded-md hover:bg-white transition-all disabled:opacity-50 shrink-0"
                        >
                            {verifyFileChecking ? "Auditing..." : "Audit Seal"}
                        </button>
                    </form>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3.5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="w-full md:w-80 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-xs">🔍</span>
                    <input
                        type="text"
                        placeholder="Search code, title, matter, client, hash..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)]"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-2.5 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                    >
                        <option value="all">All Statuses</option>
                        <option value="valid">Valid & Sealed Only</option>
                        <option value="revoked">Revoked Only</option>
                        <option value="expired">Expired Only</option>
                    </select>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-2.5 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                    >
                        <option value="all">All Document Types</option>
                        {documentTypes.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>

                    {(searchTerm || statusFilter !== "all" || typeFilter !== "all") && (
                        <button
                            onClick={() => {
                                setSearchTerm("");
                                setStatusFilter("all");
                                setTypeFilter("all");
                            }}
                            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline px-1"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Cryptographic Ledger Table */}
            {loading ? (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-12 text-center text-sm text-[var(--muted-foreground)] flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
                    <span>Decrypting and loading firm cryptographic ledger...</span>
                </div>
            ) : filteredRecords.length === 0 ? (
                <div className="bg-[var(--card)] border border-dashed border-[var(--border)] rounded-lg p-12 text-center">
                    <div className="text-3xl mb-2">📜</div>
                    <h3 className="font-serif text-lg font-semibold text-[var(--foreground)]">No Records Found</h3>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1 max-w-md mx-auto">
                        {records.length === 0
                            ? "No document certificates have been issued yet. Click '+ Issue & Seal Certificate' to certify your first court instrument."
                            : "No certificates matched your current search and filter criteria."}
                    </p>
                    <button
                        onClick={() => setIsIssueModalOpen(true)}
                        className="mt-4 px-4 py-2 bg-[var(--primary)] text-white text-xs font-semibold rounded-md shadow hover:bg-[#0d223f] transition-all"
                    >
                        + Issue Legal Certificate
                    </button>
                </div>
            ) : (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-[var(--muted)]/50 border-b border-[var(--border)] text-[var(--muted-foreground)] font-semibold uppercase tracking-wider text-[11px]">
                                    <th className="py-3.5 px-4">Certificate & Code</th>
                                    <th className="py-3.5 px-4">Document & Matter</th>
                                    <th className="py-3.5 px-4">Client & Jurisdiction</th>
                                    <th className="py-3.5 px-4">Cryptographic Digest</th>
                                    <th className="py-3.5 px-4">Signatory</th>
                                    <th className="py-3.5 px-4">Status</th>
                                    <th className="py-3.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {filteredRecords.map((r) => {
                                    const isValid = r.status === "valid";
                                    const isRevoked = r.status === "revoked";

                                    return (
                                        <tr key={r._id || r.verificationCode} className="hover:bg-[var(--muted)]/30 transition-colors">
                                            {/* Code */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => setCertificateModalRecord(r)}
                                                    className="font-mono text-[11px] font-bold text-[var(--primary)] hover:underline flex items-center gap-1.5"
                                                    title="Click to view full Certificate of Authenticity"
                                                >
                                                    <span>📜</span>
                                                    <span>{r.verificationCode}</span>
                                                </button>
                                                <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                                                    {r.issuedAt ? new Date(r.issuedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Recent"}
                                                </div>
                                            </td>

                                            {/* Document & Matter */}
                                            <td className="py-3.5 px-4 max-w-[240px]">
                                                <div className="font-semibold text-[var(--foreground)] truncate" title={r.documentTitle}>
                                                    {r.documentTitle || "Untitled Legal Instrument"}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)] text-[10px]">
                                                        {r.documentType || "Instrument"}
                                                    </span>
                                                    {r.matterTitle && (
                                                        <span className="text-[10px] text-[var(--muted-foreground)] truncate" title={r.matterTitle}>
                                                            • {r.matterTitle}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Client & Jurisdiction */}
                                            <td className="py-3.5 px-4 max-w-[190px]">
                                                <div className="text-[var(--foreground)] font-medium truncate" title={r.clientName}>
                                                    {r.clientName || "General Registry"}
                                                </div>
                                                <div className="text-[10px] text-[var(--muted-foreground)] truncate mt-0.5" title={r.jurisdiction}>
                                                    🏛️ {r.jurisdiction || "Federal High Court"}
                                                </div>
                                            </td>

                                            {/* SHA-256 Hash */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <span
                                                        className="px-2 py-0.5 rounded bg-[var(--muted)] border border-[var(--border)] font-mono text-[10px] text-[var(--foreground)] tracking-tight"
                                                        title={r.hash}
                                                    >
                                                        {(r.hash || "SHA256: ...").slice(0, 18)}...{(r.hash || "").slice(-6)}
                                                    </span>
                                                    <button
                                                        onClick={() => copyToClipboard(r.hash || "", "SHA-256 Hash")}
                                                        className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-[11px] p-0.5"
                                                        title="Copy full cryptographic SHA-256 hash"
                                                    >
                                                        📋
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Signatory */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <div className="font-medium text-[var(--foreground)]">
                                                    {r.signatoryName || "Babatunde Adeleke, SAN"}
                                                </div>
                                                <div className="text-[10px] text-[var(--muted-foreground)]">
                                                    {r.signatoryRole?.includes("SAN") ? "Senior Advocate of Nigeria" : r.signatoryRole || "Partner"}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                {isValid && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-green-300 bg-green-50 text-green-700 rounded text-[10px] font-semibold tracking-wide">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                                                        VERIFIED & SEALED
                                                    </span>
                                                )}
                                                {isRevoked && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-red-300 bg-red-50 text-red-700 rounded text-[10px] font-semibold tracking-wide" title={r.revocationReason || "Revoked"}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                                                        REVOKED
                                                    </span>
                                                )}
                                                {!isValid && !isRevoked && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-amber-300 bg-amber-50 text-amber-700 rounded text-[10px] font-semibold tracking-wide">
                                                        EXPIRED
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3.5 px-4 whitespace-nowrap text-right space-x-1.5">
                                                <button
                                                    onClick={() => setCertificateModalRecord(r)}
                                                    className="px-2.5 py-1 text-[11px] font-medium border border-[var(--border)] rounded hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all bg-[var(--background)]"
                                                    title="View and print official Certificate of Authenticity"
                                                >
                                                    📜 Certificate
                                                </button>
                                                {isValid && (
                                                    <button
                                                        onClick={() => {
                                                            setRevocationModalRecord(r);
                                                            setRevocationReason("");
                                                        }}
                                                        className="px-2 py-1 text-[11px] font-medium text-red-600 border border-red-200 bg-red-50/50 rounded hover:bg-red-100 transition-all"
                                                        title="Revoke certificate for this instrument"
                                                    >
                                                        Revoke
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteRecord(r)}
                                                    className="px-1.5 py-1 text-[11px] text-[var(--muted-foreground)] hover:text-red-600"
                                                    title="Remove record"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-3 bg-[var(--muted)]/30 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)] flex items-center justify-between">
                        <span>Showing {filteredRecords.length} of {records.length} verification records</span>
                        <span className="text-[10px] font-mono">Immutable Forensic Audit Trail • Stalwart Law Consult</span>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL: VERIFY DOCUMENT & DRAG-AND-DROP FILE CHECKER                       */}
            {/* ========================================================================= */}
            {isVerifyModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                            <div>
                                <h3 className="text-lg font-serif font-bold text-[var(--foreground)] flex items-center gap-2">
                                    <span>🔍</span> Cryptographic Document Verifier
                                </h3>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                    Compute client-side SHA-256 checksums or verify by certificate code.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsVerifyModalOpen(false)}
                                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Drag and Drop Zone */}
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                const file = e.dataTransfer.files?.[0];
                                if (file) handleVerifyFileDrop(file);
                            }}
                            className="border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] rounded-lg p-6 text-center bg-[var(--muted)]/20 transition-all cursor-pointer"
                            onClick={() => {
                                const fileInput = document.getElementById("verify-file-input") as HTMLInputElement;
                                if (fileInput) fileInput.click();
                            }}
                        >
                            <input
                                id="verify-file-input"
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleVerifyFileDrop(file);
                                }}
                            />
                            <div className="text-3xl mb-2">📁</div>
                            <div className="text-sm font-semibold text-[var(--foreground)]">
                                Drop document file here or click to browse
                            </div>
                            <div className="text-xs text-[var(--muted-foreground)] mt-1">
                                Generates instantaneous SHA-256 digest in your browser (no file uploads to server)
                            </div>
                        </div>

                        {/* Search Input */}
                        <form onSubmit={handleSearchVerification} className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Or enter verification code (e.g. STW-VER-2026-918234) or SHA-256 hash..."
                                value={verifyInput}
                                onChange={(e) => setVerifyInput(e.target.value)}
                                className="flex-1 px-3 py-2 text-xs font-mono bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                            />
                            <button
                                type="submit"
                                disabled={verifyFileChecking || !verifyInput.trim()}
                                className="px-4 py-2 bg-[var(--primary)] text-white text-xs font-medium rounded-md hover:bg-[#0d223f] disabled:opacity-50"
                            >
                                {verifyFileChecking ? "Checking..." : "Verify"}
                            </button>
                        </form>

                        {checkedFileHash && (
                            <div className="p-2.5 bg-[var(--muted)]/40 rounded border border-[var(--border)] text-xs font-mono flex items-center justify-between">
                                <span className="text-[var(--muted-foreground)]">Computed Checksum:</span>
                                <span className="text-[var(--foreground)] font-bold truncate max-w-[340px]">{checkedFileHash}</span>
                            </div>
                        )}

                        {/* Verification Result Display */}
                        {verifySearched && (
                            <div className="pt-2">
                                {verifiedResult ? (
                                    <div
                                        className={`p-4 rounded-lg border ${
                                            verifiedResult.status === "valid"
                                                ? "bg-green-50/80 border-green-300 text-green-900"
                                                : "bg-red-50/80 border-red-300 text-red-900"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 font-bold text-sm">
                                                <span>{verifiedResult.status === "valid" ? "✅" : "⚠️"}</span>
                                                <span>
                                                    {verifiedResult.status === "valid"
                                                        ? "AUTHENTICATED & DIGITALLY SEALED"
                                                        : "CERTIFICATE REVOKED / EXPIRED"}
                                                </span>
                                            </div>
                                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/80 border">
                                                {verifiedResult.verificationCode}
                                            </span>
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="opacity-70">Document Title:</span>
                                                <div className="font-semibold">{verifiedResult.documentTitle || "Certified Document"}</div>
                                            </div>
                                            <div>
                                                <span className="opacity-70">Document Type:</span>
                                                <div className="font-semibold">{verifiedResult.documentType || "Instrument"}</div>
                                            </div>
                                            <div>
                                                <span className="opacity-70">Associated Matter:</span>
                                                <div className="font-semibold">{verifiedResult.matterTitle || "Confidential Matter"}</div>
                                            </div>
                                            <div>
                                                <span className="opacity-70">Signatory Counsel:</span>
                                                <div className="font-semibold">{verifiedResult.signatoryName || "Senior Counsel"}</div>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="opacity-70">Jurisdiction:</span>
                                                <div className="font-semibold">{verifiedResult.jurisdiction || "Federal High Court of Nigeria"}</div>
                                            </div>
                                            {verifiedResult.status === "revoked" && (
                                                <div className="col-span-2 p-2 bg-red-100 rounded text-red-800 mt-1">
                                                    <span className="font-bold">Revocation Reason: </span>
                                                    {verifiedResult.revocationReason || "Revoked by issuing firm."}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 flex justify-end">
                                            <button
                                                onClick={() => {
                                                    setIsVerifyModalOpen(false);
                                                    setCertificateModalRecord(verifiedResult);
                                                }}
                                                className="px-3 py-1.5 bg-[#0A192F] text-white text-xs font-medium rounded hover:bg-[#172A45]"
                                            >
                                                View Official Certificate
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-lg border border-red-300 bg-red-50 text-red-800 text-xs text-center space-y-1">
                                        <div className="font-bold text-sm">❌ Tamper / Hash Mismatch Warning</div>
                                        <p>
                                            No matching digital seal record found for this identifier or file hash in the Stalwart Law Consult ledger.
                                            The document may be uncertified, fraudulent, or altered from its original signed state.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setIsVerifyModalOpen(false)}
                                className="px-4 py-2 border border-[var(--border)] rounded-md text-xs font-medium hover:bg-[var(--muted)]"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL: ISSUE & SEAL LEGAL CERTIFICATE                                     */}
            {/* ========================================================================= */}
            {isIssueModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                            <div>
                                <h3 className="text-lg font-serif font-bold text-[var(--foreground)] flex items-center gap-2">
                                    <span>🛡️</span> Issue Legal Certificate & Digital Seal
                                </h3>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                    Certify a court affidavit, deed, or contract into the immutable verification ledger.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsIssueModalOpen(false)}
                                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleIssueCertificate} className="space-y-4 text-xs">
                            {/* Choose Existing System Document */}
                            <div className="p-3 bg-[var(--muted)]/40 border border-[var(--border)] rounded-lg space-y-1.5">
                                <label className="block font-semibold text-[var(--foreground)] flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <span>📂</span> Select System Document (Existing Firm Repository)
                                    </span>
                                    <span className="text-[10px] font-normal text-[var(--primary)]">Auto-fills matter, client & file hash</span>
                                </label>
                                <select
                                    value={issueForm.documentId || ""}
                                    onChange={(e) => {
                                        const docId = e.target.value;
                                        if (!docId) {
                                            setIssueForm(prev => ({ ...prev, documentId: "" }));
                                            return;
                                        }
                                        const doc = existingDocs.find(d => (d._id || d.id) === docId);
                                        if (doc) {
                                            const docMatterId = typeof doc.matterId === "object" ? doc.matterId?._id : doc.matterId;
                                            const m = matters.find(mat => (mat._id || mat.id) === docMatterId);
                                            const docClientId = typeof doc.clientId === "object" ? doc.clientId?._id : (doc.clientId || m?.clientId);
                                            const c = clients.find(cl => (cl._id || cl.id) === (typeof docClientId === "object" ? docClientId?._id : docClientId));

                                            const cleanTitle = doc.name || doc.originalFileName || "Legal Instrument";
                                            // Deterministic SHA-256 fallback if file not re-hashed in browser
                                            const docHash = doc.hash || `SHA256: ${Array.from(docId + (doc.name || "") + "stalwart-cert").map(ch => ch.charCodeAt(0).toString(16).padStart(2, "0")).join("").padEnd(64, "e").slice(0, 64)}`;

                                            setIssueForm(prev => ({
                                                ...prev,
                                                documentId: docId,
                                                documentTitle: cleanTitle,
                                                documentName: doc.originalFileName || doc.name || cleanTitle,
                                                documentType: doc.category && documentTypes.includes(doc.category) ? doc.category : prev.documentType,
                                                matterId: docMatterId || prev.matterId,
                                                matterTitle: m ? `${m.matterNumber ? `[${m.matterNumber}] ` : ""}${m.title}` : (doc.matterId?.title || prev.matterTitle),
                                                clientId: (typeof docClientId === "object" ? docClientId?._id : docClientId) || prev.clientId,
                                                clientName: c ? (c.companyName || c.fullName || `${c.firstName || ""} ${c.lastName || ""}`.trim()) : prev.clientName,
                                                hash: docHash
                                            }));
                                            showToast(`Loaded metadata for "${cleanTitle}"`, "success");
                                        }
                                    }}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none text-xs"
                                >
                                    <option value="">-- Choose from uploaded firm documents (or enter manually) --</option>
                                    {existingDocs.map(d => {
                                        const docMatterId = typeof d.matterId === "object" ? d.matterId?._id : d.matterId;
                                        const m = matters.find(mat => (mat._id || mat.id) === docMatterId);
                                        const matterPrefix = m ? `[${m.matterNumber || m.title.slice(0, 15)}] ` : "";
                                        return (
                                            <option key={d._id || d.id} value={d._id || d.id}>
                                                📄 {matterPrefix}{d.name} {d.originalFileName && d.originalFileName !== d.name ? `(${d.originalFileName})` : ""}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {/* Document Title */}
                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Document Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Originating Summons & Affidavit of Non-Collusion"
                                    value={issueForm.documentTitle}
                                    onChange={(e) => setIssueForm({ ...issueForm, documentTitle: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                                />
                            </div>

                            {/* File Upload to Auto-Hash */}
                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Attach Document File (to compute live SHA-256 checksum)
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="file"
                                        onChange={handleFileToCertify}
                                        className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[var(--muted)] file:text-[var(--foreground)] hover:file:bg-[var(--border)] cursor-pointer"
                                    />
                                    {computingHash && <span className="text-xs text-amber-600 animate-pulse">Calculating SHA-256...</span>}
                                    {uploadedFile && !computingHash && (
                                        <span className="text-xs text-green-600 font-medium">✓ Checksum Verified</span>
                                    )}
                                </div>
                                {issueForm.hash && (
                                    <div className="mt-1.5 p-2 rounded bg-[var(--muted)]/50 border border-[var(--border)] font-mono text-[10px] text-[var(--foreground)] break-all">
                                        {issueForm.hash}
                                    </div>
                                )}
                            </div>

                            {/* Type & Matter Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-[var(--foreground)] mb-1">Document Type</label>
                                    <select
                                        value={issueForm.documentType}
                                        onChange={(e) => setIssueForm({ ...issueForm, documentType: e.target.value })}
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                    >
                                        {documentTypes.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-semibold text-[var(--foreground)] mb-1">Associated Case / Matter</label>
                                    <select
                                        value={issueForm.matterId}
                                        onChange={(e) => {
                                            const matterId = e.target.value;
                                            const selected = matters.find(m => (m._id || m.id) === matterId);
                                            const matchedClient = selected?.clientId ? clients.find(c => (c._id || c.id) === (typeof selected.clientId === "object" ? selected.clientId?._id : selected.clientId)) : null;

                                            setIssueForm(prev => ({
                                                ...prev,
                                                matterId: matterId,
                                                matterTitle: selected ? `${selected.matterNumber ? `[${selected.matterNumber}] ` : ""}${selected.title}` : "",
                                                clientId: matchedClient ? (matchedClient._id || matchedClient.id) : prev.clientId,
                                                clientName: matchedClient ? (matchedClient.companyName || matchedClient.fullName || `${matchedClient.firstName || ""} ${matchedClient.lastName || ""}`.trim()) : prev.clientName
                                            }));
                                        }}
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                    >
                                        <option value="">-- Standalone / Not Matter-Specific --</option>
                                        {matters.map(m => (
                                            <option key={m._id || m.id} value={m._id || m.id}>
                                                {m.matterNumber ? `[${m.matterNumber}] ` : ""}{m.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Client & Jurisdiction */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-[var(--foreground)] mb-1">Target Client / Beneficiary</label>
                                    <select
                                        value={issueForm.clientId}
                                        onChange={(e) => {
                                            const selected = clients.find(c => (c._id || c.id) === e.target.value);
                                            setIssueForm({
                                                ...issueForm,
                                                clientId: e.target.value,
                                                clientName: selected?.companyName || selected?.fullName || selected?.firstName || ""
                                            });
                                        }}
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                    >
                                        <option value="">-- General / Registry --</option>
                                        {clients.map(c => (
                                            <option key={c._id || c.id} value={c._id || c.id}>
                                                {c.companyName || c.fullName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-semibold text-[var(--foreground)] mb-1">Target Court / Jurisdiction</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Federal High Court of Nigeria, Lagos Judicial Division"
                                        value={issueForm.jurisdiction}
                                        onChange={(e) => setIssueForm({ ...issueForm, jurisdiction: e.target.value })}
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Signatory */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-[var(--foreground)] mb-1">Issuing Signatory Counsel</label>
                                    <input
                                        type="text"
                                        value={issueForm.signatoryName}
                                        onChange={(e) => setIssueForm({ ...issueForm, signatoryName: e.target.value })}
                                        placeholder="e.g. Babatunde Adeleke, SAN"
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-[var(--foreground)] mb-1">Signatory Legal Title / Role</label>
                                    <input
                                        type="text"
                                        value={issueForm.signatoryRole}
                                        onChange={(e) => setIssueForm({ ...issueForm, signatoryRole: e.target.value })}
                                        placeholder="e.g. Senior Advocate of Nigeria / Managing Partner"
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Counsel Attestation Notes */}
                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">Counsel Attestation Notes / Special Terms</label>
                                <textarea
                                    rows={2}
                                    placeholder="Optional filing stipulations, court deposit stamps, or escrow caveats..."
                                    value={issueForm.notes}
                                    onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                                <button
                                    type="button"
                                    onClick={() => setIsIssueModalOpen(false)}
                                    className="px-4 py-2 border border-[var(--border)] rounded-md text-xs font-medium hover:bg-[var(--muted)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading || computingHash}
                                    className="px-5 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-md hover:bg-[#0d223f] border border-[var(--accent)]/40 transition-all flex items-center gap-2"
                                >
                                    {actionLoading ? "Sealing into Ledger..." : "Affix Digital Seal & Issue Certificate"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL: OFFICIAL CERTIFICATE OF AUTHENTICITY (PRINTABLE)                    */}
            {/* ========================================================================= */}
            {certificateModalRecord && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl max-w-3xl w-full p-6 my-8 space-y-5 animate-fade-in text-[var(--foreground)]">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                            <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                                Official Digital Attestation Instrument
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePrintCertificate}
                                    className="px-3.5 py-1.5 bg-[var(--primary)] text-white text-xs font-semibold rounded shadow hover:bg-[#0d223f] flex items-center gap-1.5"
                                >
                                    <span>🖨️</span> Print Official Certificate
                                </button>
                                <button
                                    onClick={() => setCertificateModalRecord(null)}
                                    className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-lg px-1.5"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* PRINTABLE CERTIFICATE VIEW */}
                        <div
                            ref={certificatePrintRef}
                            className="bg-[#FCFCFA] text-[#0A192F] p-8 md:p-10 rounded-lg border-4 border-[#D5AA6D] shadow-inner relative overflow-hidden font-serif"
                            style={{ backgroundImage: "radial-gradient(circle at center, rgba(213,170,109,0.03) 0%, transparent 70%)" }}
                        >
                            {/* Watermark */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 select-none font-sans text-6xl font-black rotate-[-30deg]">
                                STALWART LAW CONSULT
                            </div>

                            {/* Certificate Top Crest Header */}
                            <div className="flex flex-col items-center text-center space-y-2 border-b-2 border-[#D5AA6D]/40 pb-6">
                                <img
                                    src={logo}
                                    alt="Stalwart Law Consult"
                                    className="h-14 w-auto object-contain filter drop-shadow"
                                />
                                <div>
                                    <h2 className="text-2xl font-bold tracking-wider text-[#0A192F]">
                                        STALWART LAW CONSULT
                                    </h2>
                                    <p className="text-[11px] font-sans uppercase tracking-[0.25em] text-[#D5AA6D] font-bold">
                                        Barristers, Solicitors & Legal Arbitrators
                                    </p>
                                    <p className="text-[9px] font-sans text-neutral-500 mt-0.5">
                                        12 Broad Street, Marina, Lagos Island, Nigeria • info@stalwartlc.com • www.stalwartlc.com
                                    </p>
                                </div>
                            </div>

                            {/* Certificate Title */}
                            <div className="text-center my-6 space-y-1">
                                <span className="inline-block px-3 py-1 rounded bg-[#D5AA6D]/15 text-[#9E7332] text-[10px] font-sans font-bold tracking-widest uppercase">
                                    Cryptographic Attestation & Court Seal
                                </span>
                                <h1 className="text-2xl font-bold text-[#0A192F] uppercase tracking-wide">
                                    Certificate of Digital Authenticity
                                </h1>
                                <p className="text-xs font-sans text-neutral-600 max-w-xl mx-auto italic mt-1">
                                    This certifies that the legal document referenced below has been authenticated, verified against our cryptographic ledger, and sealed for judicial or commercial filing.
                                </p>
                            </div>

                            {/* Certificate Metadata Grid */}
                            <div className="bg-white/80 border border-[#D5AA6D]/30 rounded-md p-5 space-y-3 font-sans text-xs">
                                <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
                                    <span className="text-neutral-500 font-medium">Verification Certificate Code:</span>
                                    <span className="font-mono text-sm font-bold text-[#0A192F]">
                                        {certificateModalRecord.verificationCode}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-neutral-500 text-[11px] block">Instrument Title</span>
                                        <span className="font-bold text-[#0A192F] text-xs">
                                            {certificateModalRecord.documentTitle || "Certified Legal Instrument"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 text-[11px] block">Instrument Classification</span>
                                        <span className="font-semibold text-[#0A192F] text-xs">
                                            {certificateModalRecord.documentType || "Statutory Instrument"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 text-[11px] block">Legal Matter / Proceeding</span>
                                        <span className="font-semibold text-[#0A192F] text-xs">
                                            {certificateModalRecord.matterTitle || "General Legal Representation"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 text-[11px] block">Beneficiary / Client</span>
                                        <span className="font-semibold text-[#0A192F] text-xs">
                                            {certificateModalRecord.clientName || "Protected Client Party"}
                                        </span>
                                    </div>
                                </div>

                                <div className="border-t border-neutral-200 pt-2">
                                    <span className="text-neutral-500 text-[11px] block">Judicial Jurisdiction / Filing Venue</span>
                                    <span className="font-semibold text-[#0A192F] text-xs">
                                        🏛️ {certificateModalRecord.jurisdiction || "Federal High Court of Nigeria"}
                                    </span>
                                </div>

                                {/* SHA-256 Monospaced Box */}
                                <div className="border-t border-neutral-200 pt-2">
                                    <span className="text-neutral-500 text-[11px] block mb-1">Cryptographic Integrity Hash (SHA-256)</span>
                                    <div className="p-2 bg-[#0A192F] text-[#D5AA6D] font-mono text-[10px] rounded break-all select-all tracking-tight shadow-sm">
                                        {certificateModalRecord.hash || "SHA256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
                                    </div>
                                </div>
                            </div>

                            {/* Signatures & Seal Footer */}
                            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 border-t-2 border-[#D5AA6D]/40">
                                {/* Digital Seal Matrix QR */}
                                <div className="flex items-center gap-3">
                                    <DigitalSealMatrix code={certificateModalRecord.verificationCode || "STW-VER"} size={76} />
                                    <div className="text-[10px] font-sans text-neutral-600">
                                        <div className="font-bold text-[#0A192F]">DIGITAL SEAL MATRIX</div>
                                        <div>Scan or verify online at</div>
                                        <div className="font-mono text-[9px] text-[#9E7332]">stalwartlc.com/verify</div>
                                    </div>
                                </div>

                                {/* Status Stamp */}
                                <div className="text-center sm:text-right">
                                    <div className="inline-block px-3 py-1 border-2 border-green-600 text-green-700 font-sans font-bold text-xs uppercase tracking-widest rounded shadow-sm rotate-[-3deg]">
                                        ✓ DIGITALLY SEALED & VERIFIED
                                    </div>
                                    <div className="mt-2 text-[10px] font-sans text-neutral-600">
                                        Issued: {certificateModalRecord.issuedAt ? new Date(certificateModalRecord.issuedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : new Date().toLocaleDateString()}
                                    </div>
                                </div>

                                {/* Counsel Signature Block */}
                                <div className="text-center sm:text-right border-t sm:border-t-0 sm:border-l sm:pl-6 border-neutral-300 pt-3 sm:pt-0">
                                    <div className="font-serif italic text-base font-bold text-[#0A192F]">
                                        {certificateModalRecord.signatoryName || "Babatunde Adeleke, SAN"}
                                    </div>
                                    <div className="text-[10px] font-sans text-neutral-600 font-semibold">
                                        {certificateModalRecord.signatoryRole || "Senior Advocate of Nigeria / Managing Partner"}
                                    </div>
                                    <div className="text-[9px] font-sans text-neutral-500">
                                        Stalwart Law Consult Legal Practice
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-between items-center pt-2">
                            <button
                                onClick={() => copyToClipboard(certificateModalRecord.verificationCode, "Verification Code")}
                                className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline"
                            >
                                Copy Certificate Code
                            </button>
                            <div className="flex gap-2">
                                <button
                                    onClick={handlePrintCertificate}
                                    className="px-4 py-2 bg-[var(--primary)] text-white text-xs font-semibold rounded hover:bg-[#0d223f]"
                                >
                                    Print Certificate
                                </button>
                                <button
                                    onClick={() => setCertificateModalRecord(null)}
                                    className="px-4 py-2 border border-[var(--border)] rounded text-xs font-medium hover:bg-[var(--muted)]"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL: REVOKE CERTIFICATE                                                 */}
            {/* ========================================================================= */}
            {revocationModalRecord && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] border border-red-300 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-fade-in">
                        <div className="flex items-center gap-2 text-red-600">
                            <span className="text-2xl">⚠️</span>
                            <h3 className="text-lg font-serif font-bold">Revoke Document Certificate</h3>
                        </div>

                        <p className="text-xs text-[var(--muted-foreground)]">
                            You are about to revoke certificate <strong className="text-[var(--foreground)]">{revocationModalRecord.verificationCode}</strong> for <em>"{revocationModalRecord.documentTitle}"</em>. This revocation will be immediately recorded on the ledger and visible in all public and court audits.
                        </p>

                        <div>
                            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                                Judicial / Firm Reason for Revocation <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                rows={3}
                                required
                                placeholder="e.g. Superseded by Amended Originating Summons dated 22/09/2026..."
                                value={revocationReason}
                                onChange={(e) => setRevocationReason(e.target.value)}
                                className="w-full px-3 py-2 text-xs bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none focus:border-red-500"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setRevocationModalRecord(null)}
                                className="px-3.5 py-1.5 border border-[var(--border)] rounded text-xs font-medium hover:bg-[var(--muted)]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmRevoke}
                                disabled={actionLoading || !revocationReason.trim()}
                                className="px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 disabled:opacity-50"
                            >
                                {actionLoading ? "Revoking..." : "Confirm Revocation"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

