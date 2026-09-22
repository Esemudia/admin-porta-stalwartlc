import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import LoginPage from "./pages/Login/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Shell from "./components/layout/Shell";
import Dashboard from "./pages/internal/Dashboard";
import Clients from "./pages/internal/Clients";
import ClientProfile from "./pages/internal/ClientProfile";
import Matters from "./pages/internal/Matters";
import MatterWorkspace from "./pages/internal/MatterWorkspace";
import Documents from "./pages/internal/Documents";
import Tasks from "./pages/internal/Tasks";
import Calendar from "./pages/internal/Calendar";
import Communications from "./pages/internal/Communications";
import Billing from "./pages/internal/Billing";
import Reports from "./pages/internal/Reports";
import Verification from "./pages/internal/Verification";
import Archive from "./pages/internal/Archive";
import Administration from "./pages/internal/Administration";
import AdminPortal from "./pages/AdminPortal/AdminPortal";
import StaffPortal from "./pages/StaffPortal/StaffPortal";
import SuperAdminPortal from "./pages/SuperAdminPortal/SuperAdminPortal";
import ClientPortal from "./pages/ClientPortal/ClientPortal";
import LawyerPortal from "./components/LawyerPortal";
import { getSession, clearSession } from "./auth";

function RootRedirect() {
  const session = getSession();
  if (session) {
    return <Navigate to="/internal/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
}

function LawyerPortalWrapper() {
  const navigate = useNavigate();
  return (
    <LawyerPortal
      onLogout={() => {
        clearSession();
        navigate("/login");
      }}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* Public login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Internal Unified Shell for Lawyers / Staff / Admins */}
        <Route
          path="/internal"
          element={
            <ProtectedRoute>
              <Shell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:id" element={<ClientProfile />} />
          <Route path="matters" element={<Matters />} />
          <Route path="matters/:id" element={<MatterWorkspace />} />
          <Route path="documents" element={<Documents />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="communications" element={<Communications />} />
          <Route path="billing" element={<Billing />} />
          <Route path="reports" element={<Reports />} />
          <Route path="verification" element={<Verification />} />
          <Route path="archive" element={<Archive />} />
          <Route path="administration" element={<Administration />} />
        </Route>

        {/* Dedicated Individual Portals */}
        <Route
          path="/portal/admin"
          element={
            <ProtectedRoute>
              <AdminPortal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal/staff"
          element={
            <ProtectedRoute>
              <StaffPortal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal/super-admin"
          element={
            <ProtectedRoute>
              <SuperAdminPortal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal/client"
          element={
            <ProtectedRoute>
              <ClientPortal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal/lawyer"
          element={
            <ProtectedRoute>
              <LawyerPortalWrapper />
            </ProtectedRoute>
          }
        />

        {/* Convenience alias paths */}
        <Route path="/admin" element={<Navigate to="/portal/admin" replace />} />
        <Route path="/staff" element={<Navigate to="/portal/staff" replace />} />
        <Route path="/super-admin" element={<Navigate to="/portal/super-admin" replace />} />
        <Route path="/client" element={<Navigate to="/portal/client" replace />} />
        <Route path="/lawyer" element={<Navigate to="/portal/lawyer" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
