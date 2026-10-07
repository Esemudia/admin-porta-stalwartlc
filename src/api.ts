import { getSession } from './auth';

// In production on Vercel, default to the live backend URL unless overridden by VITE_API_URL.
// In local dev, default to empty string so requests hit the local Vite dev proxy.
const BACKEND_BASE = import.meta.env.VITE_API_URL !== undefined 
    ? import.meta.env.VITE_API_URL 
    : (import.meta.env.PROD ? 'https://api.stalwartlc.com' : '');

export const API_BASE = `${BACKEND_BASE}/api/v1`;

export function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
    const session = getSession();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(extra || {})
    };
    if (session?.token) {
        headers['Authorization'] = `Bearer ${session.token}`;
    }
    if (session?.role) {
        headers['x-user-role'] = session.role;
    }
    if (session?.name) {
        headers['x-user-name'] = session.name;
    }
    if (session?.email) {
        headers['x-user-email'] = session.email;
    }
    if (session?.userId) {
        headers['x-user-id'] = session.userId;
    }
    return headers;
}

export async function fetchClients() {
    const res = await fetch(`${API_BASE}/clients`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch clients');
    return res.json();
}

export async function fetchMatters() {
    const res = await fetch(`${API_BASE}/matters`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch matters');
    return res.json();
}

export async function fetchDocuments() {
    const res = await fetch(`${API_BASE}/documents`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
}

export async function fetchUsers() {
    const res = await fetch(`${API_BASE}/users`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
}

export async function createClient(data: any) {
    const res = await fetch(`${API_BASE}/clients`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    return res.json();
}

export async function createMatter(data: any) {
    const res = await fetch(`${API_BASE}/matters`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create matter');
    }
    return res.json();
}

export async function createDocument(data: any) {
    const res = await fetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create document');
    }
    return res.json();
}

export async function createUser(data: any) {
    const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create user');
    }
    return res.json();
}
export async function updateClient(id: string, data: any) {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    return res.json();
}

export async function updateMatter(id: string, data: any) {
    const res = await fetch(`${API_BASE}/matters/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update matter');
    }
    return res.json();
}

export async function updateDocument(id: string, data: any) {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update document');
    }
    return res.json();
}

export async function updateUser(id: string, data: any) {
    const res = await fetch(`${API_BASE}/users/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    return res.json();
}

export async function getClient(id: string) {
    const res = await fetch(`${API_BASE}/clients/${id}`, { headers: getAuthHeaders() });
    return res.json();
}

export async function getMatter(id: string) {
    const res = await fetch(`${API_BASE}/matters/${id}`, { headers: getAuthHeaders() });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to retrieve matter');
    }
    return res.json();
}

export async function getDocument(id: string) {
    const res = await fetch(`${API_BASE}/documents/${id}`, { headers: getAuthHeaders() });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to retrieve document');
    }
    return res.json();
}

export async function getUser(id: string) {
    const res = await fetch(`${API_BASE}/users/${id}`, { headers: getAuthHeaders() });
    return res.json();
}

export async function archiveClient(id: string) {
    const res = await fetch(`${API_BASE}/clients/${id}/archive`, { method: 'POST', headers: getAuthHeaders() });
    return res.json();
}

export async function closeMatter(id: string) {
    const res = await fetch(`${API_BASE}/matters/${id}/close`, { method: 'POST', headers: getAuthHeaders() });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to close matter');
    }
    return res.json();
}

export async function assignLawyersToMatter(id: string, lawyerIds: string[]) {
    const res = await fetch(`${API_BASE}/matters/${id}/assign`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ lawyerIds })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to assign lawyer');
    }
    return res.json();
}

export async function deleteDocument(id: string) {
    const res = await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to delete document');
    }
    return res.json();
}

export async function deleteUser(id: string) {
    const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    return res.json();
}

export async function uploadDocument(data: any, file: File) {
    const session = getSession();
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(data).forEach(k => {
        if (data[k] !== undefined && data[k] !== null) {
            formData.append(k, data[k]);
        }
    });

    const headers: Record<string, string> = {};
    if (session?.token) headers['Authorization'] = `Bearer ${session.token}`;
    if (session?.role) headers['x-user-role'] = session.role;
    if (session?.name) headers['x-user-name'] = session.name;
    if (session?.email) headers['x-user-email'] = session.email;
    if (session?.userId) headers['x-user-id'] = session.userId;

    const res = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers,
        body: formData
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to upload document');
    }
    return res.json();
}


export async function fetchTasks() {
    const res = await fetch(`${API_BASE}/tasks`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
}

export async function createTask(data: any) {
    const session = getSession();
    const payload = {
        ...data,
        creatorRole: data.creatorRole || session?.role || 'super_admin',
        creatorName: data.creatorName || session?.name || 'Staff'
    };
    const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    });
    return res.json();
}

export async function updateTask(id: string, data: any) {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    return res.json();
}

export async function approveTask(id: string, note?: string) {
    const session = getSession();
    const res = await fetch(`${API_BASE}/tasks/${id}/approve`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            role: session?.role,
            approvedBy: session?.name || 'Administrator',
            note
        })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to approve task');
    }
    return res.json();
}

export async function rejectTask(id: string, reason?: string) {
    const session = getSession();
    const res = await fetch(`${API_BASE}/tasks/${id}/reject`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            role: session?.role,
            reason: reason || 'Rejected by administration review'
        })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to reject task');
    }
    return res.json();
}

