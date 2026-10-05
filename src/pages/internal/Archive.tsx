import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchMatters, updateMatter } from "../../api";
import { getSession } from "../../auth";

export default function Archive() {
    const session = getSession();
    const isAdmin = session?.role === 'super_admin' || session?.role === 'exec_secretary';
    const [matters, setMatters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<"all" | "archived" | "closed">("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const loadArchivedMatters = () => {
        setLoading(true);
        fetchMatters()
            .then(data => setMatters(data.filter((m: any) => m.status === 'archived' || m.status === 'closed')))
            .catch(err => console.error("Failed loading archive", err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadArchivedMatters();
    }, []);

    const handleRestore = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm("Restore this matter back to Active status?")) return;

        setActionLoading(id);
        try {
            await updateMatter(id, { status: 'active' });
            setMatters(prev => prev.filter(m => (m._id || m.id) !== id));
        } catch (err) {
            console.error("Failed to restore matter", err);
            alert("Failed to restore matter from archive.");
        } finally {
            setActionLoading(null);
        }
    };

    const filteredMatters = matters.filter(m => {
        if (activeFilter === "archived" && m.status !== 'archived') return false;
        if (activeFilter === "closed" && m.status !== 'closed') return false;
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            return (m.title || '').toLowerCase().includes(term) ||
                (m.matterNumber || '').toLowerCase().includes(term) ||
                (m._id || '').toLowerCase().includes(term);
        }
        return true;
    });

    const archivedCount = matters.filter(m => m.status === 'archived').length;
    const closedCount = matters.filter(m => m.status === 'closed').length;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-serif text-3xl font-semibold text-[var(--foreground)] flex items-center gap-2">
                        <span>🗄️</span> Digital Cold Archive & Sealed Records
                    </h1>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                        Secure digital cold storage for archived cases, completed dockets, and closed matter records. Cases can be archived or restored at any time.
                    </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30">
                        {archivedCount} Archived in Cold Storage
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]">
                        {closedCount} Formally Closed
                    </span>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[var(--card)] p-3 rounded-lg border border-[var(--border)]">
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <button
                        onClick={() => setActiveFilter("all")}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            activeFilter === "all"
                                ? "bg-[var(--primary)] text-white shadow-sm font-semibold"
                                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                        }`}
                    >
                        All Sealed Matters ({matters.length})
                    </button>
                    <button
                        onClick={() => setActiveFilter("archived")}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            activeFilter === "archived"
                                ? "bg-purple-600 text-white shadow-sm font-semibold"
                                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                        }`}
                    >
                        Archived Cases ({archivedCount})
                    </button>
                    <button
                        onClick={() => setActiveFilter("closed")}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            activeFilter === "closed"
                                ? "bg-[var(--primary)] text-white shadow-sm font-semibold"
                                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                        }`}
                    >
                        Closed Cases ({closedCount})
                    </button>
                </div>

                <div className="relative w-full sm:w-72">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)]">🔍</span>
                    <input
                        type="text"
                        placeholder="Search archived matters..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                    />
                </div>
            </div>

            {loading ? (
                <div className="p-12 text-center text-sm text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-lg">
                    Decrypting cold vault ledger...
                </div>
            ) : (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm overflow-hidden">
                    {filteredMatters.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="text-5xl mb-4 opacity-40">🗄️</div>
                            <p className="text-[var(--foreground)] font-serif font-semibold text-base">No matters in this archive view.</p>
                            <p className="text-xs text-[var(--muted-foreground)] mt-1">
                                Any active or concluded legal case can be archived at any time from the Matters workspace or Admin Portal.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--border)]">
                            {filteredMatters.map(m => {
                                const isArchived = m.status === 'archived';
                                const matterId = m._id || m.id;

                                return (
                                    <div
                                        key={matterId}
                                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[var(--muted)]/20 transition-colors"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs text-[var(--muted-foreground)]">
                                                    REF: {m.matterNumber || `SLC-${matterId.slice(0, 8).toUpperCase()}`}
                                                </span>
                                                <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                                                    isArchived
                                                        ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                                        : 'bg-gray-500/15 text-gray-400 border border-gray-500/30'
                                                }`}>
                                                    {isArchived ? 'COLD ARCHIVE' : 'CLOSED'}
                                                </span>
                                            </div>
                                            <h3 className="font-serif font-semibold text-lg text-[var(--foreground)]">
                                                {m.title}
                                            </h3>
                                            <p className="text-xs text-[var(--muted-foreground)]">
                                                Client: {m.clientName || m.clientId || 'Confidential'} • Docket files securely sealed in digital vault
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                                            {isAdmin && (
                                                <button
                                                    onClick={(e) => handleRestore(matterId, e)}
                                                    disabled={actionLoading === matterId}
                                                    className="px-3.5 py-1.5 text-xs font-semibold rounded bg-green-500/15 text-green-400 hover:bg-green-500/25 border border-green-500/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
                                                    title="Restore this matter back to active directory"
                                                >
                                                    <span>↩️</span> {actionLoading === matterId ? "Restoring..." : "Restore Case"}
                                                </button>
                                            )}

                                            <Link
                                                to={`/internal/matters/${matterId}`}
                                                className="px-3.5 py-1.5 text-xs font-medium rounded border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                                            >
                                                Open Workspace
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
