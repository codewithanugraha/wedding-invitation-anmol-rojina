-- Guest book and RSVP database for the wedding invitation.
-- In Supabase: open SQL Editor, paste all of this, and press Run.
-- It is safe to run this again: existing wishes and responses are kept.

create table if not exists public.wishes (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  message     text not null check (char_length(btrim(message)) between 1 and 500),
  hidden      boolean not null default false,  -- tick this in the Table Editor to remove a wish from the page
  created_at  timestamptz not null default now()
);

create index if not exists wishes_created_at_idx on public.wishes (created_at desc);

-- Guests can read visible wishes and add new ones. They cannot edit or delete
-- anything, and cannot set "hidden" or "created_at" themselves.
alter table public.wishes enable row level security;

revoke all on public.wishes from anon, authenticated;
grant select (id, name, message, created_at) on public.wishes to anon, authenticated;
grant insert (name, message) on public.wishes to anon, authenticated;

drop policy if exists "Guests can read visible wishes" on public.wishes;
create policy "Guests can read visible wishes"
  on public.wishes for select
  to anon, authenticated
  using (hidden = false);

drop policy if exists "Guests can add wishes" on public.wishes;
create policy "Guests can add wishes"
  on public.wishes for insert
  to anon, authenticated
  with check (hidden = false);

-- Slows down automated spam: no more than 30 new wishes a minute in total.
create or replace function public.wishes_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.wishes
      where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Too many wishes right now, please try again shortly';
  end if;
  return new;
end;
$$;

drop trigger if exists wishes_rate_limit on public.wishes;
create trigger wishes_rate_limit
  before insert on public.wishes
  for each row execute function public.wishes_rate_limit();

-- ------------------------------------------------------------------
-- RSVP responses
-- Guests can send a response but cannot read anyone's, including their
-- own. You can see them all in the Supabase Table Editor.
-- ------------------------------------------------------------------
create table if not exists public.rsvps (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  attending   boolean not null,
  created_at  timestamptz not null default now()
);

alter table public.rsvps enable row level security;

revoke all on public.rsvps from anon, authenticated;
grant insert (name, attending) on public.rsvps to anon, authenticated;

drop policy if exists "Guests can send a response" on public.rsvps;
create policy "Guests can send a response"
  on public.rsvps for insert
  to anon, authenticated
  with check (true);

-- Slows down automated spam: no more than 30 new responses a minute in total.
create or replace function public.rsvps_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.rsvps
      where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Too many responses right now, please try again shortly';
  end if;
  return new;
end;
$$;

drop trigger if exists rsvps_rate_limit on public.rsvps;
create trigger rsvps_rate_limit
  before insert on public.rsvps
  for each row execute function public.rsvps_rate_limit();
