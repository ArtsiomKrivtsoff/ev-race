/**
 * Server session tokens — Phase 3.1 (C-2)
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.1";

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function bufferToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashSessionToken(token: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return bufferToHex(buf);
}

export async function createUserSession(
  supabase: SupabaseClient,
  userHash: string,
): Promise<{ session_token: string; expires_at: string }> {
  const session_token = generateSessionToken();
  const token_hash = await hashSessionToken(session_token);
  const expires_at = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  const { error } = await supabase.from("user_sessions").insert({
    token_hash,
    user_hash: userHash,
    expires_at,
  });

  if (error) throw error;

  return { session_token, expires_at };
}

export async function resolveUserSession(
  supabase: SupabaseClient,
  token: string | null | undefined,
): Promise<{ user_hash: string; session_id: number } | null> {
  if (!token?.trim()) return null;

  const token_hash = await hashSessionToken(token.trim());
  const { data, error } = await supabase
    .from("user_sessions")
    .select("id, user_hash, expires_at")
    .eq("token_hash", token_hash)
    .maybeSingle();

  if (error || !data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;

  const expires_at = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await supabase
    .from("user_sessions")
    .update({ last_used_at: new Date().toISOString(), expires_at })
    .eq("id", data.id);

  return { user_hash: data.user_hash, session_id: data.id };
}

export function bearerToken(req: Request): string | null {
  const auth = req.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  return req.headers.get("X-EVRACE-Session")?.trim() || null;
}
