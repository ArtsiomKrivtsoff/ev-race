/**
 * Anonymous voter cookie — Community Signals v1
 */

export const VOTER_COOKIE_NAME = "evrace_voter";
export const VOTER_COOKIE_MAX_AGE = 31536000;

function bufferToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isUuidV4(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function generateVoterCookieValue(): string {
  return crypto.randomUUID();
}

export function parseCookieHeader(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key !== name) continue;
    return decodeURIComponent(trimmed.slice(eq + 1));
  }
  return null;
}

export function buildVoterSetCookie(value: string): string {
  return `${VOTER_COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${VOTER_COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

export async function resolveVoterCookie(
  cookieHeader: string | null,
): Promise<{ cookieValue: string; setCookie: string | null }> {
  const existing = parseCookieHeader(cookieHeader, VOTER_COOKIE_NAME);
  if (existing && isUuidV4(existing)) {
    return { cookieValue: existing, setCookie: null };
  }
  const cookieValue = generateVoterCookieValue();
  return { cookieValue, setCookie: buildVoterSetCookie(cookieValue) };
}

export async function voterKeyFromCookie(
  cookieValue: string,
  salt: string,
): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(salt),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(cookieValue),
  );
  return bufferToHex(sig);
}

export function withVoterCookie(headers: Record<string, string>, setCookie: string | null): Record<string, string> {
  if (!setCookie) return headers;
  return { ...headers, "Set-Cookie": setCookie };
}
