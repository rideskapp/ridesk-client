import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { UserRole } from "@/types";

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallbackPath?: string;
}

const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  allowedRoles,
  fallbackPath = "/dashboard",
}) => {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role as UserRole)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

export default RouteGuard;
