/**
 * Map a raw Supabase auth error message to a friendly, user-facing string.
 * Pure function — no React/Supabase imports — easy to unit-test.
 */
export function mapAuthError(message: string | null | undefined): string {
  const msg = (message || "").toLowerCase();
  if (!msg) return "Sign in failed. Please try again.";
  if (msg.includes("invalid login credentials")) {
    return "Invalid email or password. Please try again.";
  }
  if (msg.includes("email not confirmed")) {
    return "Please verify your email address before signing in. Check your inbox for the confirmation link.";
  }
  if (msg.includes("too many requests") || msg.includes("rate")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Network error. Check your connection and try again.";
  }
  if (msg.includes("user not found")) {
    return "No account found with that email. Sign up to create one.";
  }
  if (msg.includes("session") && (msg.includes("expired") || msg.includes("invalid"))) {
    return "Your session has expired. Please sign in again.";
  }
  return message || "Sign in failed. Please try again.";
}