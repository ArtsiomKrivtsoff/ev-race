/**
 * Cloudflare Turnstile verification — Phase 3.1
 */

export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string | null,
): Promise<boolean> {
  if (!token?.trim()) return false;

  const secret = Deno.env.get("TURNSTILE_SECRET_KEY") ||
    Deno.env.get("TURNSTILE_SECRET");
  if (!secret) {
    console.error("turnstile: missing TURNSTILE_SECRET_KEY");
    return false;
  }

  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token.trim());
  if (remoteIp) form.append("remoteip", remoteIp);

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: form },
  );
  if (!res.ok) return false;

  const data = await res.json();
  return Boolean(data?.success);
}
