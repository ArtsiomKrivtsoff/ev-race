import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { getCompletedRound } from '../_shared/rounds.ts';
import { validateCronSecret } from '../_shared/validate-cron-secret.ts';
import { processRound } from './process-round.ts';

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
    const roundNumber =
      typeof body.round_number === 'number'
        ? body.round_number
        : getCompletedRound();

    if (roundNumber < 1) {
      return new Response(JSON.stringify({ error: 'No completed round yet' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const result = await processRound(supabase, {
      roundNumber,
      isBackfill: false,
      skipGpt: body.skip_gpt === true,
    });

    if (result.skipped) {
      return new Response(JSON.stringify({ error: result.reason, ...result }), {
        status: 409,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        ...result,
        telegram_sent: result.telegram_sent ?? false,
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
