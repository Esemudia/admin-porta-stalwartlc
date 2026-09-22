import { useState, useEffect } from "react";
import { fetchMatters } from "../../api";

export default function Archive() {
    const [matters, setMatters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMatters()
            .then(data => setMatters(data.filter((m: any) => m.status === 'closed')))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-10">
            <div>
                <h1 className="font-serif text-3xl font-semibold text-[var(--foreground)]">Digital Cold Archive</h1>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">Immutable storage for officially closed legal matters.</p>
            </div>
            {loading ? <p className="text-[var(--muted-foreground)] p-5">Decrypting vault metadata...</p> : (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm overflow-hidden">
                    {matters.length === 0 ? (
                        <div className="p-12 text-center border-t border-[var(--border)]">
                            <div className="text-5xl mb-4 opacity-50">🗄️</div>
                            <p className="text-[var(--muted-foreground)] text-sm">No matters have been permanently closed yet.</p>
                        </div>
                    ) : matters.map(m => (
                        <div key={m._id} className="p-5 flex items-center justify-between border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/20 transition-colors">
                            <div>
                                <div className="font-mono text-xs text-[var(--muted-foreground)] mb-1">Matter Reference: {m._id.slice(0, 8).toUpperCase()}</div>
                                <h3 className="font-serif font-semibold text-lg text-[var(--foreground)]">{m.title || m.matterNumber}</h3>
                            </div>
                            <span className="px-3 py-1 bg-[var(--muted)] border border-[var(--border)] text-[var(--muted-foreground)] text-xs font-mono rounded shadow-sm">
                                SEALED & CLOSED
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
