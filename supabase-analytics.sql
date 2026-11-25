-- Visitor statistics (country + time on site). Run ONCE in Supabase > SQL Editor > New query.
-- No IP address is stored. Only: random visit id, country, city, device, source, seconds on site, scroll depth.

create table if not exists public.site_visits (
  sid        text primary key check (char_length(sid) between 8 and 64),
  started_at timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  seconds    integer not null default 0,
  scroll     integer not null default 0,
  book       boolean not null default false,
  country    text not null default '',
  city       text not null default '',
  path       text not null default '/',
  ref        text not null default '',
  device     text not null default '',
  lang       text not null default ''
);
create index if not exists site_visits_started_idx on public.site_visits (started_at desc);

alter table public.site_visits enable row level security;
drop policy if exists "Admins read visits" on public.site_visits;
create policy "Admins read visits" on public.site_visits for select to authenticated using (true);
drop policy if exists "Admins delete visits" on public.site_visits;
create policy "Admins delete visits" on public.site_visits for delete to authenticated using (true);
revoke all on public.site_visits from anon;
grant select, delete on public.site_visits to authenticated;

-- Visitors cannot read or write the table directly. The website sends data through this function only.
create or replace function public.track_visit(
  p_sid text, p_country text, p_city text, p_path text, p_ref text,
  p_device text, p_lang text, p_seconds integer, p_scroll integer, p_book boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_sid is null or char_length(p_sid) < 8 or char_length(p_sid) > 64 then return; end if;
  insert into public.site_visits (sid, country, city, path, ref, device, lang, seconds, scroll, book)
  values (
    p_sid, left(coalesce(p_country, ''), 2), left(coalesce(p_city, ''), 60), left(coalesce(p_path, '/'), 120),
    left(coalesce(p_ref, ''), 80), left(coalesce(p_device, ''), 12), left(coalesce(p_lang, ''), 8),
    0, least(greatest(coalesce(p_scroll, 0), 0), 100), coalesce(p_book, false)
  )
  on conflict (sid) do update set
    last_seen = now(),
    -- time can never grow faster than the real clock (stops fake numbers)
    seconds = greatest(public.site_visits.seconds, least(greatest(coalesce(p_seconds, 0), 0), extract(epoch from (now() - public.site_visits.started_at))::integer + 30, 14400)),
    scroll  = greatest(public.site_visits.scroll, least(greatest(coalesce(p_scroll, 0), 0), 100)),
    book    = public.site_visits.book or coalesce(p_book, false);
end $$;
revoke all on function public.track_visit(text, text, text, text, text, text, text, integer, integer, boolean) from public;
grant execute on function public.track_visit(text, text, text, text, text, text, text, integer, integer, boolean) to anon, authenticated;
