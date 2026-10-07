import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
    fetchEvents,
    createEvent,
    deleteEvent,
    fetchMatters,
    fetchClients
} from "../../api";

interface EventItem {
    _id: string;
    id?: string;
    title: string;
    type?: string;
    startDate: string;
    endDate?: string;
    location?: string;
    description?: string;
    matterId?: any;
    clientId?: any;
    reminders?: { minutesBefore: number }[];
    attendees?: any[];
}

export default function Calendar() {
    const [events, setEvents] = useState<EventItem[]>([]);
    const [matters, setMatters] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // View state
    const [viewMode, setViewMode] = useState<"month" | "agenda">("month");
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [selectedMatterFilter, setSelectedMatterFilter] = useState<string>("all");
    const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        type: "court_hearing",
        matterId: "",
        clientId: "",
        startDate: new Date().toISOString().split("T")[0] + "T09:00",
        endDate: new Date().toISOString().split("T")[0] + "T12:00",
        location: "",
        description: ""
    });

    const showToast = (text: string, type: "success" | "error" = "success") => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [evData, matterData, clientData] = await Promise.all([
                fetchEvents().catch(() => []),
                fetchMatters().catch(() => []),
                fetchClients().catch(() => [])
            ]);
            setEvents(evData || []);
            setMatters(matterData || []);
            setClients(clientData || []);
        } catch (err) {
            console.error("Failed to load calendar events:", err);
            showToast("Failed to load docket events.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Month Navigation
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const handleToday = () => setCurrentDate(new Date());

    // Helper: Lookup Matter Title
    const getMatterObj = (matterId: any) => {
        if (!matterId) return null;
        const idStr = typeof matterId === "object" ? matterId._id || matterId.id : matterId;
        return matters.find(m => m._id === idStr || m.id === idStr);
    };

    const getMatterTitle = (matterId: any) => {
        const m = getMatterObj(matterId);
        return m?.title || m?.matterNumber || null;
    };

    // Helper: Event type color & badge
    const getEventTypeMeta = (type?: string) => {
        const t = (type || "general").toLowerCase();
        if (t.includes("court") || t.includes("hearing") || t.includes("trial")) {
            return { label: "Court Hearing", bg: "rgba(213, 170, 109, 0.15)", text: "#c4995c", icon: "⚖️", border: "#D5AA6D" };
        }
        if (t.includes("deadline") || t.includes("filing")) {
            return { label: "Filing Deadline", bg: "rgba(239, 68, 68, 0.12)", text: "#ef4444", icon: "⚠️", border: "#ef4444" };
        }
        if (t.includes("meeting") || t.includes("consultation") || t.includes("conference")) {
            return { label: "Counsel Conference", bg: "rgba(59, 130, 246, 0.12)", text: "#3b82f6", icon: "💬", border: "#3b82f6" };
        }
        if (t.includes("deposition")) {
            return { label: "Deposition", bg: "rgba(168, 85, 247, 0.12)", text: "#a855f7", icon: "📑", border: "#a855f7" };
        }
        return { label: "Firm Milestone", bg: "rgba(100, 116, 139, 0.12)", text: "#64748b", icon: "📌", border: "#64748b" };
    };

    // Relative countdown
    const getCountdown = (dateStr: string) => {
        const target = new Date(dateStr).getTime();
        const now = new Date().setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return { text: "Today", isUrgent: true };
        if (diffDays === 1) return { text: "Tomorrow", isUrgent: true };
        if (diffDays < 0) return { text: `${Math.abs(diffDays)}d ago`, isUrgent: false, isPast: true };
        if (diffDays <= 7) return { text: `In ${diffDays} days`, isUrgent: true };
        return { text: `In ${diffDays} days`, isUrgent: false };
    };

    // Filter events
    const filteredEvents = useMemo(() => {
        return events.filter(ev => {
            if (selectedMatterFilter !== "all") {
                const mId = typeof ev.matterId === "object" ? ev.matterId?._id : ev.matterId;
                if (String(mId) !== selectedMatterFilter) return false;
            }
            if (selectedTypeFilter !== "all") {
                const t = (ev.type || "general").toLowerCase();
                if (selectedTypeFilter === "hearing" && !t.includes("hearing") && !t.includes("court")) return false;
                if (selectedTypeFilter === "deadline" && !t.includes("deadline") && !t.includes("filing")) return false;
                if (selectedTypeFilter === "meeting" && !t.includes("meeting") && !t.includes("conference")) return false;
            }
            return true;
        }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }, [events, selectedMatterFilter, selectedTypeFilter]);

    // Calendar Grid Days
    const calendarDays = useMemo(() => {
        const firstDayIndex = new Date(year, month, 1).getDay();
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        const lastDayOfPrevMonth = new Date(year, month, 0).getDate();

        const days = [];

        // Leading days from prev month
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const d = lastDayOfPrevMonth - i;
            days.push({
                dayNumber: d,
                date: new Date(year, month - 1, d),
                isCurrentMonth: false,
                isToday: false
            });
        }

        // Current month days
        const today = new Date();
        for (let i = 1; i <= lastDayOfMonth; i++) {
            const dateObj = new Date(year, month, i);
            const isToday =
                today.getFullYear() === year &&
                today.getMonth() === month &&
                today.getDate() === i;

            days.push({
                dayNumber: i,
                date: dateObj,
                isCurrentMonth: true,
                isToday
            });
        }

        // Trailing days from next month
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= (remainingDays >= 7 ? remainingDays - 7 : remainingDays); i++) {
            days.push({
                dayNumber: i,
                date: new Date(year, month + 1, i),
                isCurrentMonth: false,
                isToday: false
            });
        }

        return days;
    }, [year, month]);

    const getEventsForDay = (date: Date) => {
        const dStr = date.toISOString().split("T")[0];
        return filteredEvents.filter(ev => {
            try {
                return new Date(ev.startDate).toISOString().split("T")[0] === dStr;
            } catch {
                return false;
            }
        });
    };

    // Open create modal
    const handleOpenCreate = (prefillDate?: Date) => {
        const dateStr = prefillDate
            ? prefillDate.toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0];

        setFormData({
            title: "",
            type: "court_hearing",
            matterId: matters[0]?._id || "",
            clientId: matters[0]?.clientId || clients[0]?._id || "",
            startDate: `${dateStr}T09:00`,
            endDate: `${dateStr}T12:00`,
            location: "High Court of Lagos State, Courtroom 4",
            description: ""
        });
        setIsCreateOpen(true);
    };

    // Submit Create Event
    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            showToast("Please enter an event title.", "error");
            return;
        }

        setSubmitting(true);
        try {
            await createEvent({
                title: formData.title.trim(),
                type: formData.type,
                matterId: formData.matterId || undefined,
                clientId: formData.clientId || undefined,
                startDate: new Date(formData.startDate).toISOString(),
                endDate: new Date(formData.endDate).toISOString(),
                location: formData.location.trim() || undefined,
                description: formData.description.trim() || undefined,
                reminders: [{ minutesBefore: 1440 }] // 24 hours reminder
            });

            showToast("Event docketed successfully.");
            setIsCreateOpen(false);
            loadData();
        } catch (err: any) {
            console.error("Create event error:", err);
            showToast(err.message || "Failed to schedule event.", "error");
        } finally {
            setSubmitting(false);
        }
    };

    // Delete Event
    const handleDeleteEvent = async (id: string) => {
        try {
            await deleteEvent(id);
            showToast("Event removed from docket.");
            setDeletingId(null);
            if (selectedEvent && (selectedEvent._id === id || selectedEvent.id === id)) {
                setSelectedEvent(null);
            }
            loadData();
        } catch (err: any) {
            console.error("Delete event error:", err);
            showToast(err.message || "Failed to delete event.", "error");
        }
    };

    // iCal Export
    const handleDownloadIcs = (eventToExport?: EventItem) => {
        const eventsList = eventToExport ? [eventToExport] : filteredEvents;
        if (eventsList.length === 0) return;

        const formatIcsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

        let icsContent = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Stalwart Law Consult//Admin Portal//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH"
        ];

        eventsList.forEach(ev => {
            const start = new Date(ev.startDate || Date.now());
            const end = ev.endDate ? new Date(ev.endDate) : new Date(start.getTime() + 60 * 60 * 1000);
            const matterTitle = getMatterTitle(ev.matterId);

            icsContent.push(
                "BEGIN:VEVENT",
                `UID:${ev._id || Date.now()}@stalwartlc.com`,
                `DTSTAMP:${formatIcsDate(new Date())}`,
                `DTSTART:${formatIcsDate(start)}`,
                `DTEND:${formatIcsDate(end)}`,
                `SUMMARY:${ev.title || "Legal Proceeding"} — Stalwart Law Consult`,
                `DESCRIPTION:${(ev.description || "Hearing / Docket entry").replace(/\n/g, "\\n")}${matterTitle ? `\\nCase: ${matterTitle}` : ""}`,
                `LOCATION:${ev.location || "Court of Record"}`,
                "STATUS:CONFIRMED",
                "END:VEVENT"
            );
        });

        icsContent.push("END:VCALENDAR");

        const blob = new Blob([icsContent.join("\r\n")], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", eventToExport ? `${eventToExport.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics` : "Firm_Legal_Docket.ics");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-16 px-2 sm:px-4">
            {/* Toast feedback */}
            {toast && (
                <div
                    className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-lg shadow-xl text-sm font-medium flex items-center gap-3 transition-all ${
                        toast.type === "success"
                            ? "bg-emerald-800 text-white border border-emerald-600"
                            : "bg-rose-800 text-white border border-rose-600"
                    }`}
                >
                    <span>{toast.type === "success" ? "✓" : "⚠️"}</span>
                    <span>{toast.text}</span>
                </div>
            )}

            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <span className="p-2.5 bg-[var(--primary)] text-[var(--accent)] rounded-lg text-xl shadow-inner">
                            📅
                        </span>
                        <div>
                            <h1 className="font-serif text-3xl font-semibold text-[var(--foreground)] tracking-tight">
                                Firm Calendar & Hearing Docket
                            </h1>
                            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                                Centralized schedule of court hearings, statutory filing deadlines, and client consultations.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
                    {/* View Switcher */}
                    <div className="flex items-center bg-[var(--card)] border border-[var(--border)] rounded-lg p-1 text-xs font-mono shadow-sm">
                        <button
                            onClick={() => setViewMode("month")}
                            className={`px-3 py-1.5 rounded transition-all ${
                                viewMode === "month"
                                    ? "bg-[var(--primary)] text-white font-semibold shadow-xs"
                                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            }`}
                        >
                            Month Grid
                        </button>
                        <button
                            onClick={() => setViewMode("agenda")}
                            className={`px-3 py-1.5 rounded transition-all ${
                                viewMode === "agenda"
                                    ? "bg-[var(--primary)] text-white font-semibold shadow-xs"
                                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            }`}
                        >
                            Agenda Docket ({filteredEvents.length})
                        </button>
                    </div>

                    <button
                        onClick={loadData}
                        title="Refresh Events"
                        className="p-2 bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-lg hover:border-[var(--primary)] transition-all text-sm shadow-sm"
                    >
                        🔄
                    </button>

                    {filteredEvents.length > 0 && (
                        <button
                            onClick={() => handleDownloadIcs()}
                            className="px-3 py-2 bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] text-xs font-mono font-medium rounded-lg shadow-sm hover:border-[var(--primary)] transition-all flex items-center gap-1.5"
                        >
                            <span>📥</span> Export iCal
                        </button>
                    )}

                    <button
                        onClick={() => handleOpenCreate()}
                        className="px-4 py-2 bg-[var(--primary)] text-white text-xs font-semibold rounded-lg shadow-sm hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-1.5"
                    >
                        <span className="text-sm font-bold">+</span> Schedule Event
                    </button>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--card)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Matter Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[var(--muted-foreground)]">MATTER:</span>
                        <select
                            value={selectedMatterFilter}
                            onChange={(e) => setSelectedMatterFilter(e.target.value)}
                            className="text-xs px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                        >
                            <option value="all">All Matters ({events.length} events)</option>
                            {matters.map(m => (
                                <option key={m._id || m.id} value={m._id || m.id}>
                                    {m.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Event Type Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[var(--muted-foreground)]">TYPE:</span>
                        <select
                            value={selectedTypeFilter}
                            onChange={(e) => setSelectedTypeFilter(e.target.value)}
                            className="text-xs px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                        >
                            <option value="all">All Types</option>
                            <option value="hearing">Court Hearings ⚖️</option>
                            <option value="deadline">Filing Deadlines ⚠️</option>
                            <option value="meeting">Counsel Conferences 💬</option>
                        </select>
                    </div>

                    {(selectedMatterFilter !== "all" || selectedTypeFilter !== "all") && (
                        <button
                            onClick={() => {
                                setSelectedMatterFilter("all");
                                setSelectedTypeFilter("all");
                            }}
                            className="text-xs font-mono text-[var(--primary)] hover:underline"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>

                <div className="text-xs font-mono text-[var(--muted-foreground)]">
                    Showing {filteredEvents.length} of {events.length} scheduled items
                </div>
            </div>

            {/* Loading state */}
            {loading && (
                <div className="p-16 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-xl">
                    <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2"></div>
                    <p className="text-sm">Synchronizing court docket from litigation registry...</p>
                </div>
            )}

            {/* ── VIEW 1: MONTH GRID ── */}
            {!loading && viewMode === "month" && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm p-6 space-y-4">
                    {/* Navigation Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                        <div className="flex items-center gap-3">
                            <h2 className="font-serif text-2xl font-bold text-[var(--foreground)]">
                                {monthNames[month]} {year}
                            </h2>
                            <button
                                onClick={handleToday}
                                className="px-2.5 py-1 text-xs font-mono font-medium bg-[var(--muted)] text-[var(--foreground)] rounded hover:bg-[var(--border)] transition-colors"
                            >
                                Today
                            </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={handlePrevMonth}
                                className="px-3 py-1.5 text-xs font-mono bg-[var(--background)] border border-[var(--border)] rounded hover:border-[var(--primary)] text-[var(--foreground)] transition-colors"
                            >
                                ‹ Prev Month
                            </button>
                            <button
                                onClick={handleNextMonth}
                                className="px-3 py-1.5 text-xs font-mono bg-[var(--background)] border border-[var(--border)] rounded hover:border-[var(--primary)] text-[var(--foreground)] transition-colors"
                            >
                                Next Month ›
                            </button>
                        </div>
                    </div>

                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 text-center font-mono text-xs text-[var(--muted-foreground)] uppercase py-1 border-b border-[var(--border)] font-semibold">
                        <div>Sun</div>
                        <div>Mon</div>
                        <div>Tue</div>
                        <div>Wed</div>
                        <div>Thu</div>
                        <div>Fri</div>
                        <div>Sat</div>
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1.5 min-h-[480px]">
                        {calendarDays.map((cd, idx) => {
                            const dayEvents = getEventsForDay(cd.date);
                            return (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        if (dayEvents.length > 0) {
                                            setSelectedEvent(dayEvents[0]);
                                        } else {
                                            handleOpenCreate(cd.date);
                                        }
                                    }}
                                    className={`min-h-[90px] p-2 rounded-lg border transition-all flex flex-col cursor-pointer ${
                                        cd.isToday
                                            ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-inner"
                                            : cd.isCurrentMonth
                                            ? "border-[var(--border)] bg-[var(--background)] hover:border-[var(--primary)]/50"
                                            : "border-transparent bg-[var(--muted)]/20 opacity-40 hover:opacity-70"
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span
                                            className={`text-xs font-mono font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                                                cd.isToday
                                                    ? "bg-[var(--primary)] text-white"
                                                    : "text-[var(--foreground)]"
                                            }`}
                                        >
                                            {cd.dayNumber}
                                        </span>
                                        {dayEvents.length > 0 && (
                                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-[var(--muted)] text-[var(--foreground)]">
                                                {dayEvents.length}
                                            </span>
                                        )}
                                    </div>

                                    {/* Event pills */}
                                    <div className="space-y-1 flex-1 overflow-y-auto">
                                        {dayEvents.slice(0, 2).map(ev => {
                                            const meta = getEventTypeMeta(ev.type);
                                            return (
                                                <div
                                                    key={ev._id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedEvent(ev);
                                                    }}
                                                    className="p-1 rounded text-[11px] font-medium leading-tight truncate hover:brightness-95 transition-all shadow-2xs"
                                                    style={{
                                                        background: meta.bg,
                                                        color: meta.text,
                                                        borderLeft: `2.5px solid ${meta.border}`
                                                    }}
                                                    title={ev.title}
                                                >
                                                    {meta.icon} {ev.title}
                                                </div>
                                            );
                                        })}
                                        {dayEvents.length > 2 && (
                                            <div className="text-[10px] font-mono text-[var(--muted-foreground)]">
                                                +{dayEvents.length - 2} more
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── VIEW 2: AGENDA LIST ── */}
            {!loading && viewMode === "agenda" && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm p-6 space-y-4">
                    <h2 className="font-serif text-xl font-semibold text-[var(--foreground)]">
                        Hearing Docket & Upcoming Deadlines
                    </h2>

                    {filteredEvents.length === 0 ? (
                        <div className="p-16 text-center text-[var(--muted-foreground)]">
                            <div className="text-4xl mb-3 opacity-40">⚖️</div>
                            <h3 className="font-serif text-lg font-semibold text-[var(--foreground)] mb-1">
                                No docket items scheduled
                            </h3>
                            <p className="text-xs max-w-sm mx-auto mb-4">
                                There are no upcoming court hearings or filing deadlines matching your criteria.
                            </p>
                            <button
                                onClick={() => handleOpenCreate()}
                                className="px-4 py-2 bg-[var(--primary)] text-white text-xs font-semibold rounded-lg shadow-sm hover:brightness-110"
                            >
                                + Schedule First Hearing
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredEvents.map(ev => {
                                const meta = getEventTypeMeta(ev.type);
                                const cd = getCountdown(ev.startDate);
                                const dateObj = new Date(ev.startDate);
                                const matterTitle = getMatterTitle(ev.matterId);

                                return (
                                    <div
                                        key={ev._id || ev.id}
                                        onClick={() => setSelectedEvent(ev)}
                                        className="p-4 bg-[var(--background)] border border-[var(--border)] rounded-xl hover:border-[var(--primary)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                                        style={{ borderLeftWidth: "4px", borderLeftColor: meta.border }}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Date block */}
                                            <div className="w-14 h-14 rounded-lg bg-[var(--card)] border border-[var(--border)] flex flex-col items-center justify-center flex-shrink-0 shadow-2xs font-mono">
                                                <span className="text-[10px] text-[var(--accent)] font-bold uppercase">
                                                    {dateObj.toLocaleString("default", { month: "short" })}
                                                </span>
                                                <span className="text-xl font-bold text-[var(--foreground)] leading-none">
                                                    {dateObj.getDate()}
                                                </span>
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <span
                                                        className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase"
                                                        style={{ background: meta.bg, color: meta.text }}
                                                    >
                                                        {meta.icon} {meta.label}
                                                    </span>
                                                    <span
                                                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                                            cd.isUrgent
                                                                ? "bg-rose-100 text-rose-700"
                                                                : "bg-slate-100 text-slate-700"
                                                        }`}
                                                    >
                                                        {cd.text}
                                                    </span>
                                                </div>

                                                <h3 className="font-serif text-base font-semibold text-[var(--foreground)]">
                                                    {ev.title}
                                                </h3>

                                                {matterTitle && (
                                                    <p className="text-xs text-[var(--accent)] font-medium mt-0.5">
                                                        {matterTitle}
                                                    </p>
                                                )}

                                                {ev.location && (
                                                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5 flex items-center gap-1">
                                                        <span>📍</span> {ev.location}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-end sm:self-center">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownloadIcs(ev);
                                                }}
                                                className="px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded text-xs font-mono text-[var(--foreground)] hover:border-[var(--primary)] transition-colors flex items-center gap-1"
                                                title="Add to personal iCal calendar"
                                            >
                                                <span>📥</span> iCal
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeletingId(ev._id || ev.id || "");
                                                }}
                                                className="p-1.5 text-xs text-rose-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                                                title="Delete Docket Entry"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── CREATE EVENT MODAL ── */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-lg w-full p-6 my-8 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-5">
                            <div>
                                <h3 className="font-serif text-xl font-semibold text-[var(--foreground)]">
                                    Docket New Legal Event
                                </h3>
                                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                                    Schedule a court appearance, filing deadline, or client conference.
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
                            <div>
                                <label className="block text-xs font-mono font-medium text-[var(--muted-foreground)] mb-1">
                                    EVENT TITLE *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Motion for Interlocutory Injunction"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full text-xs px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-mono font-medium text-[var(--muted-foreground)] mb-1">
                                        EVENT TYPE *
                                    </label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full text-xs px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                    >
                                        <option value="court_hearing">Court Hearing ⚖️</option>
                                        <option value="filing_deadline">Filing Deadline ⚠️</option>
                                        <option value="client_meeting">Client Conference 💬</option>
                                        <option value="deposition">Deposition 📑</option>
                                        <option value="general">Firm Milestone 📌</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-mono font-medium text-[var(--muted-foreground)] mb-1">
                                        LINKED MATTER
                                    </label>
                                    <select
                                        value={formData.matterId}
                                        onChange={(e) => {
                                            const mId = e.target.value;
                                            const selM = matters.find(m => m._id === mId || m.id === mId);
                                            setFormData({
                                                ...formData,
                                                matterId: mId,
                                                clientId: selM?.clientId || formData.clientId
                                            });
                                        }}
                                        className="w-full text-xs px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                    >
                                        <option value="">No Matter Linked</option>
                                        {matters.map(m => (
                                            <option key={m._id || m.id} value={m._id || m.id}>
                                                {m.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Start and End date time */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-mono font-medium text-[var(--muted-foreground)] mb-1">
                                        START DATE & TIME *
                                    </label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full text-xs font-mono px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-mono font-medium text-[var(--muted-foreground)] mb-1">
                                        END DATE & TIME *
                                    </label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        className="w-full text-xs font-mono px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-mono font-medium text-[var(--muted-foreground)] mb-1">
                                    LOCATION / VENUE
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. High Court of Rivers State, Court 4, Port Harcourt"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full text-xs px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-mono font-medium text-[var(--muted-foreground)] mb-1">
                                    INSTRUCTIONS / BRIEF NOTES
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Add essential counsel directives, required exhibits, or attendee notes..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full text-xs px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                />
                            </div>

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
                                    className="px-5 py-2 bg-[var(--primary)] text-white text-xs font-semibold rounded-lg shadow-sm hover:brightness-110 disabled:opacity-50 transition-all"
                                >
                                    {submitting ? "Docketing..." : "Schedule Event"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── EVENT DETAILS MODAL ── */}
            {selectedEvent && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
                    onClick={() => setSelectedEvent(null)}
                >
                    <div
                        className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-lg w-full p-6 my-8 animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-4">
                            <div>
                                <span
                                    className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase"
                                    style={{
                                        background: getEventTypeMeta(selectedEvent.type).bg,
                                        color: getEventTypeMeta(selectedEvent.type).text
                                    }}
                                >
                                    {getEventTypeMeta(selectedEvent.type).label}
                                </span>
                                <h3 className="font-serif text-xl font-semibold text-[var(--foreground)] mt-1">
                                    {selectedEvent.title}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-lg p-1"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3 text-xs mb-6">
                            <div className="flex items-center gap-2">
                                <span className="text-[var(--primary)] text-sm">📅</span>
                                <div>
                                    <strong className="text-[var(--foreground)]">Scheduled Date:</strong>{" "}
                                    <span className="font-mono text-[var(--muted-foreground)]">
                                        {new Date(selectedEvent.startDate).toLocaleString("en-GB", {
                                            weekday: "long",
                                            day: "numeric",
                                            month: "long",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        })}
                                    </span>
                                </div>
                            </div>

                            {selectedEvent.location && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[var(--primary)] text-sm">📍</span>
                                    <div>
                                        <strong className="text-[var(--foreground)]">Venue / Court:</strong>{" "}
                                        <span className="text-[var(--muted-foreground)]">{selectedEvent.location}</span>
                                    </div>
                                </div>
                            )}

                            {selectedEvent.matterId && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[var(--primary)] text-sm">⚖️</span>
                                    <div>
                                        <strong className="text-[var(--foreground)]">Matter Reference:</strong>{" "}
                                        <Link
                                            to={`/internal/matters/${selectedEvent.matterId._id || selectedEvent.matterId}`}
                                            className="text-[var(--primary)] hover:underline font-serif font-medium"
                                        >
                                            {getMatterTitle(selectedEvent.matterId) || "Open Matter Workspace"}
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {selectedEvent.description && (
                                <div className="mt-3 p-3 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                                    <strong className="block text-[var(--foreground)] font-mono text-[11px] mb-1">
                                        COUNSEL NOTES & DIRECTIVES:
                                    </strong>
                                    <p className="text-[var(--muted-foreground)] leading-relaxed">
                                        {selectedEvent.description}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
                            <button
                                onClick={() => setDeletingId(selectedEvent._id || selectedEvent.id || "")}
                                className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded transition-colors font-medium"
                            >
                                🗑️ Remove from Docket
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleDownloadIcs(selectedEvent)}
                                    className="px-3.5 py-1.5 bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] rounded-lg text-xs font-mono hover:border-[var(--primary)] transition-colors flex items-center gap-1"
                                >
                                    <span>📥</span> Export iCal
                                </button>
                                <button
                                    onClick={() => setSelectedEvent(null)}
                                    className="px-4 py-1.5 bg-[var(--primary)] text-white text-xs font-semibold rounded-lg hover:brightness-110 transition-all"
                                >
                                    Done
                                </button>
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
                            Remove from Docket?
                        </h3>
                        <p className="text-xs text-[var(--muted-foreground)] mb-5">
                            Are you sure you want to cancel and remove this scheduled hearing/event from the platform?
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => setDeletingId(null)}
                                className="px-4 py-2 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            >
                                Keep Event
                            </button>
                            <button
                                onClick={() => handleDeleteEvent(deletingId)}
                                className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition-colors shadow-sm"
                            >
                                Yes, Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
