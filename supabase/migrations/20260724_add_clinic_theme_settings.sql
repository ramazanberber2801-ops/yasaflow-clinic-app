alter table public.clinic_settings
  add column if not exists theme_id text not null default 'clinic-luxury',
  add column if not exists theme_overrides jsonb not null default '{}'::jsonb;

alter table public.clinic_settings
  drop constraint if exists clinic_settings_theme_id_check;

alter table public.clinic_settings
  add constraint clinic_settings_theme_id_check
  check (theme_id in (
    'clinic-luxury',
    'nordic-clinic',
    'medical-clean',
    'beauty-rose',
    'dark-premium',
    'yasaflow-standard'
  ));

comment on column public.clinic_settings.theme_id is 'Selected clinic app theme preset';
comment on column public.clinic_settings.theme_overrides is 'Optional per-clinic theme token overrides';
