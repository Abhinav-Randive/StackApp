/**
 * Common error messages and handling patterns
 */

export const ERROR_MESSAGES = {
  FIREBASE_AUTH_INVALID_CREDENTIALS: "Invalid email or password.",
  FIREBASE_AUTH_USER_NOT_FOUND: "User not found.",
  FIREBASE_AUTH_EMAIL_IN_USE: "Email is already in use.",
  FIREBASE_AUTH_WEAK_PASSWORD: "Password is too weak.",
  FIREBASE_NETWORK_ERROR: "Network error. Please check your connection.",
  GENERIC_ERROR: "Something went wrong. Please try again.",
  LOAD_ERROR: "Failed to load data. Please try again."
};

/**
 * Parse Firebase error codes and return user-friendly messages
 */
export const parseFirebaseError = (error) => {
  if (!error) return ERROR_MESSAGES.GENERIC_ERROR;

  const errorCode = error.code || "";

  switch (errorCode) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/invalid-email":
      return ERROR_MESSAGES.FIREBASE_AUTH_INVALID_CREDENTIALS;
    case "auth/user-not-found":
      return ERROR_MESSAGES.FIREBASE_AUTH_USER_NOT_FOUND;
    case "auth/email-already-in-use":
      return ERROR_MESSAGES.FIREBASE_AUTH_EMAIL_IN_USE;
    case "auth/weak-password":
      return ERROR_MESSAGES.FIREBASE_AUTH_WEAK_PASSWORD;
    case "auth/network-request-failed":
      return ERROR_MESSAGES.FIREBASE_NETWORK_ERROR;
    default:
      return error.message || ERROR_MESSAGES.GENERIC_ERROR;
  }
};

/**
 * Log errors for debugging while returning user-friendly message
 */
export const handleError = (error, context = "") => {
  console.error(`[${context}] Error:`, error);
  return parseFirebaseError(error);
};
