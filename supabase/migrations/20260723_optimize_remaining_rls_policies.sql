begin;

-- Birthday settings: avoid overlapping ALL and SELECT policies while preserving
-- staff read access and owner/admin write access.
drop policy if exists "clinic admins manage birthday settings" on public.clinic_birthday_automations;
drop policy if exists "clinic admins read birthday settings" on public.clinic_birthday_automations;

create policy "clinic staff read birthday settings"
on public.clinic_birthday_automations
for select
to authenticated
using (
  exists (
    select 1 from public.clinic_members m
    where m.clinic_id = clinic_birthday_automations.clinic_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'staff')
  )
);

create policy "clinic admins insert birthday settings"
on public.clinic_birthday_automations
for insert
to authenticated
with check (
  exists (
    select 1 from public.clinic_members m
    where m.clinic_id = clinic_birthday_automations.clinic_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner', 'admin')
  )
);

create policy "clinic admins update birthday settings"
on public.clinic_birthday_automations
for update
to authenticated
using (
  exists (
    select 1 from public.clinic_members m
    where m.clinic_id = clinic_birthday_automations.clinic_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1 from public.clinic_members m
    where m.clinic_id = clinic_birthday_automations.clinic_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner', 'admin')
  )
);

create policy "clinic admins delete birthday settings"
on public.clinic_birthday_automations
for delete
to authenticated
using (
  exists (
    select 1 from public.clinic_members m
    where m.clinic_id = clinic_birthday_automations.clinic_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner', 'admin')
  )
);

-- Birthday send history.
drop policy if exists "clinic admins read birthday sends" on public.clinic_birthday_sends;
create policy "clinic staff read birthday sends"
on public.clinic_birthday_sends
for select
to authenticated
using (
  exists (
    select 1 from public.clinic_members m
    where m.clinic_id = clinic_birthday_sends.clinic_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'staff')
  )
);

-- CRM activity.
drop policy if exists "clinic admins can insert crm activity" on public.crm_customer_activity;
drop policy if exists "clinic admins can read crm activity" on public.crm_customer_activity;
drop policy if exists "clinic admins can update crm activity" on public.crm_customer_activity;

create policy "clinic staff can insert crm activity"
on public.crm_customer_activity
for insert
to authenticated
with check (
  exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = crm_customer_activity.clinic_id
      and cm.user_id = (select auth.uid())
      and cm.status = 'active'
      and cm.role in ('owner', 'admin', 'staff')
  )
);

create policy "clinic staff can read crm activity"
on public.crm_customer_activity
for select
to authenticated
using (
  exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = crm_customer_activity.clinic_id
      and cm.user_id = (select auth.uid())
      and cm.status = 'active'
      and cm.role in ('owner', 'admin', 'staff')
  )
);

create policy "clinic admins can update crm activity"
on public.crm_customer_activity
for update
to authenticated
using (
  exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = crm_customer_activity.clinic_id
      and cm.user_id = (select auth.uid())
      and cm.status = 'active'
      and cm.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = crm_customer_activity.clinic_id
      and cm.user_id = (select auth.uid())
      and cm.status = 'active'
      and cm.role in ('owner', 'admin')
  )
);

-- CRM preferences.
drop policy if exists "clinic admins can insert crm preferences" on public.crm_customer_preferences;
drop policy if exists "clinic admins can read crm preferences" on public.crm_customer_preferences;
drop policy if exists "clinic admins can update crm preferences" on public.crm_customer_preferences;

create policy "clinic staff can insert crm preferences"
on public.crm_customer_preferences
for insert
to authenticated
with check (
  exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = crm_customer_preferences.clinic_id
      and cm.user_id = (select auth.uid())
      and cm.status = 'active'
      and cm.role in ('owner', 'admin', 'staff')
  )
);

create policy "clinic staff can read crm preferences"
on public.crm_customer_preferences
for select
to authenticated
using (
  exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = crm_customer_preferences.clinic_id
      and cm.user_id = (select auth.uid())
      and cm.status = 'active'
      and cm.role in ('owner', 'admin', 'staff')
  )
);

create policy "clinic staff can update crm preferences"
on public.crm_customer_preferences
for update
to authenticated
using (
  exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = crm_customer_preferences.clinic_id
      and cm.user_id = (select auth.uid())
      and cm.status = 'active'
      and cm.role in ('owner', 'admin', 'staff')
  )
)
with check (
  exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = crm_customer_preferences.clinic_id
      and cm.user_id = (select auth.uid())
      and cm.status = 'active'
      and cm.role in ('owner', 'admin', 'staff')
  )
);

-- Customer rewards: combine customer and clinic-staff SELECT access into one
-- policy, while keeping write access restricted to active clinic staff.
drop policy if exists "clinic staff manage customer rewards" on public.customer_rewards;
drop policy if exists "customers view own rewards" on public.customer_rewards;

drop policy if exists "authorized users view customer rewards" on public.customer_rewards;
drop policy if exists "clinic staff insert customer rewards" on public.customer_rewards;
drop policy if exists "clinic staff update customer rewards" on public.customer_rewards;
drop policy if exists "clinic staff delete customer rewards" on public.customer_rewards;

create policy "authorized users view customer rewards"
on public.customer_rewards
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = customer_rewards.clinic_id
      and cm.user_id = (select auth.uid())
      and cm.role in ('owner', 'admin', 'staff')
      and cm.status = 'active'
  )
);

create policy "clinic staff insert customer rewards"
on public.customer_rewards
for insert
to authenticated
with check (
  exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = customer_rewards.clinic_id
      and cm.user_id = (select auth.uid())
      and cm.role in ('owner', 'admin', 'staff')
      and cm.status = 'active'
  )
);

create policy "clinic staff update customer rewards"
on public.customer_rewards
for update
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

create policy "clinic staff delete customer rewards"
on public.customer_rewards
for delete
to authenticated
using (
  exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = customer_rewards.clinic_id
      and cm.user_id = (select auth.uid())
      and cm.role in ('owner', 'admin', 'staff')
      and cm.status = 'active'
  )
);

commit;
