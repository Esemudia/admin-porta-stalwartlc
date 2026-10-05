import { useState, useEffect, useMemo, useRef } from "react";
import {
    fetchCommunications,
    sendEmailCommunication,
    receiveEmailCommunication,
    fetchServerConfig,
    verifyDomainMx,
    toggleStarCommunication,
    markCommunicationAsRead,
    deleteCommunication,
    fetchChatChannels,
    fetchChatMessages,
    sendChatMessage,
    fetchMatters,
    fetchClients,
    fetchDocuments,
    fetchUsers
} from "../../api";
import { getSession } from "../../auth";

interface AttachmentItem {
    name: string;
    size?: string;
    type?: string;
    url?: string;
}

interface MessageItem {
    _id: string;
    id?: string;
    subject: string;
    from: string;
    senderName?: string;
    to: string;
    recipientName?: string;
    cc?: string[];
    bcc?: string[];
    body: string;
    direction: "inbound" | "outbound";
    status: "received" | "sent" | "draft";
    matterId?: any;
    matterTitle?: string;
    clientId?: any;
    clientName?: string;
    attachments?: AttachmentItem[];
    isStarred?: boolean;
    isRead?: boolean;
    mxServer?: string;
    messageId?: string;
    sentAt?: string;
    receivedAt?: string;
    createdAt?: string;
}

