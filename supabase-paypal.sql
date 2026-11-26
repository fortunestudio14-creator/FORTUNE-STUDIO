-- Run once in Supabase SQL Editor.
-- This table stores PayPal order details server-side. Do not enable public access.
create table if not exists public.paypal_bookings (
  order_id text primary key,
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  booking jsonb not null,
  capture_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.paypal_bookings enable row level security;
revoke all on public.paypal_bookings from anon, authenticated;
