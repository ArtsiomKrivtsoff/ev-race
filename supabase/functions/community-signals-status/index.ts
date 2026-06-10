/**
 * GET /functions/v1/community-signals-status?location_id=
 * Returns voter status + aggregated signals (count > 0) for client refresh.
 */

import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { corsHeadersFor } from "../_shared/cors.ts";
import { fetchAggregatedSignals } from "../_shared/signals-aggregate.ts";
import {
  resolveVoterCookie,
  voterKeyFromCookie,
  withVoterCookie,
} from "../_shared/voter.ts";

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

  if (req.method !== "GET") {
    return json(req, { error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const voterSalt = Deno.env.get("VOTER_KEY_SALT");

  if (!supabaseUrl || !serviceKey || !voterSalt) {
    return json(req, { error: "server_misconfigured" }, 500);
  }

  const url = new URL(req.url);
  const locationId = Number(url.searchParams.get("location_id"));
  if (!Number.isFinite(locationId) || locationId <= 0) {
    return json(req, { error: "invalid_location" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: locRow } = await supabase
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .eq("is_active", true)
    .maybeSingle();

  if (!locRow) {
    return json(req, { error: "location_not_found" }, 404);
  }

  const signals = await fetchAggregatedSignals(supabase, locationId);

  const { cookieValue, setCookie } = await resolveVoterCookie(
    req.headers.get("Cookie"),
  );
  const voterKey = await voterKeyFromCookie(cookieValue, voterSalt);
  const responseHeaders = withVoterCookie({}, setCookie);

  const { data: submission } = await supabase
    .from("community_signal_submissions")
    .select("id, created_at")
    .eq("location_id", locationId)
    .eq("voter_key", voterKey)
    .maybeSingle();

  if (!submission) {
    return json(
      req,
      { voter_ready: true, submitted: false, selection: [], signals },
      200,
      responseHeaders,
    );
  }

  const { data: items } = await supabase
    .from("community_signal_submission_items")
    .select("signal_id, community_signals(slug, label_ru, sentiment)")
    .eq("submission_id", submission.id);

  const selection = (items || []).map((row) => {
    const sig = Array.isArray(row.community_signals)
      ? row.community_signals[0]
      : row.community_signals;
    return {
      slug: sig?.slug || "",
      label: sig?.label_ru || "",
      sentiment: sig?.sentiment || "positive",
    };
  });

  return json(
    req,
    {
      voter_ready: true,
      submitted: true,
      selection,
      submitted_at: submission.created_at,
      signals,
    },
    200,
    responseHeaders,
  );
});
