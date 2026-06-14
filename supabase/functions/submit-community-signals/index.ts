/**
 * POST /functions/v1/submit-community-signals
 */

import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.1";
import {
  mapValidSignals,
  normalizeSignalSlugs,
  SIGNAL_EDIT_COOLDOWN_SECONDS,
  validateSignalSlugs,
  type SignalRow,
} from "../_shared/signal-validation.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";
import { corsHeadersFor } from "../_shared/cors.ts";
import { fetchAggregatedSignals } from "../_shared/signals-aggregate.ts";
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

async function adjustSignalCount(
  supabase: SupabaseClient,
  locationId: number,
  signalId: number,
  delta: number,
): Promise<void> {
  if (delta === 0) return;

  const { data: countRow } = await supabase
    .from("location_signal_counts")
    .select("count")
    .eq("location_id", locationId)
    .eq("signal_id", signalId)
    .maybeSingle();

  const current = countRow?.count ?? 0;
  const next = current + delta;

  if (next <= 0) {
    await supabase
      .from("location_signal_counts")
      .delete()
      .eq("location_id", locationId)
      .eq("signal_id", signalId);
    return;
  }

  if (countRow) {
    const { error: updErr } = await supabase
      .from("location_signal_counts")
      .update({ count: next })
      .eq("location_id", locationId)
      .eq("signal_id", signalId);
    if (updErr) console.error("count update:", updErr.message);
  } else if (delta > 0) {
    const { error: insCountErr } = await supabase.from("location_signal_counts").insert({
      location_id: locationId,
      signal_id: signalId,
      count: delta,
    });
    if (insCountErr) console.error("count insert:", insCountErr.message);
  }
}

