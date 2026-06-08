export const ADMIN_EMAILS = (
  process.env.NEXT_PUBLIC_ADMIN_EMAILS ??
  process.env.ADMIN_EMAILS ??
  ""
)
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean);
