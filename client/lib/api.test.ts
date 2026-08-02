import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  clearSession: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("./auth", () => authMocks);

import { Api } from "./api";

describe("API authentication failures", () => {
  beforeEach(() => {
    authMocks.clearSession.mockReset();
    authMocks.getSession.mockReset();
    vi.restoreAllMocks();
  });

  it("does not clear or redirect the session when an unauthenticated login returns 401", async () => {
    authMocks.getSession.mockReturnValue(null);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ message: "Invalid email or password" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    ));

    await expect(Api.post("football-auth/academy/login", {
      email: "academy@example.com",
      password: "wrong-password",
    })).rejects.toThrow("Invalid email or password");

    expect(authMocks.clearSession).not.toHaveBeenCalled();
  });

  it("clears an existing session when an authenticated request returns 401", async () => {
    authMocks.getSession.mockReturnValue({
      userId: "academy-1",
      role: "academy",
      tokens: { accessToken: "expired-token", expiresInSec: 0 },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ message: "Session expired" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    ));

    await expect(Api.get("football-players"))
      .rejects.toThrow("Session expired");

    expect(authMocks.clearSession).toHaveBeenCalledOnce();
  });
});
