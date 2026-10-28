/**
 * Sign-up is limited to ALLOWED_EMAILS (comma-separated). When the list is empty,
 * anyone may sign up in development, and nobody may in production.
 */
export function isEmailAllowed(email: unknown): boolean {
  if (typeof email !== "string" || !email.trim()) return false;
  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) return process.env.NODE_ENV !== "production";
  return allowed.includes(email.trim().toLowerCase());
}

export function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}
