/**
 * GET /functions/v1/community-signals-status?location_id=
 * Returns whether this voter already submitted for the location.
 */

import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import {
  resolveVoterCookie,
  voterKeyFromCookie,
  withVoterCookie,
} from "../_shared/voter.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...extraHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const voterSalt = Deno.env.get("VOTER_KEY_SALT");

  if (!supabaseUrl || !serviceKey || !voterSalt) {
    return json({ error: "server_misconfigured" }, 500);
  }

  const url = new URL(req.url);
  const locationId = Number(url.searchParams.get("location_id"));
  if (!Number.isFinite(locationId) || locationId <= 0) {
    return json({ error: "invalid_location" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: locRow } = await supabase
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .eq("is_active", true)
    .maybeSingle();

  if (!locRow) {
    return json({ error: "location_not_found" }, 404);
  }

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
      { voter_ready: true, submitted: false, selection: [] },
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
    {
      voter_ready: true,
      submitted: true,
      selection,
      submitted_at: submission.created_at,
    },
    200,
    responseHeaders,
  );
});
