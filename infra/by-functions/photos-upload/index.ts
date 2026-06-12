import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { corsHeadersFor } from "../_shared/cors.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";
import {
  fingerprintFromCookie,
  resolveFingerprintCookie,
} from "../_shared/fingerprint.ts";
import {
  COOLDOWN_SECONDS,
  INCOMING_BUCKET,
  MAX_FILE_BYTES,
  MAX_FILES_PER_SUBMISSION,
  MAX_PENDING_PER_FINGERPRINT,
  PENDING_ANTISPAM_STATUSES,
} from "../_shared/photos-config.ts";
import { jsonResponse } from "../_shared/photos-json.ts";
import {
  detectImageContentType,
  incomingStoragePath,
} from "../_shared/file-validation.ts";

async function triggerProcessor(photoId: number): Promise<void> {
  const base = Deno.env.get("PHOTOS_PROCESSOR_URL") || "http://127.0.0.1:8789";
  const secret = Deno.env.get("PHOTOS_PROCESSOR_SECRET");
  if (!secret) {
    console.error("photos-upload: missing PHOTOS_PROCESSOR_SECRET");
    return;
  }

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/process/${photoId}`, {
      method: "POST",
      headers: { "X-Photos-Processor-Secret": secret },
    });
    if (!res.ok) {
      console.error("photos-upload: processor trigger failed", photoId, res.status);
    }
  } catch (err) {
    console.error("photos-upload: processor trigger error", photoId, err);
  }
}

function collectFiles(form: FormData): File[] {
  const fromArray = form.getAll("files").filter((v): v is File => v instanceof File);
  if (fromArray.length) return fromArray;

  const singles: File[] = [];
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("file")) continue;
    if (value instanceof File) singles.push(value);
  }
  return singles;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeadersFor(req) });
  }

  if (req.method !== "POST") {
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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonResponse(req, { error: "invalid_form_data" }, 400, {}, setCookie);
  }

  const turnstileToken = (form.get("turnstile_token") || form.get("cf_token"))
    ?.toString();
  const remoteIp =
    req.headers.get("x-photos-client-ip") ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!(await verifyTurnstile(turnstileToken, remoteIp))) {
    return jsonResponse(req, { error: "turnstile_failed" }, 403, {}, setCookie);
  }

  const locationId = Number(form.get("location_id"));
  if (!Number.isFinite(locationId) || locationId <= 0) {
    return jsonResponse(req, { error: "invalid_location" }, 400, {}, setCookie);
  }

  const files = collectFiles(form).filter((f) => f.size > 0);
  if (!files.length) {
    return jsonResponse(req, { error: "no_files" }, 400, {}, setCookie);
  }
  if (files.length > MAX_FILES_PER_SUBMISSION) {
    return jsonResponse(req, { error: "too_many_files" }, 400, {}, setCookie);
  }

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return jsonResponse(req, { error: "file_too_large" }, 400, {}, setCookie);
    }
  }

  const { data: fpState } = await supabase
    .from("photo_fingerprint_state")
    .select("last_submission_at")
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  if (fpState?.last_submission_at) {
    const lastMs = new Date(fpState.last_submission_at).getTime();
    const elapsed = (Date.now() - lastMs) / 1000;
    if (elapsed < COOLDOWN_SECONDS) {
      return jsonResponse(
        req,
        {
          error: "cooldown_active",
          cooldown_seconds: Math.ceil(COOLDOWN_SECONDS - elapsed),
        },
        429,
        {},
        setCookie,
      );
    }
  }

  const { count: pendingCount, error: pendingErr } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("fingerprint", fingerprint)
    .in("status", [...PENDING_ANTISPAM_STATUSES]);

  if (pendingErr) {
    console.error("photos-upload: pending count", pendingErr.message);
    return jsonResponse(req, { error: "server_error" }, 500, {}, setCookie);
  }

  const pending = pendingCount ?? 0;
  if (pending + files.length > MAX_PENDING_PER_FINGERPRINT) {
    return jsonResponse(
      req,
      {
        error: "pending_limit",
        pending_count: pending,
        max_pending: MAX_PENDING_PER_FINGERPRINT,
      },
      429,
      {},
      setCookie,
    );
  }

  const validated: { file: File; bytes: Uint8Array; contentType: string }[] = [];
  for (const file of files) {
    const buf = new Uint8Array(await file.arrayBuffer());
    const contentType = detectImageContentType(buf);
    if (!contentType) {
      return jsonResponse(req, { error: "invalid_file_type" }, 400, {}, setCookie);
    }
    validated.push({ file, bytes: buf, contentType });
  }

  const createdIds: number[] = [];

  for (const item of validated) {
    const { data: row, error: insertErr } = await supabase
      .from("photos")
      .insert({
        location_id: locationId,
        review_id: null,
        author_type: "anonymous",
        telegram_user_id: null,
        fingerprint,
        status: "uploaded",
      })
      .select("id")
      .single();

    if (insertErr || !row) {
      console.error("photos-upload: insert", insertErr?.message);
      for (const id of createdIds) {
        await supabase.from("photos").update({
          status: "failed",
          failed_at: new Date().toISOString(),
        }).eq("id", id);
      }
      return jsonResponse(req, { error: "server_error" }, 500, {}, setCookie);
    }

    const photoId = row.id as number;
    const path = incomingStoragePath(photoId, item.contentType);
    const { error: uploadErr } = await supabase.storage
      .from(INCOMING_BUCKET)
      .upload(path, item.bytes, {
        contentType: item.contentType,
        upsert: false,
      });

    if (uploadErr) {
      console.error("photos-upload: storage", uploadErr.message);
      await supabase.from("photos").delete().eq("id", photoId);
      for (const id of createdIds) {
        await supabase.from("photos").update({ status: "failed", failed_at: new Date().toISOString() }).eq("id", id);
      }
      return jsonResponse(req, { error: "storage_failed" }, 500, {}, setCookie);
    }

    createdIds.push(photoId);
  }

  await supabase.from("photo_fingerprint_state").upsert({
    fingerprint,
    last_submission_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  for (const photoId of createdIds) {
    triggerProcessor(photoId);
  }

  return jsonResponse(
    req,
    {
      accepted: createdIds.length,
      photo_ids: createdIds,
      message: "Фото отправлены на модерацию",
    },
    200,
    {},
    setCookie,
  );
});
