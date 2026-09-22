import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchClients, fetchMatters } from "../../api";

export default function ClientProfile() {
    const { id } = useParams();
    const [client, setClient] = useState<any>(null);
    const [cases, setCases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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
            <div className="flex items-center gap-4">
                <Link to="/internal/clients" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:underline text-sm font-medium">← Back to Clients</Link>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm overflow-hidden flex flex-col md:flex-row">
                {/* Profile Header (Static/Uneditable) */}
                <div className="bg-[var(--muted)]/50 p-8 md:w-1/3 border-b md:border-b-0 md:border-r border-[var(--border)] flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-blue-100 text-blue-700 flex items-center justify-center rounded-full text-3xl font-serif font-bold mb-4 capitalize">
                        {clientName.charAt(0)}
                    </div>
                    <h2 className="text-2xl font-serif font-semibold text-[var(--foreground)]">{clientName}</h2>
                    <span className="mt-2 text-xs px-2 py-1 bg-[var(--secondary)] text-[var(--foreground)] rounded font-mono uppercase tracking-wider">
                        {client.type || 'Individual'}
                    </span>
                    <span className="mt-2 text-xs font-mono text-[var(--muted-foreground)]">ID: {client.clientNumber}</span>
                </div>

                {/* Contact & Meta Data (Read-only) */}
                <div className="p-8 md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Primary Contact</h4>
                        <div className="text-sm text-[var(--foreground)] break-all">{client.email}</div>
                        <div className="text-sm font-mono text-[var(--muted-foreground)] mt-1">{client.phone || "No phone recorded"}</div>
                    </div>

                    {isCorporate && client.representative && (
                        <div>
                            <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Authorized Representative</h4>
                            <div className="text-sm text-[var(--foreground)]">{client.representative.name || "N/A"}</div>
                            <div className="text-sm font-mono text-[var(--muted-foreground)] mt-1">{client.representative.position || "N/A"}</div>
                            <div className="text-sm font-mono text-[var(--muted-foreground)]">{client.representative.email || "N/A"}</div>
                        </div>
                    )}

                    <div>
                        <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">System Status</h4>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${client.status === 'active' ? 'bg-green-500' : 'bg-rose-500'}`}></span>
                            <span className="text-sm uppercase font-medium">{client.status || 'Active'}</span>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Date Onboarded</h4>
                        <div className="text-sm text-[var(--foreground)] font-mono">{new Date(client.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>
            </div>

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
