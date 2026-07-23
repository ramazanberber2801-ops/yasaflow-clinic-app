-- Allow active clinic staff to record loyalty events for their own clinic,
-- while retaining platform-admin access.
drop policy if exists loyalty_events_insert_admin on public.loyalty_events;
create policy loyalty_events_insert_clinic_staff
on public.loyalty_events
for insert
to authenticated
with check (
  (select private.is_platform_admin((select auth.uid())))
  or exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = loyalty_events.clinic_id
      and cm.user_id = (select auth.uid())
      and cm.status = 'active'
      and cm.role in ('owner', 'admin', 'staff')
  )
);

-- Avoid evaluating auth.uid() once per row in frequently used policies.
drop policy if exists "customers view own rewards" on public.customer_rewards;
create policy "customers view own rewards"
on public.customer_rewards
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "clinic staff manage customer rewards" on public.customer_rewards;
create policy "clinic staff manage customer rewards"
on public.customer_rewards
for all
to authenticated
using (
  exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = customer_rewards.clinic_id
      and cm.user_id = (select auth.uid())
      and cm.role in ('owner', 'admin', 'staff')
      and cm.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = customer_rewards.clinic_id
      and cm.user_id = (select auth.uid())
      and cm.role in ('owner', 'admin', 'staff')
      and cm.status = 'active'
  )
);

-- Cover foreign keys used by CRM and reward history queries.
create index if not exists clinic_birthday_sends_notification_id_idx
  on public.clinic_birthday_sends(notification_id);
create index if not exists clinic_birthday_sends_user_id_idx
  on public.clinic_birthday_sends(user_id);
create index if not exists crm_customer_activity_created_by_idx
  on public.crm_customer_activity(created_by);
create index if not exists crm_customer_activity_user_id_idx
  on public.crm_customer_activity(user_id);
create index if not exists crm_customer_preferences_user_id_idx
  on public.crm_customer_preferences(user_id);
create index if not exists customer_rewards_created_by_idx
  on public.customer_rewards(created_by);
create index if not exists customer_rewards_redeemed_by_idx
  on public.customer_rewards(redeemed_by);
create index if not exists customer_rewards_user_id_idx
  on public.customer_rewards(user_id);
