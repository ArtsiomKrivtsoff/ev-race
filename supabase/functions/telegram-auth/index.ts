/**
 * telegram-auth — Stage 3.1
 * POST /functions/v1/telegram-auth
 *
 * Validates Telegram Login Widget → user_hash + session token.
 * Bot: TELEGRAM_AUTH_BOT_TOKEN (@evrace_auth_bot)
 */

import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import {
  computeUserHash,
  displayNameFromPayload,
  type TelegramAuthPayload,
  validateTelegramAuth,
} from "../_shared/telegram.ts";
import { createUserSession } from "../_shared/session.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function authBotToken(): string | undefined {
  return Deno.env.get("TELEGRAM_AUTH_BOT_TOKEN") ||
    Deno.env.get("TELEGRAM_BOT_TOKEN") || undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const botToken = authBotToken();
  const userHashSalt = Deno.env.get("USER_HASH_SALT");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!botToken || !userHashSalt || !supabaseUrl || !serviceKey) {
    return json({ error: "server_misconfigured" }, 500);
  }

  let body: TelegramAuthPayload;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const check = await validateTelegramAuth(body, botToken);
  if (!check.ok) {
    const status = check.reason === "auth_expired" ? 403 : 401;
    return json({ error: check.reason }, status);
  }

  const user_hash = await computeUserHash(body.id, userHashSalt);
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: existing } = await supabase
    .from("users")
    .select("id, is_banned")
    .eq("user_hash", user_hash)
    .maybeSingle();

  if (existing?.is_banned) {
    return json({ error: "banned", user_hash }, 403);
  }

  const now = new Date().toISOString();

  if (existing) {
    const { error: updErr } = await supabase
      .from("users")
      .update({ last_seen_at: now })
      .eq("user_hash", user_hash);
    if (updErr) {
      console.error("users update:", updErr.message);
      return json({ error: "db_error" }, 500);
    }
  } else {
    const { error: insErr } = await supabase.from("users").insert({
      user_hash,
      first_seen_at: now,
      last_seen_at: now,
    });
    if (insErr) {
      console.error("users insert:", insErr.message);
      return json({ error: "db_error" }, 500);
    }
  }

  let session_token: string;
  let expires_at: string;
  try {
    const session = await createUserSession(supabase, user_hash);
    session_token = session.session_token;
    expires_at = session.expires_at;
  } catch (e) {
    console.error("session create:", e);
    return json({ error: "session_failed" }, 500);
  }

  const display = {
    name: displayNameFromPayload(body),
    first_name: body.first_name ?? null,
    username: body.username ?? null,
    photo_url: body.photo_url ?? null,
  };

  return json({
    user_hash,
    is_banned: false,
    display,
    session_token,
    expires_at,
  });
});
