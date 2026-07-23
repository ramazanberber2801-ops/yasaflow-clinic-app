revoke all on function public.create_clinic_onboarding(text,text,text,text,text,boolean,boolean,boolean,boolean,boolean) from public;
revoke execute on function public.create_clinic_onboarding(text,text,text,text,text,boolean,boolean,boolean,boolean,boolean) from anon, authenticated;
grant execute on function public.create_clinic_onboarding(text,text,text,text,text,boolean,boolean,boolean,boolean,boolean) to service_role;

revoke all on function public.refresh_clinic_storage_usage(uuid) from public;
revoke execute on function public.refresh_clinic_storage_usage(uuid) from anon, authenticated;
grant execute on function public.refresh_clinic_storage_usage(uuid) to service_role;
