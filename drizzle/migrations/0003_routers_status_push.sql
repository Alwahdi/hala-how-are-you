CREATE TABLE public.routers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  ros_version text NOT NULL DEFAULT 'v7',
  token_hash text NOT NULL UNIQUE,
  last_seen_at timestamptz,
  last_status jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routers TO authenticated;
GRANT ALL ON public.routers TO service_role;
ALTER TABLE public.routers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read routers" ON public.routers FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners add routers" ON public.routers FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update routers" ON public.routers FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners delete routers" ON public.routers FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE public.router_status_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  router_id uuid NOT NULL REFERENCES public.routers(id) ON DELETE CASCADE,
  status jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX router_status_log_router_time ON public.router_status_log(router_id, created_at DESC);
GRANT SELECT ON public.router_status_log TO authenticated;
GRANT ALL ON public.router_status_log TO service_role;
ALTER TABLE public.router_status_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read router log" ON public.router_status_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.routers r WHERE r.id = router_id AND r.owner_id = auth.uid()));