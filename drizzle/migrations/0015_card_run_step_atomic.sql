-- Records one card batch atomically. Hotspot and User Manager scripts upload at the same time, and a
-- read-modify-write from the server lost one of them, which broke vanished-card removal and run timing.
CREATE OR REPLACE FUNCTION public.card_run_step(_router uuid, _source text, _page integer, _done boolean)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur jsonb;
  run jsonb;
  complete timestamptz;
  now_ts timestamptz := now();
BEGIN
  IF _source NOT IN ('hotspot', 'usermanager') THEN
    RETURN NULL;
  END IF;
  SELECT coalesce(card_runs, '{}'::jsonb) INTO cur FROM public.routers WHERE id = _router FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF _page = 0 THEN
    run := jsonb_build_object('at', now_ts, 'pages', 1);
  ELSIF cur ? _source THEN
    run := jsonb_build_object('at', cur -> _source ->> 'at', 'pages', (cur -> _source ->> 'pages')::int + 1);
  ELSE
    run := NULL;
  END IF;
  IF run IS NULL THEN
    cur := cur - _source;
  ELSE
    cur := jsonb_set(cur, ARRAY[_source], run);
  END IF;
  IF _done AND run IS NOT NULL AND (run ->> 'pages')::int = _page + 1 THEN
    complete := (run ->> 'at')::timestamptz;
    cur := jsonb_set(cur, '{took}', coalesce(cur -> 'took', '{}'::jsonb)
      || jsonb_build_object(_source, jsonb_build_object('secs', round(extract(epoch FROM now_ts - complete)), 'at', now_ts)));
    cur := cur - _source;
  END IF;
  UPDATE public.routers SET card_runs = cur WHERE id = _router;
  RETURN complete;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.card_run_step(uuid, text, integer, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.card_run_step(uuid, text, integer, boolean) TO service_role;