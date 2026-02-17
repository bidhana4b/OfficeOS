import { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, getRoleDashboardPath } from "@/lib/auth";
import LoginPage from "@/components/auth/LoginPage";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Dashboard } from "@/components/dashboard";
import { ClientDashboard } from "@/components/client-dashboard";
import DebugPanel from "@/components/debug/DebugPanel";

function AuthRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (isAuthenticated && user) {
    return <Navigate to={getRoleDashboardPath(user.role)} replace />;
  }
  return <Navigate to="/login" replace />;
}

function UnauthorizedPage() {
  const { logout } = useAuth();
  return (
    <div className="h-screen bg-titan-bg flex items-center justify-center p-4">
      <div className="text-center glass-card p-8 max-w-md">
        <h1 className="font-display font-extrabold text-2xl text-titan-magenta mb-2">
          Access Denied
        </h1>
        <p className="font-mono text-sm text-white/40 mb-4">
          You don't have permission to access this page.
        </p>
        <button
          onClick={logout}
          className="px-6 py-2.5 rounded-xl bg-titan-cyan/15 border border-titan-cyan/30 font-display font-bold text-sm text-titan-cyan active:scale-95 transition-transform"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-titan-bg flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-titan-cyan/30 border-t-titan-cyan rounded-full animate-spin" />
            <p className="font-mono text-xs text-white/30">Loading...</p>
          </div>
        </div>
      }
    >
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Admin Dashboard (Super Admin sees full dashboard) */}
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Designer Dashboard */}
        <Route
          path="/dashboard/design"
          element={
            <ProtectedRoute allowedRoles={["designer"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Media Buyer Dashboard */}
        <Route
          path="/dashboard/media"
          element={
            <ProtectedRoute allowedRoles={["media_buyer"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Account Manager Dashboard */}
        <Route
          path="/dashboard/account"
          element={
            <ProtectedRoute allowedRoles={["account_manager"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Finance Dashboard */}
        <Route
          path="/dashboard/finance"
          element={
            <ProtectedRoute allowedRoles={["finance"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Client Dashboard (Mobile-First) */}
        <Route
          path="/dashboard/client"
          element={
            <ProtectedRoute allowedRoles={["client"]}>
              <ClientDashboard />
            </ProtectedRoute>
          }
        />

        {/* Debug System Panel */}
        <Route
          path="/debug/system"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <DebugPanel />
            </ProtectedRoute>
          }
        />

        {/* Root redirect */}
        <Route path="/" element={<AuthRedirect />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
