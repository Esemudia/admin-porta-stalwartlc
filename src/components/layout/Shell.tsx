import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getSession, clearSession, canAccessNav, canAccessPortal } from "../../auth";
import logo from "../../assets/logo.png";

export const navItems = [
    { id: "dashboard", label: "Dashboard", path: "/internal/dashboard", icon: "📊" },
    { id: "clients", label: "Clients", path: "/internal/clients", icon: "👥" },
    { id: "matters", label: "Matters", path: "/internal/matters", icon: "⚖️" },
    { id: "documents", label: "Documents", path: "/internal/documents", icon: "📄" },
    { id: "tasks", label: "Tasks", path: "/internal/tasks", icon: "✓" },
    { id: "calendar", label: "Calendar", path: "/internal/calendar", icon: "📅" },
    { id: "communications", label: "Communications", path: "/internal/communications", icon: "✉️" },
    { id: "billing", label: "Billing", path: "/internal/billing", icon: "💳" },
    { id: "reports", label: "Reports", path: "/internal/reports", icon: "📉" },
    { id: "verification", label: "Verification", path: "/internal/verification", icon: "🛡️" },
    { id: "archive", label: "Archive", path: "/internal/archive", icon: "🗄️" },
    { id: "administration", label: "Administration", path: "/internal/administration", icon: "🏛️" },
    { id: "settings", label: "Settings", path: "/internal/settings", icon: "⚙️" },
];

