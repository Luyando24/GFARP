import { beforeEach, describe, expect, it } from "vitest";
import {
  getAccessTokenExpiration,
  getSession,
  isAccessTokenExpired,
} from "./auth";

const createMemoryStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, String(value)); },
  };
};

const makeToken = (payload: Record<string, unknown>) => {
  const encode = (value: Record<string, unknown>) => btoa(JSON.stringify(value))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`;
};

describe("stored authentication session", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createMemoryStorage(),
      configurable: true,
    });
  });

  it("reads the JWT expiration time", () => {
    const token = makeToken({ exp: 2_000 });
    expect(getAccessTokenExpiration(token)).toBe(2_000_000);
  });

  it("detects an expired access token", () => {
    const token = makeToken({ exp: 2_000 });
    expect(isAccessTokenExpired(token, 2_000_000)).toBe(true);
    expect(isAccessTokenExpired(token, 1_999_999)).toBe(false);
  });

  it("removes stale session and academy cache data", () => {
    const token = makeToken({ exp: 1 });
    localStorage.setItem("ipims_auth_session", JSON.stringify({
      userId: "academy-1",
      role: "academy",
      tokens: { accessToken: token, expiresInSec: 1 },
    }));
    localStorage.setItem("academy_data", JSON.stringify({ id: "academy-1" }));

    expect(getSession()).toBeNull();
    expect(localStorage.getItem("ipims_auth_session")).toBeNull();
    expect(localStorage.getItem("academy_data")).toBeNull();
  });

  it("keeps a valid session", () => {
    const token = makeToken({ exp: 4_000_000_000 });
    localStorage.setItem("ipims_auth_session", JSON.stringify({
      userId: "academy-1",
      role: "academy",
      tokens: { accessToken: token, expiresInSec: 3600 },
    }));

    expect(getSession()?.userId).toBe("academy-1");
  });
});