export async function deleteTask(id: string) {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.json();
}
export async function fetchEvents() { const res = await fetch(`${API_BASE}/events`); if (!res.ok) throw new Error(); return res.json(); }
export async function createEvent(data: any) { const res = await fetch(`${API_BASE}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); return res.json(); }
export async function updateEvent(id: string, data: any) { const res = await fetch(`${API_BASE}/events/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); return res.json(); }
export async function deleteEvent(id: string) { const res = await fetch(`${API_BASE}/events/${id}`, { method: 'DELETE' }); return res.json(); }
export async function fetchInvoices() {
    const res = await fetch(`${API_BASE}/invoices`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch invoices');
    return res.json();
}
export async function getInvoice(id: string) {
    const res = await fetch(`${API_BASE}/invoices/${id}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch invoice');
    return res.json();
}
export async function createInvoice(data: any) {
    const res = await fetch(`${API_BASE}/invoices`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create invoice');
    }
    return res.json();
}
export async function updateInvoice(id: string, data: any) {
    const res = await fetch(`${API_BASE}/invoices/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update invoice');
    }
    return res.json();
}
export async function deleteInvoice(id: string) {
    const res = await fetch(`${API_BASE}/invoices/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to delete invoice');
    }
    return res.json();
}
export async function payInvoice(id: string) {
    const res = await fetch(`${API_BASE}/invoices/${id}/pay`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to process payment');
    }
    return res.json();
}
export async function fetchCommunications(params?: any) {
    const queryStr = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${API_BASE}/communications${queryStr}`);
    if (!res.ok) throw new Error('Failed to fetch communications');
    return res.json();
}
export async function sendEmailCommunication(data: any) {
    const res = await fetch(`${API_BASE}/communications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to dispatch outbound email');
    }
    return res.json();
}
export async function receiveEmailCommunication(data: any) {
    const res = await fetch(`${API_BASE}/communications/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to process inbound email');
    }
    return res.json();
}
export async function fetchServerConfig() {
    const res = await fetch(`${API_BASE}/communications/server-config`);
    if (!res.ok) throw new Error('Failed to fetch server config');
    return res.json();
}
export async function verifyDomainMx(domain: string) {
    const res = await fetch(`${API_BASE}/communications/verify-mx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ domain })
    });
    if (!res.ok) throw new Error('Failed to verify MX records');
    return res.json();
}
export async function toggleStarCommunication(id: string) {
    const res = await fetch(`${API_BASE}/communications/${id}/star`, {
        method: 'PATCH',
        headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to update star status');
    return res.json();
}
export async function markCommunicationAsRead(id: string) {
    const res = await fetch(`${API_BASE}/communications/${id}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to mark message as read');
    return res.json();
}
export async function deleteCommunication(id: string) {
    const res = await fetch(`${API_BASE}/communications/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete message');
    return res.json();
}
export async function fetchChatChannels() {
    const res = await fetch(`${API_BASE}/communications/chat/channels`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch chat channels');
    return res.json();
}
export async function fetchChatMessages(roomId: string = 'chambers-general') {
    const res = await fetch(`${API_BASE}/communications/chat/messages?roomId=${encodeURIComponent(roomId)}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch chat messages');
    return res.json();
}
export async function sendChatMessage(data: any) {
    const res = await fetch(`${API_BASE}/communications/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to dispatch chat message');
    }
    return res.json();
}
export async function fetchVerificationRecords() { const res = await fetch(`${API_BASE}/verification`); if (!res.ok) throw new Error(); return res.json(); }
export async function createVerificationRecord(data: any) {
    const res = await fetch(`${API_BASE}/verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to issue verification record');
    }
    return res.json();
}
export async function lookupVerificationRecord(query: string) {
    const res = await fetch(`${API_BASE}/verification/lookup/${encodeURIComponent(query)}`);
    if (!res.ok) return null;
    return res.json();
}
export async function revokeVerificationRecord(id: string, reason: string) {
    const res = await fetch(`${API_BASE}/verification/${id}/revoke`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ reason })
    });
    if (!res.ok) throw new Error('Failed to revoke verification record');
    return res.json();
}
export async function deleteVerificationRecord(id: string) {
    const res = await fetch(`${API_BASE}/verification/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete verification record');
    return res.json();
}
export async function fetchAuditLogs() { const res = await fetch(`${API_BASE}/audit`); if (!res.ok) throw new Error(); return res.json(); }


export async function login(data: any) {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Invalid credentials');
    return res.json();
}

export async function changeUserPassword(id: string, data: { currentPassword?: string; newPassword: string }) {
    const res = await fetch(`${API_BASE}/users/${id}/change-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update password');
    }
    return res.json();
}

export async function updateUserProfile(id: string, data: any) {
    const res = await fetch(`${API_BASE}/users/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update profile');
    }
    return res.json();
}

export async function fetchFirmSettings() {
    const res = await fetch(`${API_BASE}/users/settings/firm`, {
        headers: getAuthHeaders()
    });
    if (!res.ok) {
        // Fallback to client-side defaults if needed
        return {
            firmName: 'Stalwart Law Consult',
            tagline: 'Barristers, Solicitors & Legal Arbitrators',
            email: 'contact@stalwartlc.com',
            phone: '+234 1 234 5678',
            address: 'Plot 12B, Admiralty Way, Lekki Phase 1, Lagos, Nigeria',
            jurisdiction: 'Federal High Court & Appellate Courts of Nigeria',
            currency: 'NGN',
            cacNumber: 'RC-1049283',
            taxId: 'TIN-92810382-0001',
            logoUrl: ''
        };
    }
    return res.json();
}

export async function updateFirmSettings(data: any) {
    const res = await fetch(`${API_BASE}/users/settings/firm`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update firm configuration');
    }
    return res.json();
}

