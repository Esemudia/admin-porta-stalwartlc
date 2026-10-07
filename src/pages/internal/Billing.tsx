import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
    fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    payInvoice,
    fetchClients,
    fetchMatters
} from "../../api";
import logo from "../../assets/logo.png";

interface InvoiceItem {
    _id: string;
    id?: string;
    invoiceNumber: string;
    clientId: any;
    caseId?: any;
    amount: number;
    status: "paid" | "pending" | "overdue";
    issuedDate: string;
    dueDate: string;
    description: string;
    createdAt?: string;
    updatedAt?: string;
}

const PRESET_DESCRIPTIONS = [
    "Retainer Agreement & Advisory Services",
    "Court Appearance & Representation Fee",
    "Drafting of Pleadings & Statutory Filings",
    "Corporate Due Diligence & Search Report",
    "Commercial Arbitration & Dispute Settlement",
    "Property Conveyancing & Title Perfection",
    "General Legal Consultation & Retainer"
];

export default function Billing() {
    const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [matters, setMatters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter & Search states
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "overdue">("all");
    const [clientFilter, setClientFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount_desc" | "amount_asc" | "due_soon">("newest");
    const [currency, setCurrency] = useState<"NGN" | "USD">("NGN");

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<InvoiceItem | null>(null);
    const [viewingInvoice, setViewingInvoice] = useState<InvoiceItem | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        invoiceNumber: "",
        clientId: "",
        caseId: "",
        amount: "",
        description: "",
        issuedDate: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        status: "pending" as "paid" | "pending" | "overdue"
    });

    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

    const showToast = (text: string, type: "success" | "error" = "success") => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [invData, clientData, matterData] = await Promise.all([
                fetchInvoices().catch(() => []),
                fetchClients().catch(() => []),
                fetchMatters().catch(() => [])
            ]);
            setInvoices(invData || []);
            setClients(clientData || []);
            setMatters(matterData || []);
        } catch (err) {
            console.error("Error loading billing data:", err);
            showToast("Failed to load invoice records.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Format currency
    const formatMoney = (val: number) => {
        return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
            style: "currency",
            currency: currency,
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    // Client and matter lookups
    const getClientObj = (clientId: any) => {
        if (!clientId) return null;
        if (typeof clientId === "object" && (clientId.firstName || clientId.companyName || clientId.name)) return clientId;
        const idStr = typeof clientId === "object" ? clientId._id || clientId.id : clientId;
        return clients.find(c => c._id === idStr || c.id === idStr);
    };

    const getClientName = (clientId: any) => {
        const c = getClientObj(clientId);
        if (!c) return typeof clientId === "string" ? "External Client" : "Client";
        if (c.companyName) return c.companyName;
        if (c.firstName || c.lastName) return `${c.firstName || ""} ${c.lastName || ""}`.trim();
        return c.name || c.email || "Client";
    };

    const getMatterObj = (caseId: any) => {
        if (!caseId) return null;
        if (typeof caseId === "object" && (caseId.title || caseId.matterNumber)) return caseId;
        const idStr = typeof caseId === "object" ? caseId._id || caseId.id : caseId;
        return matters.find(m => m._id === idStr || m.id === idStr);
    };

    const getMatterName = (caseId: any) => {
        const m = getMatterObj(caseId);
        if (!m) return null;
        return m.title || m.matterNumber || "Legal Matter";
    };

    // Auto-check overdue status on display
    const getEffectiveStatus = (inv: InvoiceItem): "paid" | "pending" | "overdue" => {
        if (inv.status === "paid") return "paid";
        if (inv.dueDate && new Date(inv.dueDate) < new Date()) {
            return "overdue";
        }
        return inv.status || "pending";
    };

    // Calculations
    const totalGross = useMemo(() => invoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0), [invoices]);
    const totalCollected = useMemo(() => invoices.filter(i => getEffectiveStatus(i) === "paid").reduce((sum, i) => sum + (Number(i.amount) || 0), 0), [invoices]);
    const totalPending = useMemo(() => invoices.filter(i => getEffectiveStatus(i) === "pending").reduce((sum, i) => sum + (Number(i.amount) || 0), 0), [invoices]);
    const totalOverdue = useMemo(() => invoices.filter(i => getEffectiveStatus(i) === "overdue").reduce((sum, i) => sum + (Number(i.amount) || 0), 0), [invoices]);
    const collectionRate = totalGross > 0 ? Math.round((totalCollected / totalGross) * 100) : 0;

    // Filtered & sorted invoices
    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const effStatus = getEffectiveStatus(inv);
            if (statusFilter !== "all" && effStatus !== statusFilter) return false;

            const clientObj = getClientObj(inv.clientId);
            const clientIdStr = clientObj?._id || clientObj?.id || (typeof inv.clientId === "string" ? inv.clientId : "");
            if (clientFilter !== "all" && clientIdStr !== clientFilter) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const invNum = (inv.invoiceNumber || "").toLowerCase();
                const desc = (inv.description || "").toLowerCase();
                const clName = getClientName(inv.clientId).toLowerCase();
                const mName = (getMatterName(inv.caseId) || "").toLowerCase();
                if (!invNum.includes(q) && !desc.includes(q) && !clName.includes(q) && !mName.includes(q)) {
                    return false;
                }
            }
            return true;
        }).sort((a, b) => {
            if (sortBy === "newest") {
                return new Date(b.createdAt || b.issuedDate || 0).getTime() - new Date(a.createdAt || a.issuedDate || 0).getTime();
            }
            if (sortBy === "oldest") {
                return new Date(a.createdAt || a.issuedDate || 0).getTime() - new Date(b.createdAt || b.issuedDate || 0).getTime();
            }
            if (sortBy === "amount_desc") {
                return (Number(b.amount) || 0) - (Number(a.amount) || 0);
            }
            if (sortBy === "amount_asc") {
                return (Number(a.amount) || 0) - (Number(b.amount) || 0);
            }
            if (sortBy === "due_soon") {
                return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
            }
            return 0;
        });
    }, [invoices, statusFilter, clientFilter, searchQuery, sortBy, clients, matters]);

    // Open create modal
    const handleOpenCreate = () => {
        const randomNum = Math.floor(10000 + Math.random() * 90000);
        setFormData({
            invoiceNumber: `INV-${randomNum}`,
            clientId: clients[0]?._id || "",
            caseId: matters[0]?._id || "",
            amount: "",
            description: "",
            issuedDate: new Date().toISOString().split("T")[0],
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            status: "pending"
        });
        setIsCreateOpen(true);
    };

    // Open edit modal
    const handleOpenEdit = (inv: InvoiceItem) => {
        const clientObj = getClientObj(inv.clientId);
        const matterObj = getMatterObj(inv.caseId);
        setEditingInvoice(inv);
        setFormData({
            invoiceNumber: inv.invoiceNumber,
            clientId: clientObj?._id || clientObj?.id || (typeof inv.clientId === "string" ? inv.clientId : ""),
            caseId: matterObj?._id || matterObj?.id || (typeof inv.caseId === "string" ? inv.caseId : ""),
            amount: String(inv.amount || ""),
            description: inv.description || "",
            issuedDate: inv.issuedDate ? new Date(inv.issuedDate).toISOString().split("T")[0] : "",
            dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split("T")[0] : "",
            status: inv.status
        });
    };

    // Submit Create
    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            showToast("Please enter a valid invoice amount.", "error");
            return;
        }
        if (!formData.description.trim()) {
            showToast("Please provide a billing description.", "error");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                invoiceNumber: formData.invoiceNumber.trim(),
                clientId: formData.clientId || undefined,
                caseId: formData.caseId || undefined,
                amount: parseFloat(formData.amount),
                description: formData.description.trim(),
                issuedDate: formData.issuedDate || new Date().toISOString(),
                dueDate: formData.dueDate,
                status: formData.status
            };

            await createInvoice(payload);
            showToast(`Invoice ${payload.invoiceNumber} created successfully.`);
            setIsCreateOpen(false);
            loadData();
        } catch (err: any) {
            console.error("Create invoice error:", err);
            showToast(err.message || "Failed to create invoice.", "error");
        } finally {
            setSubmitting(false);
        }
    };

    // Submit Edit
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingInvoice) return;

        setSubmitting(true);
        try {
            const id = editingInvoice._id || editingInvoice.id;
            const payload = {
                invoiceNumber: formData.invoiceNumber.trim(),
                clientId: formData.clientId || undefined,
                caseId: formData.caseId || undefined,
                amount: parseFloat(formData.amount),
                description: formData.description.trim(),
                issuedDate: formData.issuedDate,
                dueDate: formData.dueDate,
                status: formData.status
            };

            await updateInvoice(id!, payload);
            showToast(`Invoice ${payload.invoiceNumber} updated successfully.`);
            setEditingInvoice(null);
            loadData();
        } catch (err: any) {
            console.error("Update invoice error:", err);
            showToast(err.message || "Failed to update invoice.", "error");
        } finally {
            setSubmitting(false);
        }
    };

    // Mark as paid
    const handleMarkPaid = async (inv: InvoiceItem) => {
        const id = inv._id || inv.id;
        try {
            await payInvoice(id!);
            showToast(`Payment recorded for ${inv.invoiceNumber}.`);
            if (viewingInvoice && (viewingInvoice._id === id || viewingInvoice.id === id)) {
                setViewingInvoice({ ...viewingInvoice, status: "paid" });
            }
            loadData();
        } catch (err: any) {
            console.error("Pay invoice error:", err);
            showToast(err.message || "Failed to process payment.", "error");
        }
    };

    // Delete invoice
    const handleDelete = async (id: string) => {
        try {
            await deleteInvoice(id);
            showToast("Invoice deleted successfully.");
            setDeletingId(null);
            loadData();
        } catch (err: any) {
            console.error("Delete invoice error:", err);
            showToast(err.message || "Failed to delete invoice.", "error");
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-16 px-2 sm:px-4">
            {/* Toast Notification */}
            {toast && (
                <div
                    className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-lg shadow-xl text-sm font-medium transition-all flex items-center gap-3 ${
                        toast.type === "success"
                            ? "bg-emerald-800 text-white border border-emerald-600"
                            : "bg-rose-800 text-white border border-rose-600"
                    }`}
                >
                    <span>{toast.type === "success" ? "✓" : "⚠️"}</span>
                    <span>{toast.text}</span>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <span className="p-2.5 bg-[var(--primary)] text-[var(--accent)] rounded-lg text-xl shadow-inner">
                            💳
                        </span>
                        <div>
                            <h1 className="font-serif text-3xl font-semibold text-[var(--foreground)] tracking-tight">
                                Billing & Accounts Receivable
                            </h1>
                            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                                Manage trust ledgers, issue legal fee notes, and track disbursements.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 self-start md:self-auto">
                    {/* Currency toggle */}
                    <div className="flex items-center bg-[var(--card)] border border-[var(--border)] rounded-lg p-1 text-xs font-mono shadow-sm">
                        <button
                            onClick={() => setCurrency("NGN")}
                            className={`px-2.5 py-1 rounded transition-colors ${
                                currency === "NGN"
                                    ? "bg-[var(--primary)] text-white font-semibold"
                                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            }`}
                        >
                            ₦ NGN
                        </button>
                        <button
                            onClick={() => setCurrency("USD")}
                            className={`px-2.5 py-1 rounded transition-colors ${
                                currency === "USD"
                                    ? "bg-[var(--primary)] text-white font-semibold"
                                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            }`}
                        >
                            $ USD
                        </button>
                    </div>

                    <button
                        onClick={loadData}
                        title="Reload Invoices"
                        className="p-2 bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-lg hover:border-[var(--primary)] transition-all text-sm shadow-sm"
                    >
                        🔄
                    </button>

                    <button
                        onClick={handleOpenCreate}
                        className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-lg shadow-sm hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2"
                    >
                        <span className="text-lg leading-none">+</span>
                        <span>Create Invoice</span>
                    </button>
                </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Gross Billed */}
                <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between text-xs font-mono text-[var(--muted-foreground)] mb-2">
                        <span>TOTAL INVOICED</span>
                        <span className="text-[var(--primary)] font-bold">{invoices.length} inv.</span>
                    </div>
                    <div className="font-serif text-2xl font-bold text-[var(--foreground)] tracking-tight">
                        {formatMoney(totalGross)}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        Across all clients & active matters
                    </div>
                </div>

                {/* Collected */}
                <div className="p-5 bg-[var(--card)] border border-emerald-200/60 rounded-xl shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between text-xs font-mono text-emerald-600 mb-2">
                        <span>COLLECTED REVENUE</span>
                        <span className="bg-emerald-100/70 text-emerald-700 px-2 py-0.5 rounded text-[11px] font-bold">
                            {collectionRate}%
                        </span>
                    </div>
                    <div className="font-serif text-2xl font-bold text-emerald-600 tracking-tight">
                        {formatMoney(totalCollected)}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {invoices.filter(i => getEffectiveStatus(i) === "paid").length} paid statements
                    </div>
                </div>

                {/* Pending */}
                <div className="p-5 bg-[var(--card)] border border-amber-200/60 rounded-xl shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between text-xs font-mono text-amber-600 mb-2">
                        <span>PENDING RECEIVABLES</span>
                        <span className="bg-amber-100/70 text-amber-700 px-2 py-0.5 rounded text-[11px] font-bold">
                            {invoices.filter(i => getEffectiveStatus(i) === "pending").length}
                        </span>
                    </div>
                    <div className="font-serif text-2xl font-bold text-amber-600 tracking-tight">
                        {formatMoney(totalPending)}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        Awaiting client disbursement
                    </div>
                </div>

                {/* Overdue */}
                <div className="p-5 bg-[var(--card)] border border-rose-200/60 rounded-xl shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between text-xs font-mono text-rose-600 mb-2">
                        <span>OVERDUE BALANCE</span>
                        <span className="bg-rose-100/70 text-rose-700 px-2 py-0.5 rounded text-[11px] font-bold">
                            {invoices.filter(i => getEffectiveStatus(i) === "overdue").length}
                        </span>
                    </div>
                    <div className="font-serif text-2xl font-bold text-rose-600 tracking-tight">
                        {formatMoney(totalOverdue)}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        Past contractual due date
                    </div>
                </div>
            </div>

            {/* Collection Efficiency Progress Bar */}
            <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                        Overall Collection Rate
                    </span>
                    <span className="text-xs font-mono font-bold text-[var(--foreground)]">
                        {collectionRate}% ({formatMoney(totalCollected)} of {formatMoney(totalGross)})
                    </span>
                </div>
                <div className="w-full h-2.5 bg-[var(--muted)] rounded-full overflow-hidden flex">
                    <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${collectionRate}%` }}
                        title={`Collected: ${collectionRate}%`}
                    />
                    <div
                        className="h-full bg-amber-400 transition-all duration-500"
                        style={{ width: `${totalGross > 0 ? (totalPending / totalGross) * 100 : 0}%` }}
                        title="Pending"
                    />
                    <div
                        className="h-full bg-rose-500 transition-all duration-500"
                        style={{ width: `${totalGross > 0 ? (totalOverdue / totalGross) * 100 : 0}%` }}
                        title="Overdue"
                    />
                </div>
                <div className="flex items-center justify-between mt-3 text-[11px] text-[var(--muted-foreground)] font-mono">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span> Paid ({formatMoney(totalCollected)})
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block"></span> Pending ({formatMoney(totalPending)})
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block"></span> Overdue ({formatMoney(totalOverdue)})
                    </span>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--card)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
                {/* Search Input */}
                <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--muted-foreground)] text-sm">
                        🔍
                    </span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by invoice #, client, matter, or description..."
                        className="w-full pl-10 pr-4 py-2 text-sm bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] transition-colors text-[var(--foreground)]"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Status Tabs */}
                    <div className="flex items-center bg-[var(--background)] border border-[var(--border)] rounded-lg p-1 text-xs font-mono">
                        {(["all", "pending", "paid", "overdue"] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 rounded capitalize transition-all ${
                                    statusFilter === s
                                        ? "bg-[var(--primary)] text-white font-semibold shadow-xs"
                                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {/* Client Filter */}
                    <select
                        value={clientFilter}
                        onChange={(e) => setClientFilter(e.target.value)}
                        className="text-xs py-2 px-3 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                    >
                        <option value="all">All Clients</option>
                        {clients.map((c) => (
                            <option key={c._id || c.id} value={c._id || c.id}>
                                {getClientName(c)}
                            </option>
                        ))}
                    </select>

                    {/* Sort Dropdown */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="text-xs py-2 px-3 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                    >
                        <option value="newest">Sort: Newest First</option>
                        <option value="oldest">Sort: Oldest First</option>
                        <option value="amount_desc">Amount: High to Low</option>
                        <option value="amount_asc">Amount: Low to High</option>
                        <option value="due_soon">Due Date: Soonest</option>
                    </select>
                </div>
            </div>

            {/* Invoices List Table */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--muted)]/20">
                    <div className="text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                        Showing {filteredInvoices.length} of {invoices.length} Invoices
                    </div>
                </div>

                {loading ? (
                    <div className="p-16 text-center text-[var(--muted-foreground)]">
                        <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2"></div>
                        <p className="text-sm">Fetching legal fee records & payment ledgers...</p>
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="p-16 text-center text-[var(--muted-foreground)]">
                        <div className="text-5xl mb-3 opacity-40">💳</div>
                        <h3 className="font-serif text-lg font-semibold text-[var(--foreground)] mb-1">
                            No invoices match your criteria
                        </h3>
                        <p className="text-xs max-w-sm mx-auto mb-5 text-[var(--muted-foreground)]">
                            {invoices.length === 0
                                ? "No fee statements have been generated in the system yet."
                                : "Try clearing your search query or adjusting your status filters."}
                        </p>
                        {invoices.length === 0 && (
                            <button
                                onClick={handleOpenCreate}
                                className="px-4 py-2 bg-[var(--primary)] text-white text-xs font-medium rounded-lg shadow-sm hover:brightness-110"
                            >
                                + Generate First Invoice
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                                    <th className="py-3.5 px-4 font-semibold">Status</th>
                                    <th className="py-3.5 px-4 font-semibold">Invoice #</th>
                                    <th className="py-3.5 px-4 font-semibold">Client</th>
                                    <th className="py-3.5 px-4 font-semibold">Matter Reference</th>
                                    <th className="py-3.5 px-4 font-semibold">Description</th>
                                    <th className="py-3.5 px-4 font-semibold">Due Date</th>
                                    <th className="py-3.5 px-4 font-semibold text-right">Amount</th>
                                    <th className="py-3.5 px-4 font-semibold text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {filteredInvoices.map((inv) => {
                                    const effStatus = getEffectiveStatus(inv);
                                    const clientObj = getClientObj(inv.clientId);
                                    const clientName = getClientName(inv.clientId);
                                    const matterObj = getMatterObj(inv.caseId);
                                    const matterName = getMatterName(inv.caseId);
                                    const isDueOverdue = effStatus === "overdue";

                                    return (
                                        <tr
                                            key={inv._id || inv.id}
                                            className="hover:bg-[var(--muted)]/30 transition-colors group"
                                        >
                                            {/* Status Badge */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium capitalize ${
                                                        effStatus === "paid"
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : effStatus === "overdue"
                                                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                                                            : "bg-amber-50 text-amber-700 border border-amber-200"
                                                    }`}
                                                >
                                                    <span
                                                        className={`w-1.5 h-1.5 rounded-full ${
                                                            effStatus === "paid"
                                                                ? "bg-emerald-500"
                                                                : effStatus === "overdue"
                                                                ? "bg-rose-500"
                                                                : "bg-amber-500"
                                                        }`}
                                                    />
                                                    {effStatus}
                                                </span>
                                            </td>

                                            {/* Invoice Number */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => setViewingInvoice(inv)}
                                                    className="font-mono text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
                                                >
                                                    {inv.invoiceNumber}
                                                </button>
                                            </td>

                                            {/* Client */}
                                            <td className="py-3.5 px-4">
                                                <div className="font-medium text-[var(--foreground)] leading-tight">
                                                    {clientObj?._id ? (
                                                        <Link
                                                            to={`/internal/clients/${clientObj._id}`}
                                                            className="hover:underline hover:text-[var(--primary)]"
                                                        >
                                                            {clientName}
                                                        </Link>
                                                    ) : (
                                                        clientName
                                                    )}
                                                </div>
                                                {clientObj?.companyName && clientObj?.companyName !== clientName && (
                                                    <div className="text-[11px] text-[var(--muted-foreground)]">
                                                        {clientObj.companyName}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Matter Reference */}
                                            <td className="py-3.5 px-4">
                                                {matterObj ? (
                                                    <Link
                                                        to={`/internal/matters/${matterObj._id || matterObj.id}`}
                                                        className="font-serif text-xs text-[var(--foreground)] hover:text-[var(--primary)] hover:underline block max-w-xs truncate"
                                                        title={matterObj.title}
                                                    >
                                                        {matterName}
                                                    </Link>
                                                ) : (
                                                    <span className="text-xs text-[var(--muted-foreground)]">—</span>
                                                )}
                                                {matterObj?.matterNumber && (
                                                    <span className="font-mono text-[10px] text-[var(--muted-foreground)] block">
                                                        {matterObj.matterNumber}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Description */}
                                            <td className="py-3.5 px-4 max-w-xs">
                                                <span
                                                    className="text-xs text-[var(--foreground)] line-clamp-1"
                                                    title={inv.description}
                                                >
                                                    {inv.description || "General Legal Retainer"}
                                                </span>
                                            </td>

                                            {/* Due Date */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <div
                                                    className={`text-xs font-mono ${
                                                        isDueOverdue ? "text-rose-600 font-bold" : "text-[var(--muted-foreground)]"
                                                    }`}
                                                >
                                                    {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                                                </div>
                                                {isDueOverdue && (
                                                    <div className="text-[10px] text-rose-500 font-semibold uppercase tracking-wider">
                                                        Past Due
                                                    </div>
                                                )}
                                            </td>

                                            {/* Amount */}
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                <div className="font-mono text-sm font-bold text-[var(--foreground)]">
                                                    {formatMoney(Number(inv.amount))}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => setViewingInvoice(inv)}
                                                        title="View Statement & Receipt"
                                                        className="px-2 py-1 text-xs bg-[var(--background)] border border-[var(--border)] rounded text-[var(--foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                                                    >
                                                        📄 View
                                                    </button>

                                                    {effStatus !== "paid" && (
                                                        <button
                                                            onClick={() => handleMarkPaid(inv)}
                                                            title="Record Payment as Received"
                                                            className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-300 rounded hover:bg-emerald-100 transition-colors font-medium"
                                                        >
                                                            ✓ Mark Paid
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => handleOpenEdit(inv)}
                                                        title="Edit Invoice"
                                                        className="p-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded hover:bg-[var(--muted)] transition-colors"
                                                    >
                                                        ✏️
                                                    </button>

                                                    <button
                                                        onClick={() => setDeletingId(inv._id || inv.id || "")}
                                                        title="Delete Invoice"
                                                        className="p-1 text-xs text-rose-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── CREATE INVOICE MODAL ── */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-lg w-full p-6 my-8 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-5">
                            <div>
                                <h3 className="font-serif text-xl font-semibold text-[var(--foreground)]">
                                    Generate New Invoice
                                </h3>
                                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                                    Issue an official legal fee statement to a client matter.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-lg p-1"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-mono font-medium text-[var(--muted-foreground)] mb-1">
                                        INVOICE NUMBER *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.invoiceNumber}
                                        onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                                        className="w-full text-xs font-mono px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-mono font-medium text-[var(--muted-foreground)] mb-1">
                                        AMOUNT ({currency}) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        required
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        className="w-full text-xs font-mono font-bold px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                    />
                                </div>
                            </div>

                            {/* Client & Matter */}
                            <div>
                                <label className="block text-xs font-mono font-medium text-[var(--muted-foreground)] mb-1">
                                    CLIENT *
                                </label>
                                <select
                                    required
                                    value={formData.clientId}
                                    onChange={(e) => {
                                        const cId = e.target.value;
                                        setFormData({
                                            ...formData,
                                            clientId: cId,
                                            // auto-select first matter of this client if available
                                            caseId: matters.find(m => m.clientId === cId)?._id || formData.caseId
                                        });
                                    }}
                                    className="w-full text-xs px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                >
                                    <option value="">Select a Client</option>
                                    {clients.map((c) => (
                                        <option key={c._id || c.id} value={c._id || c.id}>
                                            {getClientName(c)} {c.clientNumber ? `(${c.clientNumber})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-mono font-medium text-[var(--muted-foreground)] mb-1">
                                    MATTER / CASE (OPTIONAL)
                                </label>
                                <select
                                    value={formData.caseId}
                                    onChange={(e) => setFormData({ ...formData, caseId: e.target.value })}
                                    className="w-full text-xs px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                >
                                    <option value="">No Matter Linked (General Retainer)</option>
                                    {matters
                                        .filter(m => !formData.clientId || m.clientId === formData.clientId)
                                        .map((m) => (
                                            <option key={m._id || m.id} value={m._id || m.id}>
                                                {m.title} {m.matterNumber ? `(${m.matterNumber})` : ""}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* Preset Descriptions */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-mono font-medium text-[var(--muted-foreground)]">
                                        DESCRIPTION *
                                    </label>
                                    <span className="text-[10px] text-[var(--muted-foreground)] font-mono">
                                        Presets available
                                    </span>
                                </div>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Legal services rendered for courtroom representation"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full text-xs px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)] mb-1.5"
                                />
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {PRESET_DESCRIPTIONS.slice(0, 4).map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, description: p })}
                                            className="text-[10px] px-2 py-0.5 bg-[var(--muted)] text-[var(--muted-foreground)] rounded hover:text-[var(--foreground)] hover:bg-[var(--border)] transition-colors"
                                        >
                                            + {p.split("&")[0].trim()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-mono font-medium text-[var(--muted-foreground)] mb-1">
                                        ISSUE DATE
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.issuedDate}
                                        onChange={(e) => setFormData({ ...formData, issuedDate: e.target.value })}
                                        className="w-full text-xs px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)] font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-mono font-medium text-[var(--muted-foreground)] mb-1">
                                        DUE DATE
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                        className="w-full text-xs px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)] font-mono"
                                    />
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-xs font-mono font-medium text-[var(--muted-foreground)] mb-1">
                                    INITIAL STATUS
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                    className="w-full text-xs px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                >
                                    <option value="pending">Pending (Unpaid)</option>
                                    <option value="paid">Paid (Payment Received)</option>
                                    <option value="overdue">Overdue</option>
                                </select>
                            </div>

                            {/* Submit */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-4 py-2 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 bg-[var(--primary)] text-white text-xs font-semibold rounded-lg shadow-sm hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2"
                                >
                                    {submitting ? "Generating..." : "Create & Issue Invoice"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── EDIT INVOICE MODAL ── */}
            {editingInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-lg w-full p-6 my-8 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-5">
                            <div>
                                <h3 className="font-serif text-xl font-semibold text-[var(--foreground)]">
                                    Edit Invoice {editingInvoice.invoiceNumber}
                                </h3>
                                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                                    Update billing details, status, or due date.
                                </p>
                            </div>
                            <button
                                onClick={() => setEditingInvoice(null)}
                                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-lg p-1"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-mono font-medium text-[var(--muted-foreground)] mb-1">
                                        INVOICE NUMBER
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.invoiceNumber}
                                        onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                                        className="w-full text-xs font-mono px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-mono font-medium text-[var(--muted-foreground)] mb-1">
                                        AMOUNT ({currency})
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        required
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        className="w-full text-xs font-mono font-bold px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-mono font-medium text-[var(--muted-foreground)] mb-1">
                                    CLIENT
                                </label>
                                <select
                                    value={formData.clientId}
                                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                                    className="w-full text-xs px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                >
                                    <option value="">Select a Client</option>
                                    {clients.map((c) => (
                                        <option key={c._id || c.id} value={c._id || c.id}>
                                            {getClientName(c)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-mono font-medium text-[var(--muted-foreground)] mb-1">
                                    MATTER / CASE
                                </label>
                                <select
                                    value={formData.caseId}
                                    onChange={(e) => setFormData({ ...formData, caseId: e.target.value })}
                                    className="w-full text-xs px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                >
                                    <option value="">No Matter Linked</option>
                                    {matters.map((m) => (
                                        <option key={m._id || m.id} value={m._id || m.id}>
                                            {m.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-mono font-medium text-[var(--muted-foreground)] mb-1">
                                    DESCRIPTION
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full text-xs px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-mono font-medium text-[var(--muted-foreground)] mb-1">
                                        DUE DATE
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                        className="w-full text-xs font-mono px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-mono font-medium text-[var(--muted-foreground)] mb-1">
                                        STATUS
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                        className="w-full text-xs px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="paid">Paid</option>
                                        <option value="overdue">Overdue</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                                <button
                                    type="button"
                                    onClick={() => setEditingInvoice(null)}
                                    className="px-4 py-2 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 bg-[var(--primary)] text-white text-xs font-semibold rounded-lg shadow-sm hover:brightness-110 disabled:opacity-50 transition-all"
                                >
                                    {submitting ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── VIEW / PRINT STATEMENT MODAL ── */}
            {viewingInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full p-8 my-8 relative">
                        {/* Action buttons (hidden on print) */}
                        <div className="flex items-center justify-between pb-6 border-b border-slate-200 mb-6 print:hidden">
                            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest font-semibold">
                                Legal Statement of Fee
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm"
                                >
                                    🖨️ Print / Save PDF
                                </button>
                                {getEffectiveStatus(viewingInvoice) !== "paid" && (
                                    <button
                                        onClick={() => handleMarkPaid(viewingInvoice)}
                                        className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                                    >
                                        ✓ Mark Paid
                                    </button>
                                )}
                                <button
                                    onClick={() => setViewingInvoice(null)}
                                    className="p-1.5 text-slate-400 hover:text-slate-800 text-lg rounded-lg"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Statement Body (Printable) */}
                        <div className="space-y-6">
                            {/* Firm Letterhead Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <img src={logo} alt="Stalwart Law Consult" className="h-10 w-auto object-contain" />
                                    <div>
                                        <h2 className="font-serif text-xl font-bold tracking-tight text-slate-900">
                                            STALWART LAW CONSULT
                                        </h2>
                                        <p className="text-[11px] text-slate-500 tracking-wide uppercase">
                                            Barristers, Solicitors & Legal Practitioners
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                            12 Broad Street, Marina, Lagos, Nigeria · counsel@stalwartlaw.com
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="font-serif text-2xl font-bold text-slate-900 tracking-tight">
                                        FEE NOTE
                                    </div>
                                    <div className="font-mono text-xs font-bold text-slate-600">
                                        {viewingInvoice.invoiceNumber}
                                    </div>
                                    <div className="mt-1">
                                        <span
                                            className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider ${
                                                getEffectiveStatus(viewingInvoice) === "paid"
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : getEffectiveStatus(viewingInvoice) === "overdue"
                                                    ? "bg-rose-100 text-rose-800"
                                                    : "bg-amber-100 text-amber-800"
                                            }`}
                                        >
                                            {getEffectiveStatus(viewingInvoice)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Client & Metadata Grid */}
                            <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                                <div>
                                    <div className="font-mono text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
                                        BILLED TO:
                                    </div>
                                    <div className="font-bold text-slate-900 text-sm">
                                        {getClientName(viewingInvoice.clientId)}
                                    </div>
                                    {getClientObj(viewingInvoice.clientId)?.companyName && (
                                        <div className="text-slate-600">
                                            {getClientObj(viewingInvoice.clientId)?.companyName}
                                        </div>
                                    )}
                                    {getClientObj(viewingInvoice.clientId)?.email && (
                                        <div className="text-slate-500 font-mono mt-0.5">
                                            {getClientObj(viewingInvoice.clientId)?.email}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5 text-right">
                                    <div>
                                        <span className="text-slate-400 font-mono text-[10px] uppercase mr-2">Issue Date:</span>
                                        <span className="font-mono font-medium text-slate-800">
                                            {viewingInvoice.issuedDate ? new Date(viewingInvoice.issuedDate).toLocaleDateString() : "—"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-mono text-[10px] uppercase mr-2">Due Date:</span>
                                        <span className="font-mono font-medium text-slate-800">
                                            {viewingInvoice.dueDate ? new Date(viewingInvoice.dueDate).toLocaleDateString() : "—"}
                                        </span>
                                    </div>
                                    {viewingInvoice.caseId && (
                                        <div>
                                            <span className="text-slate-400 font-mono text-[10px] uppercase mr-2">Matter Ref:</span>
                                            <span className="font-serif font-semibold text-slate-800">
                                                {getMatterName(viewingInvoice.caseId)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Line Item Table */}
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="bg-slate-100/80 border-b border-slate-200 font-mono text-slate-500 uppercase tracking-wider">
                                            <th className="py-2.5 px-4">Item Description</th>
                                            <th className="py-2.5 px-4 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr>
                                            <td className="py-4 px-4">
                                                <div className="font-semibold text-slate-900 text-sm mb-0.5">
                                                    {viewingInvoice.description || "Professional Legal Services Rendered"}
                                                </div>
                                                <div className="text-slate-500 text-[11px]">
                                                    Legal representation, consultation, and litigation disbursements as agreed under counsel mandate.
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-right font-mono font-bold text-sm text-slate-900">
                                                {formatMoney(Number(viewingInvoice.amount))}
                                            </td>
                                        </tr>
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-50 border-t border-slate-200 font-mono font-bold">
                                            <td className="py-3 px-4 text-right text-slate-700">TOTAL DUE ({currency}):</td>
                                            <td className="py-3 px-4 text-right text-base text-slate-900 font-serif font-bold">
                                                {formatMoney(Number(viewingInvoice.amount))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Payment Instructions */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                                <div className="font-mono text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                                    REMITTANCE & WIRE INSTRUCTIONS
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-slate-700 font-mono text-[11px] pt-1">
                                    <div>
                                        <span className="text-slate-400">Bank Name:</span> First Bank of Nigeria
                                    </div>
                                    <div>
                                        <span className="text-slate-400">Account Name:</span> Stalwart Law Consult Clients Account
                                    </div>
                                    <div>
                                        <span className="text-slate-400">Account No:</span> 2038948190
                                    </div>
                                    <div>
                                        <span className="text-slate-400">Sort / SWIFT:</span> FBNINGLA
                                    </div>
                                </div>
                            </div>

                            {/* Signature Footer */}
                            <div className="flex items-end justify-between pt-4 border-t border-slate-200 text-xs text-slate-500">
                                <div>
                                    <p className="italic">Thank you for retaining Stalwart Law Consult.</p>
                                    <p className="text-[10px] text-slate-400">Questions? Contact accounts@stalwartlaw.com</p>
                                </div>
                                <div className="text-right">
                                    <div className="font-serif italic font-bold text-slate-800 text-sm mb-1">
                                        Stalwart Law Consult
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-400">Authorized Finance Partner</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── DELETE CONFIRMATION MODAL ── */}
            {deletingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95 duration-150">
                        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xl mx-auto mb-4">
                            ⚠️
                        </div>
                        <h3 className="font-serif text-lg font-semibold text-[var(--foreground)] mb-1">
                            Void & Delete Invoice?
                        </h3>
                        <p className="text-xs text-[var(--muted-foreground)] mb-5">
                            Are you sure you want to permanently remove this fee statement from the billing registry? This action cannot be reversed.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => setDeletingId(null)}
                                className="px-4 py-2 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deletingId)}
                                className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition-colors shadow-sm"
                            >
                                Yes, Void Invoice
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
