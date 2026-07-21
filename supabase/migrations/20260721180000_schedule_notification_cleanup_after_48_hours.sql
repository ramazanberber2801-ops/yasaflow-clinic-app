create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create or replace function public.delete_expired_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.notifications
  where created_at < now() - interval '48 hours';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.delete_expired_notifications() from public;
grant execute on function public.delete_expired_notifications() to postgres;

select cron.schedule(
  'delete-expired-notifications',
  '0 * * * *',
  $$select public.delete_expired_notifications();$$
);
