import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    getSession,
    saveSession,
    canAccessNav,
    type UserRole
} from "../../auth";
import {
    fetchUsers,
    updateUserProfile,
    changeUserPassword,
    fetchFirmSettings,
    updateFirmSettings
} from "../../api";
import logo from "../../assets/logo.png";

// Preset executive avatar badges for quick selection
const AVATAR_PRESETS = [
    {
        id: "preset-san",
        label: "SAN Silk Crest",
        url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250"
    },
    {
        id: "preset-partner",
        label: "Partner Portrait",
        url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250"
    },
    {
        id: "preset-advocate",
        label: "Litigation Counsel",
        url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250"
    },
    {
        id: "preset-associate",
        label: "Corporate Associate",
        url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250"
    }
];

export default function Settings() {
    const navigate = useNavigate();
    const session = getSession();
    const isClient = session?.role === "client";
    const isSuperAdmin = session?.role === "super_admin";

    // Tab state
    const [activeTab, setActiveTab] = useState<"profile" | "security" | "notifications" | "firm">("profile");

    // Notification toast
    const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
    const showToast = (text: string, type: "success" | "error" = "success") => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    };

    // User profile state
    const [profile, setProfile] = useState({
        id: session?.userId || "",
        firstName: session?.firstName || session?.name?.split(" ")[0] || "",
        lastName: session?.lastName || session?.name?.split(" ").slice(1).join(" ") || "",
        email: session?.email || "",
        phone: session?.phone || "+234 803 000 0000",
        title: session?.title || (session?.role === "super_admin" ? "Senior Advocate of Nigeria / Managing Partner" : "Legal Practitioner"),
        department: session?.department || "Litigation & Dispute Resolution",
        barNumber: session?.barNumber || "NBA/LAG/2016/08421",
        bio: session?.bio || "Experienced advocate dedicated to corporate jurisprudence, arbitration, and commercial law advisory.",
        avatarUrl: session?.avatarUrl || ""
    });

    const [profileLoading, setProfileLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Password change state
    const [passwords, setPasswords] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Two-factor authentication toggle state
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

    // Notification preferences state
    const [notifications, setNotifications] = useState({
        courtReminders: true,
        matterAssignments: true,
        inboundCommunications: true,
        taskApprovals: true,
        billingAlerts: true,
        compactDensity: false
    });
    const [notifLoading, setNotifLoading] = useState(false);

    // Firm Configuration state (for Super Admin)
    const [firmSettings, setFirmSettings] = useState({
        firmName: "Stalwart Law Consult",
        tagline: "Barristers, Solicitors & Legal Arbitrators",
        email: "contact@stalwartlc.com",
        phone: "+234 1 234 5678",
        address: "Plot 12B, Admiralty Way, Lekki Phase 1, Lagos, Nigeria",
        jurisdiction: "Federal High Court & Appellate Courts of Nigeria",
        currency: "NGN",
        cacNumber: "RC-1049283",
        taxId: "TIN-92810382-0001",
        logoUrl: logo
    });
    const [firmLoading, setFirmLoading] = useState(false);
    const firmLogoInputRef = useRef<HTMLInputElement>(null);

    // Load initial user details and firm settings from backend
    useEffect(() => {
        if (isClient) return;

        async function loadBackendData() {
            try {
                // Fetch user record from users list if possible
                const users = await fetchUsers().catch(() => []);
                const current = users.find((u: any) =>
                    (u._id || u.id) === session?.userId ||
                    (u.email && u.email.toLowerCase() === session?.email?.toLowerCase())
                );

                if (current) {
                    setProfile(prev => ({
                        ...prev,
                        id: current._id || current.id,
                        firstName: current.firstName || prev.firstName,
                        lastName: current.lastName || prev.lastName,
                        email: current.email || prev.email,
                        phone: current.phone || prev.phone,
                        title: current.title || prev.title,
                        department: current.department || prev.department,
                        barNumber: current.barNumber || prev.barNumber,
                        bio: current.bio || prev.bio,
                        avatarUrl: current.avatarUrl || prev.avatarUrl
                    }));
                    if (current.twoFactorEnabled !== undefined) {
                        setTwoFactorEnabled(!!current.twoFactorEnabled);
                    }
                    if (current.notificationPreferences) {
                        setNotifications(prev => ({ ...prev, ...current.notificationPreferences }));
                    }
                }

                // If super admin, load firm settings
                if (isSuperAdmin) {
                    const fSettings = await fetchFirmSettings().catch(() => null);
                    if (fSettings) {
                        setFirmSettings(prev => ({
                            ...prev,
                            ...fSettings,
                            logoUrl: fSettings.logoUrl || prev.logoUrl
                        }));
                    }
                }
            } catch (err) {
                console.error("Failed to load settings data", err);
            }
        }
        loadBackendData();
    }, [isClient, isSuperAdmin, session?.userId, session?.email]);

    // Handle Image / Avatar Upload (converts to base64 Data URL)
    const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showToast("Profile image must be less than 5MB.", "error");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setProfile(prev => ({ ...prev, avatarUrl: dataUrl }));
            showToast("New profile picture loaded. Click 'Save Profile' to commit.", "success");
        };
        reader.readAsDataURL(file);
    };

    // Handle Firm Logo Upload
    const handleFirmLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setFirmSettings(prev => ({ ...prev, logoUrl: dataUrl }));
            showToast("Firm crest loaded. Click 'Save Configuration' to update.", "success");
        };
        reader.readAsDataURL(file);
    };

    // Save Profile & Avatar
    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileLoading(true);

        try {
            const fullName = `${profile.firstName.trim()} ${profile.lastName.trim()}`.trim();
            const payload: any = {
                firstName: profile.firstName.trim(),
                lastName: profile.lastName.trim(),
                phone: profile.phone.trim(),
                title: profile.title.trim(),
                department: profile.department.trim(),
                barNumber: profile.barNumber.trim(),
                bio: profile.bio.trim(),
                avatarUrl: profile.avatarUrl
            };

            const targetId = profile.id || session?.userId;
            if (targetId) {
                await updateUserProfile(targetId, payload);
            }

            // Sync with current AuthSession & emit event so Sidebar updates immediately
            if (session) {
                saveSession({
                    ...session,
                    name: fullName || session.name,
                    avatarUrl: profile.avatarUrl,
                    phone: profile.phone,
                    title: profile.title,
                    department: profile.department,
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    barNumber: profile.barNumber,
                    bio: profile.bio
                });
            }

            showToast("Profile information and avatar updated successfully!", "success");
        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Failed to update profile.", "error");
        } finally {
            setProfileLoading(false);
        }
    };

    // Change Password
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!passwords.newPassword) {
            showToast("Please enter a new password.", "error");
            return;
        }

        if (passwords.newPassword.length < 6) {
            showToast("New password must be at least 6 characters long.", "error");
            return;
        }

        if (passwords.newPassword !== passwords.confirmPassword) {
            showToast("New password and confirmation do not match.", "error");
            return;
        }

        setPasswordLoading(true);
        try {
            const targetId = profile.id || session?.userId;
            if (!targetId) {
                throw new Error("Unable to identify current user account ID.");
            }

            await changeUserPassword(targetId, {
                currentPassword: passwords.currentPassword,
                newPassword: passwords.newPassword
            });

            setPasswords({
                currentPassword: "",
                newPassword: "",
                confirmPassword: ""
            });
            showToast("Security password updated successfully!", "success");
        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Failed to change password.", "error");
        } finally {
            setPasswordLoading(false);
        }
    };

    // Save Notifications & Preferences
    const handleSaveNotifications = async (e: React.FormEvent) => {
        e.preventDefault();
        setNotifLoading(true);
        try {
            const targetId = profile.id || session?.userId;
            if (targetId) {
                await updateUserProfile(targetId, {
                    twoFactorEnabled,
                    notificationPreferences: notifications
                });
            }
            showToast("System preferences saved.", "success");
        } catch (err: any) {
            console.error(err);
            showToast("Failed to save preferences.", "error");
        } finally {
            setNotifLoading(false);
        }
    };

    // Save Firm Branding & Configuration
    const handleSaveFirmSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setFirmLoading(true);
        try {
            await updateFirmSettings(firmSettings);
            showToast("Firm branding and configuration updated successfully!", "success");
        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Failed to update firm configuration.", "error");
        } finally {
            setFirmLoading(false);
        }
    };

    // Calculate password strength
    const passwordStrength = (() => {
        const p = passwords.newPassword;
        if (!p) return 0;
        let score = 0;
        if (p.length >= 6) score += 25;
        if (p.length >= 10) score += 25;
        if (/[A-Z]/.test(p)) score += 25;
        if (/[0-9!@#$%^&*]/.test(p)) score += 25;
        return score;
    })();

    // ── GUARD: Client Role Restriction ──────────────────────────────────────────
    if (isClient) {
        return (
            <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-xl border border-slate-200 shadow-md text-center">
                <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-2xl flex items-center justify-center mx-auto mb-4">
                    🛡️
                </div>
                <h2 className="font-serif text-2xl font-bold text-slate-900 mb-2">
                    Access Restricted by Firm Policy
                </h2>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                    Client portal accounts do not have access to internal practice configuration, firm branding, or staff administrative settings.
                </p>
                <button
                    onClick={() => navigate("/internal/dashboard")}
                    className="px-5 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-md shadow-sm hover:brightness-110 transition-all"
                >
                    Return to Practice Overview
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in">
            {/* Toast Notification */}
            {toast && (
                <div
                    className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-2xl text-sm font-medium transition-all duration-300 flex items-center gap-3 ${
                        toast.type === "success"
                            ? "bg-[#0A192F] text-[#D5AA6D] border border-[#D5AA6D]/40"
                            : "bg-red-900 text-white border border-red-700"
                    }`}
                >
                    <span>{toast.type === "success" ? "✓" : "⚠️"}</span>
                    <span>{toast.text}</span>
                </div>
            )}

            {/* Header Ribbon */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">⚙️</span>
                        <h1 className="font-serif text-3xl font-semibold text-[var(--foreground)] tracking-tight">
                            Account & Practice Settings
                        </h1>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                        Manage your executive profile, digital avatar, security credentials, and firm parameters.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs px-3 py-1 bg-slate-100 border border-slate-200 rounded-full font-mono text-slate-700 capitalize">
                        Role: {session?.role?.replace("_", " ") || "Counsel"}
                    </span>
                </div>
            </div>

            {/* Tab Navigation Ribbon */}
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-2 text-sm font-medium">
                <button
                    onClick={() => setActiveTab("profile")}
                    className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 ${
                        activeTab === "profile"
                            ? "bg-[var(--primary)] text-white font-semibold shadow-sm"
                            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                    }`}
                >
                    <span>👤</span> My Profile & Avatar
                </button>

                <button
                    onClick={() => setActiveTab("security")}
                    className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 ${
                        activeTab === "security"
                            ? "bg-[var(--primary)] text-white font-semibold shadow-sm"
                            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                    }`}
                >
                    <span>🔒</span> Password & Security
                </button>

                <button
                    onClick={() => setActiveTab("notifications")}
                    className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 ${
                        activeTab === "notifications"
                            ? "bg-[var(--primary)] text-white font-semibold shadow-sm"
                            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                    }`}
                >
                    <span>🔔</span> Notifications & Preferences
                </button>

                {isSuperAdmin && (
                    <button
                        onClick={() => setActiveTab("firm")}
                        className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 ${
                            activeTab === "firm"
                                ? "bg-[var(--primary)] text-white font-semibold shadow-sm"
                                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                        }`}
                    >
                        <span>🏛️</span> Firm Branding & Parameters
                    </button>
                )}
            </div>

            {/* ========================================================================= */}
            {/* TAB 1: MY PROFILE & AVATAR                                                */}
            {/* ========================================================================= */}
            {activeTab === "profile" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                    {/* Left: Avatar Card */}
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 shadow-sm space-y-5">
                        <div className="text-center space-y-3">
                            <div className="relative inline-block mx-auto">
                                <div className="w-32 h-32 rounded-full ring-4 ring-[var(--accent)]/30 overflow-hidden bg-[var(--primary)] flex items-center justify-center text-white text-3xl font-serif font-bold shadow-lg">
                                    {profile.avatarUrl ? (
                                        <img
                                            src={profile.avatarUrl}
                                            alt={profile.firstName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span>
                                            {profile.firstName ? profile.firstName[0].toUpperCase() : "U"}
                                            {profile.lastName ? profile.lastName[0].toUpperCase() : ""}
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 p-2.5 rounded-full bg-[var(--primary)] text-white hover:bg-[#172A45] shadow-md border-2 border-white transition-all text-xs"
                                    title="Upload photo from device"
                                >
                                    📷
                                </button>
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarFileSelect}
                                className="hidden"
                            />

                            <div>
                                <h3 className="font-serif text-lg font-bold text-[var(--foreground)]">
                                    {profile.firstName} {profile.lastName}
                                </h3>
                                <p className="text-xs text-[var(--accent)] font-medium">
                                    {profile.title}
                                </p>
                                <span className="text-[11px] text-[var(--muted-foreground)] block mt-1">
                                    {profile.department}
                                </span>
                            </div>
                        </div>

                        {/* Avatar Actions */}
                        <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-2 bg-[var(--muted)] hover:bg-[var(--border)] text-[var(--foreground)] text-xs font-semibold rounded-md border border-[var(--border)] transition-all flex items-center justify-center gap-2"
                            >
                                <span>📤</span> Upload Photo from Computer
                            </button>

                            {profile.avatarUrl && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setProfile(prev => ({ ...prev, avatarUrl: "" }));
                                        showToast("Avatar image reset to monogram.", "success");
                                    }}
                                    className="w-full py-1.5 text-xs text-red-600 hover:text-red-700 transition-colors font-medium"
                                >
                                    Remove Avatar Image
                                </button>
                            )}
                        </div>

                        {/* Executive Avatar Presets */}
                        <div className="pt-2 border-t border-[var(--border)] space-y-2">
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] block">
                                Or Choose Executive Preset
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {AVATAR_PRESETS.map((preset) => (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => {
                                            setProfile(prev => ({ ...prev, avatarUrl: preset.url }));
                                            showToast(`Applied ${preset.label} preset.`, "success");
                                        }}
                                        className="flex items-center gap-2 p-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--muted)]/50 transition-all text-left"
                                    >
                                        <img
                                            src={preset.url}
                                            alt={preset.label}
                                            className="w-8 h-8 rounded-full object-cover shrink-0"
                                        />
                                        <span className="text-[11px] font-medium text-[var(--foreground)] truncate">
                                            {preset.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Personal & Practice Details */}
                    <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 shadow-sm space-y-5">
                        <div>
                            <h3 className="font-serif text-lg font-bold text-[var(--foreground)]">
                                Practitioner Credentials
                            </h3>
                            <p className="text-xs text-[var(--muted-foreground)]">
                                Your professional contact information and chamber assignment.
                            </p>
                        </div>

                        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-semibold text-[var(--foreground)] mb-1">
                                        First Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={profile.firstName}
                                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-[var(--foreground)] mb-1">
                                        Last Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={profile.lastName}
                                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-semibold text-[var(--foreground)] mb-1">
                                        Official Chamber Email
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            disabled
                                            value={profile.email}
                                            className="w-full px-3 py-2 bg-[var(--muted)]/50 border border-[var(--border)] rounded-md text-[var(--muted-foreground)] cursor-not-allowed"
                                        />
                                        <span className="absolute right-2.5 top-2 text-[10px] text-green-700 font-semibold bg-green-100 px-1.5 py-0.5 rounded">
                                            ✓ Verified
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-[var(--muted-foreground)] mt-0.5 block">
                                        Chamber email addresses are managed by Practice Administration.
                                    </span>
                                </div>

                                <div>
                                    <label className="block font-semibold text-[var(--foreground)] mb-1">
                                        Direct Telephone / Mobile
                                    </label>
                                    <input
                                        type="tel"
                                        value={profile.phone}
                                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                        placeholder="+234 803 123 4567"
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-semibold text-[var(--foreground)] mb-1">
                                        Professional Title / Silk Designation
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.title}
                                        onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                                        placeholder="e.g. Senior Advocate of Nigeria / Managing Partner"
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-[var(--foreground)] mb-1">
                                        Practice Department
                                    </label>
                                    <select
                                        value={profile.department}
                                        onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                    >
                                        <option value="Litigation & Dispute Resolution">Litigation & Dispute Resolution</option>
                                        <option value="Commercial & Corporate Law">Commercial & Corporate Law</option>
                                        <option value="Real Estate & Energy Practice">Real Estate & Energy Practice</option>
                                        <option value="Appellate & Constitutional Law">Appellate & Constitutional Law</option>
                                        <option value="Executive Administration">Executive Administration</option>
                                        <option value="Chambers Registry">Chambers Registry</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    NBA Supreme Court Roll / Bar Number
                                </label>
                                <input
                                    type="text"
                                    value={profile.barNumber}
                                    onChange={(e) => setProfile({ ...profile, barNumber: e.target.value })}
                                    placeholder="e.g. SCN/098421"
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] font-mono focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Practice Bio & Chamber Profile
                                </label>
                                <textarea
                                    rows={3}
                                    value={profile.bio}
                                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                    placeholder="Brief background on your key practice areas, court admissions, and legal expertise..."
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                                />
                            </div>

                            <div className="flex justify-end pt-3 border-t border-[var(--border)]">
                                <button
                                    type="submit"
                                    disabled={profileLoading}
                                    className="px-5 py-2.5 bg-[var(--primary)] text-white text-xs font-semibold rounded-md shadow hover:bg-[#0d223f] disabled:opacity-50 transition-all flex items-center gap-2"
                                >
                                    {profileLoading ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                            <span>Saving Profile...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>💾</span>
                                            <span>Save Profile Changes</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: PASSWORD & SECURITY                                                */}
            {/* ========================================================================= */}
            {activeTab === "security" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                    {/* Password Change Card */}
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 shadow-sm space-y-5">
                        <div>
                            <h3 className="font-serif text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                                <span>🔑</span> Change Account Password
                            </h3>
                            <p className="text-xs text-[var(--muted-foreground)]">
                                Keep your chambers credentials safe with cryptographic hashing.
                            </p>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Current Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? "text" : "password"}
                                        required
                                        placeholder="Enter your current password..."
                                        value={passwords.currentPassword}
                                        onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] pr-10 focus:outline-none focus:border-[var(--primary)]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3 top-2.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-xs"
                                    >
                                        {showCurrentPassword ? "👁️" : "🙈"}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    New Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        required
                                        placeholder="Minimum 6 characters..."
                                        value={passwords.newPassword}
                                        onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] pr-10 focus:outline-none focus:border-[var(--primary)]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-2.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-xs"
                                    >
                                        {showNewPassword ? "👁️" : "🙈"}
                                    </button>
                                </div>

                                {/* Password Strength Meter */}
                                {passwords.newPassword && (
                                    <div className="mt-2 space-y-1">
                                        <div className="h-1.5 w-full bg-[var(--muted)] rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${
                                                    passwordStrength <= 25
                                                        ? "bg-red-500 w-1/4"
                                                        : passwordStrength <= 50
                                                            ? "bg-amber-500 w-2/4"
                                                            : passwordStrength <= 75
                                                                ? "bg-blue-500 w-3/4"
                                                                : "bg-green-500 w-full"
                                                }`}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-[var(--muted-foreground)]">
                                            <span>Security Strength:</span>
                                            <span className="font-semibold">
                                                {passwordStrength <= 25 ? "Weak" : passwordStrength <= 50 ? "Fair" : passwordStrength <= 75 ? "Good" : "Strong"}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Confirm New Password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    required
                                    placeholder="Re-enter new password..."
                                    value={passwords.confirmPassword}
                                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                    className={`w-full px-3 py-2 bg-[var(--background)] border rounded-md text-[var(--foreground)] focus:outline-none ${
                                        passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword
                                            ? "border-red-400 focus:border-red-500"
                                            : "border-[var(--border)] focus:border-[var(--primary)]"
                                    }`}
                                />
                                {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                                    <span className="text-[10px] text-red-500 mt-0.5 block">
                                        Passwords do not match.
                                    </span>
                                )}
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={passwordLoading}
                                    className="w-full py-2.5 bg-[var(--primary)] text-white text-xs font-semibold rounded-md shadow hover:bg-[#0d223f] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    {passwordLoading ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                            <span>Updating Credentials...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>🔒</span>
                                            <span>Update Password</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Two-Factor Auth & Session Audit Card */}
                    <div className="space-y-6">
                        {/* Two Factor Card */}
                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h3 className="font-serif text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                                        <span>🛡️</span> Two-Factor Authentication (2FA)
                                    </h3>
                                    <p className="text-xs text-[var(--muted-foreground)]">
                                        Require an authenticator code or SMS verification when logging in.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={twoFactorEnabled}
                                        onChange={(e) => {
                                            const val = e.target.checked;
                                            setTwoFactorEnabled(val);
                                            showToast(val ? "2FA enabled for this account." : "2FA disabled.", "success");
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                                </label>
                            </div>

                            <div className="p-3 bg-[var(--muted)]/40 rounded-lg text-xs space-y-1 text-[var(--muted-foreground)]">
                                <div className="font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                                    <span>Status:</span>
                                    <span className={twoFactorEnabled ? "text-green-600" : "text-amber-600"}>
                                        {twoFactorEnabled ? "Active & Enforced" : "Standard (Single Password)"}
                                    </span>
                                </div>
                                <p className="text-[11px]">
                                    Complies with Nigerian Bar Association high-security digital litigation mandate.
                                </p>
                            </div>
                        </div>

                        {/* Active Session Overview */}
                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 shadow-sm space-y-4 text-xs">
                            <div>
                                <h3 className="font-serif text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                                    <span>💻</span> Active Chamber Session
                                </h3>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                    Device details and current authentication session.
                                </p>
                            </div>

                            <div className="p-3 border border-[var(--border)] rounded-lg bg-[var(--background)] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                                        ✓
                                    </div>
                                    <div>
                                        <div className="font-semibold text-[var(--foreground)]">
                                            Current Web Session (Lagos, NG)
                                        </div>
                                        <div className="text-[10px] text-[var(--muted-foreground)] font-mono">
                                            Windows Desktop • Chrome / Edge • Active Now
                                        </div>
                                    </div>
                                </div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                                    Current
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: NOTIFICATIONS & PREFERENCES                                       */}
            {/* ========================================================================= */}
            {activeTab === "notifications" && (
                <div className="max-w-3xl bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 shadow-sm space-y-6 animate-fade-in">
                    <div>
                        <h3 className="font-serif text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                            <span>🔔</span> Dispatch & Notification Preferences
                        </h3>
                        <p className="text-xs text-[var(--muted-foreground)]">
                            Configure how and when the Stalwart Practice System alerts you regarding case progress.
                        </p>
                    </div>

                    <form onSubmit={handleSaveNotifications} className="space-y-4">
                        <div className="space-y-3">
                            {[
                                {
                                    key: "courtReminders",
                                    label: "Court Appearance & Hearing Reminders",
                                    desc: "Receive automated alerts 24 hours and 2 hours before scheduled appearances and court fixtures."
                                },
                                {
                                    key: "matterAssignments",
                                    label: "Matter Assignments & Intake Alerts",
                                    desc: "Notification when lead counsel or practice partner assigns you to an active case."
                                },
                                {
                                    key: "inboundCommunications",
                                    label: "Inbound Client Emails & Communications",
                                    desc: "Alerts for incoming correspondence received through Stalwart mail relay or client portal."
                                },
                                {
                                    key: "taskApprovals",
                                    label: "Task Approvals & Document Seals",
                                    desc: "Notification when legal instruments are submitted, approved, or certified."
                                },
                                {
                                    key: "billingAlerts",
                                    label: "Invoice & Retainer Reminders",
                                    desc: "Alerts when client fees are paid or invoices become due for collection."
                                },
                            ].map((item) => (
                                <div
                                    key={item.key}
                                    className="p-3.5 border border-[var(--border)] rounded-lg bg-[var(--background)] flex items-center justify-between gap-4"
                                >
                                    <div>
                                        <div className="text-xs font-semibold text-[var(--foreground)]">
                                            {item.label}
                                        </div>
                                        <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                                            {item.desc}
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                        <input
                                            type="checkbox"
                                            checked={(notifications as any)[item.key]}
                                            onChange={(e) =>
                                                setNotifications({ ...notifications, [item.key]: e.target.checked })
                                            }
                                            className="sr-only peer"
                                        />
                                        <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                                    </label>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end pt-3 border-t border-[var(--border)]">
                            <button
                                type="submit"
                                disabled={notifLoading}
                                className="px-5 py-2.5 bg-[var(--primary)] text-white text-xs font-semibold rounded-md shadow hover:bg-[#0d223f] disabled:opacity-50 transition-all flex items-center gap-2"
                            >
                                {notifLoading ? "Saving Preferences..." : "Save Preferences"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: FIRM BRANDING & CONFIGURATION (Super Admin Only)                    */}
            {/* ========================================================================= */}
            {activeTab === "firm" && isSuperAdmin && (
                <div className="max-w-4xl bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 shadow-sm space-y-6 animate-fade-in">
                    <div>
                        <h3 className="font-serif text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                            <span>🏛️</span> Chambers Branding & Global Parameters
                        </h3>
                        <p className="text-xs text-[var(--muted-foreground)]">
                            Firm-wide letterhead, official crest, contact credentials, and statutory references.
                        </p>
                    </div>

                    <form onSubmit={handleSaveFirmSettings} className="space-y-5 text-xs">
                        {/* Firm Crest / Logo Upload */}
                        <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 flex flex-col sm:flex-row items-center gap-6">
                            <div className="w-24 h-24 rounded-lg bg-white border border-[var(--border)] p-2 flex items-center justify-center shrink-0 shadow-sm">
                                <img
                                    src={firmSettings.logoUrl || logo}
                                    alt="Chambers Crest"
                                    className="max-h-full max-w-full object-contain"
                                />
                            </div>

                            <div className="space-y-2 flex-1 text-center sm:text-left">
                                <div className="font-semibold text-sm text-[var(--foreground)]">
                                    Official Chambers Crest & Letterhead Seal
                                </div>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                    Rendered on formal court affidavits, verification certificates, client invoices, and letterheads.
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => firmLogoInputRef.current?.click()}
                                        className="px-3 py-1.5 bg-[var(--primary)] text-white text-xs font-semibold rounded hover:bg-[#0d223f] transition-all"
                                    >
                                        Change Firm Logo
                                    </button>
                                    <input
                                        ref={firmLogoInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFirmLogoSelect}
                                        className="hidden"
                                    />
                                    {firmSettings.logoUrl !== logo && (
                                        <button
                                            type="button"
                                            onClick={() => setFirmSettings({ ...firmSettings, logoUrl: logo })}
                                            className="px-3 py-1.5 border border-[var(--border)] text-xs text-[var(--muted-foreground)] hover:text-red-600 rounded transition-all"
                                        >
                                            Reset to Default Logo
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Firm Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Firm Legal Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={firmSettings.firmName}
                                    onChange={(e) => setFirmSettings({ ...firmSettings, firmName: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Firm Subtitle / Tagline
                                </label>
                                <input
                                    type="text"
                                    value={firmSettings.tagline}
                                    onChange={(e) => setFirmSettings({ ...firmSettings, tagline: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    General Inquiries Email
                                </label>
                                <input
                                    type="email"
                                    value={firmSettings.email}
                                    onChange={(e) => setFirmSettings({ ...firmSettings, email: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Chambers Switchboard Phone
                                </label>
                                <input
                                    type="text"
                                    value={firmSettings.phone}
                                    onChange={(e) => setFirmSettings({ ...firmSettings, phone: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-semibold text-[var(--foreground)] mb-1">
                                Chambers Physical Address
                            </label>
                            <input
                                type="text"
                                value={firmSettings.address}
                                onChange={(e) => setFirmSettings({ ...firmSettings, address: e.target.value })}
                                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Operating Currency
                                </label>
                                <select
                                    value={firmSettings.currency}
                                    onChange={(e) => setFirmSettings({ ...firmSettings, currency: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none"
                                >
                                    <option value="NGN">Nigerian Naira (₦ NGN)</option>
                                    <option value="USD">US Dollar ($ USD)</option>
                                    <option value="GBP">British Pound (£ GBP)</option>
                                    <option value="EUR">Euro (€ EUR)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    CAC Company Registration
                                </label>
                                <input
                                    type="text"
                                    value={firmSettings.cacNumber}
                                    onChange={(e) => setFirmSettings({ ...firmSettings, cacNumber: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] font-mono focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-[var(--foreground)] mb-1">
                                    Federal Tax ID (TIN)
                                </label>
                                <input
                                    type="text"
                                    value={firmSettings.taxId}
                                    onChange={(e) => setFirmSettings({ ...firmSettings, taxId: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)] font-mono focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-3 border-t border-[var(--border)]">
                            <button
                                type="submit"
                                disabled={firmLoading}
                                className="px-5 py-2.5 bg-[var(--primary)] text-white text-xs font-semibold rounded-md shadow hover:bg-[#0d223f] disabled:opacity-50 transition-all flex items-center gap-2"
                            >
                                {firmLoading ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                        <span>Saving Firm Parameters...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>💾</span>
                                        <span>Save Firm Configuration</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
