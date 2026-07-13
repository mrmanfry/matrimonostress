import { useAuth } from "@/contexts/AuthContext";
import { hasPermission, type PermissionArea, type AreaPermission } from "@/contexts/AuthContext";

/**
 * Hook: verifica un permesso granulare per l'utente attivo.
 * co_planner e planner ottengono sempre `true`.
 */
export function usePermission(area: PermissionArea, level: keyof AreaPermission = "view"): boolean {
  const { authState } = useAuth();
  if (authState.status !== "authenticated") return false;
  return hasPermission(authState.activeRole, authState.activePermissions, area, level);
}

/** Ritorna l'intero AreaPermission per l'area richiesta (utile per gate multipli). */
export function useAreaPermissions(area: PermissionArea): AreaPermission {
  const { authState } = useAuth();
  if (authState.status !== "authenticated") return { view: false, edit: false, create: false };
  if (authState.activeRole === "co_planner" || authState.activeRole === "planner") {
    return { view: true, edit: true, create: true };
  }
  return authState.activePermissions?.[area] ?? { view: false, edit: false, create: false };
}
