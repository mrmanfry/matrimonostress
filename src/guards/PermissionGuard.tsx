import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, hasPermission, type PermissionArea, type AreaPermission } from "@/contexts/AuthContext";

interface PermissionGuardProps {
  area: PermissionArea;
  level?: keyof AreaPermission;
  fallback?: string; // path per redirect (default /app/dashboard)
  children: ReactNode;
}

/**
 * Blocca l'accesso a una route se l'utente attivo non ha il permesso richiesto.
 * co_planner/planner passano sempre. Se il permesso manca → redirect al fallback.
 */
export function PermissionGuard({ area, level = "view", fallback = "/app/dashboard", children }: PermissionGuardProps) {
  const { authState } = useAuth();

  if (authState.status !== "authenticated") return <>{children}</>; // ProtectedRoute gestisce già l'auth
  const ok = hasPermission(authState.activeRole, authState.activePermissions, area, level);
  if (!ok) return <Navigate to={fallback} replace />;
  return <>{children}</>;
}
