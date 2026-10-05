import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getSession } from "../../auth";
import { fetchMatters, fetchClients, fetchUsers, createMatter, updateMatter } from "../../api";

export default function Matters() {
    const session = getSession();
    const isAdmin = session?.role === 'super_admin' || session?.role === 'exec_secretary';
    const isLawyer = session?.role === 'lawyer';

    const [searchTerm, setSearchTerm] = useState("");
    const [casesList, setCasesList] = useState<any[]>([]);
    const [firmLawyers, setFirmLawyers] = useState<any[]>([]);
    const [clientsList, setClientsList] = useState<any[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(true);

    const [newMatter, setNewMatter] = useState({ title: "", clientId: "", attorney: "" });

    useEffect(() => {
        async function loadData() {
            try {
                const [m, c, u] = await Promise.all([fetchMatters(), fetchClients(), fetchUsers()]);

                // Defense-in-depth: if lawyer, ensure only assigned matters are displayed
                let scopedMatters = m;
                if (isLawyer) {
                    const currentUserId = session?.userId;
                    const currentUserEmail = (session?.email || '').toLowerCase();
                    const currentUserName = (session?.name || '').toLowerCase();
                    const matchedUser = u.find((user: any) =>
                        (currentUserId && (user._id === currentUserId || user.id === currentUserId)) ||
                        (user.email && user.email.toLowerCase() === currentUserEmail) ||
                        (user.firstName && currentUserName.includes(user.firstName.toLowerCase()))
                    );
                    const lawyerId = matchedUser?._id || currentUserId;
                    scopedMatters = m.filter((doc: any) => {
                        if (!lawyerId) return true; // If backend already filtered
                        const assignedIds = (doc.assignedLawyerIds || []).map((id: any) => id?.toString ? id.toString() : String(id));
                        const partnerId = doc.assignedPartnerId?.toString ? doc.assignedPartnerId.toString() : String(doc.assignedPartnerId);
                        return assignedIds.includes(lawyerId.toString()) || partnerId === lawyerId.toString();
                    });
                }

                const formattedMatters = scopedMatters.map((doc: any) => ({
                    id: doc._id,
                    caseNumber: doc.matterNumber || "SLC/2026/00XX",
                    title: doc.title,
                    clientName: c.find((client: any) => client._id === doc.clientId)?.firstName || "Unknown Client",
                    attorney: u.find((user: any) => doc.assignedLawyerIds?.includes(user._id))?.firstName || "Unassigned",
                    status: doc.status || "active",
                    nextHearing: 'Pending...'
                }));
                setCasesList(formattedMatters);
                setClientsList(c);
                const lawyers = u.filter((s: any) => s.role === 'lawyer');
                setFirmLawyers(lawyers);
                if (lawyers.length > 0) setNewMatter(prev => ({ ...prev, attorney: lawyers[0]._id }));
                if (c.length > 0) setNewMatter(prev => ({ ...prev, clientId: c[0]._id }));
            } catch (err) {
                console.error("Failed loading data", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [isLawyer, session?.userId, session?.email, session?.name]);

    const handleAddMatter = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createMatter({
                title: newMatter.title,
                clientId: newMatter.clientId,
                matterNumber: `SLC/2026/00${casesList.length + 50}`,
                assignedLawyerIds: [newMatter.attorney].filter(Boolean)
            });
            window.location.reload(); // Quick refresh to pull joined data
        } catch (e) {
            console.error(e);
        }
    };

    const handleRevoke = async (id: string) => {
        try {
            await updateMatter(id, { assignedLawyerIds: [] });
            setCasesList(prev => prev.map(c => c.id === id ? { ...c, attorney: "Unassigned" } : c));
        } catch (e) {
            console.error("Failed to revoke", e);
        }
    };

    const handleAssign = async (id: string, lawyerId: string, lawyerName: string) => {
        try {
            await updateMatter(id, { assignedLawyerIds: [lawyerId] });
            setCasesList(prev => prev.map(c => c.id === id ? { ...c, attorney: lawyerName } : c));
        } catch (e) {
            console.error("Failed to assign", e);
        }
    };

    const handleArchive = async (id: string, status: string) => {
        try {
            await updateMatter(id, { status });
            setCasesList(prev => prev.map(c => c.id === id ? { ...c, status } : c));
        } catch (e) {
            console.error("Failed to update status", e);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="font-serif text-3xl font-semibold text-[var(--foreground)]">Matters</h1>
                        {isLawyer && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Assigned Cases Only ({casesList.length})
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                        {isLawyer
                            ? "View and manage only the legal matters assigned directly to you."
                            : "Manage active, pending, and closed legal workspaces across the entire firm."}
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded shadow-sm hover:brightness-110 transition-all"
                    >
                        + New Matter
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] w-full max-w-md rounded-lg shadow-xl p-6 border border-[var(--border)]">
                        <h2 className="text-xl font-serif font-semibold mb-4 text-[var(--foreground)]">Create Matter</h2>
                        <form onSubmit={handleAddMatter} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Matter Title</label>
                                <input autoFocus required value={newMatter.title} onChange={e => setNewMatter({ ...newMatter, title: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)]" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Client Name</label>
                                <select
                                    value={newMatter.clientId}
                                    onChange={(e) => setNewMatter({ ...newMatter, clientId: e.target.value })}
                                    className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--primary)]"
                                >
                                    {clientsList.map((c: any) => (
                                        <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>
                                    ))}
                                </select>
                            </div>
                            {isAdmin && (
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Assign Lawyer</label>
                                    <select
                                        value={newMatter.attorney}
                                        onChange={(e) => setNewMatter({ ...newMatter, attorney: e.target.value })}
                                        className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--primary)]"
                                    >
                                        {firmLawyers.map((l: any) => (
                                            <option key={l._id} value={l._id}>{l.firstName} {l.lastName}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 border border-[var(--border)] text-sm rounded hover:bg-[var(--muted)]">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-[var(--primary)] text-white text-sm rounded hover:brightness-110">Save Matter</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] opacity-70">🔍</span>
                    <input
                        type="text"
                        placeholder="Search matters by ID, title, or client..."
                        className="w-full bg-[var(--card)] border border-[var(--border)] rounded-md pl-10 pr-4 py-2 text-sm outline-none focus:border-[var(--primary)] transition-colors"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm overflow-hidden">
                <div className="grid grid-cols-7 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)] bg-[var(--muted)]/50 p-4 border-b border-[var(--border)]">
                    <div className="col-span-2">Matter</div>
                    <div className="col-span-1">Client</div>
                    <div className="col-span-1">Lawyer</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-1">Next Deadline</div>
                    <div className="text-right">Actions</div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-sm text-[var(--muted-foreground)]">
                        Loading matter workspaces...
                    </div>
                ) : casesList.length === 0 ? (
                    <div className="p-12 text-center text-sm text-[var(--muted-foreground)]">
                        {isLawyer
                            ? "No cases are currently assigned to your attorney profile. Please contact the Managing Partner for matter allocation."
                            : "No matters registered in the practice directory."}
                    </div>
                ) : (
                    casesList
                        .filter((c: any) => {
                            const term = searchTerm.toLowerCase();
                            return (c.title || '').toLowerCase().includes(term) ||
                                (c.clientName || '').toLowerCase().includes(term) ||
                                (c.caseNumber || '').toLowerCase().includes(term) ||
                                (c.attorney || '').toLowerCase().includes(term);
                        })
                        .map((c: any) => (
                            <div key={c.id} className="grid grid-cols-7 text-sm p-4 border-b border-[var(--border)] items-center hover:bg-[var(--muted)]/30 transition-colors last:border-0 group">
                                <div className="col-span-2 pr-4">
                                    <div className="font-medium text-[var(--foreground)]">{c.title}</div>
                                    <div className="text-xs font-mono text-[var(--muted-foreground)]">{c.caseNumber}</div>
                                </div>
                                <div className="col-span-1 text-[var(--muted-foreground)] truncate">{c.clientName}</div>

                                {/* Assign / Revoke block */}
                                <div className="col-span-1">
                                    <div className="text-[var(--muted-foreground)]">{c.attorney}</div>
                                    {isAdmin && (
                                        <div className="mt-1">
                                            {c.attorney !== "Unassigned" ? (
                                                <button onClick={() => handleRevoke(c.id)} className="text-[10px] text-red-500 hover:underline">Revoke Access</button>
                                            ) : (
                                                <select
                                                    onChange={(e) => handleAssign(c.id, e.target.value, e.target.options[e.target.selectedIndex].text)}
                                                    className="text-[10px] bg-transparent border border-[var(--border)] text-[var(--primary)] rounded outline-none p-0.5"
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>Assign Lawyer</option>
                                                    {firmLawyers.map((l: any) => (
                                                        <option key={l._id} value={l._id}>{l.firstName} {l.lastName}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="col-span-1">
                                    <span className={`text-xs px-2 py-1 rounded font-mono ${
                                        c.status === 'active' ? 'bg-green-100 text-green-700 border-green-200 border' :
                                        c.status === 'archived' ? 'bg-purple-100 text-purple-700 border-purple-200 border font-semibold' :
                                        c.status === 'closed' ? 'bg-gray-100 text-gray-700 border-gray-200 border' :
                                        'bg-amber-100 text-amber-700 border border-amber-200'
                                    }`}>
                                        {c.status}
                                    </span>
                                </div>
                                <div className="col-span-1 font-mono text-xs text-[var(--muted-foreground)]">
                                    {c.nextHearing || "None"}
                                </div>
                                <div className="text-right space-x-2 text-xs flex justify-end items-center">
                                    {isAdmin && (
                                        c.status !== 'archived' ? (
                                            <button
                                                onClick={() => handleArchive(c.id, 'archived')}
                                                className="px-2 py-1 border border-purple-300 text-purple-700 hover:bg-purple-50 rounded transition-colors flex items-center gap-1"
                                                title="Archive this matter to Cold Storage"
                                            >
                                                <span>🗄️</span> Archive
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleArchive(c.id, 'active')}
                                                className="px-2 py-1 border border-green-300 text-green-700 hover:bg-green-50 rounded transition-colors flex items-center gap-1"
                                                title="Restore matter back to Active status"
                                            >
                                                <span>↩️</span> Restore
                                            </button>
                                        )
                                    )}
                                    <Link to={`/internal/matters/${c._id || c.id}`} className="px-3 py-1 border border-[var(--primary)] text-[var(--primary)] rounded font-medium hover:bg-[var(--primary)] hover:text-white transition-colors">
                                        Workspace
                                    </Link>
                                </div>
                            </div>
                        ))
                )}
            </div>
        </div>
    );
}
