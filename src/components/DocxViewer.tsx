import { useEffect, useState } from 'react';
import * as mammoth from 'mammoth';

export default function DocxViewer({ fileUrl }: { fileUrl: string }) {
    const [html, setHtml] = useState<string>('<div class="animate-pulse text-center p-12 text-gray-500">Decrypting document offline...</div>');

    useEffect(() => {
        let isMounted = true;
        fetch(fileUrl, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json, text/plain, */*'
            }
        })
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch");
                return res.arrayBuffer();
            })
            .then(buffer => mammoth.convertToHtml({ arrayBuffer: buffer }))
            .then(result => {
                if (isMounted) setHtml(result.value || '<div class="text-center p-12 text-gray-500">Document is empty or cannot be parsed.</div>');
            })
            .catch(err => {
                console.error(err);
                if (isMounted) setHtml('<div class="text-center p-12 text-red-500 font-bold">Failed to decrypt DOCX file offline. The file may be restricted or corrupted.</div>');
            });

        return () => { isMounted = false };
    }, [fileUrl]);

    return (
        <div className="w-full h-full bg-white overflow-y-auto">
            <div
                className="max-w-4xl mx-auto p-12 prose prose-slate"
                dangerouslySetInnerHTML={{ __html: html }}
                style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '1em',
                    lineHeight: '1.6',
                    color: 'black'
                }}
            />
        </div>
    );
}
