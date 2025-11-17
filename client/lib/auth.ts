import { useEffect, useState } from "react";
import type { AuthSession } from "@shared/api";

const KEY = "ipims_auth_session";

export function saveSession(s: AuthSession) {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("auth:changed"));
}

export function clearSession() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("auth:changed"));
}

export function getSession(): AuthSession | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(getSession());
  useEffect(() => {
    const onStorage = () => setSession(getSession());
    const onCustom = () => setSession(getSession());
    window.addEventListener("storage", onStorage);
    window.addEventListener("auth:changed", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth:changed", onCustom as EventListener);
    };
  }, []);
  return { session, setSession } as const;
}

// Role-based helper functions for Football Academy Management System
export function isAdmin(session: AuthSession | null): boolean {
  return session?.role === 'admin' || session?.role === 'superadmin';
}

export function isSuperAdmin(session: AuthSession | null): boolean {
  return session?.role === 'superadmin';
}

// Dashboard Module Access Control
export function canAccessAdminPanel(session: AuthSession | null): boolean {
  return isAdmin(session);
}

export function canManageAdmins(session: AuthSession | null): boolean {
  return isSuperAdmin(session);
}

export function canAccessSystemSettings(session: AuthSession | null): boolean {
  return isAdmin(session);
}

export function canAccessReports(session: AuthSession | null): boolean {
  return isAdmin(session);
}

export function canAccessSupportManagement(session: AuthSession | null): boolean {
  return isAdmin(session);
}
