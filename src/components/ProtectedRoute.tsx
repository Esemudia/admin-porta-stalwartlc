import { Navigate, useLocation } from "react-router-dom";
import { getSession } from "../auth";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

/**
 * Wraps protected portal pages.
 * - If not logged in → redirect to /login preserving target destination.
 * - Once authenticated → full access granted without role restrictions.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const location = useLocation();
    const session = getSession();

    if (!session) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    return <>{children}</>;
}
