-- Fortune Studio private customer inbox and real-agent availability.
-- Safe to run again: it creates missing tables and adds delivery tracking columns.
-- Run once in Supabase > SQL Editor > New query > Run.

create extension if not exists pgcrypto;

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  status text not null default 'new' check (status in ('new', 'open', 'replied', 'closed')),
  visitor_token_hash text not null,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_replied_at timestamptz
);

create index if not exists support_conversations_last_message_idx
  on public.support_conversations (last_message_at desc);

create table if not exists public.support_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender text not null check (sender in ('customer', 'admin', 'system')),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

-- Track whether an admin reply was actually accepted by Resend, and allow retries after failures.
alter table public.support_messages add column if not exists delivery_status text not null default 'unknown';
alter table public.support_messages add column if not exists delivery_error text not null default '';
alter table public.support_messages add column if not exists email_id text;

create index if not exists support_messages_conversation_idx
  on public.support_messages (conversation_id, created_at);

create table if not exists public.support_settings (
  id integer primary key default 1 check (id = 1),
  agent_online boolean not null default false,
  offline_message text not null default 'Leave a message and our team will reply by email.',
  updated_at timestamptz not null default now()
);

insert into public.support_settings (id, agent_online)
values (1, false)
on conflict (id) do nothing;

alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_settings enable row level security;

-- Never expose private inbox messages or customer contact details to website visitors.
-- All access is server-side through api/messages.js with the service-role key.
revoke all on public.support_conversations from public, anon, authenticated;
revoke all on public.support_messages from public, anon, authenticated;
revoke all on public.support_settings from public, anon, authenticated;

grant all on public.support_conversations, public.support_messages, public.support_settings to service_role;
grant usage, select on sequence public.support_messages_id_seq to service_role;
