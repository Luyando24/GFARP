import { useEffect, useState } from "react";
import type { AuthSession } from "@shared/api";

const KEY = "ipims_auth_session";

export function getAccessTokenExpiration(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const normalizedPayload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - normalizedPayload.length % 4) % 4),
      "=",
    );
    const payload = JSON.parse(atob(paddedPayload));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(token: string, now = Date.now()): boolean {
  const expiresAt = getAccessTokenExpiration(token);
  return expiresAt !== null && expiresAt <= now;
}

function removeStoredSession() {
  localStorage.removeItem(KEY);
  localStorage.removeItem("academy_data");
  localStorage.removeItem("agency_data");
  localStorage.removeItem("subscription_data");
}

export function saveSession(s: AuthSession) {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("auth:changed"));
}

export function clearSession() {
  removeStoredSession();
  window.dispatchEvent(new CustomEvent("auth:changed"));
  // Redirect to portal after logout
  window.location.href = "/portal";
}

export function getSession(): AuthSession | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AuthSession;
    const token = session.tokens?.accessToken;
    if (!token || isAccessTokenExpired(token)) {
      removeStoredSession();
      return null;
    }
    return session;
  } catch {
    removeStoredSession();
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
  return { session, setSession, logout: clearSession } as const;
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

