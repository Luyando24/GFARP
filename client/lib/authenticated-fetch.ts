import { getSession } from './auth';

declare global {
  interface Window {
    __authenticatedFetchInstalled?: boolean;
  }
}

export function installAuthenticatedFetch(): void {
  if (typeof window === 'undefined' || window.__authenticatedFetchInstalled) return;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = input instanceof Request ? input.url : String(input);
    const url = new URL(rawUrl, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) {
      return nativeFetch(input, init);
    }

    const apiPath = url.pathname.replace(/^\/api\//, '');
    const isPublicAuthRequest = [
      /^auth\/(login|forgot-password|reset-password)$/,
      /^football-auth\/(academy|agency)\/(login|register)$/,
      /^football-auth\/verify-email$/,
      /^individual-players\/(login|register|verify-email|resend-verification)$/,
    ].some((pattern) => pattern.test(apiPath));

    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
    const token = isPublicAuthRequest ? undefined : getSession()?.tokens?.accessToken;
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    return nativeFetch(input, { ...init, headers });
  };
  window.__authenticatedFetchInstalled = true;
}
