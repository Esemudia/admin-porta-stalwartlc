import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchClients, fetchMatters, updateClient } from "../../api";
import { getSession } from "../../auth";

export default function ClientProfile() {
    const session = getSession();
    const canEdit = session?.role !== "lawyer";
    const { id } = useParams();
    const [client, setClient] = useState<any>(null);
    const [cases, setCases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");

    const [editForm, setEditForm] = useState({
        type: "individual",
        firstName: "",
        lastName: "",
        companyName: "",
        email: "",
        phone: "",
        status: "active",
        notes: "",
        repName: "",
        repEmail: "",
        repPhone: "",
        repPosition: "",
        street: "",
        city: "",
        state: "",
        country: ""
    });

    useEffect(() => {
        Promise.all([fetchClients(), fetchMatters()]).then(([allClients, allCases]) => {
            const foundClient = allClients.find((c: any) => c._id === id || c.id === id);
            setClient(foundClient);

            if (foundClient) {
                const clientCases = allCases.filter((m: any) =>
                    m.clientId === foundClient._id ||
                    m.client === foundClient._id ||
                    m.clientId === id
                );
                setCases(clientCases);
            }
        }).catch(err => console.error(err)).finally(() => setLoading(false));
    }, [id]);

    const handleOpenEdit = () => {
        if (!client) return;
        setEditForm({
            type: client.type?.toLowerCase() || "individual",
            firstName: client.firstName || "",
            lastName: client.lastName || "",
            companyName: client.companyName || "",
            email: client.email || "",
            phone: client.phone || "",
            status: client.status || "active",
            notes: client.notes || "",
            repName: client.representative?.name || "",
            repEmail: client.representative?.email || "",
            repPhone: client.representative?.phone || "",
            repPosition: client.representative?.position || "",
            street: client.address?.street || "",
            city: client.address?.city || "",
            state: client.address?.state || "",
            country: client.address?.country || ""
        });
        setSaveError("");
        setIsEditing(true);
    };

    const handleSaveClient = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaveError("");

        try {
            const payload: any = {
                type: editForm.type.toLowerCase(),
                email: editForm.email,
                phone: editForm.phone,
                status: editForm.status,
                notes: editForm.notes,
                address: {
                    street: editForm.street,
                    city: editForm.city,
                    state: editForm.state,
                    country: editForm.country
                }
            };

            if (editForm.type === "corporate") {
                payload.companyName = editForm.companyName;
                payload.representative = {
                    name: editForm.repName,
                    email: editForm.repEmail,
                    phone: editForm.repPhone,
                    position: editForm.repPosition
                };
            } else {
                payload.firstName = editForm.firstName;
                payload.lastName = editForm.lastName;
            }

            const updated = await updateClient(client._id || id, payload);
            if (updated && (updated.error || (updated.statusCode && updated.statusCode >= 400))) {
                throw new Error(updated.message || updated.error || "Failed to update client details");
            }

            setClient({
                ...client,
                ...payload
            });
            setIsEditing(false);
        } catch (err: any) {
            console.error(err);
            setSaveError(err.message || "Failed to update client details");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center text-[var(--muted-foreground)]">Loading Client Dossier...</div>;

    if (!client) return (
        <div className="p-10 text-center text-[var(--foreground)]">
            <h1 className="text-xl font-serif font-bold">Client Not Found</h1>
            <p className="text-[var(--muted-foreground)] text-sm mb-4">The client record might not exist.</p>
            <Link to="/internal/clients" className="text-[var(--primary)] hover:underline">Return to Clients</Link>
        </div>
    );

    const isCorporate = client.type?.toLowerCase() === 'corporate';
    const clientName = isCorporate ? (client.companyName || client.name || "Corporate Client") : `${client.firstName || ''} ${client.lastName || ''}`.trim();

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-10 relative">
            <div className="flex items-center justify-between">
                <Link to="/internal/clients" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:underline text-sm font-medium">← Back to Clients</Link>
                {canEdit && (
                    <button
                        onClick={handleOpenEdit}
                        className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded shadow-sm hover:brightness-110 transition-all flex items-center gap-2"
                    >
                        <span>✏️</span> Edit Client Details
                    </button>
                )}
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm overflow-hidden flex flex-col md:flex-row">
                {/* Profile Header */}
                <div className="bg-[var(--muted)]/50 p-8 md:w-1/3 border-b md:border-b-0 md:border-r border-[var(--border)] flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-blue-100 text-blue-700 flex items-center justify-center rounded-full text-3xl font-serif font-bold mb-4 capitalize">
                        {clientName.charAt(0)}
                    </div>
                    <h2 className="text-2xl font-serif font-semibold text-[var(--foreground)]">{clientName}</h2>
                    <span className="mt-2 text-xs px-2.5 py-1 bg-[var(--secondary)] text-[var(--foreground)] rounded font-mono uppercase tracking-wider">
                        {client.type || 'Individual'}
                    </span>
                    <span className="mt-2 text-xs font-mono text-[var(--muted-foreground)]">ID: {client.clientNumber}</span>
                </div>

                {/* Contact & Meta Data */}
                <div className="p-8 md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Primary Contact</h4>
                        <div className="text-sm text-[var(--foreground)] break-all font-medium">{client.email}</div>
                        <div className="text-sm font-mono text-[var(--muted-foreground)] mt-1">{client.phone || "No phone recorded"}</div>
                    </div>

                    {isCorporate && client.representative && (
                        <div>
                            <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Authorized Representative</h4>
                            <div className="text-sm text-[var(--foreground)] font-medium">{client.representative.name || "N/A"}</div>
                            <div className="text-sm font-mono text-[var(--muted-foreground)] mt-1">{client.representative.position || "N/A"}</div>
                            <div className="text-sm font-mono text-[var(--muted-foreground)]">{client.representative.email || "N/A"}</div>
                            {client.representative.phone && (
                                <div className="text-sm font-mono text-[var(--muted-foreground)]">{client.representative.phone}</div>
                            )}
                        </div>
                    )}

                    <div>
                        <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">System Status</h4>
                        <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${client.status === 'active' ? 'bg-green-500' : client.status === 'suspended' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                            <span className="text-sm uppercase font-medium">{client.status || 'Active'}</span>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Date Onboarded</h4>
                        <div className="text-sm text-[var(--foreground)] font-mono">{client.createdAt ? new Date(client.createdAt).toLocaleDateString() : 'N/A'}</div>
                    </div>

                    {client.address && (client.address.street || client.address.city) && (
                        <div className="md:col-span-2">
                            <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Registered Address</h4>
                            <div className="text-sm text-[var(--foreground)]">
                                {[client.address.street, client.address.city, client.address.state, client.address.country].filter(Boolean).join(", ")}
                            </div>
                        </div>
                    )}

                    {client.notes && (
                        <div className="md:col-span-2">
                            <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Internal Notes</h4>
                            <p className="text-sm text-[var(--muted-foreground)] bg-[var(--muted)]/40 p-3 rounded border border-[var(--border)]">{client.notes}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Client Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[var(--card)] w-full max-w-2xl rounded-xl shadow-2xl p-6 border border-[var(--border)] max-h-[90vh] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
                            <div>
                                <h2 className="text-xl font-serif font-semibold text-[var(--foreground)]">Edit Client Details</h2>
                                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Modify information, contact records, or entity settings for this client.</p>
                            </div>
                            <button onClick={() => setIsEditing(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-2xl font-bold">&times;</button>
                        </div>

                        {saveError && (
                            <div className="p-3 mb-4 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                                <span>⚠️</span>
                                <span>{saveError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSaveClient} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Entity Type</label>
                                    <select
                                        value={editForm.type}
                                        onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                    >
                                        <option value="individual">Individual</option>
                                        <option value="corporate">Corporate</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Status</label>
                                    <select
                                        value={editForm.status}
                                        onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)] capitalize"
                                    >
                                        <option value="active">Active</option>
                                        <option value="suspended">Suspended</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>
                            </div>

                            {editForm.type === 'individual' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">First Name *</label>
                                        <input
                                            required
                                            value={editForm.firstName}
                                            onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Last Name *</label>
                                        <input
                                            required
                                            value={editForm.lastName}
                                            onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Company / Organization Name *</label>
                                    <input
                                        required
                                        value={editForm.companyName}
                                        onChange={e => setEditForm({ ...editForm, companyName: e.target.value })}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Primary Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={editForm.email}
                                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Primary Phone</label>
                                    <input
                                        value={editForm.phone}
                                        onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)] font-mono"
                                    />
                                </div>
                            </div>

                            {editForm.type === 'corporate' && (
                                <div className="p-4 bg-[var(--muted)]/40 rounded border border-[var(--border)] space-y-3">
                                    <h3 className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">Authorized Representative</h3>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Full Name</label>
                                        <input
                                            value={editForm.repName}
                                            onChange={e => setEditForm({ ...editForm, repName: e.target.value })}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Rep Email</label>
                                            <input
                                                type="email"
                                                value={editForm.repEmail}
                                                onChange={e => setEditForm({ ...editForm, repEmail: e.target.value })}
                                                className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Rep Phone</label>
                                            <input
                                                value={editForm.repPhone}
                                                onChange={e => setEditForm({ ...editForm, repPhone: e.target.value })}
                                                className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)] font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Position / Title</label>
                                        <input
                                            value={editForm.repPosition}
                                            onChange={e => setEditForm({ ...editForm, repPosition: e.target.value })}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="p-4 bg-[var(--muted)]/40 rounded border border-[var(--border)] space-y-3">
                                <h3 className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">Address Details</h3>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Street Address</label>
                                    <input
                                        value={editForm.street}
                                        onChange={e => setEditForm({ ...editForm, street: e.target.value })}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">City</label>
                                        <input
                                            value={editForm.city}
                                            onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">State / Region</label>
                                        <input
                                            value={editForm.state}
                                            onChange={e => setEditForm({ ...editForm, state: e.target.value })}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Country</label>
                                        <input
                                            value={editForm.country}
                                            onChange={e => setEditForm({ ...editForm, country: e.target.value })}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Internal Notes</label>
                                <textarea
                                    rows={3}
                                    value={editForm.notes}
                                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)] resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 border border-[var(--border)] text-sm font-medium rounded hover:bg-[var(--muted)] text-[var(--foreground)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded shadow-sm hover:brightness-110 disabled:opacity-50 transition-all"
                                >
                                    {saving ? "Saving Changes..." : "Save Client Details"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Matter/Cases Container */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[var(--border)]">
                    <h3 className="font-serif text-xl font-semibold text-[var(--foreground)]">Associated Case Matters ({cases.length})</h3>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">Legal cases and matters actively assigned to this client record.</p>
                </div>

                {cases.length === 0 ? (
                    <div className="p-10 text-center text-sm text-[var(--muted-foreground)]">
                        No cases currently assigned to this client.
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-0">
                        {cases.map((m: any) => (
                            <Link key={m._id} to={`/internal/matters/${m._id}`} className="block border-b border-r border-[var(--border)] p-6 hover:bg-[var(--muted)]/30 transition">
                                <div className="text-xs font-mono font-medium text-[var(--primary)]">{m.matterNumber}</div>
                                <h4 className="font-medium text-[var(--foreground)] mt-1 line-clamp-1">{m.title}</h4>
                                <div className="mt-4 flex items-center justify-between">
                                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-stone-200 text-stone-700'}`}>
                                        {m.status || 'ACTIVE'}
                                    </span>
                                    <span className="text-xs text-[var(--muted-foreground)] hover:underline">View Workspace →</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
