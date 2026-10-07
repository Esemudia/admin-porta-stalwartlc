import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    fetchClients,
    fetchMatters,
    fetchDocuments,
    fetchTasks,
    fetchEvents,
    fetchInvoices,
    fetchVerificationRecords
} from "../../api";
import { getSession, canAccessNav } from "../../auth";

function formatActivityTime(dateInput?: string | Date) {
    if (!dateInput) return "Recent";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "Recent";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24 && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    if (diffDays === 1 || (diffHours < 48 && date.getDate() === now.getDate() - 1)) {
        return "Yesterday";
    }
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function formatDeadline(date: Date) {
    if (isNaN(date.getTime())) return "TBD";
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;

    if (isToday) return hasTime ? `Today, ${timeStr}` : "Today";
    if (isTomorrow) return hasTime ? `Tomorrow, ${timeStr}` : "Tomorrow";

    const dateFormatted = date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    return hasTime ? `${dateFormatted}, ${timeStr}` : dateFormatted;
}

export default function Dashboard() {
    const navigate = useNavigate();
    const session = getSession();

    const [clients, setClients] = useState<any[]>([]);
    const [matters, setMatters] = useState<any[]>([]);
    const [docs, setDocs] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [verifications, setVerifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const canMatters = canAccessNav(session?.role, "matters");
    const canClients = canAccessNav(session?.role, "clients");
    const canArchive = canAccessNav(session?.role, "archive");
    const canCalendar = canAccessNav(session?.role, "calendar");
    const canTasks = canAccessNav(session?.role, "tasks");
    const canVerification = canAccessNav(session?.role, "verification");
    const canCreateClient = canClients && session?.role !== "lawyer";
    const canCreateMatter = canMatters && (session?.role === "super_admin" || session?.role === "exec_secretary");

    useEffect(() => {
        let isMounted = true;
        async function loadAllDashboardData() {
            setLoading(true);
            try {
                const [c, m, d, t, e, inv, v] = await Promise.all([
                    fetchClients().catch(() => []),
                    fetchMatters().catch(() => []),
                    fetchDocuments().catch(() => []),
                    fetchTasks().catch(() => []),
                    fetchEvents().catch(() => []),
                    fetchInvoices().catch(() => []),
                    fetchVerificationRecords().catch(() => [])
                ]);

                if (isMounted) {
                    setClients(c || []);
                    setMatters(m || []);
                    setDocs(d || []);
                    setTasks(t || []);
                    setEvents(e || []);
                    setInvoices(inv || []);
                    setVerifications(v || []);
                }
            } catch (err) {
                console.error("Failed to load dashboard data", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        loadAllDashboardData();
        return () => {
            isMounted = false;
        };
    }, []);

    // Derived Statistics
    const stats = useMemo(() => {
        const totalClients = clients.length;
        const activeMatters = matters.filter(m => {
            const st = (m.status || "").toLowerCase();
            return st === "active" || (!st.includes("close") && !st.includes("completed"));
        }).length || matters.length;
        const firmDocuments = docs.length;
        const tasksDue = tasks.filter(t => t.status !== "done" && t.status !== "completed").length;
        const upcomingCourt = events.filter(e => {
            const isCourt = /court|hearing|trial|appearance|ruling|appeal/i.test(e.title || "") || e.eventType === "hearing";
            const date = e.startDate ? new Date(e.startDate) : null;
            const isFuture = date && date.getTime() >= new Date(new Date().setHours(0, 0, 0, 0)).getTime();
            return isCourt || isFuture;
        }).length || events.length;
        const verifiedDocs = verifications.length;

        return {
            totalClients,
            activeMatters,
            firmDocuments,
            tasksDue,
            upcomingCourt,
            verifiedDocs
        };
    }, [clients, matters, docs, tasks, events, verifications]);

    // Live Activity Feed dynamically composed from real MongoDB records and sorted
    const activityFeed = useMemo(() => {
        const feed: Array<{ id: string; timestamp: number; timeStr: string; text: string; highlight: string; link: string }> = [];

        // 1. Matters
        matters.forEach(m => {
            const ts = new Date(m.createdAt || m.updatedAt || Date.now()).getTime();
            feed.push({
                id: `matter-${m._id || m.id}`,
                timestamp: ts,
                timeStr: formatActivityTime(m.createdAt || m.updatedAt),
                text: `Matter registered: ${m.title}`,
                highlight: m.matterNumber ? `[${m.matterNumber}]` : "Active Matter",
                link: "/internal/matters"
            });
        });

        // 2. Documents
        docs.forEach(d => {
            const ts = new Date(d.createdAt || d.updatedAt || Date.now()).getTime();
            const matter = matters.find(m => (m._id || m.id) === (typeof d.matterId === "object" ? d.matterId?._id : d.matterId));
            feed.push({
                id: `doc-${d._id || d.id}`,
                timestamp: ts,
                timeStr: formatActivityTime(d.createdAt || d.updatedAt),
                text: `Document uploaded: ${d.name || d.originalFileName}`,
                highlight: matter ? (matter.matterNumber ? `[${matter.matterNumber}] ${matter.title}` : matter.title) : (d.category || "Firm Archive"),
                link: "/internal/archive"
            });
        });

        // 3. Tasks
        tasks.forEach(t => {
            const ts = new Date(t.updatedAt || t.createdAt || Date.now()).getTime();
            feed.push({
                id: `task-${t._id || t.id}`,
                timestamp: ts,
                timeStr: formatActivityTime(t.updatedAt || t.createdAt),
                text: t.status === "done" ? `Task completed: ${t.title}` : `Task in progress: ${t.title}`,
                highlight: t.priority ? `${t.priority.toUpperCase()} Priority` : (t.status || "Assigned"),
                link: "/internal/tasks"
            });
        });

        // 4. Invoices
        invoices.forEach(inv => {
            const ts = new Date(inv.updatedAt || inv.createdAt || Date.now()).getTime();
            feed.push({
                id: `inv-${inv._id || inv.id}`,
                timestamp: ts,
                timeStr: formatActivityTime(inv.updatedAt || inv.createdAt),
                text: `Invoice ${inv.invoiceNumber || ""} ${inv.status === "paid" ? "settled in full" : "issued"}`,
                highlight: `${inv.currency || "NGN"} ${Number(inv.amount || 0).toLocaleString()}`,
                link: "/internal/billing"
            });
        });

        // 5. Verification Records
        verifications.forEach(v => {
            const ts = new Date(v.issuedAt || v.createdAt || Date.now()).getTime();
            feed.push({
                id: `ver-${v._id || v.id}`,
                timestamp: ts,
                timeStr: formatActivityTime(v.issuedAt || v.createdAt),
                text: `Digital seal certified: ${v.documentTitle || "Legal Instrument"}`,
                highlight: v.verificationCode,
                link: "/internal/verification"
            });
        });

        // Sort descending by timestamp
        feed.sort((a, b) => b.timestamp - a.timestamp);
        return feed.slice(0, 6);
    }, [matters, docs, tasks, invoices, verifications]);

    // Live Upcoming Deadlines dynamically compiled from real events and tasks
    const upcomingDeadlines = useMemo(() => {
        const list: Array<{
            id: string;
            matter: string;
            deadline: string;
            lawyer: string;
            status: string;
            statusType: "critical" | "pending" | "scheduled";
            sortDate: number;
        }> = [];

        // 1. Calendar Events (Court Dates & Hearings)
        events.forEach(e => {
            if (!e.startDate && !e.date) return;
            const dateObj = new Date(e.startDate || e.date);
            if (isNaN(dateObj.getTime())) return;

            const matter = matters.find(m => (m._id || m.id) === (typeof e.matterId === "object" ? e.matterId?._id : e.matterId));
            const matterTitle = matter
                ? `${matter.matterNumber ? `[${matter.matterNumber}] ` : ""}${matter.title}`
                : (e.title || "Court Appearance");

            const isCourt = /court|hearing|trial|appearance|ruling|appeal/i.test(e.title || "") || e.eventType === "hearing";

            list.push({
                id: `evt-${e._id || e.id}`,
                matter: matterTitle,
                deadline: formatDeadline(dateObj),
                lawyer: e.assignedTo || e.creatorName || (matter?.assignedLawyers?.[0]?.name) || "Lead Counsel",
                status: isCourt ? "Court Hearing" : (e.eventType || "Scheduled"),
                statusType: isCourt ? "critical" : "scheduled",
                sortDate: dateObj.getTime()
            });
        });

        // 2. Tasks with due dates
        tasks.forEach(t => {
            if (t.status === "done" || t.status === "completed") return;
            const dateObj = t.dueDate ? new Date(t.dueDate) : null;
            const sortDate = dateObj && !isNaN(dateObj.getTime()) ? dateObj.getTime() : Date.now() + 86400000 * 30;

            const matter = matters.find(m => (m._id || m.id) === (typeof t.matterId === "object" ? t.matterId?._id : t.matterId));
            const matterTitle = matter
                ? `${matter.matterNumber ? `[${matter.matterNumber}] ` : ""}${matter.title}`
                : (t.title || "Legal Task");

            const isUrgent = t.priority === "urgent" || t.priority === "high";

            list.push({
                id: `task-${t._id || t.id}`,
                matter: matter ? `${matterTitle} (${t.title})` : t.title,
                deadline: dateObj && !isNaN(dateObj.getTime()) ? formatDeadline(dateObj) : "Open Task",
                lawyer: t.assignedTo || t.creatorName || "Litigation Team",
                status: isUrgent ? "Critical" : (t.status === "in_progress" ? "In Progress" : "Pending"),
                statusType: isUrgent ? "critical" : (t.status === "in_progress" ? "pending" : "scheduled"),
                sortDate
            });
        });

        // Sort ascending (soonest deadline first)
        list.sort((a, b) => a.sortDate - b.sortDate);
        return list.slice(0, 5);
    }, [events, tasks, matters]);

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-10 animate-fade-in">
            {/* Header Ribbon */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-serif text-3xl font-semibold text-[var(--foreground)] tracking-tight">
                        Firm Overview
                    </h1>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        Active practice dashboard configured for <span className="font-semibold capitalize">{session?.role?.replace("_", " ") || "Staff"}</span>.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {canCreateMatter && (
                        <button
                            onClick={() => navigate('/internal/matters')}
                            className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded shadow-sm hover:brightness-110 transition-all flex items-center gap-1.5"
                        >
                            <span>+</span> New Matter
                        </button>
                    )}
                    {canCreateClient && (
                        <button
                            onClick={() => navigate('/internal/clients')}
                            className="px-4 py-2 bg-[var(--secondary)] text-[var(--secondary-foreground)] text-sm font-medium rounded shadow-sm hover:brightness-95 transition-all flex items-center gap-1.5"
                        >
                            <span>+</span> New Client
                        </button>
                    )}
                </div>
            </div>

            {/* Metric KPI Cards (Live from API) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                    { label: "Total Clients", count: stats.totalClients, path: "/internal/clients", can: canClients },
                    { label: "Active Matters", count: stats.activeMatters, path: "/internal/matters", can: canMatters },
                    { label: "Firm Documents", count: stats.firmDocuments, path: "/internal/archive", can: canArchive },
                    { label: "Tasks Due", count: stats.tasksDue, path: "/internal/tasks", can: canTasks },
                    { label: "Upcoming Court", count: stats.upcomingCourt, path: "/internal/calendar", can: canCalendar },
                    { label: "Verified Instruments", count: stats.verifiedDocs, path: "/internal/verification", can: canVerification },
                ].map(k => (
                    <div
                        key={k.label}
                        onClick={() => k.can && navigate(k.path)}
                        className={`p-5 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm transition-all ${
                            k.can ? "cursor-pointer hover:border-[var(--primary)] hover:shadow-md" : ""
                        }`}
                        title={k.can ? `View all in ${k.label}` : k.label}
                    >
                        <div className="text-3xl font-mono text-[var(--primary)] mb-1 font-semibold">
                            {loading ? (
                                <span className="inline-block w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                k.count
                            )}
                        </div>
                        <div className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                            {k.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Grid: Activity Feed & Upcoming Deadlines */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Live Activity Feed */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-serif text-xl font-medium text-[var(--foreground)]">Activity Feed</h2>
                        {canArchive && (
                            <Link to="/internal/archive" className="text-xs text-[var(--primary)] hover:underline font-medium">
                                View all
                            </Link>
                        )}
                    </div>

                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="p-8 text-center text-xs text-[var(--muted-foreground)]">
                                Loading activity feed...
                            </div>
                        ) : activityFeed.length === 0 ? (
                            <div className="p-8 text-center text-xs text-[var(--muted-foreground)]">
                                No recent activity recorded.
                            </div>
                        ) : (
                            activityFeed.map((feed) => (
                                <div
                                    key={feed.id}
                                    onClick={() => navigate(feed.link)}
                                    className="p-4 border-b border-[var(--border)] last:border-0 flex gap-3 hover:bg-[var(--muted)]/50 transition-colors cursor-pointer"
                                >
                                    <div className="text-xs font-mono text-[var(--muted-foreground)] w-14 pt-0.5 shrink-0">
                                        {feed.timeStr}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm text-[var(--foreground)] font-normal line-clamp-2">
                                            {feed.text}
                                        </div>
                                        <div className="text-xs text-[var(--primary)] mt-0.5 font-medium truncate">
                                            {feed.highlight}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Live Upcoming Deadlines */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-serif text-xl font-medium text-[var(--foreground)]">Upcoming Deadlines</h2>
                        {canCalendar && (
                            <Link to="/internal/calendar" className="text-xs text-[var(--primary)] hover:underline font-medium">
                                Full calendar
                            </Link>
                        )}
                    </div>

                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm overflow-hidden">
                        <div className="grid grid-cols-5 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)] bg-[var(--muted)]/50 p-4 border-b border-[var(--border)]">
                            <div className="col-span-2">Matter / Event</div>
                            <div>Deadline</div>
                            <div>Counsel / Assigned</div>
                            <div>Status</div>
                        </div>

                        {loading ? (
                            <div className="p-8 text-center text-xs text-[var(--muted-foreground)]">
                                Loading upcoming deadlines...
                            </div>
                        ) : upcomingDeadlines.length === 0 ? (
                            <div className="p-8 text-center text-xs text-[var(--muted-foreground)]">
                                No pending court hearings or urgent task deadlines scheduled.
                            </div>
                        ) : (
                            upcomingDeadlines.map((d) => (
                                <div
                                    key={d.id}
                                    className="grid grid-cols-5 text-sm p-4 border-b border-[var(--border)] last:border-0 items-center hover:bg-[var(--muted)]/20 transition-colors"
                                >
                                    <div className="col-span-2 font-medium text-[var(--foreground)] truncate pr-4" title={d.matter}>
                                        {d.matter}
                                    </div>
                                    <div className="font-mono text-xs text-[var(--foreground)]">
                                        {d.deadline}
                                    </div>
                                    <div className="text-[var(--muted-foreground)] text-xs truncate" title={d.lawyer}>
                                        {d.lawyer}
                                    </div>
                                    <div>
                                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                                            d.statusType === 'critical'
                                                ? 'bg-red-100 text-red-700 border border-red-200'
                                                : d.statusType === 'pending'
                                                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                        }`}>
                                            {d.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
