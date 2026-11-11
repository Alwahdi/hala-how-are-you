CREATE OR REPLACE FUNCTION public.mark_finished_cards()
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.router_cards SET finished_at = now()
  WHERE finished_at IS NULL AND NOT disabled
    AND ((limit_uptime_s > 0 AND uptime_s >= limit_uptime_s) OR (limit_bytes > 0 AND bytes >= limit_bytes));
  UPDATE public.router_cards SET finished_at = NULL
  WHERE finished_at IS NOT NULL
    AND NOT ((limit_uptime_s > 0 AND uptime_s >= limit_uptime_s) OR (limit_bytes > 0 AND bytes >= limit_bytes));
$$;
REVOKE ALL ON FUNCTION public.mark_finished_cards() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_finished_cards() TO service_role;