export default function Communications() {
    const [messages, setMessages] = useState<MessageItem[]>([]);
    const [matters, setMatters] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Navigation & Folder Tab
    const [activeFolder, setActiveFolder] = useState<"inbox" | "sent" | "attachments" | "starred" | "mx-config" | "chat">("chat");
    const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMatterFilter, setSelectedMatterFilter] = useState("all");

    // ─── Real-Time WebSocket Chat State ───
    const [chatRooms, setChatRooms] = useState<any[]>([
        { id: 'chambers-general', name: 'chambers-general', label: 'Chambers General', description: 'Firm-wide operational briefing, general counsel updates, and official notices.', type: 'public', icon: '🏛️' },
        { id: 'litigation-strategy', name: 'litigation-strategy', label: 'Litigation & Court Practice', description: 'Urgent appellate pleadings, high court trial prep, motions, and evidence review.', type: 'practice', icon: '⚖️' },
        { id: 'corporate-advisory', name: 'corporate-advisory', label: 'Corporate & Commercial Advisory', description: 'Cross-border M&A transactions, regulatory CAC compliance, and escrow closings.', type: 'practice', icon: '📑' },
        { id: 'urgent-filings', name: 'urgent-filings', label: 'Registry & Expedited Filings', description: 'Time-sensitive court registry filings, sheriff execution, and e-service.', type: 'urgent', icon: '🚨' }
    ]);
    const [activeRoomId, setActiveRoomId] = useState<string>("chambers-general");
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatInputText, setChatInputText] = useState("");
    const [chatAttachments, setChatAttachments] = useState<AttachmentItem[]>([]);
    const [wsStatus, setWsStatus] = useState<"connected" | "connecting" | "offline">("connecting");
    const [roomOnlineCount, setRoomOnlineCount] = useState<number>(1);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [isVaultPickerOpen, setIsVaultPickerOpen] = useState(false);
    const [vaultSearchTerm, setVaultSearchTerm] = useState("");
    const [chatSending, setChatSending] = useState(false);
    const [unreadByRoom, setUnreadByRoom] = useState<Record<string, number>>({});
    const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
    const [channelSearch, setChannelSearch] = useState("");

    const wsRef = useRef<WebSocket | null>(null);
    const chatScrollRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const typingTimeoutRef = useRef<any>(null);

    // Modals
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [isSimulateReceiveOpen, setIsSimulateReceiveOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
    const showToast = (text: string, type: "success" | "error" = "success") => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Server MX Configuration state
    const [serverConfig, setServerConfig] = useState<any>(null);
    const [mxDomainInput, setMxDomainInput] = useState("stalwartlc.com");
    const [mxAuditResult, setMxAuditResult] = useState<any>(null);
    const [auditingMx, setAuditingMx] = useState(false);

    // Dynamic resolution of practitioner from real database
    const currentUser = useMemo(() => {
        const session = getSession();
        if (!session) return null;
        const matched = (users || []).find(u =>
            (u._id && (u._id === session.userId || u._id.toString() === session.userId)) ||
            (u.email && session.email && u.email.toLowerCase() === session.email.toLowerCase())
        );
        return {
            id: matched?._id || session.userId || '',
            name: matched ? `${matched.firstName} ${matched.lastName}`.trim() : (session.name || 'Counsel'),
            role: matched?.role || session.role || 'super_admin',
            avatarUrl: matched?.avatarUrl || session.avatarUrl || '',
            email: matched?.email || session.email || 'counsel@stalwartlc.com',
            department: matched?.department || 'Chambers Practice',
            title: matched?.title || 'Legal Practitioner'
        };
    }, [users]);

    // Compose Form state
    const [composeForm, setComposeForm] = useState({
        to: "",
        recipientName: "",
        from: "counsel@stalwartlc.com",
        senderName: "Counsel (Stalwart Law Consult)",
        cc: "",
        subject: "",
        body: "",
        matterId: "",
        matterTitle: "",
        clientId: "",
        clientName: "",
        attachments: [] as AttachmentItem[]
    });

    useEffect(() => {
        if (currentUser?.email) {
            setComposeForm(prev => ({
                ...prev,
                from: currentUser.email,
                senderName: `${currentUser.name} (Stalwart Law Consult)`
            }));
        }
    }, [currentUser]);

    // Simulate Inbound Form state
    const [receiveForm, setReceiveForm] = useState({
        from: "registry@courts.gov.ng",
        senderName: "High Court Registry of Lagos State",
        to: "litigation@stalwartlc.com",
        subject: "Hearing Notice & Cause List: Suit No. LD/3819/2026",
        body: "Counsel,\n\nPlease find attached the authenticated cause list and hearing notice for the interlocutory injunction application.\n\nCourt sits promptly at 09:00 AM.",
        matterTitle: "",
        clientName: "",
        attachments: [
            {
                name: "Court_Cause_List_Notice_2026.pdf",
                size: "1.8 MB",
                type: "application/pdf",
                url: "#"
            }
        ] as AttachmentItem[]
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [msgs, mtrs, clnts, docs, usrs, srvCfg] = await Promise.all([
                fetchCommunications().catch(() => []),
                fetchMatters().catch(() => []),
                fetchClients().catch(() => []),
                fetchDocuments().catch(() => []),
                fetchUsers().catch(() => []),
                fetchServerConfig().catch(() => null)
            ]);
            setMessages(msgs || []);
            setMatters(mtrs || []);
            setClients(clnts || []);
            setDocuments(docs || []);
            setUsers(usrs || []);
            setServerConfig(srvCfg);

            // Select first message if none selected
            if (!selectedMessage && msgs && msgs.length > 0) {
                setSelectedMessage(msgs[0]);
            }
        } catch (err) {
            console.error("Failed to load communications", err);
            showToast("Failed to load communications ledger", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // ─── Real-Time Chat Channels & Room Setup ───
    const combinedChatChannels = useMemo(() => {
        const baseChannels = [...chatRooms];
        const matterChannels = (matters || []).map(m => ({
            id: `matter-${m._id || m.id}`,
            name: `matter-${(m.title || 'matter').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 22)}`,
            label: m.title,
            description: `Case Brief: ${m.clientName || 'Confidential Client'} • Status: ${m.status || 'Active'}`,
            type: 'matter',
            icon: '📁',
            matterId: m._id || m.id,
            matterTitle: m.title
        }));
        const practitionerChannels = (users || []).filter(u => u.role !== 'client').map(u => ({
            id: `dm-${u._id || u.id}`,
            name: `counsel-${(u.firstName || 'counsel').toLowerCase()}`,
            label: `${u.firstName} ${u.lastName}`.trim(),
            description: `Direct Consultation • ${u.title || u.role || 'Chambers'} (${u.department || 'Chambers'})`,
            type: 'direct',
            icon: '👤',
            counselId: u._id || u.id,
            counselUser: u
        }));
        return [...baseChannels, ...matterChannels, ...practitionerChannels];
    }, [chatRooms, matters, users]);

    const currentRoom = useMemo(() => {
        return combinedChatChannels.find(c => c.id === activeRoomId) || combinedChatChannels[0] || {
            id: 'chambers-general',
            label: 'Chambers General',
            description: 'Firm-wide operational briefing, general counsel updates, and official notices.'
        };
    }, [combinedChatChannels, activeRoomId]);

    // Initial chat history and channels loader
    useEffect(() => {
        fetchChatChannels()
            .then(res => {
                if (Array.isArray(res) && res.length > 0) {
                    setChatRooms(res);
                }
            })
            .catch(() => {});

        fetchChatMessages(activeRoomId)
            .then(res => {
                if (Array.isArray(res)) setChatMessages(res);
            })
            .catch(() => {});
    }, []);

    // WebSocket lifecycle connection
    useEffect(() => {
        let isMounted = true;
        let reconnectTimer: any = null;

        const connect = () => {
            if (!isMounted) return;
            try {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                // Connect via port 3000 where NestJS WebSocketServer is running
                const wsUrl = `${protocol}//${window.location.hostname}:3000/ws/chat`;
                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;
                setWsStatus("connecting");

                ws.onopen = () => {
                    if (!isMounted) return;
                    setWsStatus("connected");
                    ws.send(JSON.stringify({
                        type: 'join_room',
                        roomId: activeRoomId,
                        user: {
                            id: currentUser?.id,
                            name: currentUser?.name || 'Counsel',
                            role: currentUser?.role || 'super_admin',
                            avatarUrl: currentUser?.avatarUrl || ''
                        }
                    }));
                };

                ws.onmessage = (event) => {
                    if (!isMounted) return;
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'room_history') {
                            if (data.roomId === activeRoomId) {
                                setChatMessages(data.messages || []);
                            }
                        } else if (data.type === 'new_message') {
                            if (data.roomId === activeRoomId) {
                                setChatMessages(prev => {
                                    const msgId = data.message._id || data.message.id;
                                    if (prev.some(m => (m._id || m.id) === msgId)) return prev;
                                    return [...prev, data.message];
                                });
                            } else {
                                setUnreadByRoom(prev => ({
                                    ...prev,
                                    [data.roomId]: (prev[data.roomId] || 0) + 1
                                }));
                            }
                        } else if (data.type === 'room_joined') {
                            if (data.activeCount !== undefined) {
                                setRoomOnlineCount(data.activeCount);
                            }
                        } else if (data.type === 'user_joined' || data.type === 'user_left') {
                            if (data.activeCount !== undefined) {
                                setRoomOnlineCount(data.activeCount);
                            }
                        } else if (data.type === 'user_typing') {
                            if (data.roomId === activeRoomId && data.userName) {
                                setTypingUsers(prev => Array.from(new Set([...prev, data.userName])));
                                setTimeout(() => {
                                    if (isMounted) {
                                        setTypingUsers(prev => prev.filter(u => u !== data.userName));
                                    }
                                }, 2500);
                            }
                        }
                    } catch (e) {
                        console.error('WS parse error', e);
                    }
                };

                ws.onclose = () => {
                    if (!isMounted) return;
                    setWsStatus("offline");
                    reconnectTimer = setTimeout(connect, 3500);
                };

                ws.onerror = () => {
                    if (!isMounted) return;
                    setWsStatus("offline");
                    ws.close();
                };
            } catch (err) {
                setWsStatus("offline");
                reconnectTimer = setTimeout(connect, 4000);
            }
        };

        connect();

        return () => {
            isMounted = false;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            if (wsRef.current) wsRef.current.close();
        };
    }, [currentUser]);

    // Switch active chat room
    const handleSwitchRoom = (roomId: string) => {
        setActiveRoomId(roomId);
        setUnreadByRoom(prev => ({ ...prev, [roomId]: 0 }));
        setTypingUsers([]);

        // Load messages immediately from REST to avoid blank screen
        fetchChatMessages(roomId)
            .then(res => {
                if (Array.isArray(res)) setChatMessages(res);
            })
            .catch(() => {});

        // Join room over WS
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'join_room',
                roomId,
                user: {
                    id: currentUser?.id,
                    name: currentUser?.name || 'Counsel',
                    role: currentUser?.role || 'super_admin',
                    avatarUrl: currentUser?.avatarUrl || ''
                }
            }));
        }
    };

    // Auto-scroll chat to bottom
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [chatMessages, typingUsers]);

    // Handle typing in chat
    const handleChatInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setChatInputText(e.target.value);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            if (!typingTimeoutRef.current) {
                wsRef.current.send(JSON.stringify({
                    type: 'typing',
                    roomId: activeRoomId,
                    user: { name: currentUser?.name || 'Counsel' }
                }));
                typingTimeoutRef.current = setTimeout(() => {
                    typingTimeoutRef.current = null;
                }, 2000);
            }
        }
    };

    // Handle chat file attachment
    const handleChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result as string;
                const sizeFormatted = file.size > 1024 * 1024
                    ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                    : `${Math.round(file.size / 1024)} KB`;

                setChatAttachments(prev => [
                    ...prev,
                    {
                        name: file.name,
                        size: sizeFormatted,
                        type: file.type || 'application/octet-stream',
                        url: dataUrl
                    }
                ]);
                showToast(`Attached "${file.name}" (${sizeFormatted})`, "success");
            };
            reader.readAsDataURL(file);
        });

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRemoveChatAttachment = (index: number) => {
        setChatAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleAttachFromVaultToChat = (doc: any) => {
        if (chatAttachments.some(a => a.name === doc.name)) {
            showToast("Document is already attached to this draft", "error");
            return;
        }
        const item: AttachmentItem = {
            name: doc.name || "Vault_Legal_Document.pdf",
            size: "2.4 MB",
            type: doc.name?.endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
            url: doc.fileUrl || "#"
        };
        setChatAttachments(prev => [...prev, item]);
        setIsVaultPickerOpen(false);
        showToast(`Attached "${item.name}" from legal vault.`, "success");
    };

    // Send chat message
    const handleSendChatMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const text = chatInputText.trim();
        if (!text && chatAttachments.length === 0) return;

        setChatSending(true);
        const sender = {
            id: currentUser?.id,
            name: currentUser?.name || 'Counsel',
            role: currentUser?.role || 'super_admin',
            avatarUrl: currentUser?.avatarUrl || '',
            email: currentUser?.email || 'counsel@stalwartlc.com'
        };

        const activeChannelObj = combinedChatChannels.find(c => c.id === activeRoomId);

        const payload = {
            type: 'send_message',
            roomId: activeRoomId,
            text,
            attachments: chatAttachments,
            sender,
            matterId: activeChannelObj?.matterId,
            matterTitle: activeChannelObj?.matterTitle
        };

        try {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify(payload));
            } else {
                const saved = await sendChatMessage(payload);
                setChatMessages(prev => [...prev, saved]);
            }
            setChatInputText("");
            setChatAttachments([]);
        } catch (err: any) {
            showToast(err.message || 'Failed to dispatch chat message', 'error');
        } finally {
            setChatSending(false);
        }
    };

    // Filter messages based on active folder and search term
    const filteredMessages = useMemo(() => {
        return messages.filter(m => {
            // Folder filter
            if (activeFolder === "inbox" && m.direction !== "inbound") return false;
            if (activeFolder === "sent" && m.direction !== "outbound") return false;
            if (activeFolder === "starred" && !m.isStarred) return false;
            if (activeFolder === "attachments" && (!m.attachments || m.attachments.length === 0)) return false;

            // Matter filter
            if (selectedMatterFilter !== "all" && m.matterTitle !== selectedMatterFilter) return false;

            // Search filter
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const subjMatch = (m.subject || "").toLowerCase().includes(term);
                const fromMatch = (m.from || "").toLowerCase().includes(term);
                const toMatch = (m.to || "").toLowerCase().includes(term);
                const bodyMatch = (m.body || "").toLowerCase().includes(term);
                const matterMatch = (m.matterTitle || "").toLowerCase().includes(term);
                const attachMatch = (m.attachments || []).some(a => (a.name || "").toLowerCase().includes(term));
                if (!subjMatch && !fromMatch && !toMatch && !bodyMatch && !matterMatch && !attachMatch) {
                    return false;
                }
            }
            return true;
        });
    }, [messages, activeFolder, selectedMatterFilter, searchTerm]);

    // Counters for folders
    const counts = useMemo(() => {
        const inboxCount = messages.filter(m => m.direction === "inbound").length;
        const unreadCount = messages.filter(m => m.direction === "inbound" && !m.isRead).length;
        const sentCount = messages.filter(m => m.direction === "outbound").length;
        const attachmentCount = messages.filter(m => m.attachments && m.attachments.length > 0).length;
        const starredCount = messages.filter(m => m.isStarred).length;
        return { inboxCount, unreadCount, sentCount, attachmentCount, starredCount };
    }, [messages]);

    // Handle selecting a message
    const handleSelectMessage = async (msg: MessageItem) => {
        setSelectedMessage(msg);
        if (!msg.isRead) {
            try {
                await markCommunicationAsRead(msg._id);
                setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, isRead: true } : m));
            } catch (err) {
                console.error(err);
            }
        }
    };

    // Toggle Star
    const handleToggleStar = async (msg: MessageItem, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await toggleStarCommunication(msg._id);
            setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, isStarred: !m.isStarred } : m));
            if (selectedMessage?._id === msg._id) {
                setSelectedMessage(prev => prev ? { ...prev, isStarred: !prev.isStarred } : null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Delete message
    const handleDeleteMessage = async (msgId: string) => {
        if (!window.confirm("Delete this email communication?")) return;
        try {
            await deleteCommunication(msgId);
            showToast("Message deleted", "success");
            setMessages(prev => prev.filter(m => m._id !== msgId));
            if (selectedMessage?._id === msgId) {
                const remaining = messages.filter(m => m._id !== msgId);
                setSelectedMessage(remaining[0] || null);
            }
        } catch (err) {
            showToast("Failed to delete message", "error");
        }
    };

    // Handle File Attachment in Compose
    const handleAttachLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newAttachments: AttachmentItem[] = Array.from(files).map(f => {
            const sizeMb = (f.size / (1024 * 1024)).toFixed(1);
            return {
                name: f.name,
                size: `${sizeMb} MB`,
                type: f.type || "application/octet-stream",
                url: URL.createObjectURL(f)
            };
        });

        setComposeForm(prev => ({
            ...prev,
            attachments: [...prev.attachments, ...newAttachments]
        }));
        showToast(`${newAttachments.length} file(s) attached.`, "success");
    };

    // Attach from Vault
    const handleAttachFromVault = (doc: any) => {
        if (composeForm.attachments.some(a => a.name === doc.name)) {
            showToast("Document is already attached", "error");
            return;
        }
        const item: AttachmentItem = {
            name: doc.name || "Vault_Document.pdf",
            size: "2.4 MB",
            type: doc.name?.endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
            url: doc.fileUrl || "#"
        };
        setComposeForm(prev => ({
            ...prev,
            attachments: [...prev.attachments, item]
        }));
        showToast(`Attached "${item.name}" from vault.`, "success");
    };

    // Remove attachment
    const handleRemoveAttachment = (idx: number) => {
        setComposeForm(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== idx)
        }));
    };

    // Send Outbound Email
    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!composeForm.to.trim() || !composeForm.subject.trim()) {
            showToast("Recipient email and subject are required", "error");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                ...composeForm,
                cc: composeForm.cc ? composeForm.cc.split(",").map(c => c.trim()).filter(Boolean) : []
            };
            const dispatched = await sendEmailCommunication(payload);
            showToast(`Email dispatched via mail.stalwartlc.com to ${payload.to}`, "success");
            setIsComposeOpen(false);
            setComposeForm({
                to: "",
                recipientName: "",
                from: "counsel@stalwartlc.com",
                senderName: "Babatunde Adeleke, SAN (Stalwart Law Consult)",
                cc: "",
                subject: "",
                body: "",
                matterId: "",
                matterTitle: "",
                clientId: "",
                clientName: "",
                attachments: []
            });
            await loadData();
            setSelectedMessage(dispatched);
        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Failed to send email", "error");
        } finally {
            setSubmitting(false);
        }
    };

    // Simulate Receive Inbound Email
    const handleReceiveEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const ingested = await receiveEmailCommunication(receiveForm);
            showToast(`Inbound message received via MX server from ${receiveForm.from}`, "success");
            setIsSimulateReceiveOpen(false);
            await loadData();
            setSelectedMessage(ingested);
        } catch (err: any) {
            console.error(err);
            showToast("Failed to receive message", "error");
        } finally {
            setSubmitting(false);
        }
    };

    // Run MX Records Audit
    const handleRunMxAudit = async () => {
        setAuditingMx(true);
        try {
            const result = await verifyDomainMx(mxDomainInput.trim() || "stalwartlc.com");
            setMxAuditResult(result);
            showToast("MX records DNS query completed successfully.", "success");
        } catch (err: any) {
            console.error(err);
            showToast("Failed to verify MX records", "error");
        } finally {
            setAuditingMx(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
            {/* Toast Notification */}
            {toast && (
                <div
                    className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-2xl text-sm font-medium transition-all duration-300 flex items-center gap-3 ${
                        toast.type === "success"
                            ? "bg-[#0A192F] text-[#D5AA6D] border border-[#D5AA6D]/40"
                            : "bg-red-900 text-white border border-red-700"
                    }`}
                >
                    <span>{toast.type === "success" ? "✉️" : "⚠️"}</span>
                    <span>{toast.text}</span>
                </div>
            )}

            {/* Header Ribbon */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">✉️</span>
                        <h1 className="font-serif text-3xl font-semibold text-[var(--foreground)] tracking-tight">
                            Legal Communications & Email Exchange
                        </h1>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1 flex items-center gap-2">
                        <span>Secure transmission of court filings, client advisories, and certified evidence.</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            MX: mail.stalwartlc.com
                        </span>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={() => setIsSimulateReceiveOpen(true)}
                        className="px-3.5 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-xs font-medium rounded-md shadow-sm hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all flex items-center gap-1.5"
                        title="Simulate or ingest an incoming email via MX records"
                    >
                        <span>📥</span> Receive Email
                    </button>
                    <button
                        onClick={() => setActiveFolder("mx-config")}
                        className="px-3.5 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-xs font-medium rounded-md shadow-sm hover:bg-[var(--muted)] transition-all flex items-center gap-1.5"
                        title="Configure and audit server MX records"
                    >
                        <span>⚙️</span> Server & MX Records
                    </button>
                    <button
                        onClick={() => setIsComposeOpen(true)}
                        className="px-4 py-2 bg-[var(--primary)] text-white text-xs font-semibold rounded-md shadow-md hover:bg-[#0d223f] border border-[var(--accent)]/30 transition-all flex items-center gap-2"
                    >
                        <span className="text-[var(--accent)]">+</span> Compose Email
                    </button>
                </div>
            </div>

            {/* Folder Tabs / Metrics Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--card)] border border-[var(--border)] p-2 rounded-lg shadow-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        onClick={() => setActiveFolder("inbox")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                            activeFolder === "inbox"
                                ? "bg-[var(--primary)] text-white font-semibold shadow-sm"
                                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                    >
                        <span>📥 Inbox</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeFolder === "inbox" ? "bg-[var(--accent)] text-[#0A192F]" : "bg-[var(--muted)] text-[var(--foreground)]"}`}>
                            {counts.inboxCount}
                        </span>
                        {counts.unreadCount > 0 && (
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveFolder("sent")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                            activeFolder === "sent"
                                ? "bg-[var(--primary)] text-white font-semibold shadow-sm"
                                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                    >
                        <span>📤 Sent via MX</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--muted)] text-[var(--foreground)]">
                            {counts.sentCount}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveFolder("attachments")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                            activeFolder === "attachments"
                                ? "bg-[var(--primary)] text-white font-semibold shadow-sm"
                                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                    >
                        <span>📎 With Attachments</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--muted)] text-[var(--foreground)]">
                            {counts.attachmentCount}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveFolder("starred")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                            activeFolder === "starred"
                                ? "bg-[var(--primary)] text-white font-semibold shadow-sm"
                                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                    >
                        <span>⭐ Starred</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--muted)] text-[var(--foreground)]">
                            {counts.starredCount}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveFolder("mx-config")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                            activeFolder === "mx-config"
                                ? "bg-[var(--primary)] text-white font-semibold shadow-sm"
                                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                    >
                        <span>⚙️ MX Server Setup</span>
                    </button>

                    <button
                        onClick={() => setActiveFolder("chat")}
                        className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 shadow-sm ${
                            activeFolder === "chat"
                                ? "bg-[var(--accent)] text-[#0A192F] font-bold shadow-md ring-2 ring-[var(--accent)]/40"
                                : "bg-[var(--muted)]/50 text-[var(--foreground)] hover:bg-[var(--muted)] border border-[var(--border)]"
                        }`}
                    >
                        <span>💬 Live Chambers Chat</span>
                        <span className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-green-500 animate-pulse' : wsStatus === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'}`}></span>
                            <span className="text-[10px] font-mono">{wsStatus === 'connected' ? 'LIVE' : wsStatus.toUpperCase()}</span>
                        </span>
                        {Object.values(unreadByRoom).reduce((a, b) => a + b, 0) > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-bold animate-bounce">
                                {Object.values(unreadByRoom).reduce((a, b) => a + b, 0)}
                            </span>
                        )}
                    </button>
                </div>

                {activeFolder !== "mx-config" && activeFolder !== "chat" && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)]">🔍</span>
                            <input
                                type="text"
                                placeholder="Search sender, subject, files..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-7 pr-3 py-1 text-xs bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                            />
                        </div>

                        <select
                            value={selectedMatterFilter}
                            onChange={(e) => setSelectedMatterFilter(e.target.value)}
                            className="px-2 py-1 text-xs bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                        >
                            <option value="all">All Matters</option>
                            {matters.map(m => (
                                <option key={m._id || m.id} value={m.title}>{m.title}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* VIEW: SERVER MX RECORDS CONFIGURATION & DNS AUDIT                         */}
            {/* ========================================================================= */}
            {activeFolder === "mx-config" && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-gradient-to-r from-[#0A192F] to-[#172A45] text-white rounded-xl p-6 border border-[var(--accent)]/40 shadow-md">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest bg-[var(--accent)] text-[#0A192F] font-bold rounded">
                                        Active Mail Cluster
                                    </span>
                                    <span className="text-xs text-white/70">RFC 5321 Standard</span>
                                </div>
                                <h2 className="text-xl font-serif font-bold text-white">
                                    Server MX (Mail Exchange) Records Infrastructure
                                </h2>
                                <p className="text-xs text-white/80 max-w-xl leading-relaxed">
                                    All outbound client letters, court attachments, and legal notices are signed with RSA-2048 DKIM keys and dispatched through Stalwart's dedicated MX cluster (<code className="text-[var(--accent)] bg-black/30 px-1 py-0.5 rounded">mail.stalwartlc.com</code>).
                                </p>
                            </div>

                            <div className="flex items-center gap-2 bg-black/30 p-3 rounded-lg border border-white/10 shrink-0">
                                <input
                                    type="text"
                                    value={mxDomainInput}
                                    onChange={(e) => setMxDomainInput(e.target.value)}
                                    placeholder="e.g. stalwartlc.com"
                                    className="px-3 py-2 text-xs font-mono bg-black/50 border border-white/20 rounded text-white focus:outline-none focus:border-[var(--accent)]"
                                />
                                <button
                                    onClick={handleRunMxAudit}
                                    disabled={auditingMx}
                                    className="px-4 py-2 bg-[var(--accent)] text-[#0A192F] text-xs font-bold rounded hover:bg-white transition-all disabled:opacity-50"
                                >
                                    {auditingMx ? "Auditing DNS..." : "Test DNS MX"}
                                </button>
                            </div>
                        </div>

                        {/* Live Audit Result */}
                        {mxAuditResult && (
                            <div className="mt-4 p-4 rounded-lg bg-black/50 border border-[var(--accent)]/50 text-xs font-mono">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[var(--accent)] font-bold">DNS MX Resolution Result for {mxAuditResult.domain}:</span>
                                    <span className="text-[10px] text-white/50">{mxAuditResult.timestamp}</span>
                                </div>
                                <div className="space-y-1">
                                    {mxAuditResult.records?.map((r: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-4 text-white/90">
                                            <span className="text-green-400 font-bold">✓ Priority {r.priority}</span>
                                            <span>Exchange Host: <strong>{r.exchange}</strong></span>
                                        </div>
                                    ))}
                                </div>
                                {mxAuditResult.notice && (
                                    <div className="text-[11px] text-[var(--accent)] mt-2 italic">
                                        ℹ️ {mxAuditResult.notice}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Server Routing Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* MX Records */}
                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5 shadow-sm space-y-3">
                            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                                <h3 className="font-serif font-semibold text-sm text-[var(--foreground)]">MX DNS Routing</h3>
                                <span className="text-xs text-green-600 font-semibold">● Operational</span>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="p-2 bg-[var(--muted)]/50 rounded border border-[var(--border)] flex justify-between items-center">
                                    <div>
                                        <div className="font-mono font-bold text-[var(--foreground)]">mail.stalwartlc.com</div>
                                        <div className="text-[10px] text-[var(--muted-foreground)]">Primary MX • Priority 10</div>
                                    </div>
                                    <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-bold">Active</span>
                                </div>
                                <div className="p-2 bg-[var(--muted)]/50 rounded border border-[var(--border)] flex justify-between items-center">
                                    <div>
                                        <div className="font-mono font-bold text-[var(--foreground)]">mx2.stalwartlc.com</div>
                                        <div className="text-[10px] text-[var(--muted-foreground)]">Secondary Backup • Priority 20</div>
                                    </div>
                                    <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-bold">Active</span>
                                </div>
                            </div>
                        </div>

                        {/* Outbound & Inbound Protocols */}
                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5 shadow-sm space-y-3">
                            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                                <h3 className="font-serif font-semibold text-sm text-[var(--foreground)]">Protocols & Encryption</h3>
                                <span className="text-xs text-green-600 font-semibold">● Encrypted</span>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between items-center p-2 rounded bg-[var(--muted)]/50 border border-[var(--border)]">
                                    <span className="font-semibold text-[var(--foreground)]">SMTP Outbound</span>
                                    <span className="font-mono text-[11px] text-[var(--muted-foreground)]">smtp.stalwartlc.com:587 (TLS)</span>
                                </div>
                                <div className="flex justify-between items-center p-2 rounded bg-[var(--muted)]/50 border border-[var(--border)]">
                                    <span className="font-semibold text-[var(--foreground)]">IMAP Inbound</span>
                                    <span className="font-mono text-[11px] text-[var(--muted-foreground)]">imap.stalwartlc.com:993 (SSL)</span>
                                </div>
                            </div>
                        </div>

                        {/* Domain Anti-Spoofing */}
                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5 shadow-sm space-y-3">
                            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                                <h3 className="font-serif font-semibold text-sm text-[var(--foreground)]">Authentication Policies</h3>
                                <span className="text-xs text-green-600 font-semibold">● Protected</span>
                            </div>
                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--muted-foreground)]">SPF Policy:</span>
                                    <span className="font-mono text-green-700 font-bold text-[11px]">Pass (Strict)</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--muted-foreground)]">DKIM Signature:</span>
                                    <span className="font-mono text-green-700 font-bold text-[11px]">RSA-2048 Active</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--muted-foreground)]">DMARC Policy:</span>
                                    <span className="font-mono text-green-700 font-bold text-[11px]">p=quarantine (100%)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW: TWO-PANE EMAIL CLIENT (INBOX, SENT, ATTACHMENTS, STARRED)           */}
            {/* ========================================================================= */}
            {activeFolder !== "mx-config" && activeFolder !== "chat" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[620px]">
                    {/* Left Pane: Email List (5 cols) */}
                    <div className="lg:col-span-5 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm flex flex-col overflow-hidden max-h-[720px]">
                        <div className="p-3 bg-[var(--muted)]/40 border-b border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted-foreground)] font-semibold uppercase tracking-wider">
                            <span>{filteredMessages.length} Conversations</span>
                            <span>{activeFolder.toUpperCase()}</span>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center text-xs text-[var(--muted-foreground)] flex flex-col items-center gap-2">
                                <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
                                <span>Loading messages...</span>
                            </div>
                        ) : filteredMessages.length === 0 ? (
                            <div className="p-12 text-center text-xs text-[var(--muted-foreground)]">
                                No messages in {activeFolder}.
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
                                {filteredMessages.map((msg) => {
                                    const isSelected = selectedMessage?._id === msg._id;
                                    const hasAttachments = msg.attachments && msg.attachments.length > 0;

                                    return (
                                        <div
                                            key={msg._id}
                                            onClick={() => handleSelectMessage(msg)}
                                            className={`p-3.5 cursor-pointer transition-all ${
                                                isSelected
                                                    ? "bg-[var(--primary)]/10 border-l-4 border-l-[var(--primary)]"
                                                    : !msg.isRead && msg.direction === "inbound"
                                                    ? "bg-[var(--card)] font-semibold border-l-4 border-l-blue-500"
                                                    : "hover:bg-[var(--muted)]/30"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2 truncate pr-2">
                                                    <button
                                                        onClick={(e) => handleToggleStar(msg, e)}
                                                        className={`text-xs ${msg.isStarred ? "text-amber-500" : "text-[var(--muted-foreground)] hover:text-amber-500"}`}
                                                    >
                                                        {msg.isStarred ? "★" : "☆"}
                                                    </button>
                                                    <span className="text-xs text-[var(--foreground)] truncate">
                                                        {msg.direction === "inbound" ? msg.senderName || msg.from : `To: ${msg.recipientName || msg.to}`}
                                                    </span>
                                                </div>

                                                <span className="text-[10px] text-[var(--muted-foreground)] whitespace-nowrap">
                                                    {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "Today"}
                                                </span>
                                            </div>

                                            <div className="text-xs text-[var(--foreground)] truncate font-medium mb-1">
                                                {msg.subject || "Untitled Correspondence"}
                                            </div>

                                            <div className="text-[11px] text-[var(--muted-foreground)] line-clamp-1 mb-2">
                                                {msg.body || "No preview text"}
                                            </div>

                                            <div className="flex items-center justify-between text-[10px]">
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                                        msg.direction === "inbound"
                                                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                            : "bg-green-50 text-green-700 border border-green-200"
                                                    }`}>
                                                        {msg.direction === "inbound" ? "INBOUND" : "OUTBOUND"}
                                                    </span>

                                                    {msg.matterTitle && (
                                                        <span className="px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)] truncate max-w-[140px]">
                                                            {msg.matterTitle}
                                                        </span>
                                                    )}
                                                </div>

                                                {hasAttachments && (
                                                    <span className="flex items-center gap-1 text-[var(--accent)] font-semibold">
                                                        <span>📎</span>
                                                        <span>{msg.attachments!.length}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right Pane: Message Inspector (7 cols) */}
                    <div className="lg:col-span-7 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm flex flex-col overflow-hidden max-h-[720px]">
                        {selectedMessage ? (
                            <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
                                {/* Header / Toolbar */}
                                <div className="p-4 border-b border-[var(--border)] bg-[var(--muted)]/20 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => handleToggleStar(selectedMessage, e)}
                                            className={`text-base ${selectedMessage.isStarred ? "text-amber-500" : "text-[var(--muted-foreground)] hover:text-amber-500"}`}
                                            title="Star message"
                                        >
                                            {selectedMessage.isStarred ? "★" : "☆"}
                                        </button>
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                            selectedMessage.direction === "inbound"
                                                ? "bg-blue-100 text-blue-800"
                                                : "bg-green-100 text-green-800"
                                        }`}>
                                            {selectedMessage.direction === "inbound" ? "RECEIVED VIA MX" : "DISPATCHED VIA SMTP"}
                                        </span>
                                        <span className="text-[11px] text-[var(--muted-foreground)] font-mono">
                                            {selectedMessage.mxServer || "mail.stalwartlc.com"}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setComposeForm({
                                                    to: selectedMessage.direction === "inbound" ? selectedMessage.from : selectedMessage.to,
                                                    recipientName: selectedMessage.senderName || selectedMessage.from,
                                                    from: "counsel@stalwartlc.com",
                                                    senderName: "Babatunde Adeleke, SAN",
                                                    cc: "",
                                                    subject: `Re: ${selectedMessage.subject}`,
                                                    body: `\n\n--- On ${new Date(selectedMessage.createdAt || Date.now()).toLocaleString()}, ${selectedMessage.senderName || selectedMessage.from} wrote:\n> ${selectedMessage.body.replace(/\n/g, "\n> ")}`,
                                                    matterId: selectedMessage.matterId || "",
                                                    matterTitle: selectedMessage.matterTitle || "",
                                                    clientId: selectedMessage.clientId || "",
                                                    clientName: selectedMessage.clientName || "",
                                                    attachments: []
                                                });
                                                setIsComposeOpen(true);
                                            }}
                                            className="px-2.5 py-1 text-xs border border-[var(--border)] rounded hover:bg-[var(--muted)] flex items-center gap-1"
                                        >
                                            <span>↩️</span> Reply
                                        </button>
                                        <button
                                            onClick={() => handleDeleteMessage(selectedMessage._id)}
                                            className="px-2.5 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50"
                                            title="Delete message"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>

                                {/* Message Header Info */}
                                <div className="p-5 border-b border-[var(--border)] space-y-3 bg-[var(--background)]">
                                    <h2 className="text-lg font-serif font-bold text-[var(--foreground)]">
                                        {selectedMessage.subject}
                                    </h2>

                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-[var(--foreground)]">From:</span>
                                                <span className="text-[var(--foreground)]">{selectedMessage.senderName || selectedMessage.from}</span>
                                                <span className="text-[var(--muted-foreground)] font-mono">&lt;{selectedMessage.from}&gt;</span>
                                            </div>
                                            <span className="text-[var(--muted-foreground)]">
                                                {selectedMessage.createdAt ? new Date(selectedMessage.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "Recent"}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-[var(--foreground)]">To:</span>
                                            <span className="text-[var(--foreground)]">{selectedMessage.recipientName || selectedMessage.to}</span>
                                            <span className="text-[var(--muted-foreground)] font-mono">&lt;{selectedMessage.to}&gt;</span>
                                        </div>

                                        {selectedMessage.cc && selectedMessage.cc.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-[var(--foreground)]">CC:</span>
                                                <span className="text-[var(--muted-foreground)] font-mono">{selectedMessage.cc.join(", ")}</span>
                                            </div>
                                        )}

                                        {selectedMessage.matterTitle && (
                                            <div className="flex items-center gap-2 pt-1">
                                                <span className="font-semibold text-[var(--foreground)]">Matter:</span>
                                                <span className="px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--foreground)] font-medium">
                                                    ⚖️ {selectedMessage.matterTitle}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-5 flex-1 overflow-y-auto whitespace-pre-wrap font-sans text-xs text-[var(--foreground)] leading-relaxed bg-[var(--card)]">
                                    {selectedMessage.body}
                                </div>

                                {/* Attachments Drawer */}
                                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                                    <div className="p-4 border-t border-[var(--border)] bg-[var(--muted)]/20 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                                                <span>📎</span> Attached Files ({selectedMessage.attachments.length})
                                            </span>
                                            <span className="text-[10px] text-[var(--muted-foreground)]">
                                                Court evidence & execution instruments
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {selectedMessage.attachments.map((att, idx) => (
                                                <div
                                                    key={idx}
                                                    className="p-2.5 rounded border border-[var(--border)] bg-[var(--card)] flex items-center justify-between gap-2 shadow-sm"
                                                >
                                                    <div className="flex items-center gap-2 truncate">
                                                        <div className="w-8 h-8 rounded bg-red-100 text-red-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                                            {att.name.endsWith(".pdf") ? "PDF" : att.name.endsWith(".docx") ? "DOC" : "FILE"}
                                                        </div>
                                                        <div className="truncate">
                                                            <div className="font-medium text-xs text-[var(--foreground)] truncate" title={att.name}>
                                                                {att.name}
                                                            </div>
                                                            <div className="text-[10px] text-[var(--muted-foreground)]">
                                                                {att.size || "1.5 MB"}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <a
                                                        href={att.url || "#"}
                                                        download={att.name}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="px-2 py-1 bg-[var(--primary)] text-white text-[10px] font-semibold rounded hover:bg-[#0d223f] shrink-0"
                                                    >
                                                        Download
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-[var(--muted-foreground)] text-xs">
                                <div className="text-4xl mb-3">✉️</div>
                                <span>Select a message to view full headers, content, and attachments.</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW: REAL-TIME CHAMBERS CHAT (WEBSOCKET & ATTACHMENTS)                   */}
            {/* ========================================================================= */}
            {activeFolder === "chat" && (
                <div className="space-y-4 animate-fade-in">
                    {/* Live Network Banner */}
                    <div className="bg-gradient-to-r from-[#0A192F] via-[#112240] to-[#1E3A5F] text-white rounded-xl p-4 border border-[var(--accent)]/30 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/20 border border-[var(--accent)] flex items-center justify-center text-xl shrink-0">
                                💬
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="font-serif text-lg font-bold text-white tracking-wide">
                                        Chambers Real-Time Counsel Stream
                                    </h2>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent)] text-[#0A192F]">
                                        RFC 6455
                                    </span>
                                </div>
                                <p className="text-xs text-white/75 mt-0.5">
                                    Instantaneous bi-directional counsel messaging, pleadings coordination, and document sharing over persistent WebSockets.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                            <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-right">
                                <div className="flex items-center gap-1.5 justify-end">
                                    <span className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-green-400 animate-pulse' : wsStatus === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'}`}></span>
                                    <span className="font-mono text-[11px] font-bold text-white uppercase">
                                        {wsStatus === 'connected' ? 'WebSocket Live' : wsStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                                    </span>
                                </div>
                                <div className="text-[10px] text-white/60">
                                    {roomOnlineCount} Counsel Active
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    fetchChatMessages(activeRoomId).then(res => {
                                        if (Array.isArray(res)) setChatMessages(res);
                                        showToast("Chat stream refreshed from database", "success");
                                    });
                                }}
                                className="px-3 py-1.5 bg-[var(--accent)] hover:bg-white text-[#0A192F] font-bold text-xs rounded-md shadow transition-all flex items-center gap-1.5"
                                title="Reload latest chat messages from database"
                            >
                                <span>🔄</span> Refresh Stream
                            </button>
                        </div>
                    </div>

                    {/* Chat Workspace (Sidebar + Stream) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[640px]">
                        {/* ─── Left Sidebar: Channels & Matters (4 cols) ─── */}
                        <div className="lg:col-span-4 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm flex flex-col overflow-hidden max-h-[740px]">
                            {/* Search channels */}
                            <div className="p-3 border-b border-[var(--border)] bg-[var(--muted)]/30">
                                <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)]">🔍</span>
                                    <input
                                        type="text"
                                        placeholder="Filter channels & matters..."
                                        value={channelSearch}
                                        onChange={(e) => setChannelSearch(e.target.value)}
                                        className="w-full pl-7 pr-3 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                                    />
                                </div>
                            </div>

                            {/* Channel List */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-4 divide-y divide-[var(--border)]/50">
                                {/* Section 1: Firm Channels */}
                                <div className="space-y-1 pt-1">
                                    <div className="px-2 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center justify-between">
                                        <span>Practice Chambers</span>
                                        <span>{chatRooms.length}</span>
                                    </div>

                                    {chatRooms
                                        .filter(ch => !channelSearch.trim() || ch.label.toLowerCase().includes(channelSearch.toLowerCase()) || ch.name.toLowerCase().includes(channelSearch.toLowerCase()))
                                        .map(ch => {
                                            const isActive = activeRoomId === ch.id;
                                            const unread = unreadByRoom[ch.id] || 0;

                                            return (
                                                <button
                                                    key={ch.id}
                                                    onClick={() => handleSwitchRoom(ch.id)}
                                                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-start gap-2.5 ${
                                                        isActive
                                                            ? "bg-[var(--primary)] text-white font-medium shadow-sm border border-[var(--accent)]/40"
                                                            : "text-[var(--foreground)] hover:bg-[var(--muted)]/50"
                                                    }`}
                                                >
                                                    <span className="text-base shrink-0 mt-0.5">{ch.icon || '💬'}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-semibold truncate">
                                                                #{ch.name || ch.id}
                                                            </span>
                                                            {unread > 0 && (
                                                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-bold animate-pulse">
                                                                    {unread}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className={`text-[11px] truncate mt-0.5 ${isActive ? "text-white/80" : "text-[var(--muted-foreground)]"}`}>
                                                            {ch.description}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                </div>

                                {/* Section 2: Active Matters Collaboration Streams */}
                                <div className="space-y-1 pt-3">
                                    <div className="px-2 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center justify-between">
                                        <span>Matter Streams</span>
                                        <span>{matters.length}</span>
                                    </div>

                                    {matters.length === 0 ? (
                                        <div className="px-3 py-2 text-xs text-[var(--muted-foreground)] italic">
                                            No active legal matters loaded.
                                        </div>
                                    ) : (
                                        matters
                                            .filter(m => !channelSearch.trim() || (m.title || '').toLowerCase().includes(channelSearch.toLowerCase()) || (m.clientName || '').toLowerCase().includes(channelSearch.toLowerCase()))
                                            .slice(0, 12)
                                            .map(m => {
                                                const roomId = `matter-${m._id || m.id}`;
                                                const isActive = activeRoomId === roomId;
                                                const unread = unreadByRoom[roomId] || 0;

                                                return (
                                                    <button
                                                        key={roomId}
                                                        onClick={() => handleSwitchRoom(roomId)}
                                                        className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-start gap-2.5 ${
                                                            isActive
                                                                ? "bg-[var(--primary)] text-white font-medium shadow-sm border border-[var(--accent)]/40"
                                                                : "text-[var(--foreground)] hover:bg-[var(--muted)]/50"
                                                        }`}
                                                    >
                                                        <span className="text-base shrink-0 mt-0.5">📁</span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-semibold truncate" title={m.title}>
                                                                    {m.title}
                                                                </span>
                                                                {unread > 0 && (
                                                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-bold">
                                                                        {unread}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className={`text-[10px] truncate mt-0.5 ${isActive ? "text-white/80" : "text-[var(--muted-foreground)]"}`}>
                                                                Client: {m.clientName || 'Confidential'} • {m.status || 'Active'}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })
                                    )}
                                </div>

                                {/* Section 3: Chambers Counsel Directory (Real DB Users) */}
                                <div className="space-y-1 pt-3">
                                    <div className="px-2 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center justify-between">
                                        <span>Chambers Counsel</span>
                                        <span>{users.filter(u => u.role !== 'client').length}</span>
                                    </div>

                                    {users.filter(u => u.role !== 'client').length === 0 ? (
                                        <div className="px-3 py-2 text-xs text-[var(--muted-foreground)] italic">
                                            Loading counsel directory...
                                        </div>
                                    ) : (
                                        users
                                            .filter(u => u.role !== 'client')
                                            .filter(u => !channelSearch.trim() || `${u.firstName} ${u.lastName}`.toLowerCase().includes(channelSearch.toLowerCase()) || (u.department || '').toLowerCase().includes(channelSearch.toLowerCase()))
                                            .map(u => {
                                                const roomId = `dm-${u._id || u.id}`;
                                                const isActive = activeRoomId === roomId;
                                                const unread = unreadByRoom[roomId] || 0;
                                                const isSelf = currentUser?.id && (u._id === currentUser.id || u._id?.toString() === currentUser.id);

                                                return (
                                                    <button
                                                        key={roomId}
                                                        onClick={() => handleSwitchRoom(roomId)}
                                                        className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-center gap-2.5 ${
                                                            isActive
                                                                ? "bg-[var(--primary)] text-white font-medium shadow-sm border border-[var(--accent)]/40"
                                                                : "text-[var(--foreground)] hover:bg-[var(--muted)]/50"
                                                        }`}
                                                    >
                                                        {u.avatarUrl ? (
                                                            <img
                                                                src={u.avatarUrl}
                                                                alt={`${u.firstName} ${u.lastName}`}
                                                                className="w-7 h-7 rounded-full object-cover border border-[var(--border)] shrink-0"
                                                            />
                                                        ) : (
                                                            <div className="w-7 h-7 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                                                                {(u.firstName || 'C').charAt(0).toUpperCase()}
                                                            </div>
                                                        )}

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-semibold truncate">
                                                                    {u.firstName} {u.lastName} {isSelf && <span className="opacity-70 text-[10px]">(You)</span>}
                                                                </span>
                                                                {unread > 0 && (
                                                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-bold">
                                                                        {unread}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className={`text-[10px] truncate ${isActive ? "text-white/80" : "text-[var(--muted-foreground)]"}`}>
                                                                {u.title || u.role} • {u.department || 'Chambers'}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })
                                    )}
                                </div>
                            </div>

                            {/* Real-Time Status Footer */}
                            <div className="p-3 bg-[var(--muted)]/30 border-t border-[var(--border)] text-[11px] text-[var(--muted-foreground)] space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                                        <span className="font-mono">{wsStatus === 'connected' ? 'WSS Socket Open' : 'Connecting...'}</span>
                                    </span>
                                    <span className="font-mono text-[10px] text-[var(--accent)]">:3000/ws/chat</span>
                                </div>
                                <div className="text-[10px] text-[var(--muted-foreground)]/80 flex items-center justify-between">
                                    <span>Encrypted with SHA-256 Ledger</span>
                                    <span>MongoDB Sync</span>
                                </div>
                            </div>
                        </div>

                        {/* ─── Right Pane: Message Feed & Chat Composer (8 cols) ─── */}
                        <div className="lg:col-span-8 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm flex flex-col overflow-hidden max-h-[740px]">
                            {/* Room Header */}
                            <div className="p-3.5 border-b border-[var(--border)] bg-[var(--muted)]/20 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-serif font-bold text-sm text-[var(--foreground)] truncate">
                                            #{currentRoom.name || currentRoom.label}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200">
                                            {currentRoom.type === 'matter' ? 'Case Collaboration' : currentRoom.type === 'direct' ? 'Direct Counsel Stream' : 'Firm Channel'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">
                                        {currentRoom.description}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-[11px] font-medium font-mono">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                        <span>{roomOnlineCount} Counsel Online</span>
                                    </span>
                                </div>
                            </div>

                            {/* Message Stream */}
                            <div
                                ref={chatScrollRef}
                                className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--background)]/40 min-h-[380px]"
                            >
                                {chatMessages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-[var(--muted-foreground)] space-y-3">
                                        <div className="w-12 h-12 rounded-full bg-[var(--muted)] flex items-center justify-center text-2xl">
                                            💬
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-semibold text-[var(--foreground)]">No messages in #{currentRoom.name || currentRoom.label} yet.</p>
                                            <p>Send an expedited brief, draft motion, or dispatch an attachment to initiate discussion.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setIsVaultPickerOpen(true)}
                                                className="px-3 py-1.5 border border-[var(--border)] rounded text-[11px] font-medium hover:bg-[var(--muted)] transition-all flex items-center gap-1"
                                            >
                                                <span>🏛️</span> Attach Vault Document
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    chatMessages.map((msg, idx) => {
                                        const session = getSession();
                                        const isMe = msg.senderName === session?.name || msg.senderRole === session?.role;
                                        const role = msg.senderRole || 'staff';
                                        const roleBadgeColor =
                                            role === 'super_admin' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                                            role === 'partner' ? 'bg-purple-100 text-purple-900 border-purple-300' :
                                            role === 'lawyer' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                                            'bg-gray-100 text-gray-800 border-gray-300';

                                        const roleLabel =
                                            role === 'super_admin' ? 'SAN / Managing Partner' :
                                            role === 'partner' ? 'Partner' :
                                            role === 'lawyer' ? 'Counsel' :
                                            role === 'exec_secretary' ? 'Registrar' :
                                            'Legal Staff';

                                        const hasAttachments = Array.isArray(msg.attachments) && msg.attachments.length > 0;
                                        const timeStr = msg.createdAt
                                            ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                        return (
                                            <div
                                                key={msg._id || msg.id || idx}
                                                className={`flex items-start gap-3 animate-fade-in ${isMe ? 'flex-row-reverse' : ''}`}
                                            >
                                                {/* Avatar / Initials */}
                                                <div className="shrink-0">
                                                    {msg.senderAvatar ? (
                                                        <img
                                                            src={msg.senderAvatar}
                                                            alt={msg.senderName}
                                                            className="w-8 h-8 rounded-full object-cover border border-[var(--border)] shadow-sm"
                                                        />
                                                    ) : (
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                                                            isMe ? 'bg-[#0A192F]' : 'bg-[#1E3A5F]'
                                                        }`}>
                                                            {(msg.senderName || 'C').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Message Content Container */}
                                                <div className={`max-w-[78%] space-y-1.5 ${isMe ? 'items-end text-right' : 'items-start text-left'}`}>
                                                    {/* Sender info line */}
                                                    <div className={`flex items-center gap-2 text-[11px] ${isMe ? 'flex-row-reverse' : ''}`}>
                                                        <span className="font-bold text-[var(--foreground)]">
                                                            {msg.senderName || 'Counsel'}
                                                        </span>
                                                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border ${roleBadgeColor}`}>
                                                            {roleLabel}
                                                        </span>
                                                        <span className="text-[10px] text-[var(--muted-foreground)] font-mono">
                                                            {timeStr}
                                                        </span>
                                                    </div>

                                                    {/* Message Bubble */}
                                                    <div className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm space-y-2.5 ${
                                                        isMe
                                                            ? 'bg-[var(--primary)] text-white rounded-tr-none border border-[var(--accent)]/30'
                                                            : 'bg-[var(--card)] text-[var(--foreground)] rounded-tl-none border border-[var(--border)]'
                                                    }`}>
                                                        {msg.body && (
                                                            <div className="whitespace-pre-wrap break-words">
                                                                {msg.body}
                                                            </div>
                                                        )}

                                                        {/* Attachments inside message bubble */}
                                                        {hasAttachments && (
                                                            <div className="space-y-2 pt-1 border-t border-white/20">
                                                                {msg.attachments.map((att: AttachmentItem, attIdx: number) => {
                                                                    const isImage = att.type?.startsWith('image/') ||
                                                                        /\.(jpg|jpeg|png|gif|webp)$/i.test(att.name) ||
                                                                        (typeof att.url === 'string' && att.url.startsWith('data:image/'));

                                                                    if (isImage) {
                                                                        return (
                                                                            <div
                                                                                key={attIdx}
                                                                                className="rounded-lg overflow-hidden border border-black/10 bg-black/5 p-1 max-w-[280px]"
                                                                            >
                                                                                <img
                                                                                    src={att.url}
                                                                                    alt={att.name}
                                                                                    onClick={() => setPreviewImageModal(att.url || null)}
                                                                                    className="max-h-48 w-full object-cover rounded cursor-zoom-in hover:opacity-90 transition-opacity"
                                                                                />
                                                                                <div className="p-1 flex items-center justify-between text-[10px]">
                                                                                    <span className="truncate pr-2 font-medium">{att.name}</span>
                                                                                    <a
                                                                                        href={att.url}
                                                                                        download={att.name}
                                                                                        className={`underline font-bold ${isMe ? 'text-[var(--accent)]' : 'text-blue-600'}`}
                                                                                    >
                                                                                        Save
                                                                                    </a>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }

                                                                    // PDF / Word Document card
                                                                    return (
                                                                        <div
                                                                            key={attIdx}
                                                                            className={`p-2 rounded-lg flex items-center justify-between gap-3 text-xs border ${
                                                                                isMe
                                                                                    ? 'bg-black/30 border-white/20 text-white'
                                                                                    : 'bg-[var(--muted)]/60 border-[var(--border)] text-[var(--foreground)]'
                                                                            }`}
                                                                        >
                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                <span className="text-xl shrink-0">
                                                                                    {att.name.endsWith('.pdf') ? '📄' : att.name.endsWith('.doc') || att.name.endsWith('.docx') ? '📝' : '📎'}
                                                                                </span>
                                                                                <div className="min-w-0">
                                                                                    <div className="font-semibold truncate max-w-[180px] sm:max-w-[240px]" title={att.name}>
                                                                                        {att.name}
                                                                                    </div>
                                                                                    <div className="text-[10px] opacity-75 font-mono">
                                                                                        {att.size || 'Document Attachment'}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <a
                                                                                href={att.url || '#'}
                                                                                download={att.name}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className={`px-2.5 py-1 rounded text-[10px] font-bold shrink-0 transition-all ${
                                                                                    isMe
                                                                                        ? 'bg-[var(--accent)] text-[#0A192F] hover:bg-white'
                                                                                        : 'bg-[var(--primary)] text-white hover:bg-[#0d223f]'
                                                                                }`}
                                                                            >
                                                                                Download
                                                                            </a>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Typing Notification */}
                            {typingUsers.length > 0 && (
                                <div className="px-4 py-1.5 bg-[var(--muted)]/40 border-t border-[var(--border)] text-[11px] text-[var(--muted-foreground)] flex items-center gap-2 italic">
                                    <span className="flex gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:0.2s]"></span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:0.4s]"></span>
                                    </span>
                                    <span>{typingUsers.join(', ')} is typing legal memo...</span>
                                </div>
                            )}

                            {/* Staged Draft Attachments Strip */}
                            {chatAttachments.length > 0 && (
                                <div className="p-2.5 bg-[var(--muted)]/60 border-t border-[var(--border)] flex flex-wrap gap-2">
                                    <span className="text-[11px] font-semibold text-[var(--foreground)] self-center mr-1">
                                        Staged Files ({chatAttachments.length}):
                                    </span>
                                    {chatAttachments.map((att, idx) => (
                                        <div
                                            key={idx}
                                            className="px-2.5 py-1 rounded-md bg-[var(--card)] border border-[var(--border)] text-xs flex items-center gap-2 shadow-sm"
                                        >
                                            <span>{att.name.endsWith('.pdf') ? '📄' : att.type?.startsWith('image/') ? '🖼️' : '📎'}</span>
                                            <span className="font-medium truncate max-w-[140px]">{att.name}</span>
                                            <span className="text-[10px] text-[var(--muted-foreground)] font-mono">{att.size}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveChatAttachment(idx)}
                                                className="text-[var(--muted-foreground)] hover:text-red-500 font-bold ml-1"
                                                title="Remove attachment"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Chat Composer Input Console */}
                            <div className="p-3 bg-[var(--card)] border-t border-[var(--border)] space-y-2">
                                {/* Attachment Trigger Buttons */}
                                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                                    <div className="flex items-center gap-2">
                                        {/* Hidden file input */}
                                        <input
                                            type="file"
                                            multiple
                                            ref={fileInputRef}
                                            onChange={handleChatFileUpload}
                                            className="hidden"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-2.5 py-1 border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)] text-[var(--foreground)] rounded-md font-medium flex items-center gap-1.5 transition-all text-xs"
                                            title="Attach PDF, Word doc, image, or scan"
                                        >
                                            <span>📎</span> Attach Files
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setIsVaultPickerOpen(true)}
                                            className="px-2.5 py-1 border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)] text-[var(--foreground)] rounded-md font-medium flex items-center gap-1.5 transition-all text-xs"
                                            title="Attach an existing document from the firm's vault"
                                        >
                                            <span>🏛️</span> Vault Documents
                                        </button>
                                    </div>

                                    <div className="text-[11px] text-[var(--muted-foreground)] hidden sm:block">
                                        Press <kbd className="px-1 py-0.5 rounded bg-[var(--muted)] border border-[var(--border)] font-mono text-[10px]">Enter</kbd> to send • <kbd className="px-1 py-0.5 rounded bg-[var(--muted)] border border-[var(--border)] font-mono text-[10px]">Shift+Enter</kbd> for newline
                                    </div>
                                </div>

                                {/* Text Input & Send */}
                                <form onSubmit={handleSendChatMessage} className="flex items-end gap-2">
                                    <div className="relative flex-1">
                                        <textarea
                                            rows={2}
                                            value={chatInputText}
                                            onChange={handleChatInputChange}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendChatMessage();
                                                }
                                            }}
                                            placeholder={`Type a legal brief or inquiry in #${currentRoom.name || currentRoom.label}...`}
                                            className="w-full px-3 py-2 text-xs bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] resize-none font-sans"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={chatSending || (!chatInputText.trim() && chatAttachments.length === 0)}
                                        className="px-4 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-lg shadow hover:bg-[#0d223f] border border-[var(--accent)]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                                    >
                                        <span>{chatSending ? 'Sending...' : 'Send'}</span>
                                        <span>➔</span>
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL: COMPOSE OUTBOUND EMAIL WITH ATTACHMENTS                             */}
            {/* ========================================================================= */}
            {isComposeOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                            <div>
                                <h3 className="text-base font-serif font-bold text-[var(--foreground)] flex items-center gap-2">
                                    <span>✉️</span> Compose Outbound Legal Email
                                </h3>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                    Dispatched via <code className="text-[var(--accent)] font-mono">mail.stalwartlc.com</code> with cryptographic DKIM signature.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsComposeOpen(false)}
                                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSendEmail} className="space-y-3.5 text-xs">
                            {/* To and Quick Client Picker */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="font-semibold text-[var(--foreground)]">
                                        Recipient Email (To) <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        onChange={(e) => {
                                            const cl = clients.find(c => (c._id || c.id) === e.target.value);
                                            if (cl) {
                                                setComposeForm({
                                                    ...composeForm,
                                                    to: cl.email || "",
                                                    recipientName: cl.companyName || cl.fullName || `${cl.firstName || ""} ${cl.lastName || ""}`.trim(),
                                                    clientId: cl._id || cl.id,
                                                    clientName: cl.companyName || cl.fullName || `${cl.firstName || ""} ${cl.lastName || ""}`.trim()
                                                });
                                            }
                                        }}
                                        className="text-[11px] bg-transparent text-[var(--accent)] border-none cursor-pointer underline"
                                    >
                                        <option value="">Insert from Client Directory...</option>
                                        {clients.map(c => (
                                            <option key={c._id || c.id} value={c._id || c.id}>
                                                {c.companyName || c.fullName || `${c.firstName || ""} ${c.lastName || ""}`.trim()} ({c.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <input
                                    type="email"
                                    required
                                    placeholder="e.g. client@acmecorp.com or registrar@courts.gov.ng"
                                    value={composeForm.to}
                                    onChange={(e) => setComposeForm({ ...composeForm, to: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                                />
                            </div>

                            {/* CC & Matter */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-[var(--foreground)] mb-1">
                                        CC (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="counsel@stalwartlc.com, partner@..."
                                        value={composeForm.cc}
                                        onChange={(e) => setComposeForm({ ...composeForm, cc: e.target.value })}
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-[var(--foreground)] mb-1">
                                        Associate Case / Matter
                                    </label>
                                    <select
                                        value={composeForm.matterId}
                                        onChange={(e) => {
                                            const m = matters.find(item => (item._id || item.id) === e.target.value);
                                            setComposeForm({
                                                ...composeForm,
                                                matterId: e.target.value,
                                                matterTitle: m?.title || ""
                                            });
                                        }}
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                    >
                                        <option value="">-- No Matter Association --</option>
                                        {matters.map(m => (
                                            <option key={m._id || m.id} value={m._id || m.id}>{m.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Subject Line <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Legal Opinion & Execution Draft: Originating Motion"
                                    value={composeForm.subject}
                                    onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                                />
                            </div>

                            {/* Body */}
                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Message Body
                                </label>
                                <textarea
                                    rows={6}
                                    placeholder="Dear Counsel,\n\nFurther to our conference today..."
                                    value={composeForm.body}
                                    onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none font-sans leading-relaxed"
                                />
                            </div>

                            {/* Attachments Section */}
                            <div className="p-3.5 bg-[var(--muted)]/40 rounded-lg border border-[var(--border)] space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <span className="font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                                        <span>📎</span> Attach Documents ({composeForm.attachments.length})
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {/* Local file input */}
                                        <label className="px-2.5 py-1 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded cursor-pointer hover:bg-[var(--muted)] text-[11px] font-medium">
                                            <span>📁 Browse Device</span>
                                            <input
                                                type="file"
                                                multiple
                                                onChange={handleAttachLocalFile}
                                                className="hidden"
                                            />
                                        </label>

                                        {/* Vault selector */}
                                        {documents.length > 0 && (
                                            <select
                                                onChange={(e) => {
                                                    const doc = documents.find(d => (d._id || d.id) === e.target.value);
                                                    if (doc) handleAttachFromVault(doc);
                                                    e.target.value = "";
                                                }}
                                                className="px-2.5 py-1 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded text-[11px]"
                                            >
                                                <option value="">+ From Document Vault...</option>
                                                {documents.map(d => (
                                                    <option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>

                                {/* Attached Pills */}
                                {composeForm.attachments.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {composeForm.attachments.map((att, idx) => (
                                            <div
                                                key={idx}
                                                className="px-2.5 py-1 bg-[var(--card)] border border-[var(--border)] rounded-md flex items-center gap-2 text-[11px] shadow-sm"
                                            >
                                                <span>📄</span>
                                                <span className="font-medium text-[var(--foreground)] max-w-[200px] truncate">{att.name}</span>
                                                <span className="text-[10px] text-[var(--muted-foreground)]">({att.size || "1.2 MB"})</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveAttachment(idx)}
                                                    className="text-[var(--muted-foreground)] hover:text-red-500 font-bold ml-1"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-[11px] text-[var(--muted-foreground)] italic">
                                        No files attached. Click "Browse Device" or choose from "Document Vault" to attach court filings or agreements.
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                                <span className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1">
                                    <span>🔒</span> Signed via RSA-2048 DKIM & TLS 1.3
                                </span>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsComposeOpen(false)}
                                        className="px-3.5 py-2 border border-[var(--border)] rounded-md hover:bg-[var(--muted)] font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-4 py-2 bg-[var(--primary)] text-white font-bold rounded-md hover:bg-[#0d223f] border border-[var(--accent)]/40 transition-all flex items-center gap-1.5"
                                    >
                                        {submitting ? "Dispatching..." : "Send Email via Server"}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL: RECEIVE INBOUND EMAIL (MX SERVER SIMULATOR / INGEST)              */}
            {/* ========================================================================= */}
            {isSimulateReceiveOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                            <div>
                                <h3 className="text-base font-serif font-bold text-[var(--foreground)] flex items-center gap-2">
                                    <span>📥</span> Ingest Inbound Email via MX Server
                                </h3>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                    Simulate incoming email arriving on <code className="text-[var(--accent)]">mail.stalwartlc.com</code> with attachments.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsSimulateReceiveOpen(false)}
                                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleReceiveEmail} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Sender (From)
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={receiveForm.from}
                                    onChange={(e) => setReceiveForm({ ...receiveForm, from: e.target.value })}
                                    className="w-full px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Sender Display Name
                                </label>
                                <input
                                    type="text"
                                    value={receiveForm.senderName}
                                    onChange={(e) => setReceiveForm({ ...receiveForm, senderName: e.target.value })}
                                    className="w-full px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Subject
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={receiveForm.subject}
                                    onChange={(e) => setReceiveForm({ ...receiveForm, subject: e.target.value })}
                                    className="w-full px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Email Body
                                </label>
                                <textarea
                                    rows={4}
                                    value={receiveForm.body}
                                    onChange={(e) => setReceiveForm({ ...receiveForm, body: e.target.value })}
                                    className="w-full px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Attached File Name
                                </label>
                                <input
                                    type="text"
                                    value={receiveForm.attachments[0]?.name || ""}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        setReceiveForm({
                                            ...receiveForm,
                                            attachments: [{ name, size: "2.1 MB", type: "application/pdf", url: "#" }]
                                        });
                                    }}
                                    className="w-full px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                                <button
                                    type="button"
                                    onClick={() => setIsSimulateReceiveOpen(false)}
                                    className="px-3 py-1.5 border border-[var(--border)] rounded hover:bg-[var(--muted)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
                                >
                                    {submitting ? "Ingesting..." : "Ingest Email into Inbox"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL: VAULT DOCUMENT SELECTOR FOR CHAT                                    */}
            {/* ========================================================================= */}
            {isVaultPickerOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl max-w-xl w-full p-6 space-y-4 animate-fade-in max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                            <div>
                                <h3 className="text-base font-serif font-bold text-[var(--foreground)] flex items-center gap-2">
                                    <span>🏛️</span> Attach Document from Firm Vault
                                </h3>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                    Select an authenticated matter document or evidence item to transmit over chat.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsVaultPickerOpen(false)}
                                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Search input */}
                        <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)]">🔍</span>
                            <input
                                type="text"
                                placeholder="Search vault documents by name, matter, or type..."
                                value={vaultSearchTerm}
                                onChange={(e) => setVaultSearchTerm(e.target.value)}
                                className="w-full pl-7 pr-3 py-2 text-xs bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                            />
                        </div>

                        {/* Document List */}
                        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg">
                            {documents.length === 0 ? (
                                <div className="p-8 text-center text-xs text-[var(--muted-foreground)]">
                                    No documents found in firm vault.
                                </div>
                            ) : (
                                documents
                                    .filter(d => !vaultSearchTerm.trim() || (d.name || d.title || '').toLowerCase().includes(vaultSearchTerm.toLowerCase()) || (d.matterTitle || '').toLowerCase().includes(vaultSearchTerm.toLowerCase()))
                                    .map(doc => (
                                        <div
                                            key={doc._id || doc.id}
                                            className="p-3 hover:bg-[var(--muted)]/40 flex items-center justify-between gap-3 text-xs"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className="text-xl">📄</span>
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-[var(--foreground)] truncate">
                                                        {doc.name || doc.title}
                                                    </div>
                                                    <div className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-2">
                                                        <span>{doc.type || 'Legal Document'}</span>
                                                        {doc.matterTitle && <span>• {doc.matterTitle}</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleAttachFromVaultToChat(doc)}
                                                className="px-3 py-1 bg-[var(--primary)] text-white text-xs font-semibold rounded hover:bg-[#0d223f] shrink-0"
                                            >
                                                Attach 📎
                                            </button>
                                        </div>
                                    ))
                            )}
                        </div>

                        <div className="flex justify-end pt-2 border-t border-[var(--border)]">
                            <button
                                type="button"
                                onClick={() => setIsVaultPickerOpen(false)}
                                className="px-4 py-1.5 border border-[var(--border)] rounded text-xs font-medium hover:bg-[var(--muted)]"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL: IMAGE PREVIEW MODAL                                                 */}
            {/* ========================================================================= */}
            {previewImageModal && (
                <div
                    onClick={() => setPreviewImageModal(null)}
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative max-w-4xl max-h-[90vh] bg-black rounded-xl overflow-hidden border border-white/20 shadow-2xl p-2 flex flex-col items-center"
                    >
                        <img
                            src={previewImageModal}
                            alt="Chat Attachment Preview"
                            className="max-h-[80vh] max-w-full object-contain rounded"
                        />
                        <div className="p-3 w-full flex items-center justify-between text-xs text-white">
                            <span>Image Attachment Preview</span>
                            <div className="flex items-center gap-3">
                                <a
                                    href={previewImageModal}
                                    download="chat_attachment_image"
                                    className="px-3 py-1 bg-[var(--accent)] text-[#0A192F] font-bold rounded"
                                >
                                    Download Image
                                </a>
                                <button
                                    onClick={() => setPreviewImageModal(null)}
                                    className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-white"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

