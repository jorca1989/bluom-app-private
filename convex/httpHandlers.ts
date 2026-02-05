import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Buffer } from "buffer";

// Convex httpActions run in a lightweight runtime; Buffer may not be defined globally.
// We polyfill it so our WebCrypto + Buffer helpers can verify Svix/Clerk signatures.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Buffer = Buffer;

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
const MASTER_ADMIN_EMAILS = new Set([
  "ggovsaas@gmail.com",
  "jwfcarvalho1989@gmail.com",
  "josecarvalhoggov@gmail.com",
]);

function parseSvixSecret(secret: string): Uint8Array {
  // Clerk provides Svix secrets that look like: whsec_<base64>
  if (secret.startsWith("whsec_")) {
    const b64 = secret.slice("whsec_".length);
    return Uint8Array.from(Buffer.from(b64, "base64"));
  }
  return Uint8Array.from(Buffer.from(secret, "utf8"));
}

async function hmacSha256Base64(key: Uint8Array, msg: string) {
  // In some runtimes `Uint8Array` can carry `SharedArrayBuffer` which TypeScript rejects for WebCrypto.
  // Create a copy backed by a normal `ArrayBuffer`.
  const keyBytes = new Uint8Array(key);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(msg));
  return Buffer.from(sig).toString("base64");
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i] ^ b[i];
  return out === 0;
}

async function verifySvixSignatureOrThrow(params: {
  secret: string;
  payload: string;
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
}) {
  const key = parseSvixSecret(params.secret);
  const signedContent = `${params.svixId}.${params.svixTimestamp}.${params.payload}`;
  const expected = await hmacSha256Base64(key, signedContent);

  // svix-signature can contain multiple candidates, e.g. "v1,abc v1,def"
  const candidates = params.svixSignature
    .split(" ")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith("v1,")) return part.slice(3);
      if (part.startsWith("v1=")) return part.slice(3);
      const commaIdx = part.indexOf(",");
      if (commaIdx >= 0) {
        const prefix = part.slice(0, commaIdx);
        const sig = part.slice(commaIdx + 1);
        return prefix === "v1" ? sig : null;
      }
      const eqIdx = part.indexOf("=");
      if (eqIdx >= 0) {
        const prefix = part.slice(0, eqIdx);
        const sig = part.slice(eqIdx + 1);
        return prefix === "v1" ? sig : null;
      }
      return null;
    })
    .filter((s): s is string => !!s);

  const expectedBuf = Buffer.from(expected);
  const ok = candidates.some((sig) => {
    const sigBuf = Buffer.from(sig);
    return timingSafeEqualBytes(sigBuf, expectedBuf);
  });

  if (!ok) throw new Error("Invalid Svix signature");
}

export const handleClerkWebhook = httpAction(async (_ctx, request) => {
  console.log("--- WEBHOOK HIT ---");
  const body = await request.text();
  // Log raw body BEFORE any verification/early-return so failures are visible in Convex logs.
  console.log("Webhook received", body);

  if (!CLERK_WEBHOOK_SECRET) {
    return new Response("CLERK_WEBHOOK_SECRET not configured", { status: 500 });
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  try {
    await verifySvixSignatureOrThrow({
      secret: CLERK_WEBHOOK_SECRET,
      payload: body,
      svixId,
      svixTimestamp,
      svixSignature,
    });
  } catch (err: any) {
    console.error("Clerk webhook verification failed:", err?.message ?? err);
    return new Response("Invalid webhook signature", { status: 400 });
  }

  // If verified, sync the user into Convex so the app doesn't get stuck in the "Convex user missing" loop.
  try {
    const evt = JSON.parse(body);
    const type = evt?.type as string | undefined;
    const data = evt?.data as any;

    if (type === "user.created") {
      const clerkId = data?.id as string | undefined;
      const email =
        (data?.email_addresses?.[0]?.email_address as string | undefined) ??
        (data?.email as string | undefined);
      const name =
        (data?.first_name || data?.last_name)
          ? `${data?.first_name ?? ""} ${data?.last_name ?? ""}`.trim()
          : (data?.username as string | undefined) ?? "User";

      if (clerkId && email) {
        const userId = await _ctx.runMutation(api.users.storeUser, { clerkId, email, name });

        // Hard override requested: ensure master admin always gets admin + premium.
        const emailLower = email.toLowerCase().trim();
        if (MASTER_ADMIN_EMAILS.has(emailLower)) {
          await _ctx.runMutation(internal.users.masterAdminOverride, { userId });
        }
      } else {
        console.warn("Clerk webhook user event missing clerkId/email", { clerkId, email });
      }
    }
  } catch (err: any) {
    console.error("Clerk webhook processing error:", err?.message ?? err);
    // Still return 200 so Clerk doesn't retry forever if our sync failed transiently.
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});


