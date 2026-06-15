-- ============================================================
-- Arkive — Complete Supabase Migration (run this in full)
-- Go to: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to run multiple times (uses IF NOT EXISTS / OR REPLACE)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- PROFILES
-- Stores the user's chosen username (shown instead of email)
-- ─────────────────────────────────────────────────────────────
create table if not exists profiles (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null unique,
  username      text,
  display_name  text,
  created_at    timestamptz default now() not null
);

alter table profiles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='profiles_select') then
    create policy "profiles_select" on profiles for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='profiles_insert') then
    create policy "profiles_insert" on profiles for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='profiles_update') then
    create policy "profiles_update" on profiles for update using (auth.uid() = user_id);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- INACTIVITY SETTINGS
-- One row per user. Stores the dead-man switch config including
-- required_approvals (2 = "2 of 3" quorum, 3 = "3 of 5" quorum)
-- total_guardians is auto-maintained by a trigger below
-- ─────────────────────────────────────────────────────────────
create table if not exists inactivity_settings (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid references auth.users(id) on delete cascade not null unique,
  inactivity_days       integer default 90 not null,
  check_interval_days   integer default 30 not null,
  time_delay_days       integer default 7 not null,
  auto_check_in_enabled boolean default false not null,
  multi_signal_enabled  boolean default true not null,
  time_delay_enabled    boolean default true not null,
  final_warning_enabled boolean default true not null,
  required_approvals    integer default 2 not null,   -- 2 = "2 of 3", 3 = "3 of 5"
  total_guardians       integer default 0 not null,   -- auto-updated by trigger
  current_status        text default 'active' not null, -- active | warning | escalation | triggered
  last_check_in         timestamptz,
  created_at            timestamptz default now() not null
);

alter table inactivity_settings enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='inactivity_settings' and policyname='settings_select') then
    create policy "settings_select" on inactivity_settings for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='inactivity_settings' and policyname='settings_insert') then
    create policy "settings_insert" on inactivity_settings for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='inactivity_settings' and policyname='settings_update') then
    create policy "settings_update" on inactivity_settings for update using (auth.uid() = user_id);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- GUARDIANS
-- telegram_username stored in DB (not localStorage) so it
-- persists across devices and browsers
-- ─────────────────────────────────────────────────────────────
create table if not exists guardians (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid references auth.users(id) on delete cascade not null,
  name              text not null,
  email             text not null,
  wallet_address    text,
  phone             text,
  telegram_username text,         -- persistent; shown in Guardians tab
  status            text default 'pending' not null,
  created_at        timestamptz default now() not null
);

alter table guardians enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='guardians' and policyname='guardians_select') then
    create policy "guardians_select" on guardians for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='guardians' and policyname='guardians_insert') then
    create policy "guardians_insert" on guardians for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='guardians' and policyname='guardians_update') then
    create policy "guardians_update" on guardians for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='guardians' and policyname='guardians_delete') then
    create policy "guardians_delete" on guardians for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Trigger: keep inactivity_settings.total_guardians in sync
-- Fires after any INSERT or DELETE on guardians
create or replace function sync_guardian_count()
returns trigger language plpgsql security definer as $$
declare
  v_user_id uuid;
  v_count   integer;
begin
  -- determine which user_id changed
  if TG_OP = 'DELETE' then
    v_user_id := OLD.user_id;
  else
    v_user_id := NEW.user_id;
  end if;

  -- count current guardians for that user
  select count(*) into v_count from guardians where user_id = v_user_id;

  -- upsert into inactivity_settings
  insert into inactivity_settings (user_id, total_guardians)
  values (v_user_id, v_count)
  on conflict (user_id) do update set total_guardians = v_count;

  return null;
end;
$$;

drop trigger if exists trg_sync_guardian_count on guardians;
create trigger trg_sync_guardian_count
  after insert or delete on guardians
  for each row execute function sync_guardian_count();

