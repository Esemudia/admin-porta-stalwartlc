import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PdfViewer({ fileUrl }: { fileUrl: string }) {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

    useEffect(() => {
        if (!fileUrl) return;
        fetch(fileUrl, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json, text/plain, */*'
            }
        })
            .then(res => res.blob())
            .then(blob => setPdfBlob(blob))
            .catch(console.error);
    }, [fileUrl]);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setPageNumber(1);
    }

    if (!pdfBlob) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-full bg-stone-900 border border-stone-700">
                <div className="p-20 text-stone-400 font-medium text-center animate-pulse">Decrypting PDF Stream Securely...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center w-full h-full bg-stone-900 overflow-y-auto shadow-2xl relative border border-stone-700">
            <div className="flex items-center gap-4 bg-stone-800 text-white w-full px-6 py-3 sticky top-0 z-10 shadow-md justify-between">
                <div>
                    <h3 className="font-semibold text-sm tracking-wide">Secure PDF Viewer</h3>
                </div>
                {numPages && (
                    <div className="flex items-center gap-4">
                        <button
                            disabled={pageNumber <= 1}
                            onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                            className="h-8 px-4 flex items-center justify-center bg-stone-700 hover:bg-stone-600 rounded-md disabled:opacity-50 transition-colors shadow-sm"
                        >← Prev</button>
                        <span className="text-sm font-mono font-medium px-2">Page {pageNumber} of {numPages}</span>
                        <button
                            disabled={pageNumber >= numPages}
                            onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
                            className="h-8 px-4 flex items-center justify-center bg-stone-700 hover:bg-stone-600 rounded-md disabled:opacity-50 transition-colors shadow-sm"
                        >
                            Next →
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-4 mb-4 w-full max-w-5xl mx-auto overflow-auto shadow-2xl ring-1 ring-white/10 relative bg-stone-800 h-[75vh]">
                <Document
                    file={pdfBlob}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="flex flex-col items-center justify-center min-w-max min-h-full bg-stone-300 rounded p-4"
                    loading={<div className="p-20 text-stone-600 font-medium text-center animate-pulse">Decrypting PDF Stream...</div>}
                    error={<div className="p-20 text-red-600 font-bold bg-white text-center rounded">Failed to load encrypted PDF file.</div>}
                >
                    <Page
                        pageNumber={pageNumber}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        className="shadow-lg"
                        scale={1.2}
                    />
                </Document>
            </div>
        </div>
    );
}
