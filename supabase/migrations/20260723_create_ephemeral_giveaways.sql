begin;

create table if not exists public.giveaway_sessions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  instagram_url text not null,
  rules jsonb not null default '{}'::jsonb,
  participants jsonb not null default '[]'::jsonb,
  winner_data jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '12 hours')
);

create index if not exists giveaway_sessions_clinic_expires_idx
  on public.giveaway_sessions (clinic_id, expires_at);

alter table public.giveaway_sessions enable row level security;

drop policy if exists "clinic staff manage giveaway sessions" on public.giveaway_sessions;
create policy "clinic staff manage giveaway sessions"
on public.giveaway_sessions
for all
to authenticated
using (
  exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = giveaway_sessions.clinic_id
      and cm.user_id = (select auth.uid())
      and cm.status = 'active'
      and cm.role in ('owner', 'admin', 'staff')
  )
  and expires_at > now()
)
with check (
  created_by = (select auth.uid())
  and expires_at <= created_at + interval '12 hours'
  and expires_at > created_at
  and exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = giveaway_sessions.clinic_id
      and cm.user_id = (select auth.uid())
      and cm.status = 'active'
      and cm.role in ('owner', 'admin', 'staff')
  )
);

create or replace function public.purge_expired_giveaway_sessions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.giveaway_sessions
  where expires_at <= now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_giveaway_sessions() from public;
revoke all on function public.purge_expired_giveaway_sessions() from anon;
revoke all on function public.purge_expired_giveaway_sessions() from authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'purge-expired-giveaway-sessions';

    perform cron.schedule(
      'purge-expired-giveaway-sessions',
      '17 * * * *',
      'select public.purge_expired_giveaway_sessions();'
    );
  end if;
end;
$$;

commit;
