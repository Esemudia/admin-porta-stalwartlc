import { useState, useEffect, useMemo } from "react";
import {
    fetchCommunications,
    sendEmailCommunication,
    receiveEmailCommunication,
    fetchServerConfig,
    verifyDomainMx,
    toggleStarCommunication,
    markCommunicationAsRead,
    deleteCommunication,
    fetchMatters,
    fetchClients,
    fetchDocuments
} from "../../api";

interface AttachmentItem {
    name: string;
    size?: string;
    type?: string;
    url?: string;
}

interface MessageItem {
    _id: string;
    id?: string;
    subject: string;
    from: string;
    senderName?: string;
    to: string;
    recipientName?: string;
    cc?: string[];
    bcc?: string[];
    body: string;
    direction: "inbound" | "outbound";
    status: "received" | "sent" | "draft";
    matterId?: any;
    matterTitle?: string;
    clientId?: any;
    clientName?: string;
    attachments?: AttachmentItem[];
    isStarred?: boolean;
    isRead?: boolean;
    mxServer?: string;
    messageId?: string;
    sentAt?: string;
    receivedAt?: string;
    createdAt?: string;
}

export default function Communications() {
    const [messages, setMessages] = useState<MessageItem[]>([]);
    const [matters, setMatters] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Navigation & Folder Tab
    const [activeFolder, setActiveFolder] = useState<"inbox" | "sent" | "attachments" | "starred" | "mx-config">("inbox");
    const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMatterFilter, setSelectedMatterFilter] = useState("all");

    // Modals
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [isSimulateReceiveOpen, setIsSimulateReceiveOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
    const showToast = (text: string, type: "success" | "error" = "success") => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Server MX Configuration state
    const [serverConfig, setServerConfig] = useState<any>(null);
    const [mxDomainInput, setMxDomainInput] = useState("stalwartlc.com");
    const [mxAuditResult, setMxAuditResult] = useState<any>(null);
    const [auditingMx, setAuditingMx] = useState(false);

    // Compose Form state
    const [composeForm, setComposeForm] = useState({
        to: "",
        recipientName: "",
        from: "counsel@stalwartlc.com",
        senderName: "Babatunde Adeleke, SAN (Stalwart Law Consult)",
        cc: "",
        subject: "",
        body: "",
        matterId: "",
        matterTitle: "",
        clientId: "",
        clientName: "",
        attachments: [] as AttachmentItem[]
    });

    // Simulate Inbound Form state
    const [receiveForm, setReceiveForm] = useState({
        from: "registry@courts.gov.ng",
        senderName: "High Court Registry of Lagos State",
        to: "litigation@stalwartlc.com",
        subject: "Hearing Notice & Cause List: Suit No. LD/3819/2026",
        body: "Counsel,\n\nPlease find attached the authenticated cause list and hearing notice for the interlocutory injunction application.\n\nCourt sits promptly at 09:00 AM.",
        matterTitle: "",
        clientName: "",
        attachments: [
            {
                name: "Court_Cause_List_Notice_2026.pdf",
                size: "1.8 MB",
                type: "application/pdf",
                url: "#"
            }
        ] as AttachmentItem[]
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [msgs, mtrs, clnts, docs, srvCfg] = await Promise.all([
                fetchCommunications().catch(() => []),
                fetchMatters().catch(() => []),
                fetchClients().catch(() => []),
                fetchDocuments().catch(() => []),
                fetchServerConfig().catch(() => null)
            ]);
            setMessages(msgs || []);
            setMatters(mtrs || []);
            setClients(clnts || []);
            setDocuments(docs || []);
            setServerConfig(srvCfg);

            // Select first message if none selected
            if (!selectedMessage && msgs && msgs.length > 0) {
                setSelectedMessage(msgs[0]);
            }
        } catch (err) {
            console.error("Failed to load communications", err);
            showToast("Failed to load communications ledger", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filter messages based on active folder and search term
    const filteredMessages = useMemo(() => {
        return messages.filter(m => {
            // Folder filter
            if (activeFolder === "inbox" && m.direction !== "inbound") return false;
            if (activeFolder === "sent" && m.direction !== "outbound") return false;
            if (activeFolder === "starred" && !m.isStarred) return false;
            if (activeFolder === "attachments" && (!m.attachments || m.attachments.length === 0)) return false;

            // Matter filter
            if (selectedMatterFilter !== "all" && m.matterTitle !== selectedMatterFilter) return false;

            // Search filter
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const subjMatch = (m.subject || "").toLowerCase().includes(term);
                const fromMatch = (m.from || "").toLowerCase().includes(term);
                const toMatch = (m.to || "").toLowerCase().includes(term);
                const bodyMatch = (m.body || "").toLowerCase().includes(term);
                const matterMatch = (m.matterTitle || "").toLowerCase().includes(term);
                const attachMatch = (m.attachments || []).some(a => (a.name || "").toLowerCase().includes(term));
                if (!subjMatch && !fromMatch && !toMatch && !bodyMatch && !matterMatch && !attachMatch) {
                    return false;
                }
            }
            return true;
        });
    }, [messages, activeFolder, selectedMatterFilter, searchTerm]);

    // Counters for folders
    const counts = useMemo(() => {
        const inboxCount = messages.filter(m => m.direction === "inbound").length;
        const unreadCount = messages.filter(m => m.direction === "inbound" && !m.isRead).length;
        const sentCount = messages.filter(m => m.direction === "outbound").length;
        const attachmentCount = messages.filter(m => m.attachments && m.attachments.length > 0).length;
        const starredCount = messages.filter(m => m.isStarred).length;
        return { inboxCount, unreadCount, sentCount, attachmentCount, starredCount };
    }, [messages]);

    // Handle selecting a message
    const handleSelectMessage = async (msg: MessageItem) => {
        setSelectedMessage(msg);
        if (!msg.isRead) {
            try {
                await markCommunicationAsRead(msg._id);
                setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, isRead: true } : m));
            } catch (err) {
                console.error(err);
            }
        }
    };

    // Toggle Star
    const handleToggleStar = async (msg: MessageItem, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await toggleStarCommunication(msg._id);
            setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, isStarred: !m.isStarred } : m));
            if (selectedMessage?._id === msg._id) {
                setSelectedMessage(prev => prev ? { ...prev, isStarred: !prev.isStarred } : null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Delete message
    const handleDeleteMessage = async (msgId: string) => {
        if (!window.confirm("Delete this email communication?")) return;
        try {
            await deleteCommunication(msgId);
            showToast("Message deleted", "success");
            setMessages(prev => prev.filter(m => m._id !== msgId));
            if (selectedMessage?._id === msgId) {
                const remaining = messages.filter(m => m._id !== msgId);
                setSelectedMessage(remaining[0] || null);
            }
        } catch (err) {
            showToast("Failed to delete message", "error");
        }
    };

    // Handle File Attachment in Compose
    const handleAttachLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newAttachments: AttachmentItem[] = Array.from(files).map(f => {
            const sizeMb = (f.size / (1024 * 1024)).toFixed(1);
            return {
                name: f.name,
                size: `${sizeMb} MB`,
                type: f.type || "application/octet-stream",
                url: URL.createObjectURL(f)
            };
        });

        setComposeForm(prev => ({
            ...prev,
            attachments: [...prev.attachments, ...newAttachments]
        }));
        showToast(`${newAttachments.length} file(s) attached.`, "success");
    };

    // Attach from Vault
    const handleAttachFromVault = (doc: any) => {
        if (composeForm.attachments.some(a => a.name === doc.name)) {
            showToast("Document is already attached", "error");
            return;
        }
        const item: AttachmentItem = {
            name: doc.name || "Vault_Document.pdf",
            size: "2.4 MB",
            type: doc.name?.endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
            url: doc.fileUrl || "#"
        };
        setComposeForm(prev => ({
            ...prev,
            attachments: [...prev.attachments, item]
        }));
        showToast(`Attached "${item.name}" from vault.`, "success");
    };

    // Remove attachment
    const handleRemoveAttachment = (idx: number) => {
        setComposeForm(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== idx)
        }));
    };

    // Send Outbound Email
    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!composeForm.to.trim() || !composeForm.subject.trim()) {
            showToast("Recipient email and subject are required", "error");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                ...composeForm,
                cc: composeForm.cc ? composeForm.cc.split(",").map(c => c.trim()).filter(Boolean) : []
            };
            const dispatched = await sendEmailCommunication(payload);
            showToast(`Email dispatched via mail.stalwartlc.com to ${payload.to}`, "success");
            setIsComposeOpen(false);
            setComposeForm({
                to: "",
                recipientName: "",
                from: "counsel@stalwartlc.com",
                senderName: "Babatunde Adeleke, SAN (Stalwart Law Consult)",
                cc: "",
                subject: "",
                body: "",
                matterId: "",
                matterTitle: "",
                clientId: "",
                clientName: "",
                attachments: []
            });
            await loadData();
            setSelectedMessage(dispatched);
        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Failed to send email", "error");
        } finally {
            setSubmitting(false);
        }
    };

    // Simulate Receive Inbound Email
    const handleReceiveEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const ingested = await receiveEmailCommunication(receiveForm);
            showToast(`Inbound message received via MX server from ${receiveForm.from}`, "success");
            setIsSimulateReceiveOpen(false);
            await loadData();
            setSelectedMessage(ingested);
        } catch (err: any) {
            console.error(err);
            showToast("Failed to receive message", "error");
        } finally {
            setSubmitting(false);
        }
    };

    // Run MX Records Audit
    const handleRunMxAudit = async () => {
        setAuditingMx(true);
        try {
            const result = await verifyDomainMx(mxDomainInput.trim() || "stalwartlc.com");
            setMxAuditResult(result);
            showToast("MX records DNS query completed successfully.", "success");
        } catch (err: any) {
            console.error(err);
            showToast("Failed to verify MX records", "error");
        } finally {
            setAuditingMx(false);
        }
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
                    <span>{toast.type === "success" ? "✉️" : "⚠️"}</span>
                    <span>{toast.text}</span>
                </div>
            )}

            {/* Header Ribbon */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">✉️</span>
                        <h1 className="font-serif text-3xl font-semibold text-[var(--foreground)] tracking-tight">
                            Legal Communications & Email Exchange
                        </h1>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1 flex items-center gap-2">
                        <span>Secure transmission of court filings, client advisories, and certified evidence.</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            MX: mail.stalwartlc.com
                        </span>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={() => setIsSimulateReceiveOpen(true)}
                        className="px-3.5 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-xs font-medium rounded-md shadow-sm hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all flex items-center gap-1.5"
                        title="Simulate or ingest an incoming email via MX records"
                    >
                        <span>📥</span> Receive Email
                    </button>
                    <button
                        onClick={() => setActiveFolder("mx-config")}
                        className="px-3.5 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-xs font-medium rounded-md shadow-sm hover:bg-[var(--muted)] transition-all flex items-center gap-1.5"
                        title="Configure and audit server MX records"
                    >
                        <span>⚙️</span> Server & MX Records
                    </button>
                    <button
                        onClick={() => setIsComposeOpen(true)}
                        className="px-4 py-2 bg-[var(--primary)] text-white text-xs font-semibold rounded-md shadow-md hover:bg-[#0d223f] border border-[var(--accent)]/30 transition-all flex items-center gap-2"
                    >
                        <span className="text-[var(--accent)]">+</span> Compose Email
                    </button>
                </div>
            </div>

            {/* Folder Tabs / Metrics Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--card)] border border-[var(--border)] p-2 rounded-lg shadow-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        onClick={() => setActiveFolder("inbox")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                            activeFolder === "inbox"
                                ? "bg-[var(--primary)] text-white font-semibold shadow-sm"
                                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                    >
                        <span>📥 Inbox</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeFolder === "inbox" ? "bg-[var(--accent)] text-[#0A192F]" : "bg-[var(--muted)] text-[var(--foreground)]"}`}>
                            {counts.inboxCount}
                        </span>
                        {counts.unreadCount > 0 && (
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveFolder("sent")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                            activeFolder === "sent"
                                ? "bg-[var(--primary)] text-white font-semibold shadow-sm"
                                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                    >
                        <span>📤 Sent via MX</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--muted)] text-[var(--foreground)]">
                            {counts.sentCount}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveFolder("attachments")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                            activeFolder === "attachments"
                                ? "bg-[var(--primary)] text-white font-semibold shadow-sm"
                                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                    >
                        <span>📎 With Attachments</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--muted)] text-[var(--foreground)]">
                            {counts.attachmentCount}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveFolder("starred")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                            activeFolder === "starred"
                                ? "bg-[var(--primary)] text-white font-semibold shadow-sm"
                                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                    >
                        <span>⭐ Starred</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--muted)] text-[var(--foreground)]">
                            {counts.starredCount}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveFolder("mx-config")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                            activeFolder === "mx-config"
                                ? "bg-[var(--primary)] text-white font-semibold shadow-sm"
                                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                    >
                        <span>⚙️ MX Server Setup</span>
                    </button>
                </div>

                {activeFolder !== "mx-config" && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)]">🔍</span>
                            <input
                                type="text"
                                placeholder="Search sender, subject, files..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-7 pr-3 py-1 text-xs bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                            />
                        </div>

                        <select
                            value={selectedMatterFilter}
                            onChange={(e) => setSelectedMatterFilter(e.target.value)}
                            className="px-2 py-1 text-xs bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                        >
                            <option value="all">All Matters</option>
                            {matters.map(m => (
                                <option key={m._id || m.id} value={m.title}>{m.title}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* VIEW: SERVER MX RECORDS CONFIGURATION & DNS AUDIT                         */}
            {/* ========================================================================= */}
            {activeFolder === "mx-config" && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-gradient-to-r from-[#0A192F] to-[#172A45] text-white rounded-xl p-6 border border-[var(--accent)]/40 shadow-md">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest bg-[var(--accent)] text-[#0A192F] font-bold rounded">
                                        Active Mail Cluster
                                    </span>
                                    <span className="text-xs text-white/70">RFC 5321 Standard</span>
                                </div>
                                <h2 className="text-xl font-serif font-bold text-white">
                                    Server MX (Mail Exchange) Records Infrastructure
                                </h2>
                                <p className="text-xs text-white/80 max-w-xl leading-relaxed">
                                    All outbound client letters, court attachments, and legal notices are signed with RSA-2048 DKIM keys and dispatched through Stalwart's dedicated MX cluster (<code className="text-[var(--accent)] bg-black/30 px-1 py-0.5 rounded">mail.stalwartlc.com</code>).
                                </p>
                            </div>

                            <div className="flex items-center gap-2 bg-black/30 p-3 rounded-lg border border-white/10 shrink-0">
                                <input
                                    type="text"
                                    value={mxDomainInput}
                                    onChange={(e) => setMxDomainInput(e.target.value)}
                                    placeholder="e.g. stalwartlc.com"
                                    className="px-3 py-2 text-xs font-mono bg-black/50 border border-white/20 rounded text-white focus:outline-none focus:border-[var(--accent)]"
                                />
                                <button
                                    onClick={handleRunMxAudit}
                                    disabled={auditingMx}
                                    className="px-4 py-2 bg-[var(--accent)] text-[#0A192F] text-xs font-bold rounded hover:bg-white transition-all disabled:opacity-50"
                                >
                                    {auditingMx ? "Auditing DNS..." : "Test DNS MX"}
                                </button>
                            </div>
                        </div>

                        {/* Live Audit Result */}
                        {mxAuditResult && (
                            <div className="mt-4 p-4 rounded-lg bg-black/50 border border-[var(--accent)]/50 text-xs font-mono">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[var(--accent)] font-bold">DNS MX Resolution Result for {mxAuditResult.domain}:</span>
                                    <span className="text-[10px] text-white/50">{mxAuditResult.timestamp}</span>
                                </div>
                                <div className="space-y-1">
                                    {mxAuditResult.records?.map((r: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-4 text-white/90">
                                            <span className="text-green-400 font-bold">✓ Priority {r.priority}</span>
                                            <span>Exchange Host: <strong>{r.exchange}</strong></span>
                                        </div>
                                    ))}
                                </div>
                                {mxAuditResult.notice && (
                                    <div className="text-[11px] text-[var(--accent)] mt-2 italic">
                                        ℹ️ {mxAuditResult.notice}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Server Routing Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* MX Records */}
                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5 shadow-sm space-y-3">
                            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                                <h3 className="font-serif font-semibold text-sm text-[var(--foreground)]">MX DNS Routing</h3>
                                <span className="text-xs text-green-600 font-semibold">● Operational</span>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="p-2 bg-[var(--muted)]/50 rounded border border-[var(--border)] flex justify-between items-center">
                                    <div>
                                        <div className="font-mono font-bold text-[var(--foreground)]">mail.stalwartlc.com</div>
                                        <div className="text-[10px] text-[var(--muted-foreground)]">Primary MX • Priority 10</div>
                                    </div>
                                    <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-bold">Active</span>
                                </div>
                                <div className="p-2 bg-[var(--muted)]/50 rounded border border-[var(--border)] flex justify-between items-center">
                                    <div>
                                        <div className="font-mono font-bold text-[var(--foreground)]">mx2.stalwartlc.com</div>
                                        <div className="text-[10px] text-[var(--muted-foreground)]">Secondary Backup • Priority 20</div>
                                    </div>
                                    <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-bold">Active</span>
                                </div>
                            </div>
                        </div>

                        {/* Outbound & Inbound Protocols */}
                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5 shadow-sm space-y-3">
                            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                                <h3 className="font-serif font-semibold text-sm text-[var(--foreground)]">Protocols & Encryption</h3>
                                <span className="text-xs text-green-600 font-semibold">● Encrypted</span>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between items-center p-2 rounded bg-[var(--muted)]/50 border border-[var(--border)]">
                                    <span className="font-semibold text-[var(--foreground)]">SMTP Outbound</span>
                                    <span className="font-mono text-[11px] text-[var(--muted-foreground)]">smtp.stalwartlc.com:587 (TLS)</span>
                                </div>
                                <div className="flex justify-between items-center p-2 rounded bg-[var(--muted)]/50 border border-[var(--border)]">
                                    <span className="font-semibold text-[var(--foreground)]">IMAP Inbound</span>
                                    <span className="font-mono text-[11px] text-[var(--muted-foreground)]">imap.stalwartlc.com:993 (SSL)</span>
                                </div>
                            </div>
                        </div>

                        {/* Domain Anti-Spoofing */}
                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5 shadow-sm space-y-3">
                            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                                <h3 className="font-serif font-semibold text-sm text-[var(--foreground)]">Authentication Policies</h3>
                                <span className="text-xs text-green-600 font-semibold">● Protected</span>
                            </div>
                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--muted-foreground)]">SPF Policy:</span>
                                    <span className="font-mono text-green-700 font-bold text-[11px]">Pass (Strict)</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--muted-foreground)]">DKIM Signature:</span>
                                    <span className="font-mono text-green-700 font-bold text-[11px]">RSA-2048 Active</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--muted-foreground)]">DMARC Policy:</span>
                                    <span className="font-mono text-green-700 font-bold text-[11px]">p=quarantine (100%)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW: TWO-PANE EMAIL CLIENT (INBOX, SENT, ATTACHMENTS, STARRED)           */}
            {/* ========================================================================= */}
            {activeFolder !== "mx-config" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[620px]">
                    {/* Left Pane: Email List (5 cols) */}
                    <div className="lg:col-span-5 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm flex flex-col overflow-hidden max-h-[720px]">
                        <div className="p-3 bg-[var(--muted)]/40 border-b border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted-foreground)] font-semibold uppercase tracking-wider">
                            <span>{filteredMessages.length} Conversations</span>
                            <span>{activeFolder.toUpperCase()}</span>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center text-xs text-[var(--muted-foreground)] flex flex-col items-center gap-2">
                                <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
                                <span>Loading messages...</span>
                            </div>
                        ) : filteredMessages.length === 0 ? (
                            <div className="p-12 text-center text-xs text-[var(--muted-foreground)]">
                                No messages in {activeFolder}.
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
                                {filteredMessages.map((msg) => {
                                    const isSelected = selectedMessage?._id === msg._id;
                                    const hasAttachments = msg.attachments && msg.attachments.length > 0;

                                    return (
                                        <div
                                            key={msg._id}
                                            onClick={() => handleSelectMessage(msg)}
                                            className={`p-3.5 cursor-pointer transition-all ${
                                                isSelected
                                                    ? "bg-[var(--primary)]/10 border-l-4 border-l-[var(--primary)]"
                                                    : !msg.isRead && msg.direction === "inbound"
                                                    ? "bg-[var(--card)] font-semibold border-l-4 border-l-blue-500"
                                                    : "hover:bg-[var(--muted)]/30"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2 truncate pr-2">
                                                    <button
                                                        onClick={(e) => handleToggleStar(msg, e)}
                                                        className={`text-xs ${msg.isStarred ? "text-amber-500" : "text-[var(--muted-foreground)] hover:text-amber-500"}`}
                                                    >
                                                        {msg.isStarred ? "★" : "☆"}
                                                    </button>
                                                    <span className="text-xs text-[var(--foreground)] truncate">
                                                        {msg.direction === "inbound" ? msg.senderName || msg.from : `To: ${msg.recipientName || msg.to}`}
                                                    </span>
                                                </div>

                                                <span className="text-[10px] text-[var(--muted-foreground)] whitespace-nowrap">
                                                    {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "Today"}
                                                </span>
                                            </div>

                                            <div className="text-xs text-[var(--foreground)] truncate font-medium mb-1">
                                                {msg.subject || "Untitled Correspondence"}
                                            </div>

                                            <div className="text-[11px] text-[var(--muted-foreground)] line-clamp-1 mb-2">
                                                {msg.body || "No preview text"}
                                            </div>

                                            <div className="flex items-center justify-between text-[10px]">
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                                        msg.direction === "inbound"
                                                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                            : "bg-green-50 text-green-700 border border-green-200"
                                                    }`}>
                                                        {msg.direction === "inbound" ? "INBOUND" : "OUTBOUND"}
                                                    </span>

                                                    {msg.matterTitle && (
                                                        <span className="px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)] truncate max-w-[140px]">
                                                            {msg.matterTitle}
                                                        </span>
                                                    )}
                                                </div>

                                                {hasAttachments && (
                                                    <span className="flex items-center gap-1 text-[var(--accent)] font-semibold">
                                                        <span>📎</span>
                                                        <span>{msg.attachments!.length}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right Pane: Message Inspector (7 cols) */}
                    <div className="lg:col-span-7 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm flex flex-col overflow-hidden max-h-[720px]">
                        {selectedMessage ? (
                            <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
                                {/* Header / Toolbar */}
                                <div className="p-4 border-b border-[var(--border)] bg-[var(--muted)]/20 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => handleToggleStar(selectedMessage, e)}
                                            className={`text-base ${selectedMessage.isStarred ? "text-amber-500" : "text-[var(--muted-foreground)] hover:text-amber-500"}`}
                                            title="Star message"
                                        >
                                            {selectedMessage.isStarred ? "★" : "☆"}
                                        </button>
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                            selectedMessage.direction === "inbound"
                                                ? "bg-blue-100 text-blue-800"
                                                : "bg-green-100 text-green-800"
                                        }`}>
                                            {selectedMessage.direction === "inbound" ? "RECEIVED VIA MX" : "DISPATCHED VIA SMTP"}
                                        </span>
                                        <span className="text-[11px] text-[var(--muted-foreground)] font-mono">
                                            {selectedMessage.mxServer || "mail.stalwartlc.com"}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setComposeForm({
                                                    to: selectedMessage.direction === "inbound" ? selectedMessage.from : selectedMessage.to,
                                                    recipientName: selectedMessage.senderName || selectedMessage.from,
                                                    from: "counsel@stalwartlc.com",
                                                    senderName: "Babatunde Adeleke, SAN",
                                                    cc: "",
                                                    subject: `Re: ${selectedMessage.subject}`,
                                                    body: `\n\n--- On ${new Date(selectedMessage.createdAt || Date.now()).toLocaleString()}, ${selectedMessage.senderName || selectedMessage.from} wrote:\n> ${selectedMessage.body.replace(/\n/g, "\n> ")}`,
                                                    matterId: selectedMessage.matterId || "",
                                                    matterTitle: selectedMessage.matterTitle || "",
                                                    clientId: selectedMessage.clientId || "",
                                                    clientName: selectedMessage.clientName || "",
                                                    attachments: []
                                                });
                                                setIsComposeOpen(true);
                                            }}
                                            className="px-2.5 py-1 text-xs border border-[var(--border)] rounded hover:bg-[var(--muted)] flex items-center gap-1"
                                        >
                                            <span>↩️</span> Reply
                                        </button>
                                        <button
                                            onClick={() => handleDeleteMessage(selectedMessage._id)}
                                            className="px-2.5 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50"
                                            title="Delete message"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>

                                {/* Message Header Info */}
                                <div className="p-5 border-b border-[var(--border)] space-y-3 bg-[var(--background)]">
                                    <h2 className="text-lg font-serif font-bold text-[var(--foreground)]">
                                        {selectedMessage.subject}
                                    </h2>

                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-[var(--foreground)]">From:</span>
                                                <span className="text-[var(--foreground)]">{selectedMessage.senderName || selectedMessage.from}</span>
                                                <span className="text-[var(--muted-foreground)] font-mono">&lt;{selectedMessage.from}&gt;</span>
                                            </div>
                                            <span className="text-[var(--muted-foreground)]">
                                                {selectedMessage.createdAt ? new Date(selectedMessage.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "Recent"}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-[var(--foreground)]">To:</span>
                                            <span className="text-[var(--foreground)]">{selectedMessage.recipientName || selectedMessage.to}</span>
                                            <span className="text-[var(--muted-foreground)] font-mono">&lt;{selectedMessage.to}&gt;</span>
                                        </div>

                                        {selectedMessage.cc && selectedMessage.cc.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-[var(--foreground)]">CC:</span>
                                                <span className="text-[var(--muted-foreground)] font-mono">{selectedMessage.cc.join(", ")}</span>
                                            </div>
                                        )}

                                        {selectedMessage.matterTitle && (
                                            <div className="flex items-center gap-2 pt-1">
                                                <span className="font-semibold text-[var(--foreground)]">Matter:</span>
                                                <span className="px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--foreground)] font-medium">
                                                    ⚖️ {selectedMessage.matterTitle}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-5 flex-1 overflow-y-auto whitespace-pre-wrap font-sans text-xs text-[var(--foreground)] leading-relaxed bg-[var(--card)]">
                                    {selectedMessage.body}
                                </div>

                                {/* Attachments Drawer */}
                                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                                    <div className="p-4 border-t border-[var(--border)] bg-[var(--muted)]/20 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                                                <span>📎</span> Attached Files ({selectedMessage.attachments.length})
                                            </span>
                                            <span className="text-[10px] text-[var(--muted-foreground)]">
                                                Court evidence & execution instruments
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {selectedMessage.attachments.map((att, idx) => (
                                                <div
                                                    key={idx}
                                                    className="p-2.5 rounded border border-[var(--border)] bg-[var(--card)] flex items-center justify-between gap-2 shadow-sm"
                                                >
                                                    <div className="flex items-center gap-2 truncate">
                                                        <div className="w-8 h-8 rounded bg-red-100 text-red-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                                            {att.name.endsWith(".pdf") ? "PDF" : att.name.endsWith(".docx") ? "DOC" : "FILE"}
                                                        </div>
                                                        <div className="truncate">
                                                            <div className="font-medium text-xs text-[var(--foreground)] truncate" title={att.name}>
                                                                {att.name}
                                                            </div>
                                                            <div className="text-[10px] text-[var(--muted-foreground)]">
                                                                {att.size || "1.5 MB"}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <a
                                                        href={att.url || "#"}
                                                        download={att.name}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="px-2 py-1 bg-[var(--primary)] text-white text-[10px] font-semibold rounded hover:bg-[#0d223f] shrink-0"
                                                    >
                                                        Download
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-[var(--muted-foreground)] text-xs">
                                <div className="text-4xl mb-3">✉️</div>
                                <span>Select a message to view full headers, content, and attachments.</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL: COMPOSE OUTBOUND EMAIL WITH ATTACHMENTS                             */}
            {/* ========================================================================= */}
            {isComposeOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                            <div>
                                <h3 className="text-base font-serif font-bold text-[var(--foreground)] flex items-center gap-2">
                                    <span>✉️</span> Compose Outbound Legal Email
                                </h3>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                    Dispatched via <code className="text-[var(--accent)] font-mono">mail.stalwartlc.com</code> with cryptographic DKIM signature.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsComposeOpen(false)}
                                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSendEmail} className="space-y-3.5 text-xs">
                            {/* To and Quick Client Picker */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="font-semibold text-[var(--foreground)]">
                                        Recipient Email (To) <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        onChange={(e) => {
                                            const cl = clients.find(c => (c._id || c.id) === e.target.value);
                                            if (cl) {
                                                setComposeForm({
                                                    ...composeForm,
                                                    to: cl.email || "",
                                                    recipientName: cl.companyName || cl.fullName || `${cl.firstName || ""} ${cl.lastName || ""}`.trim(),
                                                    clientId: cl._id || cl.id,
                                                    clientName: cl.companyName || cl.fullName || `${cl.firstName || ""} ${cl.lastName || ""}`.trim()
                                                });
                                            }
                                        }}
                                        className="text-[11px] bg-transparent text-[var(--accent)] border-none cursor-pointer underline"
                                    >
                                        <option value="">Insert from Client Directory...</option>
                                        {clients.map(c => (
                                            <option key={c._id || c.id} value={c._id || c.id}>
                                                {c.companyName || c.fullName || `${c.firstName || ""} ${c.lastName || ""}`.trim()} ({c.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <input
                                    type="email"
                                    required
                                    placeholder="e.g. client@acmecorp.com or registrar@courts.gov.ng"
                                    value={composeForm.to}
                                    onChange={(e) => setComposeForm({ ...composeForm, to: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                                />
                            </div>

                            {/* CC & Matter */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-[var(--foreground)] mb-1">
                                        CC (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="counsel@stalwartlc.com, partner@..."
                                        value={composeForm.cc}
                                        onChange={(e) => setComposeForm({ ...composeForm, cc: e.target.value })}
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-[var(--foreground)] mb-1">
                                        Associate Case / Matter
                                    </label>
                                    <select
                                        value={composeForm.matterId}
                                        onChange={(e) => {
                                            const m = matters.find(item => (item._id || item.id) === e.target.value);
                                            setComposeForm({
                                                ...composeForm,
                                                matterId: e.target.value,
                                                matterTitle: m?.title || ""
                                            });
                                        }}
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                    >
                                        <option value="">-- No Matter Association --</option>
                                        {matters.map(m => (
                                            <option key={m._id || m.id} value={m._id || m.id}>{m.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Subject Line <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Legal Opinion & Execution Draft: Originating Motion"
                                    value={composeForm.subject}
                                    onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                                />
                            </div>

                            {/* Body */}
                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Message Body
                                </label>
                                <textarea
                                    rows={6}
                                    placeholder="Dear Counsel,\n\nFurther to our conference today..."
                                    value={composeForm.body}
                                    onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none font-sans leading-relaxed"
                                />
                            </div>

                            {/* Attachments Section */}
                            <div className="p-3.5 bg-[var(--muted)]/40 rounded-lg border border-[var(--border)] space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <span className="font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                                        <span>📎</span> Attach Documents ({composeForm.attachments.length})
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {/* Local file input */}
                                        <label className="px-2.5 py-1 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded cursor-pointer hover:bg-[var(--muted)] text-[11px] font-medium">
                                            <span>📁 Browse Device</span>
                                            <input
                                                type="file"
                                                multiple
                                                onChange={handleAttachLocalFile}
                                                className="hidden"
                                            />
                                        </label>

                                        {/* Vault selector */}
                                        {documents.length > 0 && (
                                            <select
                                                onChange={(e) => {
                                                    const doc = documents.find(d => (d._id || d.id) === e.target.value);
                                                    if (doc) handleAttachFromVault(doc);
                                                    e.target.value = "";
                                                }}
                                                className="px-2.5 py-1 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded text-[11px]"
                                            >
                                                <option value="">+ From Document Vault...</option>
                                                {documents.map(d => (
                                                    <option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>

                                {/* Attached Pills */}
                                {composeForm.attachments.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {composeForm.attachments.map((att, idx) => (
                                            <div
                                                key={idx}
                                                className="px-2.5 py-1 bg-[var(--card)] border border-[var(--border)] rounded-md flex items-center gap-2 text-[11px] shadow-sm"
                                            >
                                                <span>📄</span>
                                                <span className="font-medium text-[var(--foreground)] max-w-[200px] truncate">{att.name}</span>
                                                <span className="text-[10px] text-[var(--muted-foreground)]">({att.size || "1.2 MB"})</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveAttachment(idx)}
                                                    className="text-[var(--muted-foreground)] hover:text-red-500 font-bold ml-1"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-[11px] text-[var(--muted-foreground)] italic">
                                        No files attached. Click "Browse Device" or choose from "Document Vault" to attach court filings or agreements.
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                                <span className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1">
                                    <span>🔒</span> Signed via RSA-2048 DKIM & TLS 1.3
                                </span>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsComposeOpen(false)}
                                        className="px-3.5 py-2 border border-[var(--border)] rounded-md hover:bg-[var(--muted)] font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-4 py-2 bg-[var(--primary)] text-white font-bold rounded-md hover:bg-[#0d223f] border border-[var(--accent)]/40 transition-all flex items-center gap-1.5"
                                    >
                                        {submitting ? "Dispatching..." : "Send Email via Server"}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL: RECEIVE INBOUND EMAIL (MX SERVER SIMULATOR / INGEST)              */}
            {/* ========================================================================= */}
            {isSimulateReceiveOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                            <div>
                                <h3 className="text-base font-serif font-bold text-[var(--foreground)] flex items-center gap-2">
                                    <span>📥</span> Ingest Inbound Email via MX Server
                                </h3>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                    Simulate incoming email arriving on <code className="text-[var(--accent)]">mail.stalwartlc.com</code> with attachments.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsSimulateReceiveOpen(false)}
                                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleReceiveEmail} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Sender (From)
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={receiveForm.from}
                                    onChange={(e) => setReceiveForm({ ...receiveForm, from: e.target.value })}
                                    className="w-full px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Sender Display Name
                                </label>
                                <input
                                    type="text"
                                    value={receiveForm.senderName}
                                    onChange={(e) => setReceiveForm({ ...receiveForm, senderName: e.target.value })}
                                    className="w-full px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Subject
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={receiveForm.subject}
                                    onChange={(e) => setReceiveForm({ ...receiveForm, subject: e.target.value })}
                                    className="w-full px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Email Body
                                </label>
                                <textarea
                                    rows={4}
                                    value={receiveForm.body}
                                    onChange={(e) => setReceiveForm({ ...receiveForm, body: e.target.value })}
                                    className="w-full px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Attached File Name
                                </label>
                                <input
                                    type="text"
                                    value={receiveForm.attachments[0]?.name || ""}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        setReceiveForm({
                                            ...receiveForm,
                                            attachments: [{ name, size: "2.1 MB", type: "application/pdf", url: "#" }]
                                        });
                                    }}
                                    className="w-full px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                                <button
                                    type="button"
                                    onClick={() => setIsSimulateReceiveOpen(false)}
                                    className="px-3 py-1.5 border border-[var(--border)] rounded hover:bg-[var(--muted)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
                                >
                                    {submitting ? "Ingesting..." : "Ingest Email into Inbox"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

