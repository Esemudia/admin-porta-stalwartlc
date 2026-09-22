import { useState, useEffect } from "react";
import { fetchDocuments, fetchMatters, uploadDocument } from "../../api";
import { getSession } from "../../auth";
import PdfViewer from "../../components/PdfViewer";
import DocxViewer from "../../components/DocxViewer";

export default function Documents() {
    const session = getSession();
    const isLawyer = session?.role === 'lawyer';

    const [searchTerm, setSearchTerm] = useState("");
    const [docsList, setDocsList] = useState<any[]>([]);
    const [mattersList, setMattersList] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadingState, setUploadingState] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [loading, setLoading] = useState(true);

    const [newDoc, setNewDoc] = useState({ name: "", caseId: "", type: "evidence" });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewName, setPreviewName] = useState<string>("");

    useEffect(() => {
        async function load() {
            try {
                const [d, m] = await Promise.all([fetchDocuments(), fetchMatters()]);
                setMattersList(m || []);

                // Defense in depth: if lawyer, verify document belongs to lawyer's assigned cases
                if (isLawyer && m) {
                    const assignedMatterIds = new Set(
                        m.flatMap((matter: any) => [
                            matter._id?.toString(),
                            matter.id?.toString(),
                            matter.matterNumber
                        ]).filter(Boolean)
                    );
                    const scopedDocs = (d || []).filter((doc: any) => {
                        const mid = doc.matterId?.toString();
                        return !mid || assignedMatterIds.has(mid);
                    });
                    setDocsList(scopedDocs);
                } else {
                    setDocsList(d || []);
                }

                if (m && m.length > 0) {
                    setNewDoc(prev => ({ ...prev, caseId: m[0]._id || m[0].id }));
                }
            } catch (err) {
                console.error("Error loading documents or matters:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [isLawyer]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            setUploadError("Please select a physical file to upload.");
            return;
        }
        if (!newDoc.caseId) {
            setUploadError("Please select a valid matter for this document.");
            return;
        }

        setUploadingState(true);
        setUploadError("");

        try {
            await uploadDocument({
                name: newDoc.name,
                documentNumber: `STW-DOC-00${docsList.length + 50}`,
                category: newDoc.type,
                matterId: newDoc.caseId
            }, selectedFile);

            setIsUploading(false);
            setSelectedFile(null);
            setNewDoc(prev => ({ ...prev, name: "" }));

            // Reload documents
            const updatedDocs = await fetchDocuments();
            setDocsList(updatedDocs || []);
        } catch (err: any) {
            console.error("Upload failed:", err);
            setUploadError(err.message || "Failed to upload document to case.");
        } finally {
            setUploadingState(false);
        }
    };

    const getMatterDisplayName = (matterId: string) => {
        if (!matterId) return "N/A";
        const found = mattersList.find(
            m => m._id === matterId || m.id === matterId || m.matterNumber === matterId
        );
        if (found) {
            return `${found.matterNumber || ''} - ${found.title}`;
        }
        return matterId;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="font-serif text-3xl font-semibold text-[var(--foreground)]">Documents</h1>
                        {isLawyer && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Assigned Cases Vault ({docsList.length})
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                        {isLawyer
                            ? "Documents and privileged files from legal matters assigned directly to you."
                            : "Central repository for all firm-wide document versions and legal files."}
                    </p>
                </div>

                <button
                    onClick={() => {
                        setUploadError("");
                        setIsUploading(true);
                    }}
                    className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded shadow-sm hover:brightness-110 transition-all flex items-center justify-center gap-2"
                >
                    <span className="text-lg leading-none">+</span> Upload Document
                </button>
            </div>

            {/* Document Upload Modal */}
            {isUploading && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[var(--card)] w-full max-w-lg rounded-xl shadow-2xl p-6 border border-[var(--border)] relative">
                        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
                            <div>
                                <h2 className="text-lg font-serif font-semibold text-[var(--foreground)]">
                                    Upload Legal Document
                                </h2>
                                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                                    {isLawyer
                                        ? "Attach filings, evidence, or briefs to your assigned matters."
                                        : "Vault documents to practice matters with encrypted integrity."}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsUploading(false)}
                                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-xl font-bold"
                            >
                                &times;
                            </button>
                        </div>

                        {uploadError && (
                            <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                                <span>⚠️</span>
                                <span>{uploadError}</span>
                            </div>
                        )}

                        <form onSubmit={handleUpload} className="space-y-4">
                            <div>
                                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                                    Select File (.pdf, .docx, .doc, images)*
                                </label>
                                <input
                                    required
                                    type="file"
                                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                                    className="w-full text-sm outline-none file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[var(--primary)] file:text-white hover:file:brightness-110 border border-[var(--border)] rounded-md p-1 bg-[var(--background)]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                                    Document Title / Filename*
                                </label>
                                <input
                                    required
                                    value={newDoc.name}
                                    onChange={e => setNewDoc({ ...newDoc, name: e.target.value })}
                                    placeholder="e.g. Affidavit in Support of Motion..."
                                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                                    {isLawyer ? "Target Assigned Case*" : "Target Practice Matter*"}
                                </label>
                                {mattersList.length === 0 ? (
                                    <div className="text-xs text-amber-500 p-2 bg-amber-500/10 border border-amber-500/20 rounded">
                                        No assigned matters found. Documents can only be uploaded to cases assigned to you.
                                    </div>
                                ) : (
                                    <select
                                        required
                                        value={newDoc.caseId}
                                        onChange={e => setNewDoc({ ...newDoc, caseId: e.target.value })}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                    >
                                        {mattersList.map((m: any) => (
                                            <option key={m._id || m.id} value={m._id || m.id}>
                                                {m.matterNumber ? `[${m.matterNumber}] ` : ''}{m.title}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                                    Document Category
                                </label>
                                <select
                                    value={newDoc.type}
                                    onChange={e => setNewDoc({ ...newDoc, type: e.target.value })}
                                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)] capitalize"
                                >
                                    <option value="evidence">Evidence</option>
                                    <option value="pleading">Court Pleading</option>
                                    <option value="brief">Legal Brief</option>
                                    <option value="contract">Agreement / Contract</option>
                                    <option value="correspondence">Official Correspondence</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                                <button
                                    type="button"
                                    onClick={() => setIsUploading(false)}
                                    className="px-4 py-2 border border-[var(--border)] text-sm rounded hover:bg-[var(--muted)] text-[var(--foreground)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploadingState || mattersList.length === 0}
                                    className="px-5 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded shadow-sm hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2"
                                >
                                    {uploadingState ? "Uploading..." : "Upload Document"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] opacity-70">🔍</span>
                    <input
                        type="text"
                        placeholder="Search documents by title, case ID, category, or document number..."
                        className="w-full bg-[var(--card)] border border-[var(--border)] rounded-md pl-10 pr-4 py-2 text-sm outline-none focus:border-[var(--primary)] transition-colors"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Preview Modal */}
            {previewUrl && (
                <div className="fixed inset-0 bg-black/80 z-50 flex flex-col p-4 items-center justify-center backdrop-blur-md">
                    <div className="w-full max-w-5xl h-[85vh] bg-[var(--card)] rounded-lg shadow-2xl overflow-hidden flex flex-col border border-[var(--border)]">
                        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--muted)]/50">
                            <h2 className="font-semibold text-[var(--foreground)] pr-4 truncate font-serif text-lg">Preview: {previewName}</h2>
                            <button
                                onClick={() => { setPreviewUrl(null); setPreviewName(""); }}
                                className="px-4 py-1.5 bg-[var(--primary)] text-white text-sm rounded hover:brightness-110 shadow-sm transition-colors"
                            >
                                Close
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            {previewUrl.toLowerCase().endsWith('.pdf') ? (
                                <PdfViewer fileUrl={previewUrl} />
                            ) : previewUrl.toLowerCase().endsWith('.docx') ? (
                                <DocxViewer fileUrl={previewUrl} />
                            ) : (
                                <div className="p-10 text-center text-[var(--muted-foreground)] font-medium h-full flex flex-col items-center justify-center">
                                    <span className="text-4xl mb-4">📄</span>
                                    Preview not available in this embedded mode.
                                    <div className="mt-4">
                                        <a href={previewUrl} target="_blank" rel="noreferrer" download className="text-[var(--primary)] underline text-sm font-normal">
                                            Download File
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Documents Table */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm overflow-hidden">
                <div className="grid grid-cols-6 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)] bg-[var(--muted)]/50 p-4 border-b border-[var(--border)]">
                    <div className="col-span-2">File Name</div>
                    <div className="col-span-2">Matter Reference</div>
                    <div>Category</div>
                    <div className="text-right">Actions</div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-[var(--muted-foreground)] text-sm">
                        Loading documents vault...
                    </div>
                ) : docsList.length === 0 ? (
                    <div className="p-12 text-center text-[var(--muted-foreground)] text-sm">
                        {isLawyer
                            ? "No documents found for your assigned cases. Use '+ Upload Document' above to add documents to your cases."
                            : "No documents stored in the practice vault."}
                    </div>
                ) : (
                    docsList
                        .filter((d: any) => {
                            const term = searchTerm.toLowerCase();
                            const matterDisplay = getMatterDisplayName(d.matterId).toLowerCase();
                            return (d.name || '').toLowerCase().includes(term) ||
                                (d.matterId || '').toString().toLowerCase().includes(term) ||
                                matterDisplay.includes(term) ||
                                (d.category || '').toLowerCase().includes(term) ||
                                (d.documentNumber || '').toLowerCase().includes(term);
                        })
                        .map((d: any) => (
                            <div key={d._id || d.id} className="grid grid-cols-6 text-sm p-4 border-b border-[var(--border)] items-center hover:bg-[var(--muted)]/30 transition-colors last:border-0">
                                <div className="col-span-2 flex items-center gap-3">
                                    <span className="text-xl">📄</span>
                                    <div>
                                        <div className="font-medium text-[var(--foreground)]">{d.name}</div>
                                        <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] opacity-70">
                                            V.{d.currentVersion || 1} • {d.documentNumber || 'REF-DOC'}
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-2 pr-4">
                                    <div className="font-medium text-xs text-[var(--foreground)] truncate">
                                        {getMatterDisplayName(d.matterId)}
                                    </div>
                                    <div className="text-[10px] font-mono text-[var(--muted-foreground)]">
                                        {d.matterId || "Unlinked"}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs px-2 py-1 bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)] rounded font-mono capitalize">
                                        {d.category || 'evidence'}
                                    </span>
                                </div>
                                <div className="text-right space-x-3 text-xs flex justify-end">
                                    {d.fileUrl ? (
                                        <button
                                            onClick={() => { setPreviewUrl(d.fileUrl); setPreviewName(d.name || d.documentNumber); }}
                                            className="px-4 py-1.5 bg-[var(--primary)] text-white rounded font-medium shadow-sm hover:brightness-110 transition-colors"
                                        >
                                            Preview
                                        </button>
                                    ) : (
                                        <span className="px-3 py-1.5 bg-[var(--muted)] text-[var(--muted-foreground)] rounded font-medium shadow-sm text-xs">No File</span>
                                    )}
                                </div>
                            </div>
                        ))
                )}
            </div>
        </div>
    );
}
