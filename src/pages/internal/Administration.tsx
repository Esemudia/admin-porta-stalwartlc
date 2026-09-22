import { useState, useEffect } from "react";
import {
    getSession,
    getAllRolePermissions,
    saveRolePermissions,
    resetRolePermissions,
    type UserRole,
} from "../../auth";
import { navItems } from "../../components/layout/Shell";
import { fetchUsers, createUser, deleteUser } from "../../api";

interface UserAccount {
    _id: string;
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    role: "super_admin" | "exec_secretary" | "lawyer" | "front_desk" | "client" | string;
    department?: string;
    phone?: string;
    status?: "active" | "inactive" | string;
    createdAt?: string;
    avatarUrl?: string;
}

export default function Administration() {
    const session = getSession();
    const canManageStaff = session?.role === "super_admin" || session?.role === "exec_secretary";
    const isSuperAdmin = session?.role === "super_admin";

    const [activeTab, setActiveTab] = useState<"directory" | "access_control">("directory");
    const [rolePerms, setRolePerms] = useState<Record<UserRole, string[]>>(getAllRolePermissions());

    const [staff, setStaff] = useState<UserAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");

    useEffect(() => {
        const handlePermChange = () => setRolePerms(getAllRolePermissions());
        window.addEventListener("slc-permissions-change", handlePermChange);
        return () => window.removeEventListener("slc-permissions-change", handlePermChange);
    }, []);

    // Modal state
    const [isAdding, setIsAdding] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Deletion state
    const [deletingUser, setDeletingUser] = useState<UserAccount | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form inputs
    const initialFormState = {
        firstName: "",
        lastName: "",
        email: "",
        role: "lawyer",
        department: "Litigation & Dispute Resolution",
        phone: "",
        password: "stalwart2026",
    };
    const [newStaff, setNewStaff] = useState(initialFormState);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await fetchUsers();
            setStaff(Array.isArray(data) ? data : []);
        } catch (err: any) {
            console.error("Failed to load staff list:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!newStaff.firstName.trim() || !newStaff.lastName.trim()) {
            setFormError("Both first and last name are required.");
            return;
        }

        if (!newStaff.email.trim()) {
            setFormError("Email address is required.");
            return;
        }

        try {
            setIsSubmitting(true);
            await createUser({
                firstName: newStaff.firstName.trim(),
                lastName: newStaff.lastName.trim(),
                email: newStaff.email.trim().toLowerCase(),
                role: newStaff.role,
                department: newStaff.department,
                phone: newStaff.phone.trim(),
                password: newStaff.password.trim() || "stalwart2026",
                status: "active",
            });

            setSuccessMessage(`Account for ${newStaff.firstName} ${newStaff.lastName} (${newStaff.role}) successfully created.`);
            setIsAdding(false);
            setNewStaff(initialFormState);
            await loadUsers();
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err: any) {
            console.error("Error creating user:", err);
            setFormError(err.message || "Failed to create user. Please ensure the email is unique.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingUser) return;
        try {
            setIsDeleting(true);
            await deleteUser(deletingUser._id || deletingUser.id || "");
            setDeletingUser(null);
            setSuccessMessage(`User ${deletingUser.firstName} ${deletingUser.lastName} removed.`);
            await loadUsers();
            setTimeout(() => setSuccessMessage(null), 4000);
        } catch (err: any) {
            console.error("Error deleting user:", err);
            alert(err.message || "Failed to delete user account.");
        } finally {
            setIsDeleting(false);
        }
    };

    const ALL_ROLES: { role: UserRole; label: string; badgeColor: string; description: string }[] = [
        {
            role: "super_admin",
            label: "Super Administrator",
            badgeColor: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
            description: "Managing Partner & Executive Board. Has full administrative oversight over all firm practice modules and financial systems.",
        },
        {
            role: "lawyer",
            label: "Lawyer / Associate",
            badgeColor: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
            description: "Litigation partners, associates, and legal counsel. Access to active matters, documents, court hearings, legal tasks, and document verification. Billing and executive reports are hidden.",
        },
        {
            role: "exec_secretary",
            label: "Executive Secretary",
            badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
            description: "Senior legal secretary & office manager. Coordinates client intake, case files, scheduling, and staff personnel accounts. Financial billing and seal certificates are hidden.",
        },
        {
            role: "front_desk",
            label: "Front Desk Officer",
            badgeColor: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
            description: "Reception & visitor coordination. Front office calendar, visitor clients, front-desk tasks, and communications. Confidential case files and briefs are hidden.",
        },
        {
            role: "client",
            label: "External Client",
            badgeColor: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
            description: "Direct access restricted to their assigned matters, legal documents, scheduled hearings, and counsel communications.",
        },
    ];

    const handleTogglePermission = (role: UserRole, navId: string) => {
        if (!isSuperAdmin) {
            alert("Only Super Administrators have permission to modify firm role access control policies.");
            return;
        }
        if (role === "super_admin" && (navId === "dashboard" || navId === "administration")) {
            alert("Super Administrator access to Dashboard and Administration is required for system governance and cannot be disabled.");
            return;
        }
        const current = rolePerms[role] || [];
        const updated = current.includes(navId)
            ? current.filter((id) => id !== navId)
            : [...current, navId];

        saveRolePermissions(role, updated);
        setRolePerms(getAllRolePermissions());
        const navLabel = navItems.find((n) => n.id === navId)?.label || navId;
        const roleLabel = role.replace("_", " ");
        setSuccessMessage(`Updated access control: ${current.includes(navId) ? "Hidden from" : "Added to"} menu for ${roleLabel} ("${navLabel}").`);
        setTimeout(() => setSuccessMessage(null), 3500);
    };

    const handleResetDefaults = () => {
        if (!isSuperAdmin) {
            alert("Only Super Administrators can reset role access policies.");
            return;
        }
        if (window.confirm("Restore all practice role access permissions to the firm standard policy?")) {
            resetRolePermissions();
            setRolePerms(getAllRolePermissions());
            setSuccessMessage("Firm standard role-based access control policy restored.");
            setTimeout(() => setSuccessMessage(null), 3500);
        }
    };

    // Filter staff
    const filteredStaff = staff.filter((s) => {
        const fullName = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
        const email = (s.email || "").toLowerCase();
        const dept = (s.department || "").toLowerCase();
        const phone = (s.phone || "").toLowerCase();
        const term = searchTerm.toLowerCase();

        const matchesSearch = !term || fullName.includes(term) || email.includes(term) || dept.includes(term) || phone.includes(term);

        let matchesRole = true;
        if (roleFilter !== "all") {
            matchesRole = s.role === roleFilter;
        }

        return matchesSearch && matchesRole;
    });

    const counts = {
        all: staff.length,
        lawyer: staff.filter((s) => s.role === "lawyer").length,
        exec_secretary: staff.filter((s) => s.role === "exec_secretary").length,
        front_desk: staff.filter((s) => s.role === "front_desk").length,
        super_admin: staff.filter((s) => s.role === "super_admin").length,
    };

    const getRoleBadgeStyle = (role: string) => {
        switch (role) {
            case "super_admin":
                return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800";
            case "exec_secretary":
                return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
            case "lawyer":
                return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
            case "front_desk":
                return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case "super_admin":
                return "Super Admin";
            case "exec_secretary":
                return "Executive Secretary";
            case "lawyer":
                return "Lawyer / Associate";
            case "front_desk":
                return "Front Desk Officer";
            case "client":
                return "External Client";
            default:
                return role.replace("_", " ");
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-serif text-3xl font-semibold text-[var(--foreground)] tracking-tight">
                        Firm Administration & Personnel
                    </h1>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                        Manage firm employees, create lawyer and secretariat accounts, and configure portal credentials.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={loadUsers}
                        className="px-3.5 py-2 border border-[var(--border)] rounded text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors flex items-center gap-1.5"
                        title="Refresh Directory"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>

                    {activeTab === "directory" && canManageStaff && (
                        <button
                            onClick={() => {
                                setFormError(null);
                                setIsAdding(true);
                            }}
                            className="px-4 py-2 bg-[var(--primary)] text-white text-xs font-semibold rounded shadow-sm hover:brightness-110 transition-all flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            + Add Employee
                        </button>
                    )}

                    {activeTab === "access_control" && isSuperAdmin && (
                        <button
                            onClick={handleResetDefaults}
                            className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded shadow-sm hover:bg-slate-700 transition-all flex items-center gap-2"
                            title="Restore default firm permissions policy"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Restore Defaults
                        </button>
                    )}
                </div>
            </div>

            {/* Read-only Alert if Non-Admin */}
            {!canManageStaff && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-xs flex items-center gap-3">
                    <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                        <strong>Directory View Mode:</strong> Your current role (
                        <span className="font-mono uppercase font-bold">{session?.role || "Staff"}</span>
                        ) has read-only access. Only Super Administrators and Executive Secretaries can create new accounts or update employee records.
                    </span>
                </div>
            )}

            {/* Success notification */}
            {successMessage && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs flex items-center justify-between transition-all">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{successMessage}</span>
                    </div>
                    <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900 font-bold text-xs">
                        ✕
                    </button>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-[var(--border)] gap-2">
                <button
                    onClick={() => setActiveTab("directory")}
                    className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab === "directory"
                        ? "border-[var(--primary)] text-[var(--primary)]"
                        : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        }`}
                >
                    <span>👥</span>
                    <span>Personnel Directory ({staff.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab("access_control")}
                    className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab === "access_control"
                        ? "border-[var(--primary)] text-[var(--primary)]"
                        : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        }`}
                >
                    <span>🛡️</span>
                    <span>Access Control & Menu Visibility (RBAC)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent)] text-[var(--primary)] font-bold">
                        Enforced
                    </span>
                </button>
            </div>

            {/* TAB CONTENT: Personnel Directory */}
            {activeTab === "directory" && (
                <div className="space-y-6">
                    {/* Filters & Search */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg">
                        {/* Search Bar */}
                        <div className="relative flex-1 max-w-md">
                            <svg className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by name, email, department..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Role Tabs */}
                        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-xs">
                            {[
                                { id: "all", label: "All Personnel", count: counts.all },
                                { id: "lawyer", label: "Lawyers", count: counts.lawyer },
                                { id: "exec_secretary", label: "Secretaries", count: counts.exec_secretary },
                                { id: "front_desk", label: "Front Desk", count: counts.front_desk },
                                { id: "super_admin", label: "Admins", count: counts.super_admin },
                            ].map((tab) => {
                                const active = roleFilter === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setRoleFilter(tab.id)}
                                        className={`px-2.5 py-1.5 rounded font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                                            active
                                                ? "bg-[var(--primary)] text-white"
                                                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        <span
                                            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                                active ? "bg-white/20 text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                                            }`}
                                        >
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Staff Directory Grid */}
                    {loading ? (
                        <div className="py-16 text-center text-sm text-[var(--muted-foreground)]">
                            <div className="inline-block animate-spin w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full mb-2"></div>
                            <p>Loading personnel directory...</p>
                        </div>
                    ) : filteredStaff.length === 0 ? (
                        <div className="py-16 text-center border border-dashed border-[var(--border)] rounded-lg bg-[var(--card)] p-8">
                            <svg className="w-12 h-12 mx-auto text-[var(--muted-foreground)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <p className="font-serif text-base font-medium text-[var(--foreground)]">No personnel match your search</p>
                            <p className="text-xs text-[var(--muted-foreground)] mt-1">
                                Try modifying your search query or switching role filter tabs.
                            </p>
                            {canManageStaff && (
                                <button
                                    onClick={() => {
                                        setFormError(null);
                                        setIsAdding(true);
                                    }}
                                    className="mt-4 px-4 py-1.5 bg-[var(--primary)] text-white text-xs rounded hover:brightness-110"
                                >
                                    + Register New Employee
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredStaff.map((person) => {
                                const fullName = `${person.firstName || ""} ${person.lastName || ""}`.trim() || person.email;
                                const initials = fullName
                                    .split(" ")
                                    .filter(Boolean)
                                    .map((w) => w[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase();
                                const isSelf = session?.userId === person._id || session?.email === person.email;
                                const role = person.role || "lawyer";
                                const isActive = person.status !== "inactive";

                                return (
                                    <div
                                        key={person._id || person.id}
                                        className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                                    >
                                        <div>
                                            {/* Top user row */}
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-[var(--primary)] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-inner">
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-serif text-sm font-semibold text-[var(--foreground)] line-clamp-1">
                                                            {fullName}
                                                        </h3>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span
                                                                className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${getRoleBadgeStyle(
                                                                    role
                                                                )}`}
                                                            >
                                                                {getRoleLabel(role)}
                                                            </span>
                                                            {isSelf && (
                                                                <span className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono px-1.5 py-0.2 rounded">
                                                                    You
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span
                                                        className={`w-2 h-2 rounded-full ${
                                                            isActive ? "bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-950" : "bg-slate-400"
                                                        }`}
                                                        title={isActive ? "Active Account" : "Inactive Account"}
                                                    />
                                                </div>
                                            </div>

                                            {/* Details */}
                                            <div className="space-y-1.5 text-xs pt-2 border-t border-[var(--border)]">
                                                {person.department && (
                                                    <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                                                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                        </svg>
                                                        <span className="text-[var(--foreground)] truncate">{person.department}</span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                                                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                    <a
                                                        href={`mailto:${person.email}`}
                                                        className="text-[var(--foreground)] hover:text-[var(--primary)] truncate hover:underline"
                                                    >
                                                        {person.email}
                                                    </a>
                                                </div>

                                                {person.phone && (
                                                    <div className="flex items-center gap-2 text-[var(--muted-foreground)] font-mono">
                                                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                        </svg>
                                                        <span>{person.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action footer */}
                                        <div className="pt-3 mt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                                            <span>
                                                Joined {person.createdAt ? new Date(person.createdAt).toLocaleDateString() : "Recent"}
                                            </span>

                                            {canManageStaff && !isSelf && (
                                                <button
                                                    onClick={() => setDeletingUser(person)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 px-2 py-1 rounded transition-colors text-[11px] font-medium flex items-center gap-1"
                                                    title="Delete User"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: Access Control & Menu Visibility (RBAC) */}
            {activeTab === "access_control" && (
                <div className="space-y-6">
                    {/* Policy Banner */}
                    <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-[#020d1f] text-white rounded-xl border border-white/10 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[var(--accent)] text-[var(--primary)] font-bold">
                                    Firm Security Standard
                                </span>
                                <span className="text-xs text-slate-300 font-medium">Dynamic Role Navigation Governance</span>
                            </div>
                            <h3 className="font-serif text-lg font-semibold text-white">
                                Dynamic Practice Menu & Role Access Control
                            </h3>
                            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                                <strong>Core Rule:</strong> Modules a user does not have permission to access <strong>do not appear on the navigation menu</strong>. This prevents unauthorized visibility into confidential legal briefs, client privilege dossiers, billing ledgers, and firm administration.
                            </p>
                        </div>

                        {isSuperAdmin && (
                            <button
                                onClick={handleResetDefaults}
                                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded text-xs font-medium transition-all shrink-0 flex items-center gap-1.5"
                                title="Reset all role permissions to Stalwart Law Consult factory defaults"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Restore Defaults
                            </button>
                        )}
                    </div>

                    {/* RBAC Matrix Table */}
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--background)]">
                            <div>
                                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                                    Role-to-Module Access & Sidebar Menu Visibility Matrix
                                </h3>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                    {isSuperAdmin
                                        ? "Click any pill to toggle whether that module appears on the role's navigation menu."
                                        : "Read-only view of active firm menu visibility policies per role."}
                                </p>
                            </div>
                            <div className="flex items-center gap-4 text-xs shrink-0">
                                <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                    Visible on Menu
                                </span>
                                <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                                    Hidden from Menu
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--border)] bg-slate-50/70 dark:bg-slate-900/50 text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                                        <th className="py-3 px-4 w-60">Practice Module</th>
                                        <th className="py-3 px-3 text-center">Super Admin</th>
                                        <th className="py-3 px-3 text-center">Lawyer / Associate</th>
                                        <th className="py-3 px-3 text-center">Exec. Secretary</th>
                                        <th className="py-3 px-3 text-center">Front Desk</th>
                                        <th className="py-3 px-3 text-center">External Client</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)] text-xs">
                                    {navItems.map((item) => {
                                        return (
                                            <tr key={item.id} className="hover:bg-[var(--muted)]/40 transition-colors">
                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="text-lg">{item.icon}</span>
                                                        <div>
                                                            <div className="font-semibold text-[var(--foreground)]">{item.label}</div>
                                                            <div className="text-[10px] text-[var(--muted-foreground)] font-mono">{item.path}</div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {(["super_admin", "lawyer", "exec_secretary", "front_desk", "client"] as UserRole[]).map((r) => {
                                                    const isPermitted = (rolePerms[r] || []).includes(item.id);
                                                    const isLocked = r === "super_admin" && (item.id === "dashboard" || item.id === "administration");

                                                    return (
                                                        <td key={r} className="py-3.5 px-3 text-center">
                                                            <button
                                                                type="button"
                                                                disabled={!isSuperAdmin || isLocked}
                                                                onClick={() => handleTogglePermission(r, item.id)}
                                                                title={
                                                                    !isSuperAdmin
                                                                        ? "Only Super Administrators can edit permissions"
                                                                        : isLocked
                                                                            ? "Required for super admin governance"
                                                                            : `Click to ${isPermitted ? "hide from" : "show on"} menu`
                                                                }
                                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all ${isPermitted
                                                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 shadow-xs"
                                                                    : "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 opacity-60"
                                                                    } ${isSuperAdmin && !isLocked ? "cursor-pointer hover:scale-105 active:scale-95" : "cursor-default"}`}
                                                            >
                                                                <span>{isPermitted ? "✓" : "🔒"}</span>
                                                                <span>{isPermitted ? "Visible" : "Hidden"}</span>
                                                            </button>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Role Profiles Breakdown Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                        {ALL_ROLES.map((rp) => {
                            const permitted = rolePerms[rp.role] || [];
                            return (
                                <div key={rp.role} className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xs space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${rp.badgeColor}`}>
                                            {rp.label}
                                        </span>
                                        <span className="text-[11px] font-mono text-[var(--muted-foreground)]">
                                            {permitted.length}/{navItems.length} Visible
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                                        {rp.description}
                                    </p>
                                    <div className="pt-2 border-t border-[var(--border)]">
                                        <div className="text-[10px] uppercase font-mono tracking-wider text-[var(--muted-foreground)] mb-1.5">
                                            Active Menu Items ({permitted.length})
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {permitted.map((id) => {
                                                const navObj = navItems.find((n) => n.id === id);
                                                return (
                                                    <span key={id} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-[var(--foreground)] px-2 py-0.5 rounded border border-[var(--border)] flex items-center gap-1 font-medium">
                                                        <span>{navObj?.icon || "•"}</span>
                                                        <span>{navObj?.label || id}</span>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modal: Add Employee */}
            {isAdding && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-[var(--card)] w-full max-w-lg rounded-xl shadow-2xl border border-[var(--border)] relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--background)]">
                            <div>
                                <h2 className="text-base font-serif font-semibold text-[var(--foreground)]">
                                    Register New Firm Personnel
                                </h2>
                                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                                    Create internal credentials for lawyers, practice secretaries, or front desk staff.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsAdding(false)}
                                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1 rounded-md text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleAddUser} className="p-6 space-y-4">
                            {/* Error Alert */}
                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs flex items-start gap-2">
                                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="flex-1 font-medium">{formError}</span>
                                </div>
                            )}

                            {/* Name Fields */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                                        First Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Chukwuemeka"
                                        value={newStaff.firstName}
                                        onChange={(e) => setNewStaff({ ...newStaff, firstName: e.target.value })}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-xs outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                                        Last Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Stalwart"
                                        value={newStaff.lastName}
                                        onChange={(e) => setNewStaff({ ...newStaff, lastName: e.target.value })}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-xs outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                                    Official Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    placeholder="c.stalwart@stalwartlc.com"
                                    value={newStaff.email}
                                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-xs outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                />
                                <span className="text-[10px] text-[var(--muted-foreground)] mt-0.5 block">
                                    This email will be used to log into the internal practice portal.
                                </span>
                            </div>

                            {/* Role and Department */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                                        Practice Role <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={newStaff.role}
                                        onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-xs outline-none focus:border-[var(--primary)] text-[var(--foreground)] font-medium"
                                    >
                                        <option value="lawyer">Lawyer / Associate</option>
                                        <option value="exec_secretary">Executive Secretary</option>
                                        <option value="front_desk">Front Desk Officer</option>
                                        <option value="super_admin">Super Administrator</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                                        Department
                                    </label>
                                    <select
                                        value={newStaff.department}
                                        onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-xs outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                    >
                                        <option value="Litigation & Dispute Resolution">Litigation & Dispute Resolution</option>
                                        <option value="Corporate & Commercial">Corporate & Commercial</option>
                                        <option value="Real Estate & Property">Real Estate & Property</option>
                                        <option value="Practice Secretariat">Practice Secretariat</option>
                                        <option value="Front Office & Client Services">Front Office & Client Services</option>
                                        <option value="Executive Management">Executive Management</option>
                                    </select>
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    placeholder="+234 800 000 0000"
                                    value={newStaff.phone}
                                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-xs outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                                />
                            </div>

                            {/* Initial Password */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                                    Initial Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        placeholder="stalwart2026"
                                        value={newStaff.password}
                                        onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded pl-3 pr-9 py-2 text-xs outline-none focus:border-[var(--primary)] text-[var(--foreground)] font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-xs"
                                        title={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </button>
                                </div>
                                <span className="text-[10px] text-[var(--muted-foreground)] mt-1 block">
                                    Default is <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">stalwart2026</code>. Will be securely hashed with bcrypt.
                                </span>
                            </div>

                            {/* Form Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 border border-[var(--border)] text-xs font-medium rounded hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-[var(--primary)] text-white text-xs font-semibold rounded hover:brightness-110 shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                            Creating Account...
                                        </>
                                    ) : (
                                        "Save & Create Account"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Delete Confirmation */}
            {deletingUser && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] w-full max-w-sm rounded-lg p-5 border border-[var(--border)] shadow-xl space-y-4">
                        <div className="flex items-center gap-3 text-red-600">
                            <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="font-serif font-semibold text-sm text-[var(--foreground)]">
                                Remove Personnel Account
                            </h3>
                        </div>

                        <p className="text-xs text-[var(--muted-foreground)]">
                            Are you sure you want to remove the account for{" "}
                            <strong className="text-[var(--foreground)]">
                                {deletingUser.firstName} {deletingUser.lastName}
                            </strong>{" "}
                            ({deletingUser.email})? This staff member will no longer be able to log in.
                        </p>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setDeletingUser(null)}
                                disabled={isDeleting}
                                className="px-3 py-1.5 border border-[var(--border)] text-xs rounded hover:bg-[var(--muted)] text-[var(--foreground)]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="px-3.5 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50"
                            >
                                {isDeleting ? "Removing..." : "Yes, Remove Account"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