export default function Shell() {
    const location = useLocation();
    const navigate = useNavigate();
    const [session, setSession] = useState(getSession());
    const [, setPermRevision] = useState(0);

    // Sync session and role permissions across tabs or live updates
    useEffect(() => {
        const handleAuthChange = () => setSession(getSession());
        const handlePermChange = () => setPermRevision((r) => r + 1);

        window.addEventListener("slc-auth-change", handleAuthChange);
        window.addEventListener("slc-permissions-change", handlePermChange);
        window.addEventListener("storage", handlePermChange);

        return () => {
            window.removeEventListener("slc-auth-change", handleAuthChange);
            window.removeEventListener("slc-permissions-change", handlePermChange);
            window.removeEventListener("storage", handlePermChange);
        };
    }, []);

    const handleLogout = () => {
        clearSession();
        navigate("/login");
    };

    // Filter menu items: Only items the role has permission to access appear on the menu
    const visibleNavItems = navItems.filter((item) => canAccessNav(session?.role, item.id));

    // Check if the current route is unauthorized for the user's role
    const isRouteRestricted = !canAccessPortal(location.pathname, session?.role);
    const currentNav = navItems.find((n) => location.pathname.startsWith(n.path));

    const roleFormatted = session?.role?.replace("_", " ") || "Staff";

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
            {/* Premium Navy Sidebar */}
            <aside className="w-64 flex-shrink-0 flex flex-col bg-[var(--primary)] text-white shadow-xl z-20">
                <div className="h-16 flex items-center px-5 border-b border-white/10 shrink-0 gap-3">
                    <img
                        src={logo}
                        alt="Stalwart Law Consult"
                        className="h-9 w-auto object-contain filter drop-shadow-[0_2px_6px_rgba(213,170,109,0.3)]"
                    />
                    <div className="flex flex-col">
                        <span className="font-serif text-base font-bold tracking-wide text-white leading-tight">
                            STALWART
                        </span>
                        <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--accent)] font-semibold leading-tight">
                            Law Consult
                        </span>
                    </div>
                </div>

                {/* Filtered Dynamic Navigation Menu */}
                <div className="flex-1 overflow-y-auto py-6">
                    <div className="px-3 mb-2">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-white/40 px-2 block">
                            Practice Navigation
                        </span>
                    </div>

                    <nav className="space-y-1 px-3">
                        {visibleNavItems.map((item) => {
                            const isActive = location.pathname.startsWith(item.path);
                            return (
                                <Link
                                    key={item.id}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 ${isActive
                                        ? "bg-[var(--accent)] text-[var(--primary)] font-semibold shadow-md"
                                        : "text-white/70 hover:bg-white/10 hover:text-white hover:translate-x-1"
                                        }`}
                                >
                                    <span className="text-base">{item.icon}</span>
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* User Session & Role Indicator */}
                <div className="p-4 border-t border-white/10 bg-black/20">
                    <Link
                        to={canAccessNav(session?.role, "settings") ? "/internal/settings" : "#"}
                        className={`flex items-center gap-3 mb-3 px-2 py-1.5 rounded-lg transition-colors group ${
                            canAccessNav(session?.role, "settings") ? "hover:bg-white/10 cursor-pointer" : "cursor-default"
                        }`}
                        title={canAccessNav(session?.role, "settings") ? "Account & Profile Settings" : session?.name || "User"}
                    >
                        <div className="w-9 h-9 rounded-full bg-[var(--accent)] flex items-center justify-center text-[var(--primary)] font-bold text-xs ring-2 ring-white/20 shrink-0 overflow-hidden shadow-sm">
                            {session?.avatarUrl ? (
                                <img
                                    src={session.avatarUrl}
                                    alt={session.name}
                                    className="w-full h-full object-cover rounded-full"
                                />
                            ) : (
                                <span>{session?.name ? session.name.substring(0, 2).toUpperCase() : "U"}</span>
                            )}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-sm font-medium text-white truncate group-hover:text-[var(--accent)] transition-colors">
                                {session?.name || "User"}
                            </span>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-[var(--accent)] capitalize tracking-wide font-medium truncate">
                                    {roleFormatted}
                                </span>
                                {canAccessNav(session?.role, "settings") && (
                                    <span className="text-[11px] opacity-40 group-hover:opacity-100 transition-opacity" title="Settings">⚙️</span>
                                )}
                            </div>
                        </div>
                    </Link>

                    <div className="px-2 mb-3">
                        <div className="flex items-center justify-between text-[10px] text-white/50 font-mono">
                            <span>Access Level:</span>
                            <span className="text-[var(--accent)]">
                                {visibleNavItems.length}/{navItems.length} modules
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {canAccessNav(session?.role, "settings") && (
                            <Link
                                to="/internal/settings"
                                className="py-2 px-3 text-xs border border-white/20 text-white/80 hover:text-white hover:bg-white/10 transition-colors rounded-md font-medium tracking-wide flex items-center justify-center gap-1.5"
                                title="Practice & Profile Settings"
                            >
                                <span>⚙️</span>
                                <span className="hidden sm:inline">Settings</span>
                            </Link>
                        )}
                        <button
                            onClick={handleLogout}
                            className="flex-1 py-2 text-xs border border-white/20 text-white/70 hover:text-white hover:bg-white/10 transition-colors rounded-md font-medium tracking-wide uppercase"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#f8f9fa]">
                <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-[var(--border)] shrink-0 shadow-sm z-10">
                    <div className="flex flex-col">
                        <div className="font-serif text-lg font-semibold text-[var(--primary)] flex items-center gap-2">
                            {isRouteRestricted ? (
                                <>
                                    <span className="text-amber-600">🔒</span>
                                    <span>Restricted Practice Area</span>
                                </>
                            ) : (
                                navItems.find((n) => location.pathname.startsWith(n.path))?.label || "Workspace"
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200 text-xs text-slate-600 font-mono">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="capitalize">{roleFormatted}</span>
                        </div>
                        {canAccessNav(session?.role, "settings") && (
                            <Link
                                to="/internal/settings"
                                className="text-[var(--primary)] hover:opacity-70 p-2 rounded-full hover:bg-[var(--primary)]/5 transition-colors flex items-center justify-center text-sm"
                                title="Settings & Profile"
                            >
                                ⚙️
                            </Link>
                        )}
                        <button className="text-[var(--primary)] hover:opacity-70 relative p-2 rounded-full hover:bg-[var(--primary)]/5 transition-colors" title="Notifications">
                            🔔
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8 relative">
                    {/* Guarded View: If unauthorized route was navigated to directly */}
                    {isRouteRestricted ? (
                        <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-xl border border-slate-200 shadow-md text-center">
                            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-2xl flex items-center justify-center mx-auto mb-4">
                                🛡️
                            </div>
                            <h2 className="font-serif text-2xl font-bold text-slate-900 mb-2">
                                Access Restricted by Firm Policy
                            </h2>
                            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                                You do not have permission to access the{" "}
                                <strong className="text-slate-900 font-semibold">
                                    {currentNav?.label || "requested"}
                                </strong>{" "}
                                module. Under Stalwart Law Consult's internal governance policy, this area is not permitted for your role (
                                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 uppercase">
                                    {roleFormatted}
                                </span>
                                ).
                            </p>
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 mb-6 text-left">
                                <strong className="text-slate-700 block mb-1">Access Control Principle:</strong>
                                Modules and sensitive operations you are not permitted to access are kept confidential and removed from your practice navigation menu.
                            </div>
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={() => navigate("/internal/dashboard")}
                                    className="px-5 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-md shadow-sm hover:brightness-110 transition-all"
                                >
                                    Return to Dashboard
                                </button>
                                {visibleNavItems.length > 0 && visibleNavItems[0].path !== "/internal/dashboard" && (
                                    <button
                                        onClick={() => navigate(visibleNavItems[0].path)}
                                        className="px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 transition-all"
                                    >
                                        Go to {visibleNavItems[0].label}
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <Outlet />
                    )}
                </main>
            </div>
        </div>
    );
}

