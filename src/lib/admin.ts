export const ADMIN_EMAILS = ['kinghasanbd1@gmail.com'];

/** Main (hardcoded) admin — cannot be demoted or edited by anyone */
export function isMainAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

/** Legacy alias — used across the app for the primary admin check */
export const isAdmin = isMainAdmin;

/** Any admin — either main admin OR Firestore-assigned admin */
export function isAnyAdmin(email?: string | null, isAdminFlag?: boolean): boolean {
  return isMainAdmin(email) || isAdminFlag === true;
}
