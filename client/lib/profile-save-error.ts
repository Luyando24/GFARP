import { AuthError, NetworkError } from "./errors";

export type ProfileSaveErrorAction = "retry" | "sign-in" | "none";

export interface ProfileSaveErrorMessage {
  title: string;
  description: string;
  action: ProfileSaveErrorAction;
}

type ErrorWithResponse = {
  message?: string;
  name?: string;
  status?: number;
  statusCode?: number;
};

const getStatus = (error: ErrorWithResponse) => error.status ?? error.statusCode;

const isNetworkFailure = (error: unknown) => {
  if (error instanceof NetworkError) return true;
  if (!(error instanceof Error)) return false;

  return (
    error.name === "TypeError" && /fetch|network|load failed/i.test(error.message)
  ) || /unable to connect|network request failed|failed to fetch/i.test(error.message);
};

export function getProfileSaveErrorMessage(
  error: unknown,
  isOnline = typeof navigator === "undefined" ? true : navigator.onLine,
): ProfileSaveErrorMessage {
  const responseError = (error && typeof error === "object" ? error : {}) as ErrorWithResponse;
  const status = getStatus(responseError);
  const serverMessage = responseError.message?.trim();

  if (!isOnline) {
    return {
      title: "No internet connection",
      description: "Your changes are still here. Reconnect to the internet, then tap Retry.",
      action: "retry",
    };
  }

  if (isNetworkFailure(error)) {
    return {
      title: "Couldn’t reach the server",
      description: "Your connection may be unstable, or the service may be temporarily unavailable. Check your internet connection and try again.",
      action: "retry",
    };
  }

  if (responseError.name === "AbortError" || status === 408 || status === 504) {
    return {
      title: "The save took too long",
      description: "Your changes are still here. Check your connection, then try saving again.",
      action: "retry",
    };
  }

  if (error instanceof AuthError || status === 401) {
    return {
      title: "Your session has expired",
      description: "Sign in again to save your profile. Your changes will stay on this device.",
      action: "sign-in",
    };
  }

  if (status === 403) {
    return {
      title: "This change isn’t available",
      description: serverMessage || "Your current plan or account permissions do not allow this profile change.",
      action: "none",
    };
  }

  if (status === 400 || status === 409 || status === 422 || serverMessage?.includes("Link Name")) {
    return {
      title: "Check your profile details",
      description: serverMessage || "One or more profile details are not valid. Review them and try again.",
      action: "none",
    };
  }

  if (status === 429) {
    return {
      title: "Too many save attempts",
      description: "Please wait a moment, then try saving your profile again.",
      action: "retry",
    };
  }

  if (status && status >= 500) {
    return {
      title: "The server couldn’t save your profile",
      description: "This is likely a temporary service problem. Your changes are still here; please try again.",
      action: "retry",
    };
  }

  const usefulServerMessage = serverMessage && !/^(internal server error|http \d+)$/i.test(serverMessage)
    ? serverMessage
    : undefined;

  return {
    title: "Your profile wasn’t saved",
    description: usefulServerMessage || "Something unexpected happened. Your changes are still here; please try again.",
    action: "retry",
  };
}
