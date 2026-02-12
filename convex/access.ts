import { Doc } from "./_generated/dataModel";
import { MASTER_ADMINS } from "./permissions";

export function isProOrAdmin(user: Doc<"users"> | null | undefined) {
  if (
    user?.subscriptionStatus === "pro" ||
    user?.isPremium === true ||
    user?.isAdmin === true ||
    user?.role === "admin" ||
    user?.role === "super_admin"
  ) return true;

  // Fallback: check master admin email list
  const email = (user as any)?.email?.toLowerCase?.().trim?.();
  if (email && MASTER_ADMINS.map(e => e.toLowerCase().trim()).includes(email)) {
    return true;
  }

  return false;
}


