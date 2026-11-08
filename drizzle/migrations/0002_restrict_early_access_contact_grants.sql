REVOKE ALL ON public.early_access_contacts FROM anon, authenticated;
GRANT ALL ON public.early_access_contacts TO service_role;