async function loadSubmissionItems(
  supabase: SupabaseClient,
  submissionId: number,
): Promise<{ signal_id: number; slug: string }[]> {
  const { data: items } = await supabase
    .from("community_signal_submission_items")
    .select("signal_id, community_signals(slug)")
    .eq("submission_id", submissionId);

  return (items || []).map((row) => {
    const sig = Array.isArray(row.community_signals)
      ? row.community_signals[0]
      : row.community_signals;
    return {
      signal_id: row.signal_id as number,
      slug: (sig?.slug as string) || "",
    };
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
    return json(req, { error: "server_misconfigured" }, 500);
  }

  let body: SubmitBody;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "invalid_json" }, 400);
  }

  const turnstileToken = body.turnstile_token || body.cf_token;
  const remoteIp = req.headers.get("cf-connecting-ip");
  if (!(await verifyTurnstile(turnstileToken, remoteIp))) {
    return json(req, { error: "turnstile_failed" }, 403);
  }

  const locationId = Number(body.location_id);
  if (!Number.isFinite(locationId) || locationId <= 0) {
    return json(req, { error: "invalid_location" }, 400);
  }

  const slugs = normalizeSignalSlugs(body.signal_slugs);

  const supabase = createClient(supabaseUrl, serviceKey);

  const { cookieValue, setCookie } = await resolveVoterCookie(
    req.headers.get("Cookie"),
  );
  const voterKey = await voterKeyFromCookie(cookieValue, voterSalt);
  const responseHeaders = withVoterCookie({}, setCookie);

  const { data: existing } = await supabase
    .from("community_signal_submissions")
    .select("id, created_at")
    .eq("location_id", locationId)
    .eq("voter_key", voterKey)
    .maybeSingle();

  const isEdit = Boolean(existing);
  const slugError = validateSignalSlugs(slugs, { allowEmpty: isEdit });
  if (slugError) {
    return json(req, { error: slugError }, 400, responseHeaders);
  }

  const { data: locRow } = await supabase
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .eq("is_active", true)
    .maybeSingle();

  if (!locRow) {
    return json(req, { error: "location_not_found" }, 404, responseHeaders);
  }

  let validSignals: SignalRow[] = [];
  if (slugs.length) {
    const { data: signalRows, error: sigErr } = await supabase
      .from("community_signals")
      .select("id, slug, label_ru, sentiment")
      .eq("is_active", true)
      .in("slug", slugs);

    if (sigErr) {
      console.error("signals lookup:", sigErr.message);
      return json(req, { error: "db_error" }, 500, responseHeaders);
    }

    validSignals = mapValidSignals(slugs, signalRows || []);
    if (validSignals.length !== slugs.length) {
      return json(req, { error: "invalid_payload" }, 400, responseHeaders);
    }
  }

  if (existing) {
    const lastMs = new Date(existing.created_at).getTime();
    const elapsed = (Date.now() - lastMs) / 1000;
    if (elapsed < SIGNAL_EDIT_COOLDOWN_SECONDS) {
      return json(
        req,
        {
          error: "edit_cooldown",
          edit_seconds_remaining: Math.ceil(SIGNAL_EDIT_COOLDOWN_SECONDS - elapsed),
          cooldown_seconds: SIGNAL_EDIT_COOLDOWN_SECONDS,
        },
        429,
        responseHeaders,
      );
    }

    const oldItems = await loadSubmissionItems(supabase, existing.id);
    const oldBySlug = new Map(oldItems.map((item) => [item.slug, item.signal_id]));
    const newSlugs = new Set(slugs);

    for (const item of oldItems) {
      if (!newSlugs.has(item.slug)) {
        await adjustSignalCount(supabase, locationId, item.signal_id, -1);
      }
    }

    for (const signal of validSignals) {
      if (!oldBySlug.has(signal.slug)) {
        await adjustSignalCount(supabase, locationId, signal.id, 1);
      }
    }

    await supabase
      .from("community_signal_submission_items")
      .delete()
      .eq("submission_id", existing.id);

    if (!slugs.length) {
      await supabase
        .from("community_signal_submissions")
        .delete()
        .eq("id", existing.id);
    } else {
      const itemRows = validSignals.map((s) => ({
        submission_id: existing.id,
        signal_id: s.id,
      }));
      const { error: itemsErr } = await supabase
        .from("community_signal_submission_items")
        .insert(itemRows);

      if (itemsErr) {
        console.error("submission items update:", itemsErr.message);
        return json(req, { error: "db_error" }, 500, responseHeaders);
      }

      await supabase
        .from("community_signal_submissions")
        .update({ created_at: new Date().toISOString() })
        .eq("id", existing.id);
    }

    const selection = validSignals.map((s) => ({
      slug: s.slug,
      label: s.label_ru,
      sentiment: s.sentiment,
    }));
    const signals = await fetchAggregatedSignals(supabase, locationId);

    return json(
      req,
      {
        success: true,
        updated: true,
        removed: !slugs.length,
        submission_id: slugs.length ? existing.id : null,
        selection,
        signals,
      },
      200,
      responseHeaders,
    );
  }

  if (!slugs.length) {
    return json(req, { error: "empty_selection" }, 400, responseHeaders);
  }

  const { data: inserted, error: insErr } = await supabase
    .from("community_signal_submissions")
    .insert({ location_id: locationId, voter_key: voterKey })
    .select("id, created_at")
    .single();

  if (insErr || !inserted) {
    if (insErr?.code === "23505") {
      return json(req, { error: "already_submitted" }, 409, responseHeaders);
    }
    console.error("submission insert:", insErr?.message);
    return json(req, { error: "db_error" }, 500, responseHeaders);
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
    return json(req, { error: "db_error" }, 500, responseHeaders);
  }

  const countsDelta: Record<string, number> = {};
  for (const signal of validSignals) {
    await adjustSignalCount(supabase, locationId, signal.id, 1);
    countsDelta[signal.slug] = 1;
  }

  const selection = validSignals.map((s) => ({
    slug: s.slug,
    label: s.label_ru,
    sentiment: s.sentiment,
  }));

  const signals = await fetchAggregatedSignals(supabase, locationId);

  return json(
    req,
    {
      success: true,
      submission_id: inserted.id,
      selection,
      counts_delta: countsDelta,
      signals,
    },
    200,
    responseHeaders,
  );
});
