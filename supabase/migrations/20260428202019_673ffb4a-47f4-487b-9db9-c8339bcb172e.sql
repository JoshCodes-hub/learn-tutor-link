-- Token purchases table (records each completed card purchase, idempotent on paddle_transaction_id)
create table if not exists public.token_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paddle_transaction_id text not null unique,
  price_id text not null,
  tokens_credited integer not null,
  amount_cents integer not null,
  currency text not null,
  environment text not null default 'sandbox',
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create index if not exists idx_token_purchases_user on public.token_purchases(user_id);

alter table public.token_purchases enable row level security;

create policy "Users view own purchases"
  on public.token_purchases for select
  using (auth.uid() = user_id);

create policy "Admins view all purchases"
  on public.token_purchases for select
  using (public.has_role(auth.uid(), 'admin'::app_role));

-- Atomic credit function (service-role only via SECURITY DEFINER; idempotent on paddle_transaction_id)
create or replace function public.credit_tokens_for_purchase(
  p_user_id uuid,
  p_paddle_transaction_id text,
  p_price_id text,
  p_tokens integer,
  p_amount_cents integer,
  p_currency text,
  p_environment text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase_id uuid;
  v_wallet_id uuid;
begin
  -- Idempotency: if this Paddle transaction was already processed, return existing id
  select id into v_purchase_id from public.token_purchases
    where paddle_transaction_id = p_paddle_transaction_id;
  if v_purchase_id is not null then
    return v_purchase_id;
  end if;

  -- Ensure wallet exists
  select id into v_wallet_id from public.token_wallets where user_id = p_user_id;
  if v_wallet_id is null then
    insert into public.token_wallets (user_id, balance) values (p_user_id, 0)
      returning id into v_wallet_id;
  end if;

  -- Insert purchase row first so a concurrent retry conflicts on the unique key
  insert into public.token_purchases (
    user_id, paddle_transaction_id, price_id, tokens_credited,
    amount_cents, currency, environment, status
  ) values (
    p_user_id, p_paddle_transaction_id, p_price_id, p_tokens,
    p_amount_cents, p_currency, p_environment, 'completed'
  ) returning id into v_purchase_id;

  -- Credit wallet
  update public.token_wallets
    set balance = balance + p_tokens,
        total_earned = total_earned + p_tokens,
        updated_at = now()
    where id = v_wallet_id;

  -- Transaction log
  insert into public.token_transactions (wallet_id, amount, type, description, reference_id)
    values (v_wallet_id, p_tokens, 'credit',
            'Token purchase (' || p_tokens || ' tokens)', v_purchase_id);

  -- Notification
  insert into public.notifications (user_id, title, message, type, link)
    values (p_user_id, 'Tokens added!',
            p_tokens || ' tokens have been credited to your wallet.',
            'success', '/student/dashboard');

  return v_purchase_id;
end;
$$;

revoke all on function public.credit_tokens_for_purchase(uuid, text, text, integer, integer, text, text) from public;
grant execute on function public.credit_tokens_for_purchase(uuid, text, text, integer, integer, text, text) to service_role;