-- ─────────────────────────────────────────────────────────────
-- BENEFICIARIES
-- ─────────────────────────────────────────────────────────────
create table if not exists beneficiaries (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid references auth.users(id) on delete cascade not null,
  name               text not null,
  email              text not null,
  wallet_address     text,
  phone              text,
  allocation_percent numeric default 0 not null,
  created_at         timestamptz default now() not null
);

alter table beneficiaries enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='beneficiaries' and policyname='beneficiaries_select') then
    create policy "beneficiaries_select" on beneficiaries for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='beneficiaries' and policyname='beneficiaries_insert') then
    create policy "beneficiaries_insert" on beneficiaries for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='beneficiaries' and policyname='beneficiaries_update') then
    create policy "beneficiaries_update" on beneficiaries for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='beneficiaries' and policyname='beneficiaries_delete') then
    create policy "beneficiaries_delete" on beneficiaries for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- ASSETS
-- Transfer rules: X amount of SYMBOL goes to beneficiary_id
-- ─────────────────────────────────────────────────────────────
create table if not exists assets (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  symbol         text not null,
  name           text not null,
  amount         numeric default 0 not null,
  value_usd      numeric default 0 not null,
  beneficiary_id uuid references beneficiaries(id) on delete set null,
  created_at     timestamptz default now() not null
);

alter table assets enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='assets' and policyname='assets_select') then
    create policy "assets_select" on assets for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='assets' and policyname='assets_insert') then
    create policy "assets_insert" on assets for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='assets' and policyname='assets_update') then
    create policy "assets_update" on assets for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='assets' and policyname='assets_delete') then
    create policy "assets_delete" on assets for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- ACTIVITY LOGS
-- Audit trail for check-ins, guardian changes, panic resets, etc.
-- ─────────────────────────────────────────────────────────────
create table if not exists activity_logs (
  id        uuid primary key default uuid_generate_v4(),
  user_id   uuid references auth.users(id) on delete cascade not null,
  type      text default 'system' not null,
  message   text not null,
  severity  text default 'info' not null,  -- info | warning | critical
  timestamp timestamptz default now() not null
);

alter table activity_logs enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='activity_logs' and policyname='logs_select') then
    create policy "logs_select" on activity_logs for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='activity_logs' and policyname='logs_insert') then
    create policy "logs_insert" on activity_logs for insert with check (auth.uid() = user_id);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- TRACKED WALLETS
-- Up to 3 external wallet addresses monitored for activity.
-- Editable at most once per 30 days (enforced in frontend).
-- ─────────────────────────────────────────────────────────────
create table if not exists tracked_wallets (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  label           text,
  address         text not null,
  chain           text default 'arc-testnet' not null,
  last_updated_at timestamptz default now() not null,
  created_at      timestamptz default now() not null
);

alter table tracked_wallets enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='tracked_wallets' and policyname='wallets_select') then
    create policy "wallets_select" on tracked_wallets for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='tracked_wallets' and policyname='wallets_insert') then
    create policy "wallets_insert" on tracked_wallets for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='tracked_wallets' and policyname='wallets_update') then
    create policy "wallets_update" on tracked_wallets for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='tracked_wallets' and policyname='wallets_delete') then
    create policy "wallets_delete" on tracked_wallets for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- VAULT DEPOSITS
-- On-chain deposits recorded when user deposits to the vault
-- ─────────────────────────────────────────────────────────────
create table if not exists vault_deposits (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  from_address text not null,
  amount       numeric not null,
  token        text default 'USDC' not null,
  chain_id     integer not null,
  tx_hash      text not null,
  status       text default 'confirmed' not null,
  created_at   timestamptz default now() not null,
  unique (tx_hash, chain_id)   -- prevent duplicate deposit records
);

alter table vault_deposits enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='vault_deposits' and policyname='deposits_select') then
    create policy "deposits_select" on vault_deposits for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='vault_deposits' and policyname='deposits_insert') then
    create policy "deposits_insert" on vault_deposits for insert with check (auth.uid() = user_id);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Done! All tables, policies, and triggers are now in place.
-- ─────────────────────────────────────────────────────────────
