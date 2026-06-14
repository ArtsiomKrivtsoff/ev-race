import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { corsHeadersFor } from "../_shared/cors.ts";
import {
  fingerprintFromCookie,
  resolveFingerprintCookie,
} from "../_shared/fingerprint.ts";
import {
  COOLDOWN_SECONDS,
  MAX_FILES_PER_SUBMISSION,
  MAX_PENDING_PER_FINGERPRINT,
  PENDING_ANTISPAM_STATUSES,
} from "../_shared/photos-config.ts";
import { jsonResponse } from "../_shared/photos-json.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeadersFor(req) });
  }

  if (req.method !== "GET") {
    return jsonResponse(req, { error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const fpSalt = Deno.env.get("PHOTOS_FINGERPRINT_SALT");

  if (!supabaseUrl || !serviceKey || !fpSalt) {
    return jsonResponse(req, { error: "server_misconfigured" }, 500);
  }

  const { cookieValue, setCookie } = await resolveFingerprintCookie(
    req.headers.get("Cookie"),
  );
  const fingerprint = await fingerprintFromCookie(cookieValue, fpSalt);
  const supabase = createClient(supabaseUrl, serviceKey);

  const { count: pendingCount } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("fingerprint", fingerprint)
    .in("status", [...PENDING_ANTISPAM_STATUSES]);

  const pending = pendingCount ?? 0;

  const { data: fpState } = await supabase
    .from("photo_fingerprint_state")
    .select("last_submission_at")
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  let cooldownSeconds = 0;
  if (fpState?.last_submission_at) {
    const elapsed = (Date.now() - new Date(fpState.last_submission_at).getTime()) / 1000;
    if (elapsed < COOLDOWN_SECONDS) {
      cooldownSeconds = Math.ceil(COOLDOWN_SECONDS - elapsed);
    }
  }

  const canUpload = pending < MAX_PENDING_PER_FINGERPRINT && cooldownSeconds === 0;

  return jsonResponse(
    req,
    {
      fingerprint_ready: true,
      pending_count: pending,
      max_pending: MAX_PENDING_PER_FINGERPRINT,
      cooldown_seconds: cooldownSeconds,
      can_upload: canUpload,
      max_files_per_submission: MAX_FILES_PER_SUBMISSION,
    },
    200,
    {},
    setCookie,
  );
});
