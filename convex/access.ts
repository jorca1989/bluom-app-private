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

  // ── Affiliate / Influencer Manual Override ────────────────────────────────
  // Lifetime VIPs (family, mega-influencers) granted permanent access
  if (user?.isLifetimeAdmin === true) return true;

  // Timed manual grant (influencers, 1-month/3-month/1-year codes)
  if (user?.manualPremiumUntil && user.manualPremiumUntil > Date.now()) return true;

  // Fallback: check master admin email list
  const email = (user as any)?.email?.toLowerCase?.().trim?.();
  if (email && MASTER_ADMINS.map(e => e.toLowerCase().trim()).includes(email)) {
    return true;
  }

  return false;
}


