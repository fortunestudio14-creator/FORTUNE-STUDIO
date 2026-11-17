-- Run this once in Supabase > SQL Editor > New query.
create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings" on public.site_settings for select using (true);
drop policy if exists "Signed-in admins can manage site settings" on public.site_settings;
create policy "Signed-in admins can manage site settings" on public.site_settings for all to authenticated using (true) with check (true);
grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;
insert into public.site_settings (id, content) values (1, '{}'::jsonb) on conflict (id) do nothing;
-- Create a PUBLIC bucket named site-media in Storage (images/videos shown on the public site).
-- Only authenticated users can upload/update/delete files; public visitors can read them.
