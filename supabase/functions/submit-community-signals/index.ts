/**
 * POST /functions/v1/submit-community-signals
 */

import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import {
  mapValidSignals,
  normalizeSignalSlugs,
  validateSignalSlugs,
} from "../_shared/signal-validation.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";
import { corsHeadersFor } from "../_shared/cors.ts";
import {
  resolveVoterCookie,
  voterKeyFromCookie,
  withVoterCookie,
} from "../_shared/voter.ts";

type SubmitBody = {
  location_id?: number;
  signal_slugs?: string[];
  turnstile_token?: string;
  cf_token?: string;
};

function json(
  req: Request,
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeadersFor(req),
      ...extraHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeadersFor(req) });
  }

  if (req.method !== "POST") {
    return json(req, { error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const voterSalt = Deno.env.get("VOTER_KEY_SALT");

  if (!supabaseUrl || !serviceKey || !voterSalt) {
    return json(req,{ error: "server_misconfigured" }, 500);
  }

  let body: SubmitBody;
  try {
    body = await req.json();
  } catch {
    return json(req,{ error: "invalid_json" }, 400);
  }

  const turnstileToken = body.turnstile_token || body.cf_token;
  const remoteIp = req.headers.get("cf-connecting-ip");
  if (!(await verifyTurnstile(turnstileToken, remoteIp))) {
    return json(req,{ error: "turnstile_failed" }, 403);
  }

  const locationId = Number(body.location_id);
  if (!Number.isFinite(locationId) || locationId <= 0) {
    return json(req,{ error: "invalid_location" }, 400);
  }

  const slugs = normalizeSignalSlugs(body.signal_slugs);
  const slugError = validateSignalSlugs(slugs);
  if (slugError) {
    return json(req,{ error: slugError }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: locRow } = await supabase
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .eq("is_active", true)
    .maybeSingle();

  if (!locRow) {
    return json(req,{ error: "location_not_found" }, 404);
  }

  const { data: signalRows, error: sigErr } = await supabase
    .from("community_signals")
    .select("id, slug, label_ru, sentiment")
    .eq("is_active", true)
    .in("slug", slugs);

  if (sigErr) {
    console.error("signals lookup:", sigErr.message);
    return json(req,{ error: "db_error" }, 500);
  }

  const validSignals = mapValidSignals(slugs, signalRows || []);
  if (validSignals.length !== slugs.length) {
    return json(req,{ error: "invalid_payload" }, 400);
  }

  const { cookieValue, setCookie } = await resolveVoterCookie(
    req.headers.get("Cookie"),
  );
  const voterKey = await voterKeyFromCookie(cookieValue, voterSalt);
  const responseHeaders = withVoterCookie({}, setCookie);

  const { data: existing } = await supabase
    .from("community_signal_submissions")
    .select("id")
    .eq("location_id", locationId)
    .eq("voter_key", voterKey)
    .maybeSingle();

  if (existing) {
    return json(req,{ error: "already_submitted" }, 409, responseHeaders);
  }

  const { data: inserted, error: insErr } = await supabase
    .from("community_signal_submissions")
    .insert({ location_id: locationId, voter_key: voterKey })
    .select("id, created_at")
    .single();

  if (insErr || !inserted) {
    if (insErr?.code === "23505") {
      return json(req,{ error: "already_submitted" }, 409, responseHeaders);
    }
    console.error("submission insert:", insErr?.message);
    return json(req,{ error: "db_error" }, 500, responseHeaders);
  }

  const itemRows = validSignals.map((s) => ({
    submission_id: inserted.id,
    signal_id: s.id,
  }));

  const { error: itemsErr } = await supabase
    .from("community_signal_submission_items")
    .insert(itemRows);

  if (itemsErr) {
    console.error("submission items:", itemsErr.message);
    await supabase.from("community_signal_submissions").delete().eq("id", inserted.id);
    return json(req,{ error: "db_error" }, 500, responseHeaders);
  }

  const countsDelta: Record<string, number> = {};
  for (const signal of validSignals) {
    const { data: countRow } = await supabase
      .from("location_signal_counts")
      .select("count")
      .eq("location_id", locationId)
      .eq("signal_id", signal.id)
      .maybeSingle();

    if (countRow) {
      const next = (countRow.count ?? 0) + 1;
      const { error: updErr } = await supabase
        .from("location_signal_counts")
        .update({ count: next })
        .eq("location_id", locationId)
        .eq("signal_id", signal.id);
      if (updErr) console.error("count update:", updErr.message);
    } else {
      const { error: insCountErr } = await supabase.from("location_signal_counts").insert({
        location_id: locationId,
        signal_id: signal.id,
        count: 1,
      });
      if (insCountErr) console.error("count insert:", insCountErr.message);
    }
    countsDelta[signal.slug] = 1;
  }

  const selection = validSignals.map((s) => ({
    slug: s.slug,
    label: s.label_ru,
    sentiment: s.sentiment,
  }));

  return json(
    req,
    {
      success: true,
      submission_id: inserted.id,
      selection,
      counts_delta: countsDelta,
    },
    200,
    responseHeaders,
  );
});
