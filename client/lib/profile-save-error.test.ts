import { describe, expect, it } from "vitest";
import { AuthError, NetworkError } from "./errors";
import { getProfileSaveErrorMessage } from "./profile-save-error";

describe("getProfileSaveErrorMessage", () => {
  it("explains an offline failure and offers retry", () => {
    expect(getProfileSaveErrorMessage(new NetworkError(), false)).toEqual({
      title: "No internet connection",
      description: "Your changes are still here. Reconnect to the internet, then tap Retry.",
      action: "retry",
    });
  });

  it("explains a network failure while the browser reports online", () => {
    const result = getProfileSaveErrorMessage(new NetworkError("Unable to connect to server"), true);

    expect(result.title).toBe("Couldn’t reach the server");
    expect(result.action).toBe("retry");
  });

  it("directs an expired session back to sign in", () => {
    const result = getProfileSaveErrorMessage(new AuthError("Unauthorized"), true);

    expect(result.title).toBe("Your session has expired");
    expect(result.action).toBe("sign-in");
  });

  it("shows an actionable validation message without retrying unchanged data", () => {
    const error = Object.assign(new Error("Link Name is already taken."), { status: 400 });

    expect(getProfileSaveErrorMessage(error, true)).toEqual({
      title: "Check your profile details",
      description: "Link Name is already taken.",
      action: "none",
    });
  });

  it("treats server failures as temporary and retryable", () => {
    const error = Object.assign(new Error("Internal server error"), { status: 503 });
    const result = getProfileSaveErrorMessage(error, true);

    expect(result.title).toBe("The server couldn’t save your profile");
    expect(result.description).not.toContain("Internal server error");
    expect(result.action).toBe("retry");
  });
});
