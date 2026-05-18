import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SidebarProvider } from "./contexts/SidebarContext";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./contexts/AuthContext";

import { LoginPage } from "./screens/LoginPage";
import { MainLayout } from "./components/layout/MainLayout";

import { Dashboard as EmployeeDashboard } from "./screens/employee/Dashboard";
import { CreateGoalSheet } from "./screens/employee/CreateGoalSheet";
import { MyGoals } from "./screens/employee/MyGoals";
import { QuarterlyCheckin as EmployeeCheckin } from "./screens/employee/QuarterlyCheckin";

import { ApprovalsQueue } from "./screens/manager/ApprovalsQueue";
import { TeamDashboard } from "./screens/manager/TeamDashboard";
import { CheckinReview } from "./screens/manager/CheckinReview";

import { OrganizationDashboard } from "./screens/admin/OrganizationDashboard";
import { CycleConfiguration } from "./screens/admin/CycleConfiguration";
import { SharedGoals } from "./screens/admin/SharedGoals";
import { AchievementReport } from "./screens/admin/AchievementReport";
import { AuditTrail } from "./screens/admin/AuditTrail";

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <LoginPage />;
  if (user.role === "employee") return <Navigate to="/employee/dashboard" replace />;
  if (user.role === "manager") return <Navigate to="/manager/team-dashboard" replace />;
  if (user.role === "admin") return <Navigate to="/admin/organization" replace />;
  return <LoginPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RoleRedirect />} />

      <Route path="/employee/*" element={
        <ProtectedRoute allowedRoles={["employee"]}>
          <MainLayout userRole="Employee">
            <Routes>
              <Route path="dashboard" element={<EmployeeDashboard />} />
              <Route path="create-goals" element={<CreateGoalSheet />} />
              <Route path="my-goals" element={<MyGoals />} />
              <Route path="checkin" element={<EmployeeCheckin />} />
              <Route path="*" element={<Navigate to="/employee/dashboard" replace />} />
            </Routes>
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/manager/*" element={
        <ProtectedRoute allowedRoles={["manager"]}>
          <MainLayout userRole="Manager">
            <Routes>
              <Route path="team-dashboard" element={<TeamDashboard />} />
              <Route path="approvals" element={<ApprovalsQueue />} />
              <Route path="checkin-review" element={<CheckinReview />} />
              <Route path="*" element={<Navigate to="/manager/team-dashboard" replace />} />
            </Routes>
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={["admin"]}>
          <MainLayout userRole="Admin">
            <Routes>
              <Route path="organization" element={<OrganizationDashboard />} />
              <Route path="cycle-config" element={<CycleConfiguration />} />
              <Route path="shared-goals" element={<SharedGoals />} />
              <Route path="reports" element={<AchievementReport />} />
              <Route path="audit-trail" element={<AuditTrail />} />
              <Route path="*" element={<Navigate to="/admin/organization" replace />} />
            </Routes>
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </SidebarProvider>
    </ThemeProvider>
  );
}