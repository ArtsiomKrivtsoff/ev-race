import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { getCompletedRound } from '../_shared/rounds.ts';
import { validateCronSecret } from '../_shared/validate-cron-secret.ts';
import { processRound } from '../generate-weekly-letter/process-round.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  if (!validateCronSecret(req.headers.get('x-cron-secret'))) {
    return new Response('Unauthorized', { status: 401, headers: cors });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json().catch(() => ({}));
    const throughRound =
      typeof body.through_round === 'number'
        ? body.through_round
        : getCompletedRound();

    const skipGpt = body.skip_gpt === true;
    const results = [];

    for (let rn = 1; rn <= throughRound; rn++) {
      const result = await processRound(supabase, {
        roundNumber: rn,
        isBackfill: true,
        skipGpt,
      });
      results.push(result);
    }

    const created = results.filter((r) => !r.skipped).length;
    const skipped = results.filter((r) => r.skipped).length;

    return new Response(
      JSON.stringify({
        through_round: throughRound,
        created,
        skipped,
        skip_gpt: skipGpt,
        results,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
