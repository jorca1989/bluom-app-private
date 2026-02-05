import { Doc } from "./_generated/dataModel";

export function isProOrAdmin(user: Doc<"users"> | null | undefined) {
  return (
    user?.subscriptionStatus === "pro" ||
    user?.isPremium === true ||
    user?.isAdmin === true ||
    user?.role === "admin" ||
    user?.role === "super_admin"
  );
}


