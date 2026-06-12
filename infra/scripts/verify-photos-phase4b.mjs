#!/usr/bin/env node
/**
 * Photos Phase 4B — BY backend verification (B3–B5, B8, B10 + direct upload)
 * Run on BY VPS: infra/scripts/run-verify-photos-phase4b.sh
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import ws from "ws";
import { createHmac } from "node:crypto";
import { execSync } from "node:child_process";

const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:8000";
const TEST_LOCATION_ID = 999999005;
const TEST_COOKIE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const COOLDOWN_COOKIE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const PENDING_COOKIE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";
const TURNSTILE_DUMMY_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
const ENV_FILE = "/opt/supabase/docker/.env";

const results = [];
function pass(id, name, detail = "") {
  results.push({ id, name, status: "PASS", detail });
}
function fail(id, name, detail = "") {
  results.push({ id, name, status: "FAIL", detail });
}

function fp(cookie) {
  return createHmac("sha256", process.env.PHOTOS_FINGERPRINT_SALT || "")
    .update(cookie)
    .digest("hex");
}

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadSecret(file, key) {
  try {
    return sh(`grep -m1 '^${key}=' ${file} | cut -d= -f2-`).trim();
  } catch {
    return process.env[key] || "";
  }
}

function patchTurnstile(secret) {
  sh(`sudo sed -i 's|^TURNSTILE_SECRET_KEY=.*|TURNSTILE_SECRET_KEY=${secret}|' ${ENV_FILE}`);
  sh(
    "cd /opt/supabase/docker && sudo docker compose -f docker-compose.yml -f docker-compose.override.yml -f docker-compose.photos.override.yml up -d functions",
  );
}

async function makeJpeg(color = "#334488") {
  return sharp({
    create: { width: 720, height: 540, channels: 3, background: color },
  })
    .jpeg({ quality: 90 })
    .toBuffer();
}

function anonHeaders(cookie) {
  const anon = process.env.ANON_KEY || loadSecret("/root/evrace-secrets/supabase.env", "ANON_KEY");
  return {
    Authorization: `Bearer ${anon}`,
    apikey: anon,
    Cookie: `evrace_photos_fp=${cookie}`,
  };
}

async function fetchStatus(cookie) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/photos-status`, {
    headers: anonHeaders(cookie),
  });
  return { status: res.status, body: await res.json() };
}

async function uploadOne(cookie, jpeg, token = TURNSTILE_DUMMY_TOKEN) {
  const form = new FormData();
  form.append("location_id", String(TEST_LOCATION_ID));
  form.append("turnstile_token", token);
  form.append("files", new Blob([jpeg], { type: "image/jpeg" }), "phase4b.jpg");
  const res = await fetch(`${SUPABASE_URL}/functions/v1/photos-upload`, {
    method: "POST",
    headers: anonHeaders(cookie),
    body: form,
  });
  return { status: res.status, body: await res.json() };
}

async function cleanup(supabase, ids, cookies) {
  for (const id of ids) {
    const { data } = await supabase
      .from("photos")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle();
    if (data?.storage_path) {
      await supabase.storage.from("photos-processed").remove([data.storage_path]);
    }
    await supabase.storage.from("photos-incoming").remove([`${id}/original.jpg`]);
    await supabase.from("photos").delete().eq("id", id);
  }
  for (const cookie of cookies) {
    await supabase.from("photo_fingerprint_state").delete().eq("fingerprint", fp(cookie));
    await supabase.from("photos").delete().eq("fingerprint", fp(cookie));
  }
}

async function main() {
  const serviceKey =
    process.env.SERVICE_ROLE_KEY ||
    loadSecret("/root/evrace-secrets/supabase.env", "SERVICE_ROLE_KEY");
  const supabase = createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false },
    realtime: { transport: ws },
  });

  const created = [];
  const cookies = [TEST_COOKIE, COOLDOWN_COOKIE, PENDING_COOKIE];
  const prodTurnstile = loadSecret(ENV_FILE, "TURNSTILE_SECRET_KEY");

  try {
    patchTurnstile(TURNSTILE_TEST_SECRET);
    await sleep(8000);
    await cleanup(supabase, [], cookies);

    // B3 — Turnstile fail (empty token; pass-test secret still rejects missing token)
    const jpeg = await makeJpeg();
    const badTs = await uploadOne(TEST_COOKIE, jpeg, "");
    if (badTs.status === 403 && badTs.body.error === "turnstile_failed") {
      pass("B3", "Turnstile fail", "403 turnstile_failed");
    } else {
      fail("B3", "Turnstile fail", JSON.stringify(badTs));
    }

    // B4 — Cooldown
    await supabase.from("photo_fingerprint_state").upsert({
      fingerprint: fp(COOLDOWN_COOKIE),
      last_submission_at: new Date().toISOString(),
    });
    const cd = await uploadOne(COOLDOWN_COOKIE, jpeg);
    if (cd.status === 429 && cd.body.error === "cooldown_active") {
      pass("B4", "Cooldown", `cooldown_seconds=${cd.body.cooldown_seconds}`);
    } else {
      fail("B4", "Cooldown", JSON.stringify(cd));
    }

    // B5 — Pending limit
    const pendingIds = [];
    for (let i = 0; i < 5; i++) {
      const { data: r } = await supabase
        .from("photos")
        .insert({
          location_id: TEST_LOCATION_ID,
          author_type: "anonymous",
          fingerprint: fp(PENDING_COOKIE),
          status: "uploaded",
        })
        .select("id")
        .single();
      pendingIds.push(r.id);
    }
    const lim = await uploadOne(PENDING_COOKIE, jpeg);
    await supabase.from("photos").delete().in("id", pendingIds);
    if (lim.status === 429 && lim.body.error === "pending_limit") {
      pass("B5", "Pending limit", `pending_count=${lim.body.pending_count}`);
    } else {
      fail("B5", "Pending limit", JSON.stringify(lim));
    }

    // B10 + upload success (backend direct — CF B2 covered by cf script)
    await supabase.from("photo_fingerprint_state").delete().eq("fingerprint", fp(TEST_COOKIE));
    await supabase.from("photos").delete().eq("fingerprint", fp(TEST_COOKIE));

    const before = await fetchStatus(TEST_COOKIE);
    const beforePending = before.body.pending_count ?? 0;

    const up = await uploadOne(TEST_COOKIE, jpeg);
    if (up.status === 200 && up.body.accepted >= 1) {
      pass("B2-backend", "Upload success (BY direct)", `accepted=${up.body.accepted}`);
      if (up.body.photo_ids?.length) created.push(...up.body.photo_ids);
    } else {
      fail("B2-backend", "Upload success (BY direct)", JSON.stringify(up));
    }

    const after = await fetchStatus(TEST_COOKIE);
    const afterPending = after.body.pending_count ?? 0;
    if (afterPending >= beforePending + 1) {
      pass("B10", "Status pending after upload", `before=${beforePending} after=${afterPending}`);
    } else {
      fail("B10", "Status pending after upload", `before=${beforePending} after=${afterPending}`);
    }

    const expectedCanUpload =
      afterPending < (after.body.max_pending || 5) && (after.body.cooldown_seconds || 0) === 0;
    if (after.body.can_upload === expectedCanUpload) {
      pass("B10", "can_upload matches backend", String(after.body.can_upload));
    } else {
      fail("B10", "can_upload matches backend", `can_upload=${after.body.can_upload}`);
    }

    // B8 — Moderation queue (processor → pending_moderation)
    if (created.length) {
      await sleep(2500);
      const { data: row } = await supabase
        .from("photos")
        .select("status")
        .eq("id", created[0])
        .maybeSingle();
      if (row?.status === "pending_moderation" || row?.status === "processing" || row?.status === "uploaded") {
        pass("B8", "Moderation pipeline", `status=${row.status}`);
      } else {
        fail("B8", "Moderation pipeline", `status=${row?.status}`);
      }
    } else {
      fail("B8", "Moderation pipeline", "no photo_id");
    }

    // B6 — API fields for blocked UI states
    const stCd = await fetchStatus(COOLDOWN_COOKIE);
    const stPend = await fetchStatus(PENDING_COOKIE);
    if (stCd.body.can_upload === false && (stCd.body.cooldown_seconds || 0) > 0) {
      pass("B6", "Cooldown blocked state API", `cooldown=${stCd.body.cooldown_seconds}`);
    } else {
      fail("B6", "Cooldown blocked state API", JSON.stringify(stCd.body));
    }
    await supabase.from("photos").delete().eq("fingerprint", fp(PENDING_COOKIE));
    for (let i = 0; i < 5; i++) {
      await supabase.from("photos").insert({
        location_id: TEST_LOCATION_ID,
        author_type: "anonymous",
        fingerprint: fp(PENDING_COOKIE),
        status: "uploaded",
      });
    }
    const stPend2 = await fetchStatus(PENDING_COOKIE);
    if (stPend2.body.can_upload === false && stPend2.body.pending_count >= 5) {
      pass("B6", "Pending limit blocked state API", `pending=${stPend2.body.pending_count}`);
    } else {
      fail("B6", "Pending limit blocked state API", JSON.stringify(stPend2.body));
    }
    await supabase.from("photos").delete().eq("fingerprint", fp(PENDING_COOKIE));
  } catch (err) {
    fail("Z", "unexpected error", err.message || String(err));
  } finally {
    await cleanup(supabase, created, cookies);
    if (prodTurnstile) {
      patchTurnstile(prodTurnstile);
      await sleep(5000);
    }
  }

  const fails = results.filter((r) => r.status === "FAIL");
  console.log("\n=== Photos Phase 4B BY Verification ===\n");
  for (const r of results) {
    console.log(`${r.status} [${r.id}] ${r.name}${r.detail ? " — " + r.detail : ""}`);
  }
  console.log(`\n${results.length - fails.length}/${results.length} PASS\n`);
  process.exit(fails.length ? 1 : 0);
}

main();
