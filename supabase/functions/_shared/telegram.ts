/**
 * Telegram Login Widget validation (Infrastructure Platform Stage 3)
 * @see https://core.telegram.org/widgets/login#checking-authorization
 */

export type TelegramAuthPayload = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

const AUTH_MAX_AGE_SEC = 86400; // 24h

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function sha256Bytes(data: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
}

function bufferToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256Hex(key: ArrayBuffer, data: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(data),
  );
  return bufferToHex(sig);
}

export function buildDataCheckString(payload: TelegramAuthPayload): string {
  const entries: [string, string][] = [];
  if (payload.id !== undefined) entries.push(["id", String(payload.id)]);
  if (payload.first_name) entries.push(["first_name", payload.first_name]);
  if (payload.last_name) entries.push(["last_name", payload.last_name]);
  if (payload.username) entries.push(["username", payload.username]);
  if (payload.photo_url) entries.push(["photo_url", payload.photo_url]);
  entries.push(["auth_date", String(payload.auth_date)]);
  entries.sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([k, v]) => `${k}=${v}`).join("\n");
}

export async function validateTelegramAuth(
  payload: TelegramAuthPayload,
  botToken: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!payload?.hash || !payload?.id || !payload?.auth_date) {
    return { ok: false, reason: "invalid_payload" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (now - Number(payload.auth_date) > AUTH_MAX_AGE_SEC) {
    return { ok: false, reason: "auth_expired" };
  }

  const secretKey = await sha256Bytes(botToken);
  const dataCheckString = buildDataCheckString(payload);
  const computed = await hmacSha256Hex(secretKey, dataCheckString);

  if (!timingSafeEqual(computed, payload.hash)) {
    return { ok: false, reason: "invalid_hash" };
  }

  return { ok: true };
}

export async function computeUserHash(
  telegramId: number | string,
  salt: string,
): Promise<string> {
  const buf = await sha256Bytes(`${telegramId}:${salt}`);
  return bufferToHex(buf);
}

export function displayNameFromPayload(payload: TelegramAuthPayload): string {
  if (payload.username) return `@${payload.username}`;
  if (payload.first_name) return payload.first_name;
  return "Водитель EV RACE";
}
