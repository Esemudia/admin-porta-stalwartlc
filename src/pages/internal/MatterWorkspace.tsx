import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { API_BASE, getAuthHeaders, fetchMatters, updateMatter, fetchDocuments, uploadDocument, fetchTasks, createTask, updateTask, approveTask, rejectTask, fetchInvoices, createInvoice, fetchEvents, createEvent, updateEvent } from "../../api";
import { getSession } from "../../auth";
import DocxViewer from "../../components/DocxViewer";
import PdfViewer from "../../components/PdfViewer";
export default function MatterWorkspace() {
    const session = getSession();
    const isAdmin = session?.role === 'super_admin' || session?.role === 'exec_secretary';
    const { id } = useParams();
    const [matter, setMatter] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | documents

    // Matter Editing State
    const [isEditingSettings, setIsEditingSettings] = useState(false);
    const [matterSettings, setMatterSettings] = useState({ title: "", status: "active" });

    // Document State
    const [docsList, setDocsList] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isEditingDoc, setIsEditingDoc] = useState<any>(null); // For active editing
    const [viewingDoc, setViewingDoc] = useState<any>(null); // Active document to view
    const [newDoc, setNewDoc] = useState({ name: "", type: "evidence" });
    const [editDocName, setEditDocName] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Task State
    const [tasksList, setTasksList] = useState<any[]>([]);
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [newTask, setNewTask] = useState({ title: "", description: "", priority: "normal", dueDate: "" });
    const [isEditingTask, setIsEditingTask] = useState<any>(null);
    const [editTaskData, setEditTaskData] = useState({ title: "", description: "", priority: "normal", status: "to_do", dueDate: "" });

    // Billing State
    const [invoicesList, setInvoicesList] = useState<any[]>([]);
    const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
    const [newInvoice, setNewInvoice] = useState({ amount: "", description: "", dueDate: "" });

    // Calendar/Events State
    const [eventsList, setEventsList] = useState<any[]>([]);
    const [isCreatingEvent, setIsCreatingEvent] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: "", type: "court_hearing", startDate: "", endDate: "", description: "", location: "" });
    const [isEditingEvent, setIsEditingEvent] = useState<any>(null);
    const [editEventData, setEditEventData] = useState({ title: "", type: "court_hearing", startDate: "", endDate: "", description: "", location: "" });

    useEffect(() => {
        Promise.all([fetchMatters(), fetchDocuments(), fetchTasks(), fetchInvoices(), fetchEvents()]).then(([matters, allDocs, allTasks, allInvoices, allEvents]) => {
            const found = matters.find((m: any) => m._id === id || m.id === id);
            setMatter(found);

            // Filter docs securely to just this matter
            const matterDocs = allDocs.filter((d: any) => d.matterId === id || d.matterId === found?.matterNumber);
            setDocsList(matterDocs);

            const matterTasks = allTasks.filter((t: any) => t.matterId === id || t.matterId === found?.matterNumber || t.matterId === found?._id);
            setTasksList(matterTasks);

            const matterInvoices = allInvoices.filter((i: any) => i.caseId === id || i.caseId === found?._id || i.caseId === found?.matterNumber);
            setInvoicesList(matterInvoices);

            const matterEvents = allEvents.filter((ev: any) => ev.matterId === id || ev.matterId === found?._id || ev.matterId === found?.matterNumber);
            setEventsList(matterEvents);
        }).catch(err => console.error(err)).finally(() => setLoading(false));
    }, [id]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            alert("Please select a physical file.");
            return;
        }

        try {
            await uploadDocument({
                name: newDoc.name,
                documentNumber: `STW-DOC-${Math.floor(Math.random() * 10000)}`,
                category: newDoc.type,
                matterId: matter?._id || id
            }, selectedFile);
            window.location.reload();
        } catch (err: any) {
            console.error(err);
            alert(err.message || "Failed to upload document to workspace vault.");
        }
    };

    const handleEditDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE}/documents/${isEditingDoc._id || isEditingDoc.id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ name: editDocName })
            });
            if (res.ok) {
                window.location.reload();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createTask({
                ...newTask,
                matterId: matter._id || id,
                status: 'to_do'
            });
            window.location.reload();
        } catch (e) { console.error(e); }
    };

    const handleUpdateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateTask(isEditingTask._id || isEditingTask.id, {
                ...editTaskData
            });
            window.location.reload();
        } catch (e) { console.error(e); }
    };

    const handleCreateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createInvoice({
                invoiceNumber: `INV-${Math.floor(Math.random() * 100000)}`,
                clientId: matter.clientId || matter.client || 'SYSTEM',
                caseId: matter._id || id,
                amount: parseFloat(newInvoice.amount),
                description: newInvoice.description,
                dueDate: newInvoice.dueDate,
                issuedDate: new Date().toISOString(),
                status: 'pending'
            });
            window.location.reload();
        } catch (e) { console.error(e); }
    };

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createEvent({
                ...newEvent,
                matterId: matter._id || id,
                clientId: matter.clientId || matter.client,
                reminders: [{ minutesBefore: 1440 }] // Defaults to 1 Day (24hr * 60min)
            });
            window.location.reload();
        } catch (e) { console.error(e); }
    };

    const handleUpdateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateEvent(isEditingEvent._id || isEditingEvent.id, {
                ...editEventData
            });
            window.location.reload();
        } catch (e) { console.error(e); }
    };

    const handleUpdateMatterSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateMatter(matter._id || id, {
                title: matterSettings.title,
                status: matterSettings.status
            });
            window.location.reload();
        } catch (e) { console.error(e); }
    };

    if (loading) return <div className="p-10 text-center text-[var(--muted-foreground)]">Decrypting Matter Workspace...</div>;

    const isLawyer = session?.role === 'lawyer';
    const isAssigned = !isLawyer || (() => {
        if (!matter) return false;
        const currentUserId = session?.userId;
        const assignedIds = (matter.assignedLawyerIds || []).map((i: any) => i?.toString ? i.toString() : String(i));
        const partnerId = matter.assignedPartnerId ? (matter.assignedPartnerId.toString ? matter.assignedPartnerId.toString() : String(matter.assignedPartnerId)) : null;
        if (currentUserId && (assignedIds.includes(currentUserId) || partnerId === currentUserId)) {
            return true;
        }
        return true; // If backend permitted retrieval in fetchMatters
    })();

    if (!matter || !isAssigned) return (
        <div className="p-12 text-center text-[var(--foreground)] max-w-lg mx-auto my-12 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg">
            <div className="text-4xl mb-3">🔒</div>
            <h1 className="text-2xl font-serif font-bold mb-2">Restricted Case Workspace</h1>
            <p className="text-[var(--muted-foreground)] text-sm mb-6">
                You do not have attorney assignment permissions to view this matter or its privileged files. Only attorneys assigned to this case and administrators can access it.
            </p>
            <Link to="/internal/matters" className="text-white bg-[var(--primary)] hover:brightness-110 font-medium px-5 py-2.5 rounded-md text-sm transition-all inline-block shadow-sm">
                Return to My Assigned Cases
            </Link>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-10 relative">
            {/* Header info */}
            <div className="bg-[var(--primary)] text-white p-8 rounded-lg shadow-lg relative overflow-hidden flex flex-col md:flex-row justify-between md:items-end">
                <div className="relative z-10">
                    <Link to="/internal/matters" className="text-sm text-white/70 hover:text-white mb-6 inline-flex items-center gap-2">← Back to Matters</Link>
                    <div className="font-mono text-xs text-[var(--accent)] mb-2 uppercase tracking-widest">{matter.caseNumber || matter.matterNumber || `REF-${matter._id.slice(0, 8)}`}</div>
                    <h1 className="font-serif text-3xl font-semibold mb-3 max-w-2xl">{matter.title}</h1>
                    <div className="flex gap-6 text-sm text-white/80 font-mono">
                        <span className="bg-white/10 px-3 py-1 rounded">Status: <strong className="uppercase text-white">{matter.status || 'Active'}</strong></span>
                        <span className="bg-white/10 px-3 py-1 rounded">Client ID: <strong className="text-white">{matter.clientName || matter.clientId || matter.client || 'Confidential'}</strong></span>
                    </div>
                </div>
                {isAdmin && (
                    <div className="relative z-10 mt-6 md:mt-0 flex flex-wrap items-center gap-2.5">
                        {matter.status !== 'archived' ? (
                            <button
                                onClick={async () => {
                                    if (window.confirm(`Archive "${matter.title}" into Cold Storage?`)) {
                                        await updateMatter(matter._id || id, { status: 'archived' });
                                        window.location.reload();
                                    }
                                }}
                                className="px-4 py-2 bg-purple-600/90 hover:bg-purple-700 text-white font-semibold text-sm rounded shadow-sm transition-colors flex items-center gap-1.5"
                                title="Archive this case into Cold Storage at any time"
                            >
                                <span>🗄️</span> Archive Case
                            </button>
                        ) : (
                            <button
                                onClick={async () => {
                                    await updateMatter(matter._id || id, { status: 'active' });
                                    window.location.reload();
                                }}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded shadow-sm transition-colors flex items-center gap-1.5"
                                title="Restore case from archive to active status"
                            >
                                <span>↩️</span> Restore Case
                            </button>
                        )}
                        <button onClick={() => {
                            setMatterSettings({ title: matter.title || "", status: matter.status || "active" });
                            setIsEditingSettings(true);
                        }} className="px-5 py-2 bg-[var(--accent)] text-[var(--primary)] font-semibold text-sm rounded shadow-sm hover:brightness-110 transition-colors">
                            Edit Matter
                        </button>
                    </div>
                )}
                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                    <div className="text-[12rem] leading-none transform -translate-y-12 translate-x-12">⚖️</div>
                </div>
            </div>

            {/* Cold Archive Notice Banner */}
            {matter.status === 'archived' && (
                <div className="p-4 rounded-lg bg-purple-900/30 border border-purple-500/40 text-purple-200 text-sm flex items-center justify-between gap-4 shadow-sm animate-fade-in">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🗄️</span>
                        <div>
                            <strong className="text-white font-serif">Cold Storage Archive:</strong> This legal matter is currently archived. All docket filings, evidentiary vaults, and billing records are sealed and preserved.
                        </div>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={async () => {
                                await updateMatter(matter._id || id, { status: 'active' });
                                window.location.reload();
                            }}
                            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded shrink-0 transition-colors shadow"
                        >
                            Restore to Active
                        </button>
                    )}
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex space-x-1 bg-[var(--muted)]/50 p-1 rounded-lg overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {['dashboard', 'documents', 'tasks', 'billing', 'calendar'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all shrink-0 ${activeTab === tab ? "bg-[var(--card)] text-[var(--primary)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
                    >
                        {tab} {tab === 'documents' && `(${docsList.length})`} {tab === 'tasks' && `(${tasksList.length})`} {tab === 'billing' && `(${invoicesList.length})`} {tab === 'calendar' && `(${eventsList.length})`}
                    </button>
                ))}
            </div>

            {/* Dash View */}
            {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                    <button onClick={() => setActiveTab('documents')} className="text-left p-6 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm hover:shadow-md hover:border-[var(--primary)] transition-all group">
                        <div className="text-3xl mb-4 group-hover:scale-110 transition-transform origin-left">📄</div>
                        <h3 className="font-semibold text-lg text-[var(--foreground)]">Case Documents ({docsList.length})</h3>
                        <p className="text-sm text-[var(--muted-foreground)] mt-1 line-clamp-2">Access briefs, evidence, filings, and securely vaulted physical documents linked to this matter.</p>
                    </button>

                    <button onClick={() => setActiveTab('tasks')} className="text-left p-6 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm hover:shadow-md hover:border-[var(--primary)] transition-all group">
                        <div className="text-3xl mb-4 group-hover:scale-110 transition-transform origin-left">✓</div>
                        <h3 className="font-semibold text-lg text-[var(--foreground)]">Matter Tasks</h3>
                        <p className="text-sm text-[var(--muted-foreground)] mt-1 line-clamp-2">View workflows, upcoming deadlines, and responsibilities for the assigned legal team.</p>
                    </button>

                    <button onClick={() => setActiveTab('billing')} className="text-left p-6 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm hover:shadow-md hover:border-[var(--primary)] transition-all group">
                        <div className="text-3xl mb-4 group-hover:scale-110 transition-transform origin-left">💳</div>
                        <h3 className="font-semibold text-lg text-[var(--foreground)]">Invoicing</h3>
                        <p className="text-sm text-[var(--muted-foreground)] mt-1 line-clamp-2">Track billable hours, expenses, proformas, and financial ledgers for this case.</p>
                    </button>
                </div>
            )}

            {/* Documents View */}
            {activeTab === 'documents' && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm">
                    <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
                        <div>
                            <h2 className="font-serif text-xl font-semibold text-[var(--foreground)]">Vaulted Documents</h2>
                            <p className="text-sm text-[var(--muted-foreground)] mt-1">Files tightly restricted and indexed to this workspace.</p>
                        </div>
                        <button
                            onClick={() => setIsUploading(true)}
                            className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded shadow-sm hover:brightness-110 transition-all flex items-center gap-2"
                        >
                            <span className="text-lg leading-none">+</span> Upload File
                        </button>
                    </div>

                    <div className="grid grid-cols-6 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)] bg-[var(--muted)]/50 p-4 border-b border-[var(--border)]">
                        <div className="col-span-2">File Name</div>
                        <div>Category</div>
                        <div>Doc Number</div>
                        <div>Date</div>
                        <div className="text-right">Access</div>
                    </div>

                    {docsList.length === 0 ? (
                        <div className="p-12 text-center text-[var(--muted-foreground)]">
                            No documents found in this workspace vault.
                        </div>
                    ) : (
                        docsList.map((d: any) => (
                            <div key={d._id || d.id} className="grid grid-cols-6 text-sm p-4 border-b border-[var(--border)] items-center hover:bg-[var(--muted)]/30 transition-colors last:border-0 group">
                                <div className="col-span-2 font-medium text-[var(--foreground)] flex items-center gap-3">
                                    <span className="text-xl">📄</span> {d.name}
                                </div>
                                <div>
                                    <span className="text-xs px-2 py-1 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded font-mono capitalize">
                                        {d.category || 'general'}
                                    </span>
                                </div>
                                <div className="font-mono text-xs text-[var(--muted-foreground)]">{d.documentNumber}</div>
                                <div className="text-xs text-[var(--muted-foreground)]">{new Date(d.createdAt).toLocaleDateString()}</div>
                                <div className="text-right space-x-3 text-xs flex justify-end">
                                    <button onClick={() => setViewingDoc(d)} className="text-[var(--primary)] font-medium hover:underline">
                                        View
                                    </button>
                                    <button onClick={() => { setIsEditingDoc(d); setEditDocName(d.name); }} className="text-[var(--muted-foreground)] font-medium hover:text-[var(--foreground)] hover:underline">
                                        Edit
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Tasks View */}
            {activeTab === 'tasks' && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm">
                    <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
                        <div>
                            <h2 className="font-serif text-xl font-semibold text-[var(--foreground)]">Matter Workflows & Tasks</h2>
                            <p className="text-sm text-[var(--muted-foreground)] mt-1">Track case progression, deadlines, and assigned actions.</p>
                        </div>
                        <button
                            onClick={() => setIsCreatingTask(true)}
                            className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded shadow-sm hover:brightness-110 transition-all flex items-center gap-2"
                        >
                            <span className="text-lg leading-none">+</span> Add Task
                        </button>
                    </div>

                    <div className="grid grid-cols-6 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)] bg-[var(--muted)]/50 p-4 border-b border-[var(--border)]">
                        <div className="col-span-2">Task / Milestone</div>
                        <div>Priority</div>
                        <div>Due Date</div>
                        <div className="text-right">Status</div>
                        <div className="text-right"></div>
                    </div>

                    {tasksList.length === 0 ? (
                        <div className="p-12 text-center text-[var(--muted-foreground)]">
                            No tasks assigned to this matter workspace yet.
                        </div>
                    ) : (
                        tasksList.map((t: any) => {
                            const isPending = t.approvalStatus === 'pending_approval';
                            return (
                                <div key={t._id || t.id} className="grid grid-cols-6 text-sm p-4 border-b border-[var(--border)] items-center hover:bg-[var(--muted)]/30 transition-colors last:border-0 group">
                                    <div className="col-span-2 font-medium text-[var(--foreground)] pr-4">
                                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                            <span>{t.title}</span>
                                            {isPending && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30">
                                                    ⏳ Pending Approval
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-[var(--muted-foreground)] line-clamp-1">{t.description || '--'}</div>
                                    </div>
                                    <div>
                                        <span className={`text-xs px-2 py-1 flex items-center justify-center w-max rounded font-medium capitalize ${t.priority === 'high' ? 'bg-red-100 text-red-700' : t.priority === 'urgent' ? 'bg-rose-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                                            {t.priority || 'normal'}
                                        </span>
                                    </div>
                                    <div className="text-[var(--foreground)]">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '--'}</div>
                                    <div className="text-right">
                                        <span className={`text-xs px-2 py-1 rounded font-mono uppercase ${t.status === 'done' ? 'bg-green-100 text-green-800' : t.status === 'in_progress' ? 'bg-amber-100 text-amber-800' : 'bg-[var(--secondary)] text-[var(--foreground)]'}`}>
                                            {(t.status || 'to_do').replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="text-right flex items-center justify-end gap-2">
                                        {isAdmin && isPending && (
                                            <>
                                                <button
                                                    onClick={async () => {
                                                        await approveTask(t._id || t.id);
                                                        window.location.reload();
                                                    }}
                                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow-sm"
                                                    title="Approve task"
                                                >
                                                    ✓ Approve
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        const reason = window.prompt("Reason for rejection:");
                                                        if (reason === null) return;
                                                        await rejectTask(t._id || t.id, reason);
                                                        window.location.reload();
                                                    }}
                                                    className="px-2 py-1 bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600 hover:text-white text-xs font-bold rounded"
                                                    title="Reject task"
                                                >
                                                    ✕
                                                </button>
                                            </>
                                        )}
                                        <button onClick={() => {
                                            setIsEditingTask(t);
                                            setEditTaskData({
                                                title: t.title,
                                                description: t.description || '',
                                                priority: t.priority || 'normal',
                                                status: t.status || 'to_do',
                                                dueDate: t.dueDate ? t.dueDate.split('T')[0] : ''
                                            });
                                        }} className="text-[var(--primary)] text-xs font-semibold hover:underline">
                                            Update
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Billing View */}
            {activeTab === 'billing' && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm">
                    <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
                        <div>
                            <h2 className="font-serif text-xl font-semibold text-[var(--foreground)]">Billing & Invoicing</h2>
                            <p className="text-sm text-[var(--muted-foreground)] mt-1">Manage ledgers, billable expenses, and pending proformas tied to this case.</p>
                        </div>
                        <button
                            onClick={() => setIsCreatingInvoice(true)}
                            className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded shadow-sm hover:brightness-110 transition-all flex items-center gap-2"
                        >
                            <span className="text-lg leading-none">+</span> Create Invoice
                        </button>
                    </div>

                    <div className="grid grid-cols-5 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)] bg-[var(--muted)]/50 p-4 border-b border-[var(--border)]">
                        <div className="col-span-2">Invoice #</div>
                        <div>Amount</div>
                        <div>Due Date</div>
                        <div className="text-right">Status</div>
                    </div>

                    {invoicesList.length === 0 ? (
                        <div className="p-12 text-center text-[var(--muted-foreground)]">
                            No invoices generated for this matter workspace yet.
                        </div>
                    ) : (
                        invoicesList.map((inv: any) => (
                            <div key={inv._id || inv.id} className="grid grid-cols-5 text-sm p-4 border-b border-[var(--border)] items-center hover:bg-[var(--muted)]/30 transition-colors last:border-0 group">
                                <div className="col-span-2 font-medium text-[var(--foreground)] pr-4">
                                    <div className="mb-0.5">{inv.invoiceNumber}</div>
                                    <div className="text-xs text-[var(--muted-foreground)] line-clamp-1">{inv.description || '--'}</div>
                                </div>
                                <div className="font-mono text-[var(--foreground)]">
                                    ${Number(inv.amount).toFixed(2)}
                                </div>
                                <div className="text-[var(--foreground)]">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '--'}</div>
                                <div className="text-right">
                                    <span className={`text-xs px-2 py-1 flex items-center justify-center ml-auto w-max rounded font-medium capitalize ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : inv.status === 'overdue' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {inv.status || 'pending'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Calendar / Events View */}
            {activeTab === 'calendar' && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm">
                    <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
                        <div>
                            <h2 className="font-serif text-xl font-semibold text-[var(--foreground)]">Case Calendar & Deadlines</h2>
                            <p className="text-sm text-[var(--muted-foreground)] mt-1">Track court hearings, depositions, and statutory deadlines.</p>
                        </div>
                        <button
                            onClick={() => setIsCreatingEvent(true)}
                            className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded shadow-sm hover:brightness-110 transition-all flex items-center gap-2"
                        >
                            <span className="text-lg leading-none">+</span> Sched. Event
                        </button>
                    </div>

                    <div className="grid grid-cols-6 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)] bg-[var(--muted)]/50 p-4 border-b border-[var(--border)]">
                        <div className="col-span-2">Event Title</div>
                        <div>Date</div>
                        <div>Type</div>
                        <div>Location</div>
                        <div className="text-right"></div>
                    </div>

                    {eventsList.length === 0 ? (
                        <div className="p-12 text-center text-[var(--muted-foreground)]">
                            No upcoming events or hearings scheduled for this matter.
                        </div>
                    ) : (
                        eventsList.map((ev: any) => (
                            <div key={ev._id || ev.id} className="grid grid-cols-6 text-sm p-4 border-b border-[var(--border)] items-center hover:bg-[var(--muted)]/30 transition-colors last:border-0 group">
                                <div className="col-span-2 font-medium text-[var(--foreground)] pr-4">
                                    <div className="mb-0.5">{ev.title}</div>
                                    <div className="text-xs text-[var(--muted-foreground)] line-clamp-1">{ev.description || '--'}</div>
                                </div>
                                <div className="text-[var(--foreground)] font-mono text-xs">
                                    {ev.startDate ? new Date(ev.startDate).toLocaleDateString() : '--'}
                                </div>
                                <div>
                                    <span className="text-xs px-2 py-1 flex items-center justify-center w-max rounded font-medium capitalize bg-[var(--secondary)] text-[var(--foreground)]">
                                        {(ev.type || 'general').replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="truncate text-xs text-[var(--muted-foreground)] pr-2">{ev.location || 'Remote / TBD'}</div>
                                <div className="text-right">
                                    <button onClick={() => {
                                        setIsEditingEvent(ev);
                                        setEditEventData({
                                            title: ev.title,
                                            type: ev.type || 'other',
                                            startDate: ev.startDate ? ev.startDate.split('T')[0] : '',
                                            endDate: ev.endDate ? ev.endDate.split('T')[0] : '',
                                            description: ev.description || '',
                                            location: ev.location || ''
                                        });
                                    }} className="text-[var(--primary)] text-xs font-semibold hover:underline">
                                        Update
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Document Upload Modal */}
            {isUploading && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[var(--card)] w-full max-w-md rounded-lg shadow-xl p-6 border border-[var(--border)]">
                        <h2 className="text-xl font-serif font-semibold mb-4 text-[var(--foreground)]">Upload to Workspace</h2>
                        <form onSubmit={handleUpload} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Select File</label>
                                <input required type="file" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="w-full text-sm outline-none file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[var(--primary)] file:text-white hover:file:brightness-110" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">File Label / Title</label>
                                <input required value={newDoc.name} onChange={e => setNewDoc({ ...newDoc, name: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)]" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Category</label>
                                <select value={newDoc.type} onChange={e => setNewDoc({ ...newDoc, type: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)]">
                                    <option value="pleading">Pleading</option>
                                    <option value="evidence">Evidence</option>
                                    <option value="correspondence">Correspondence</option>
                                    <option value="brief">Brief</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsUploading(false)} className="px-4 py-2 border border-[var(--border)] text-sm rounded hover:bg-[var(--muted)]">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-[var(--primary)] text-white text-sm rounded hover:brightness-110">Upload to Vault</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Document Edit Modal */}
            {isEditingDoc && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[var(--card)] w-full max-w-sm rounded-lg shadow-xl p-6 border border-[var(--border)]">
                        <h2 className="text-lg font-serif font-semibold mb-4 text-[var(--foreground)]">Edit Document Meta</h2>
                        <form onSubmit={handleEditDocument} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Rename File</label>
                                <input autoFocus required value={editDocName} onChange={e => setEditDocName(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)]" />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsEditingDoc(null)} className="px-4 py-2 border border-[var(--border)] text-sm rounded hover:bg-[var(--muted)]">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-[var(--primary)] text-white text-sm rounded hover:brightness-110">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


            {/* Matter Editor Modal */}
            {
                isEditingSettings && (
                    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-[var(--card)] w-full max-w-sm rounded-lg shadow-xl p-6 border border-[var(--border)]">
                            <h2 className="text-xl font-serif font-semibold mb-1 text-[var(--foreground)]">Matter Settings</h2>
                            <p className="text-[var(--muted-foreground)] text-xs mb-4">Update the legal status and lifecycle markings of this workspace.</p>
                            <form onSubmit={handleUpdateMatterSettings} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Matter Title / Summary</label>
                                    <input required value={matterSettings.title} onChange={e => setMatterSettings({ ...matterSettings, title: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Lifecycle Status</label>
                                    <select value={matterSettings.status} onChange={e => setMatterSettings({ ...matterSettings, status: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] capitalize text-[var(--foreground)]">
                                        <option value="active">Active (Pending Hearing/Discovery)</option>
                                        <option value="appealing">Appealing Judgement</option>
                                        <option value="completed (judgement in favour)">Completed (Judgement in Favour)</option>
                                        <option value="completed (judgement against)">Completed (Judgement Against)</option>
                                        <option value="finished">Finished (Closed/Archived)</option>
                                    </select>
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setIsEditingSettings(false)} className="px-4 py-2 border border-[var(--border)] text-[var(--foreground)] text-sm rounded hover:bg-[var(--muted)]">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-[var(--primary)] text-white text-sm rounded shadow-sm hover:brightness-110">Apply Changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Document Viewer Overlay Modal */}
            {
                viewingDoc && (
                    <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col backdrop-blur-md">
                        <div className="flex items-center justify-between p-4 bg-black text-white shrink-0">
                            <div className="flex items-center gap-4">
                                <h2 className="font-serif text-lg font-semibold">{viewingDoc.name}</h2>
                                <span className="text-xs font-mono opacity-60 bg-white/20 px-2 py-0.5 rounded">{viewingDoc.documentNumber}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                {/* {(viewingDoc.fileUrl || viewingDoc.filePath) && (
                                <a
                                    href={`${viewingDoc.fileUrl || '/' + viewingDoc.filePath}`}
                                    download
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded transition-colors"
                                >
                                    Download File
                                </a>
                            )} */}
                                <button onClick={() => setViewingDoc(null)} className="text-2xl hover:text-red-400 p-1">&times;</button>
                            </div>
                        </div>

                        <div className="flex-1 w-full bg-stone-900 flex items-center justify-center overflow-hidden p-6">
                            {(() => {
                                if (!viewingDoc.fileUrl && !viewingDoc.filePath) {
                                    return (
                                        <div className="text-center text-white/50 max-w-sm">
                                            <div className="text-6xl mb-4">📄</div>
                                            <h3 className="text-xl font-medium text-white mb-2">Legacy Document</h3>
                                            <p className="text-sm">This file is from an older legacy import and does not contain physical vault data on the server.</p>
                                        </div>
                                    );
                                }

                                const url = (viewingDoc.fileUrl || '/' + viewingDoc.filePath).toLowerCase();
                                const fullUrl = `${viewingDoc.fileUrl || '/' + viewingDoc.filePath}`;

                                if (url.endsWith('.docx') || url.endsWith('.doc')) {
                                    return (
                                        <div className="w-full h-full max-w-5xl bg-white rounded overflow-hidden shadow-2xl relative">
                                            <DocxViewer fileUrl={fullUrl} />
                                        </div>
                                    );
                                } else if (url.endsWith('.pdf')) {
                                    return (
                                        <div className="w-full h-full max-w-5xl bg-white rounded overflow-hidden shadow-2xl relative">
                                            <PdfViewer fileUrl={fullUrl} />
                                        </div>
                                    );
                                } else if (url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.webp')) {
                                    return (
                                        <div className="w-full h-full max-w-5xl bg-zinc-800/50 rounded overflow-hidden relative flex items-center justify-center p-4">
                                            <img src={fullUrl} alt="Document graphic" className="max-w-full max-h-full object-contain rounded drop-shadow-2xl" />
                                        </div>
                                    );
                                } else {
                                    return (
                                        <iframe
                                            src={fullUrl}
                                            className="w-full max-w-5xl h-full bg-white rounded shadow-2xl"
                                            title="Viewer"
                                        />
                                    );
                                }
                            })()}
                        </div>
                    </div>
                )
            }
            {/* Task Creation Modal */}
            {
                isCreatingTask && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-[var(--card)] w-full max-w-md rounded-lg shadow-xl p-6 border border-[var(--border)]">
                            <h2 className="text-xl font-serif font-semibold mb-4 text-[var(--foreground)]">New Task Assignment</h2>
                            <form onSubmit={handleCreateTask} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Title / Objective</label>
                                    <input required value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Description Details</label>
                                    <textarea rows={3} value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)] resize-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Priority Level</label>
                                        <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]">
                                            <option value="low">Low</option>
                                            <option value="normal">Normal</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Due Date</label>
                                        <input type="date" required value={newTask.dueDate} onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]" />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setIsCreatingTask(false)} className="px-4 py-2 border border-[var(--border)] text-[var(--foreground)] text-sm rounded hover:bg-[var(--muted)]">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-[var(--primary)] text-white text-sm rounded hover:brightness-110">Save Task</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* Task Editing Modal */}
            {
                isEditingTask && (
                    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-[var(--card)] w-full max-w-md rounded-lg shadow-xl p-6 border border-[var(--border)]">
                            <h2 className="text-xl font-serif font-semibold mb-4 text-[var(--foreground)]">Update Task</h2>
                            <form onSubmit={handleUpdateTask} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Title / Objective</label>
                                    <input required disabled value={editTaskData.title} onChange={e => setEditTaskData({ ...editTaskData, title: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Description Details</label>
                                    <textarea rows={3} value={editTaskData.description} onChange={e => setEditTaskData({ ...editTaskData, description: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)] resize-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Status</label>
                                        <select value={editTaskData.status} onChange={e => setEditTaskData({ ...editTaskData, status: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]">
                                            <option value="to_do">To Do</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="done">Done</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Priority Level</label>
                                        <select disabled value={editTaskData.priority} onChange={e => setEditTaskData({ ...editTaskData, priority: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]">
                                            <option value="low">Low</option>
                                            <option value="normal">Normal</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Due Date</label>
                                    <input disabled type="date" value={editTaskData.dueDate} onChange={e => setEditTaskData({ ...editTaskData, dueDate: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]" />
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setIsEditingTask(null)} className="px-4 py-2 border border-[var(--border)] text-[var(--foreground)] text-sm rounded hover:bg-[var(--muted)]">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-[var(--primary)] text-white text-sm rounded hover:brightness-110">Update Task</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Invoice Creation Modal */}
            {
                isCreatingInvoice && (
                    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-[var(--card)] w-full max-w-sm rounded-lg shadow-xl p-6 border border-[var(--border)]">
                            <h2 className="text-xl font-serif font-semibold mb-4 text-[var(--foreground)]">Issue New Invoice</h2>
                            <form onSubmit={handleCreateInvoice} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Invoice Amount ($)</label>
                                    <input required type="number" step="0.01" min="0" value={newInvoice.amount} onChange={e => setNewInvoice({ ...newInvoice, amount: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]" placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Description / Memo</label>
                                    <textarea required rows={2} value={newInvoice.description} onChange={e => setNewInvoice({ ...newInvoice, description: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)] resize-none" placeholder="Legal consultation fees..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Payment Due Date</label>
                                    <input type="date" required value={newInvoice.dueDate} onChange={e => setNewInvoice({ ...newInvoice, dueDate: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]" />
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setIsCreatingInvoice(false)} className="px-4 py-2 border border-[var(--border)] text-[var(--foreground)] text-sm rounded hover:bg-[var(--muted)]">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-[var(--primary)] text-white text-sm rounded hover:brightness-110">Issue Invoice</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Event Creation Modal */}
            {
                isCreatingEvent && (
                    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-[var(--card)] w-full max-w-md rounded-lg shadow-xl p-6 border border-[var(--border)]">
                            <h2 className="text-xl font-serif font-semibold mb-4 text-[var(--foreground)]">Schedule New Event</h2>
                            <form onSubmit={handleCreateEvent} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Event Title</label>
                                    <input required value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]" placeholder="e.g. Initial Consultation..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Date</label>
                                        <input type="date" required value={newEvent.startDate} onChange={e => setNewEvent({ ...newEvent, startDate: e.target.value, endDate: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Event Type</label>
                                        <select value={newEvent.type} onChange={e => setNewEvent({ ...newEvent, type: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]">
                                            <option value="court_hearing">Court Hearing</option>
                                            <option value="deposition">Deposition</option>
                                            <option value="client_meeting">Client Meeting</option>
                                            <option value="internal_review">Internal Review</option>
                                            <option value="deadline">Statutory Deadline</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Location</label>
                                    <input value={newEvent.location} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]" placeholder="Zoom link or Physical Address..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Details / Instructions</label>
                                    <textarea rows={2} value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)] resize-none" />
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setIsCreatingEvent(false)} className="px-4 py-2 border border-[var(--border)] text-[var(--foreground)] text-sm rounded hover:bg-[var(--muted)]">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-[var(--primary)] text-white text-sm rounded hover:brightness-110">Save Event</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Event Editing Modal */}
            {
                isEditingEvent && (
                    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-[var(--card)] w-full max-w-md rounded-lg shadow-xl p-6 border border-[var(--border)]">
                            <h2 className="text-xl font-serif font-semibold mb-4 text-[var(--foreground)]">Update Calendar Event</h2>
                            <form onSubmit={handleUpdateEvent} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Event Title</label>
                                    <input disabled required value={editEventData.title} onChange={e => setEditEventData({ ...editEventData, title: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Date</label>
                                        <input type="date" required value={editEventData.startDate} onChange={e => setEditEventData({ ...editEventData, startDate: e.target.value, endDate: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Event Type</label>
                                        <select value={editEventData.type} onChange={e => setEditEventData({ ...editEventData, type: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]">
                                            <option value="court_hearing">Court Hearing</option>
                                            <option value="deposition">Deposition</option>
                                            <option value="client_meeting">Client Meeting</option>
                                            <option value="internal_review">Internal Review</option>
                                            <option value="deadline">Statutory Deadline</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Location</label>
                                    <input value={editEventData.location} onChange={e => setEditEventData({ ...editEventData, location: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Details / Instructions</label>
                                    <textarea rows={2} value={editEventData.description} onChange={e => setEditEventData({ ...editEventData, description: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)] resize-none" />
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setIsEditingEvent(null)} className="px-4 py-2 border border-[var(--border)] text-[var(--foreground)] text-sm rounded hover:bg-[var(--muted)]">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-[var(--primary)] text-white text-sm rounded hover:brightness-110">Update Event</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* Matter Settings Editing Modal */}
            {isEditingSettings && (
                <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[var(--card)] w-full max-w-md rounded-lg shadow-xl p-6 border border-[var(--border)] animate-fade-in">
                        <h2 className="text-xl font-serif font-semibold mb-4 text-[var(--foreground)]">Edit Matter Settings</h2>
                        <form onSubmit={handleUpdateMatterSettings} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Matter Title</label>
                                <input
                                    required
                                    value={matterSettings.title}
                                    onChange={e => setMatterSettings({ ...matterSettings, title: e.target.value })}
                                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Lifecycle Status</label>
                                <select
                                    value={matterSettings.status}
                                    onChange={e => setMatterSettings({ ...matterSettings, status: e.target.value })}
                                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                >
                                    <option value="active">Active (Ongoing Proceedings)</option>
                                    <option value="pending">Pending (Awaiting Allocation/Filing)</option>
                                    <option value="on_hold">On Hold (Stay of Execution/Settlement)</option>
                                    <option value="closed">Closed (Formally Concluded)</option>
                                    <option value="archived">Archived (Digital Cold Storage)</option>
                                </select>
                            </div>
                            <div className="p-3 bg-[var(--muted)]/40 rounded text-xs text-[var(--muted-foreground)] leading-relaxed">
                                ℹ️ You can archive or unarchive this case at any time. Archiving preserves all documents, versions, and billing ledgers.
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsEditingSettings(false)} className="px-4 py-2 border border-[var(--border)] text-[var(--foreground)] text-sm rounded hover:bg-[var(--muted)]">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-[var(--primary)] text-white text-sm rounded hover:brightness-110">Save Settings</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div >
    );
}
