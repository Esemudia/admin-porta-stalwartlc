// ─── Auth module ────────────────────────────────────────────────────────────
// Stores the authenticated session in sessionStorage so it survives
// page refreshes within the same browser tab, but clears automatically
// when the tab is closed.

export type UserRole =
    | "client"
    | "lawyer"
    | "front_desk"
    | "exec_secretary"
    | "super_admin";

export interface AuthSession {
    role: UserRole;
    name: string;
    email: string;
    token?: string;
    userId?: string;
}

const SESSION_KEY = "slc_session";
const PERMISSIONS_STORAGE_KEY = "slc_role_permissions";

// ── Normalization helper ─────────────────────────────────────────────────────

export function normalizeRole(role?: string): UserRole {
    if (!role) return "front_desk";
    const r = role.toLowerCase().trim();
    if (r === "super_admin" || r === "superadmin" || r === "admin" || r === "managing_partner") {
        return "super_admin";
    }
    if (r === "lawyer" || r === "associate" || r === "counsel" || r === "partner" || r === "advocate") {
        return "lawyer";
    }
    if (r === "exec_secretary" || r === "secretary" || r === "admin_secretary") {
        return "exec_secretary";
    }
    if (r === "front_desk" || r === "receptionist") {
        return "front_desk";
    }
    if (r === "client") {
        return "client";
    }
    return "lawyer";
}

// ── Default Role Permissions Map ─────────────────────────────────────────────
// Rule: What a role does NOT have permission to access will NOT appear on the menu.

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    super_admin: [
        "dashboard",
        "clients",
        "matters",
        "documents",
        "tasks",
        "calendar",
        "communications",
        "billing",
        "reports",
        "verification",
        "archive",
        "administration",
    ],
    lawyer: [
        "dashboard",
        "clients",
        "matters",
        "documents",
        "tasks",
        "calendar",
        "communications",
        "verification",
    ],
    exec_secretary: [
        "dashboard",
        "clients",
        "matters",
        "documents",
        "tasks",
        "calendar",
        "communications",
        "archive",
        "administration",
    ],
    front_desk: [
        "dashboard",
        "clients",
        "tasks",
        "calendar",
        "communications",
    ],
    client: [
        "dashboard",
        "matters",
        "documents",
        "calendar",
        "communications",
    ],
};

// ── Persistence helpers ──────────────────────────────────────────────────────

export function getSession(): AuthSession | null {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
        return null;
    }
}

export function saveSession(session: AuthSession): void {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    window.dispatchEvent(new Event("slc-auth-change"));
}

export function clearSession(): void {
    sessionStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event("slc-auth-change"));
}

// ── Role Permissions Accessors & Modifiers ───────────────────────────────────

export function getAllRolePermissions(): Record<UserRole, string[]> {
    try {
        const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
                return {
                    super_admin: Array.isArray(parsed.super_admin) ? parsed.super_admin : DEFAULT_ROLE_PERMISSIONS.super_admin,
                    lawyer: Array.isArray(parsed.lawyer) ? parsed.lawyer : DEFAULT_ROLE_PERMISSIONS.lawyer,
                    exec_secretary: Array.isArray(parsed.exec_secretary) ? parsed.exec_secretary : DEFAULT_ROLE_PERMISSIONS.exec_secretary,
                    front_desk: Array.isArray(parsed.front_desk) ? parsed.front_desk : DEFAULT_ROLE_PERMISSIONS.front_desk,
                    client: Array.isArray(parsed.client) ? parsed.client : DEFAULT_ROLE_PERMISSIONS.client,
                };
            }
        }
    } catch {
        // Fallback to defaults if parsing fails
    }
    return { ...DEFAULT_ROLE_PERMISSIONS };
}

export function getRolePermissions(role?: string): string[] {
    const norm = normalizeRole(role);
    const all = getAllRolePermissions();
    return all[norm] || DEFAULT_ROLE_PERMISSIONS[norm] || ["dashboard"];
}

export function saveRolePermissions(role: UserRole, permissions: string[]): void {
    try {
        const all = getAllRolePermissions();
        all[role] = permissions;
        localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(all));
        window.dispatchEvent(new Event("slc-permissions-change"));
    } catch (e) {
        console.error("Failed to save role permissions:", e);
    }
}

export function resetRolePermissions(): void {
    try {
        localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
        window.dispatchEvent(new Event("slc-permissions-change"));
    } catch (e) {
        console.error("Failed to reset role permissions:", e);
    }
}

/**
 * Returns true if the specified role is permitted to access the navigation item ID.
 * If false, this module must NOT appear on the navigation menu.
 */
export function canAccessNav(role?: string, navId?: string): boolean {
    if (!navId) return true;
    const permissions = getRolePermissions(role);
    return permissions.includes(navId);
}

/**
 * Returns true if the user's role allows access to the provided internal route pathname.
 * Handles subroutes like "/internal/matters/123" by mapping to "matters".
 */
export function canAccessPortal(pathname?: string, role?: string): boolean {
    if (!pathname || pathname === "/internal" || pathname === "/internal/") return true;
    const match = pathname.match(/^\/internal\/([^/?#]+)/);
    if (!match) return true;
    const moduleName = match[1];
    return canAccessNav(role, moduleName);
}

// ── Portal URL mapping ───────────────────────────────────────────────────────
export function portalForRole(_role?: UserRole): string {
    return "/internal";
}

