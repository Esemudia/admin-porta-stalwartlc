import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchClients, createClient } from "../../api";
import { getSession } from "../../auth";

export default function ClientList() {
    const session = getSession();
    const isLawyer = session?.role === "lawyer";
    const canAddClient = session?.role !== "lawyer";

    const [searchTerm, setSearchTerm] = useState("");
    const [clientsList, setClientsList] = useState<any[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form state
    const [formData, setFormData] = useState({
        type: "individual",
        firstName: "",
        lastName: "",
        companyName: "",
        email: "",
        phone: "",
        repName: "",
        repEmail: "",
        repPhone: "",
        repPosition: ""
    });

    useEffect(() => {
        async function load() {
            try {
                const c = await fetchClients();
                setClientsList(c);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const handleAddClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLawyer) {
            alert("Lawyers do not have permission to register new clients. Please contact firm administration or front desk.");
            return;
        }

        try {
            const payload: any = {
                clientNumber: `STW-CL-00${clientsList.length + 10}`,
                type: formData.type.toLowerCase(),
                email: formData.email,
                phone: formData.phone
            };

            if (formData.type === 'corporate') {
                payload.companyName = formData.companyName;
                payload.representative = {
                    name: formData.repName,
                    email: formData.repEmail,
                    phone: formData.repPhone,
                    position: formData.repPosition
                };
            } else {
                payload.firstName = formData.firstName;
                payload.lastName = formData.lastName;
            }

            const res = await createClient(payload);
            if (res && (res.error || (res.statusCode && res.statusCode >= 400))) {
                throw new Error(res.message || res.error || "Failed to create client");
            }
            window.location.reload();
        } catch (e: any) {
            console.error(e);
            alert(e?.message || "Failed to create client.");
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-10 relative">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="font-serif text-3xl font-semibold text-[var(--foreground)]">Clients</h1>
                        {isLawyer && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                Read Only
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                        {isLawyer
                            ? "View firm individual and corporate clients associated with matters."
                            : "Manage all firm individuals and corporate clients."}
                    </p>
                </div>
                {canAddClient && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded shadow-sm hover:brightness-110 transition-all"
                    >
                        + New Client
                    </button>
                )}
            </div>

            {/* Modal */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] w-full max-w-lg rounded-lg shadow-xl p-6 border border-[var(--border)] max-h-[90vh] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                        <h2 className="text-xl font-serif font-semibold mb-4 text-[var(--foreground)]">Register New Client</h2>
                        <form onSubmit={handleAddClient} className="space-y-4">

                            <div>
                                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Entity Type</label>
                                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)]">
                                    <option value="individual">Individual</option>
                                    <option value="corporate">Corporate</option>
                                </select>
                            </div>

                            {formData.type === 'individual' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">First Name</label>
                                        <input required value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)]" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Last Name</label>
                                        <input required value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)]" />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Company Name</label>
                                    <input required value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)]" />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Primary Email</label>
                                    <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Primary Phone</label>
                                    <input required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)]" />
                                </div>
                            </div>

                            {formData.type === 'corporate' && (
                                <div className="mt-6 pt-4 border-t border-[var(--border)] space-y-4">
                                    <h3 className="text-sm font-semibold text-[var(--primary)]">Representative Details</h3>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Representative Name</label>
                                        <input required value={formData.repName} onChange={e => setFormData({ ...formData, repName: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)]" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Rep Email</label>
                                            <input type="email" value={formData.repEmail} onChange={e => setFormData({ ...formData, repEmail: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)]" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Rep Phone</label>
                                            <input value={formData.repPhone} onChange={e => setFormData({ ...formData, repPhone: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)]" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Position / Title</label>
                                        <input value={formData.repPosition} onChange={e => setFormData({ ...formData, repPosition: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)]" />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-6">
                                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 border border-[var(--border)] text-sm font-medium rounded hover:bg-[var(--muted)]">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded shadow-sm hover:brightness-110">Register Client</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm overflow-hidden mt-6">
                <div className="grid grid-cols-6 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)] bg-[var(--muted)]/50 p-4 border-b border-[var(--border)]">
                    <div className="col-span-2">Client / Company Name</div>
                    <div>Type</div>
                    <div>Contact</div>
                    <div>ID Number</div>
                    <div className="text-right">Actions</div>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-[var(--muted-foreground)] text-sm">Loading backend data...</div>
                ) : clientsList.length === 0 ? (
                    <div className="p-8 text-center text-[var(--muted-foreground)] text-sm">No clients found.</div>
                ) : (
                    clientsList
                        .filter((c: any) => {
                            const term = searchTerm.toLowerCase();
                            return (c.firstName || '').toLowerCase().includes(term) ||
                                (c.lastName || '').toLowerCase().includes(term) ||
                                (c.companyName || '').toLowerCase().includes(term) ||
                                (c.email || '').toLowerCase().includes(term) ||
                                (c.clientNumber || '').toLowerCase().includes(term);
                        })
                        .map((c: any, i: number) => (
                            <div key={c._id || i} className="grid grid-cols-6 text-sm p-4 border-b border-[var(--border)] items-center hover:bg-[var(--muted)]/30 transition-colors last:border-0">
                                <div className="col-span-2 font-medium text-[var(--foreground)]">
                                    {c.type?.toLowerCase() === 'corporate' ? (c.companyName || c.name || "Corporate Client") : `${c.firstName || ''} ${c.lastName || ''}`.trim()}
                                    {c.type?.toLowerCase() === 'corporate' && c.representative?.name && (
                                        <div className="text-xs text-[var(--muted-foreground)] font-normal mt-0.5">Rep: {c.representative.name}</div>
                                    )}
                                </div>
                                <div>
                                    <span className="text-xs px-2 py-1 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded font-mono capitalize">
                                        {c.type}
                                    </span>
                                </div>
                                <div className="min-w-0 pr-4">
                                    <div className="text-[var(--foreground)] truncate" title={c.email}>{c.email}</div>
                                    <div className="text-xs text-[var(--muted-foreground)] truncate mt-0.5 font-mono">{c.phone || 'No phone'}</div>
                                </div>
                                <div className="font-mono text-xs text-[var(--muted-foreground)]">{c.clientNumber}</div>
                                <div className="text-right flex justify-end gap-3 text-xs">
                                    <Link to={`/internal/clients/${c._id}`} className="text-[var(--primary)] font-medium hover:underline">Profile</Link>
                                </div>
                            </div>
                        ))
                )}
            </div>
        </div>
    );
}
