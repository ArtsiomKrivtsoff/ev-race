/**
 * submit-review — Phase 3.1 Reviews MVP
 * POST /functions/v1/submit-review
 *
 * Session auth + Turnstile + UPSERT review + review_tags + user_activity
 */

import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { bearerToken, resolveUserSession } from "../_shared/session.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-evrace-session",
};

type SubmitBody = {
  location_id?: number;
  rating?: number;
  tag_keys?: string[];
  comment?: string | null;
  visit_date?: string | null;
  turnstile_token?: string;
  cf_token?: string;
  author_display?: string;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

async function emitActivity(
  supabase: ReturnType<typeof createClient>,
  row: {
    user_hash: string;
    event_type: string;
    location_id: number;
    review_id: number;
    payload?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("user_activity").insert({
    user_hash: row.user_hash,
    event_type: row.event_type,
    location_id: row.location_id,
    review_id: row.review_id,
    payload: row.payload ?? {},
  });
  if (error) console.error("user_activity:", error.message);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "server_misconfigured" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const session = await resolveUserSession(supabase, bearerToken(req));
  if (!session) {
    return json({ error: "session_expired" }, 401);
  }

  let body: SubmitBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const turnstileToken = body.turnstile_token || body.cf_token;
  const remoteIp = req.headers.get("cf-connecting-ip");
  if (!(await verifyTurnstile(turnstileToken, remoteIp))) {
    return json({ error: "turnstile_failed" }, 403);
  }

  const locationId = Number(body.location_id);
  const rating = Number(body.rating);
  if (!Number.isFinite(locationId) || locationId <= 0) {
    return json({ error: "invalid_location" }, 400);
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return json({ error: "invalid_rating" }, 400);
  }

  let comment = body.comment != null ? String(body.comment).trim() : "";
  if (comment.length > 280) {
    return json({ error: "comment_too_long" }, 400);
  }
  if (!comment) comment = "";

  const tagKeys = Array.isArray(body.tag_keys)
    ? [...new Set(body.tag_keys.filter((k) => typeof k === "string" && k.trim()))]
    : [];
  if (tagKeys.length > 8) {
    return json({ error: "too_many_tags" }, 400);
  }

  let visitDate: string | null = null;
  if (body.visit_date) {
    const vd = String(body.visit_date).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(vd)) visitDate = vd;
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("is_banned")
    .eq("user_hash", session.user_hash)
    .maybeSingle();

  if (userRow?.is_banned) {
    return json({ error: "banned" }, 403);
  }

  const { data: locRow } = await supabase
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .eq("is_active", true)
    .maybeSingle();

  if (!locRow) {
    return json({ error: "location_not_found" }, 404);
  }

  const authorDisplay = body.author_display != null
    ? String(body.author_display).slice(0, 64)
    : "Водитель EV RACE";

  const { data: existing } = await supabase
    .from("reviews")
    .select("id, edit_count, created_at")
    .eq("location_id", locationId)
    .eq("user_hash", session.user_hash)
    .maybeSingle();

  let reviewId: number;
  let wasNew = false;
  let wasFirstOnLocation = false;

  if (existing) {
    const { data: updated, error: updErr } = await supabase
      .from("reviews")
      .update({
        rating,
        comment: comment || null,
        visit_date: visitDate,
        author_display: authorDisplay,
        edit_count: (existing.edit_count ?? 0) + 1,
        deleted_at: null,
        moderation_status: "published",
      })
      .eq("id", existing.id)
      .select("id")
      .single();

    if (updErr || !updated) {
      console.error("review update:", updErr?.message);
      return json({ error: "db_error" }, 500);
    }
    reviewId = updated.id;

    await emitActivity(supabase, {
      user_hash: session.user_hash,
      event_type: "review_updated",
      location_id: locationId,
      review_id: reviewId,
    });
  } else {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_hash", session.user_hash)
      .gte("created_at", oneHourAgo);

    if ((recentCount ?? 0) > 0) {
      return json({ error: "rate_limited" }, 429);
    }

    const { count: pubCountBefore } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("location_id", locationId)
      .is("deleted_at", null)
      .eq("moderation_status", "published");

    wasFirstOnLocation = (pubCountBefore ?? 0) === 0;

    const { data: inserted, error: insErr } = await supabase
      .from("reviews")
      .insert({
        location_id: locationId,
        user_hash: session.user_hash,
        rating,
        comment: comment || null,
        visit_date: visitDate,
        author_display: authorDisplay,
        moderation_status: "published",
      })
      .select("id")
      .single();

    if (insErr || !inserted) {
      console.error("review insert:", insErr?.message);
      return json({ error: "db_error" }, 500);
    }

    reviewId = inserted.id;
    wasNew = true;

    await emitActivity(supabase, {
      user_hash: session.user_hash,
      event_type: "review_created",
      location_id: locationId,
      review_id: reviewId,
    });

    if (wasFirstOnLocation) {
      await emitActivity(supabase, {
        user_hash: session.user_hash,
        event_type: "first_review_on_location",
        location_id: locationId,
        review_id: reviewId,
        payload: { is_first: true },
      });
    }
  }

  let validTags: { id: number; key: string }[] = [];
  if (tagKeys.length) {
    const { data: tagRows } = await supabase
      .from("tags")
      .select("id, key")
      .eq("is_active", true)
      .in("key", tagKeys);
    validTags = (tagRows || []).filter((t) => tagKeys.includes(t.key));
  }

  await supabase.from("review_tags").delete().eq("review_id", reviewId);

  if (validTags.length) {
    const { error: rtErr } = await supabase.from("review_tags").insert(
      validTags.map((t) => ({ review_id: reviewId, tag_id: t.id })),
    );
    if (rtErr) console.error("review_tags:", rtErr.message);
  }

  const { data: locAfter } = await supabase
    .from("locations")
    .select("cached_avg_rating, cached_review_count")
    .eq("id", locationId)
    .single();

  return json({
    success: true,
    review_id: reviewId,
    was_new: wasNew,
    was_first_on_location: wasFirstOnLocation,
    cached_avg_rating: locAfter?.cached_avg_rating ?? null,
    cached_review_count: locAfter?.cached_review_count ?? 0,
  });
});
