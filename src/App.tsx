import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster, toast, ToastBar } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useErrorTranslation } from "@/hooks/useErrorTranslation";
import { X } from "lucide-react";

import { useAuthStore } from "@/store/auth";
import { useI18nStore } from "@/store/i18n";
import LoginForm from "@/components/auth/LoginForm";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import UserManagement from "@/components/admin/UserManagement";
import SchoolManagement from "@/components/schools/SchoolManagement";
import AdminSchoolManagement from "@/components/admin/SchoolManagement";
import { StudentManagement } from "@/components/students/StudentManagement";
import Instructors from "@/components/instructors/Instructors";
import { SchoolUserManagement } from "@/components/school/UserManagement";
import { InvitationAcceptance } from "@/pages/InvitationAcceptance";
import InstructorRegistrationPage from "@/pages/InstructorRegistrationPage";
import StudentRegistrationPage from "@/pages/StudentRegistrationPage";
import { StudentFormPage } from "@/pages/StudentFormPage";
import Dashboard from "@/pages/Dashboard";
import UnifiedSidebar from "@/components/UnifiedSidebar";
import RouteGuard from "@/components/RouteGuard";
import { authApi, LoginRequest } from "@/services/auth";
import { UserRole } from "@/types";
import "./i18n";
import Calendar from "@/pages/Calendar";
import AvailabilityEditor from "@/pages/AvailabilityEditor";
import InstructorCalendar from "@/pages/InstructorCalendar";
import InstructorAvailability from "@/pages/InstructorAvailability";
import InstructorProfilePage from "@/pages/InstructorProfilePage";
import SuperAdminSchoolProfiles from "./pages/SuperAdminSchoolProfiles";
import SuperAdminSchoolProfileEditor from "./pages/SuperAdminSchoolProfileEditor";
import SchoolCalendarPage from "@/pages/SchoolCalendar";
import SuperAdminSchoolCalendars from "./pages/SuperAdminSchoolCalendars";
import SuperAdminSchoolCalendarEditor from "./pages/SuperAdminSchoolCalendarEditor";
import SuperAdminSystemConfigurations from "./pages/SuperAdminSystemConfigurations";
import SuperAdminSystemConfigurationEditor from "./pages/SuperAdminSystemConfigurationEditor";
import SchoolAdminSystemConfigurations from "./pages/SchoolAdminSystemConfigurations";
import SuperAdminSettings from "./pages/SuperAdminSettings";
// import SuperAdminSystemSettings from "./pages/SuperAdminSystemSettings";
// import SuperAdminSystemSettingsEditor from "./pages/SuperAdminSystemSettingsEditor";
import BookingsPage from "./pages/Bookings";
import LessonDetailsPage from "./pages/LessonDetailsPage";
import InstructorCompensationsPage from "./pages/InstructorCompensations";
import StudentDetailPage from "./pages/StudentDetailPage";
import ReportingPage from "./pages/Reporting";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Inner component that can use hooks
const AppContent: React.FC = () => {
  const { user, isAuthenticated, login, logout } = useAuthStore();
  const { language } = useI18nStore();
  const { i18n, t } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Sync language with i18n
  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

  // Initialize auth state from localStorage on app startup
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    console.log("=== TOKEN VALIDATION ===");
    console.log("Token from localStorage:", token);
    console.log("isAuthenticated:", isAuthenticated);

    if (token && !isAuthenticated) {
      console.log("Attempting token validation...");
      // Try to validate the token by making a request to /me
      authApi
        .getProfile()
        .then((user) => {
          console.log("Token validation successful, user:", user);
          login(user, token);
        })
        .catch((error) => {
          console.warn("Token validation failed:", error);
          localStorage.removeItem("auth_token");
          logout();
        });
    }
  }, [isAuthenticated, login, logout]);

  const handleLogin = async (data: LoginRequest) => {
    try {
      setIsLoading(true);
      console.log("=== LOGIN ATTEMPT ===");
      console.log("Login data:", data);

      const response = await authApi.login(data);
      console.log("Login response:", response);
      console.log("Response user:", response.user);
      console.log("Response token:", response.token);

      // Store token in localStorage
      localStorage.setItem("auth_token", response.token);
      console.log("Token stored:", response.token);

      // Update auth store
      login(response.user, response.token);
      console.log("Auth store updated with user:", response.user);

      // Navigate to dashboard after successful login
      navigate("/dashboard");
      toast.success(t("auth.loginSuccess"));
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(getTranslatedError(error) || t("auth.loginFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.warn("Logout API call failed:", error);
    } finally {
      // Always clear local storage and auth state
      localStorage.removeItem("auth_token");
      logout();
      toast.success(t("auth.logoutSuccess"));
    }
  };

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/invitation" element={<InvitationAcceptance />} />
        <Route path="/student-form" element={<StudentFormPage />} />
        <Route
          path="/instructor-registration/:schoolIdentifier"
          element={<InstructorRegistrationPage />}
        />
        <Route
          path="/student-registration/:schoolIdentifier"
          element={<StudentRegistrationPage />}
        />
        <Route path="/forgot-password" element={<ForgotPasswordForm />} />
        <Route
          path="*"
          element={<LoginForm onLogin={handleLogin} isLoading={isLoading} />}
        />
      </Routes>
    );
  }

  // Debug: Log user info
  console.log("=== APP DEBUG ===");
  console.log("isAuthenticated:", isAuthenticated);
  console.log("user:", user);
  console.log("user?.role:", user?.role);
  console.log("user?.role === 'SUPER_ADMIN':", user?.role === "SUPER_ADMIN");

  // All authenticated users use the unified sidebar

  return (
    <UnifiedSidebar onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/admin/users"
          element={
            <RouteGuard allowedRoles={[UserRole.SUPER_ADMIN]}>
              <UserManagement />
            </RouteGuard>
          }
        />
        <Route
          path="/admin/schools"
          element={
            <RouteGuard allowedRoles={[UserRole.SUPER_ADMIN]}>
              <AdminSchoolManagement />
            </RouteGuard>
          }
        />
        <Route
          path="/admin/school-profiles"
          element={
            <RouteGuard allowedRoles={[UserRole.SUPER_ADMIN]}>
              <SuperAdminSchoolProfiles />
            </RouteGuard>
          }
        />
        <Route
          path="/admin/school-profiles/:schoolId"
          element={
            <RouteGuard allowedRoles={[UserRole.SUPER_ADMIN]}>
              <SuperAdminSchoolProfileEditor />
            </RouteGuard>
          }
        />
        <Route
          path="/admin/school-calendars"
          element={
            <RouteGuard allowedRoles={[UserRole.SUPER_ADMIN]}>
              <SuperAdminSchoolCalendars />
            </RouteGuard>
          }
        />
        <Route
          path="/admin/school-calendars/:schoolId"
          element={
            <RouteGuard allowedRoles={[UserRole.SUPER_ADMIN]}>
              <SuperAdminSchoolCalendarEditor />
            </RouteGuard>
          }
        />
        {/* <Route
          path="/admin/settings"
          element={
            <RouteGuard allowedRoles={[UserRole.SUPER_ADMIN]}>
              <SuperAdminSystemSettings />
            </RouteGuard>
          }
        />
        <Route
          path="/admin/settings/:schoolId"
          element={
            <RouteGuard allowedRoles={[UserRole.SUPER_ADMIN]}>
              <SuperAdminSystemSettingsEditor />
            </RouteGuard>
          }
        /> */}
        <Route
          path="/admin/system-configurations"
          element={
            <RouteGuard allowedRoles={[UserRole.SUPER_ADMIN]}>
              <SuperAdminSystemConfigurations />
            </RouteGuard>
          }
        />
        <Route
          path="/admin/system-configurations/:schoolId"
          element={
            <RouteGuard allowedRoles={[UserRole.SUPER_ADMIN]}>
              <SuperAdminSystemConfigurationEditor />
            </RouteGuard>
          }
        />
        <Route
          path="/system-configurations"
          element={
            <RouteGuard allowedRoles={[UserRole.SCHOOL_ADMIN]}>
              <SchoolAdminSystemConfigurations />
            </RouteGuard>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <RouteGuard allowedRoles={[UserRole.SUPER_ADMIN]}>
              <SuperAdminSettings />
            </RouteGuard>
          }
        />
        <Route path="/school" element={<SchoolManagement />} />
        <Route
          path="/school/users"
          element={
            <RouteGuard allowedRoles={[UserRole.SUPER_ADMIN]}>
              <SchoolUserManagement />
            </RouteGuard>
          }
        />
        <Route
          path="/students"
          element={
            <RouteGuard
              allowedRoles={[UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN]}
            >
              <StudentManagement />
            </RouteGuard>
          }
        />
        <Route
          path="/students/:id"
          element={
            <RouteGuard
              allowedRoles={[UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN]}
            >
              <StudentDetailPage />
            </RouteGuard>
          }
        />
        <Route
          path="/instructors"
          element={
            <RouteGuard
              allowedRoles={[UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN]}
            >
              <Instructors />
            </RouteGuard>
          }
        />
        <Route
          path="/instructors/:id"
          element={
            <RouteGuard
              allowedRoles={[UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN]}
            >
              <InstructorProfilePage />
            </RouteGuard>
          }
        />
        <Route
          path="/bookings"
          element={
            <RouteGuard
              allowedRoles={[UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN]}
            >
              <BookingsPage />
            </RouteGuard>
          }
        />
        <Route
          path="/compensations"
          element={
            <RouteGuard
              allowedRoles={[
                UserRole.SCHOOL_ADMIN,
                UserRole.SUPER_ADMIN,
                UserRole.INSTRUCTOR,
              ]}
            >
              <InstructorCompensationsPage />
            </RouteGuard>
          }
        />
        <Route
          path="/reporting"
          element={
            <RouteGuard
              allowedRoles={[UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN]}
            >
              <ReportingPage />
            </RouteGuard>
          }
        />
        <Route
          path="/calendar"
          element={
            <RouteGuard
              allowedRoles={[
                UserRole.SCHOOL_ADMIN,
                UserRole.INSTRUCTOR,
                UserRole.USER,
                UserRole.SUPER_ADMIN,
              ]}
            >
              <Calendar />
            </RouteGuard>
          }
        />
        <Route path="/lessons" element={<Calendar />} />
        <Route path="/lessons/:id" element={<LessonDetailsPage />} />
        <Route path="/school-calendar" element={<SchoolCalendarPage />} />
        <Route
          path="/instructor-calendar"
          element={
            <RouteGuard allowedRoles={[UserRole.INSTRUCTOR]}>
              <InstructorCalendar />
            </RouteGuard>
          }
        />
        <Route
          path="/instructor-availability"
          element={
            <RouteGuard allowedRoles={[UserRole.INSTRUCTOR]}>
              <InstructorAvailability />
            </RouteGuard>
          }
        />
        <Route
          path="/instructor-profile"
          element={
            <RouteGuard allowedRoles={[UserRole.INSTRUCTOR]}>
              <InstructorProfilePage />
            </RouteGuard>
          }
        />
        <Route path="/availability" element={<AvailabilityEditor />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        {/* Add more routes here */}
      </Routes>
    </UnifiedSidebar>
  );
};

// Main App component that provides the Router context
const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            success: {
              duration: 3000,
            },
            error: {
              duration: 4000,
            },
          }}
        >
          {(t) => (
            <ToastBar toast={t}>
              {({ icon, message }) => (
                <>
                  {icon}
                  {message}
                  {t.type !== "loading" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.dismiss(t.id);
                      }}
                      className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                      aria-label="Close"
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}
            </ToastBar>
          )}
        </Toaster>
      </Router>
    </QueryClientProvider >
  );
};

export default App;
