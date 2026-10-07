import { useState, useEffect } from "react";
import { fetchTasks, createTask, updateTask, approveTask, rejectTask, deleteTask, fetchUsers, fetchMatters } from "../../api";
import { getSession } from "../../auth";

interface TaskItem {
    _id: string;
    id?: string;
    title: string;
    description?: string;
    priority?: string;
    status?: string;
    approvalStatus?: "pending_approval" | "approved" | "rejected";
    creatorRole?: string;
    creatorName?: string;
    assignedTo?: any;
    matterId?: any;
    dueDate?: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectionReason?: string;
    createdAt?: string;
}

export default function Tasks() {
    const session = getSession();
    const isAdmin = session?.role === "super_admin" || session?.role === "exec_secretary";
    const isLawyer = session?.role === "lawyer";

    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [matters, setMatters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "approved" | "completed">("all");

    // Modal state
    const [isAdding, setIsAdding] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskDesc, setNewTaskDesc] = useState("");
    const [newTaskPriority, setNewTaskPriority] = useState("normal");
    const [newTaskDueDate, setNewTaskDueDate] = useState("");
    const [newTaskAssignee, setNewTaskAssignee] = useState("");
    const [newTaskMatter, setNewTaskMatter] = useState("");

    // Feedback
    const [actionMsg, setActionMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

    const loadAll = async () => {
        try {
            const [taskList, userList, matterList] = await Promise.all([
                fetchTasks().catch(() => []),
                fetchUsers().catch(() => []),
                fetchMatters().catch(() => [])
            ]);
            setTasks(taskList || []);
            setUsers(userList || []);
            setMatters(matterList || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
    }, []);

    const showMessage = (text: string, type: "success" | "error" = "success") => {
        setActionMsg({ text, type });
        setTimeout(() => setActionMsg(null), 3500);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        setSubmitting(true);

        try {
            await createTask({
                title: newTaskTitle.trim(),
                description: newTaskDesc.trim(),
                priority: newTaskPriority,
                status: "to_do",
                dueDate: newTaskDueDate || undefined,
                assignedTo: newTaskAssignee || undefined,
                matterId: newTaskMatter || undefined,
                creatorRole: session?.role || "lawyer",
                creatorName: session?.name || "Counsel Member",
            });

            if (isLawyer) {
                showMessage("Task submitted successfully. It is now awaiting Admin approval.", "success");
            } else {
                showMessage("Task created and approved.", "success");
            }

            setNewTaskTitle("");
            setNewTaskDesc("");
            setNewTaskDueDate("");
            setNewTaskAssignee("");
            setNewTaskMatter("");
            setIsAdding(false);
            await loadAll();
        } catch (err: any) {
            showMessage(err.message || "Failed to create task", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprove = async (task: TaskItem) => {
        try {
            await approveTask(task._id);
            showMessage(`Task "${task.title}" approved.`, "success");
            await loadAll();
        } catch (err: any) {
            showMessage(err.message || "Failed to approve task", "error");
        }
    };

    const handleReject = async (task: TaskItem) => {
        const reason = window.prompt("Reason for administrative rejection (optional):", "Needs scope clarification");
        if (reason === null) return; // User cancelled
        try {
            await rejectTask(task._id, reason);
            showMessage(`Task "${task.title}" rejected.`, "success");
            await loadAll();
        } catch (err: any) {
            showMessage(err.message || "Failed to reject task", "error");
        }
    };

    const handleDelete = async (task: TaskItem) => {
        if (!window.confirm(`Are you sure you want to delete task "${task.title}"?`)) return;
        try {
            await deleteTask(task._id);
            showMessage("Task deleted.", "success");
            await loadAll();
        } catch (err: any) {
            showMessage(err.message || "Failed to delete task", "error");
        }
    };

    const handleToggleStatus = async (task: TaskItem) => {
        const nextStatus = task.status === "completed" ? "to_do" : "completed";
        try {
            await updateTask(task._id, { status: nextStatus });
            await loadAll();
        } catch (err: any) {
            showMessage(err.message || "Failed to update task progress", "error");
        }
    };

    // Filter counts
    const pendingCount = tasks.filter((t) => t.approvalStatus === "pending_approval").length;

    const filteredTasks = tasks.filter((t) => {
        if (activeFilter === "pending") return t.approvalStatus === "pending_approval";
        if (activeFilter === "approved") return t.approvalStatus === "approved" && t.status !== "completed";
        if (activeFilter === "completed") return t.status === "completed";
        return true;
    });

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
            {/* Action notification toast */}
            {actionMsg && (
                <div
                    className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                        actionMsg.type === "success"
                            ? "bg-emerald-600 text-white shadow-emerald-600/30"
                            : "bg-red-600 text-white shadow-red-600/30"
                    }`}
                >
                    <span>{actionMsg.text}</span>
                </div>
            )}

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="font-serif text-3xl font-bold text-[var(--foreground)]">Practice Tasks</h1>
                        <span
                            className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider ${
                                isAdmin
                                    ? "bg-[#D5AA6D]/20 text-[#D5AA6D] border border-[#D5AA6D]/40"
                                    : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                            }`}
                        >
                            {isAdmin ? "Admin Full Control" : `${session?.role || "Staff"} Privileges`}
                        </span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        Operational assignments, docket milestones, and administrative approval workflow.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsAdding(true)}
                        className="px-4 py-2.5 bg-[var(--primary)] text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <span>+ Create New Task</span>
                    </button>
                </div>
            </div>

            {/* Lawyer / Staff Advisory Banner */}
            {isLawyer && (
                <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                        <strong>Counsel Protocol:</strong> Any task you initiate is submitted to Administration for statutory sign-off before being activated in the master docket.
                    </span>
                </div>
            )}

            {/* Admin Approval Queue Callout */}
            {isAdmin && pendingCount > 0 && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-[#001d42]/40 to-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                            {pendingCount}
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white">
                                {pendingCount} Lawyer Task{pendingCount > 1 ? "s" : ""} Awaiting Your Approval
                            </h3>
                            <p className="text-xs text-slate-400">
                                Review lawyer submissions and either grant sign-off or reject with explanatory notes.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setActiveFilter("pending")}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-[#001026] hover:bg-amber-400 transition-all shrink-0"
                    >
                        View Approval Queue →
                    </button>
                </div>
            )}

            {/* Filters Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                    { id: "all", label: `All Tasks (${tasks.length})` },
                    { id: "pending", label: `Pending Approval (${pendingCount})`, highlight: pendingCount > 0 },
                    { id: "approved", label: "Active & Approved" },
                    { id: "completed", label: "Completed" },
                ].map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setActiveFilter(f.id as any)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                            activeFilter === f.id
                                ? "bg-[var(--primary)] text-white shadow-sm"
                                : f.highlight
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
                                : "bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)] hover:text-[var(--foreground)]"
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Tasks List */}
            {loading ? (
                <div className="p-12 text-center text-sm text-[var(--muted-foreground)]">
                    Loading firm tasks and approval states...
                </div>
            ) : filteredTasks.length === 0 ? (
                <div className="p-12 text-center rounded-xl bg-[var(--card)] border border-[var(--border)]">
                    <p className="text-sm text-[var(--muted-foreground)]">No tasks found in this view.</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {filteredTasks.map((t) => {
                        const isPending = t.approvalStatus === "pending_approval";
                        const isApproved = t.approvalStatus === "approved";
                        const isRejected = t.approvalStatus === "rejected";
                        const isCompleted = t.status === "completed";

                        return (
                            <div
                                key={t._id}
                                className={`p-4 sm:p-5 rounded-xl border transition-all ${
                                    isPending
                                        ? "bg-amber-500/[0.04] border-amber-500/30 hover:border-amber-500/50"
                                        : isRejected
                                        ? "bg-red-500/[0.04] border-red-500/25"
                                        : isCompleted
                                        ? "bg-[var(--card)]/50 border-[var(--border)] opacity-70"
                                        : "bg-[var(--card)] border-[var(--border)] hover:shadow-md"
                                }`}
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    {/* Left Info */}
                                    <div className="flex items-start gap-3.5">
                                        {/* Checkbox (if approved) */}
                                        {isApproved ? (
                                            <button
                                                type="button"
                                                onClick={() => handleToggleStatus(t)}
                                                className={`mt-1 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                                    isCompleted
                                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                                        : "border-[var(--border)] hover:border-[var(--primary)] text-transparent"
                                                }`}
                                                title={isCompleted ? "Mark incomplete" : "Mark completed"}
                                            >
                                                ✓
                                            </button>
                                        ) : (
                                            <div className="mt-1 w-5 h-5 rounded border border-amber-500/40 bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-400 text-xs">
                                                ⏳
                                            </div>
                                        )}

                                        <div>
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <h3
                                                    className={`text-sm font-semibold ${
                                                        isCompleted
                                                            ? "line-through text-[var(--muted-foreground)]"
                                                            : "text-[var(--foreground)]"
                                                    }`}
                                                >
                                                    {t.title}
                                                </h3>

                                                {/* Approval Badge */}
                                                {isPending && (
                                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                                        ⏳ Pending Admin Approval
                                                    </span>
                                                )}
                                                {isApproved && (
                                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                        ✓ Approved
                                                    </span>
                                                )}
                                                {isRejected && (
                                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                                                        ✕ Rejected
                                                    </span>
                                                )}

                                                {/* Priority badge */}
                                                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-500/15 text-slate-400">
                                                    {t.priority || "Normal"}
                                                </span>
                                            </div>

                                            {t.description && (
                                                <p className="text-xs text-[var(--muted-foreground)] mb-2 font-light">
                                                    {t.description}
                                                </p>
                                            )}

                                            {/* Sub-meta details */}
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--muted-foreground)]">
                                                {t.creatorName && (
                                                    <span>
                                                        Created by: <strong className="text-[var(--foreground)] font-medium">{t.creatorName}</strong> ({t.creatorRole || "Staff"})
                                                    </span>
                                                )}
                                                {t.dueDate && (
                                                    <span>
                                                        Due: <strong>{new Date(t.dueDate).toLocaleDateString()}</strong>
                                                    </span>
                                                )}
                                                {t.approvedBy && (
                                                    <span className="text-emerald-500/90 font-medium">
                                                        Approved by: {t.approvedBy}
                                                    </span>
                                                )}
                                                {t.rejectionReason && (
                                                    <span className="text-red-400 font-medium">
                                                        Reason: {t.rejectionReason}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Actions */}
                                    <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                                        {/* ADMIN APPROVAL CONTROLS */}
                                        {isAdmin && isPending && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => handleApprove(t)}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1.5 transition-all"
                                                >
                                                    <span>✓ Approve</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleReject(t)}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600 hover:text-white transition-all"
                                                >
                                                    <span>✕ Reject</span>
                                                </button>
                                            </>
                                        )}

                                        {/* ADMIN DELETE CONTROL */}
                                        {isAdmin && (
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(t)}
                                                className="p-1.5 text-slate-500 hover:text-red-400 rounded transition-colors"
                                                title="Delete task"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* CREATE TASK MODAL */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-[var(--card)] w-full max-w-lg rounded-xl shadow-2xl p-6 border border-[var(--border)] animate-fadeIn">
                        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-4">
                            <div>
                                <h2 className="text-lg font-serif font-bold text-[var(--foreground)]">Create Practice Task</h2>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                    {isLawyer
                                        ? "This assignment will be submitted to the Admin Approval Queue."
                                        : "Administrator assignment (auto-approved)."}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="text-slate-400 hover:text-white text-lg leading-none"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                                    Task Title *
                                </label>
                                <input
                                    autoFocus
                                    required
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    placeholder="e.g. Draft amended statement of claim for AMCON review"
                                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                                    Scope & Deliverables
                                </label>
                                <textarea
                                    rows={3}
                                    value={newTaskDesc}
                                    onChange={(e) => setNewTaskDesc(e.target.value)}
                                    placeholder="Outline specific legal citations, target court dates, or evidentiary requirements..."
                                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                                        Priority
                                    </label>
                                    <select
                                        value={newTaskPriority}
                                        onChange={(e) => setNewTaskPriority(e.target.value)}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                                    >
                                        <option value="normal">Normal</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                        <option value="low">Low</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                                        Target Due Date
                                    </label>
                                    <input
                                        type="date"
                                        value={newTaskDueDate}
                                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                                        Assign To
                                    </label>
                                    <select
                                        value={newTaskAssignee}
                                        onChange={(e) => setNewTaskAssignee(e.target.value)}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                                    >
                                        <option value="">Unassigned</option>
                                        {users.map((u) => (
                                            <option key={u._id} value={u._id}>
                                                {u.firstName} {u.lastName} ({u.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                                        Related Matter
                                    </label>
                                    <select
                                        value={newTaskMatter}
                                        onChange={(e) => setNewTaskMatter(e.target.value)}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                                    >
                                        <option value="">Firm General</option>
                                        {matters.map((m) => (
                                            <option key={m._id} value={m._id}>
                                                {m.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="px-4 py-2 text-xs font-semibold rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-[var(--primary)] text-white rounded-lg hover:brightness-110 disabled:opacity-50"
                                >
                                    {submitting
                                        ? "Submitting..."
                                        : isLawyer
                                        ? "Submit for Admin Approval"
                                        : "Create Task"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
