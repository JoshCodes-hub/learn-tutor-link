import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, type PaddleEnv } from '../_shared/paddle.ts';

// Map human-readable price IDs -> tokens to credit
const PRICE_TO_TOKENS: Record<string, number> = {
  tokens_100_onetime: 100,
  tokens_250_onetime: 250,
  tokens_500_onetime: 500,
  tokens_1000_onetime: 1000,
};

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }
  return _supabase;
}

async function handleTransactionCompleted(data: any, env: PaddleEnv) {
  const userId = data.customData?.userId;
  if (!userId) {
    console.warn('transaction.completed missing customData.userId', { id: data.id });
    return;
  }

  const item = data.items?.[0];
  const priceId = item?.price?.importMeta?.externalId;
  if (!priceId) {
    console.warn('transaction.completed missing price.importMeta.externalId', { id: data.id });
    return;
  }

  const tokens = PRICE_TO_TOKENS[priceId];
  if (!tokens) {
    console.warn('transaction.completed unknown priceId', { id: data.id, priceId });
    return;
  }

  const amountCents = parseInt(data.details?.totals?.total ?? '0', 10);
  const currency = data.currencyCode ?? 'USD';

  const { data: result, error } = await getSupabase().rpc('credit_tokens_for_purchase', {
    p_user_id: userId,
    p_paddle_transaction_id: data.id,
    p_price_id: priceId,
    p_tokens: tokens,
    p_amount_cents: amountCents,
    p_currency: currency,
    p_environment: env,
  });

  if (error) {
    console.error('credit_tokens_for_purchase failed', error);
    throw error;
  }
  console.log('credited tokens', { purchase: result, userId, tokens, txn: data.id });
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.eventType) {
    case EventName.TransactionCompleted:
      await handleTransactionCompleted(event.data, env);
      break;
    default:
      console.log('Unhandled event:', event.eventType);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const url = new URL(req.url);
  const env = (url.searchParams.get('env') || 'sandbox') as PaddleEnv;
  try {
    await handleWebhook(req, env);
    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response('Webhook error', { status: 400 });
  }
});
