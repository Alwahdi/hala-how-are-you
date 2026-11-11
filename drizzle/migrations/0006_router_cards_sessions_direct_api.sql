ALTER TABLE public.routers ADD COLUMN IF NOT EXISTS direct_port integer, ADD COLUMN IF NOT EXISTS direct_tls boolean, ADD COLUMN IF NOT EXISTS cards_sync_started_at timestamptz, ADD COLUMN IF NOT EXISTS cards_synced_at timestamptz;

CREATE TABLE public.router_cards (
  router_id uuid NOT NULL REFERENCES public.routers(id) ON DELETE CASCADE,
  source text NOT NULL,
  name text NOT NULL,
  profile text,
  uptime_s bigint NOT NULL DEFAULT 0,
  bytes bigint NOT NULL DEFAULT 0,
  limit_uptime_s bigint,
  limit_bytes bigint,
  disabled boolean NOT NULL DEFAULT false,
  comment text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (router_id, source, name)
);
GRANT SELECT ON public.router_cards TO authenticated;
GRANT ALL ON public.router_cards TO service_role;
ALTER TABLE public.router_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read router cards" ON public.router_cards FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.routers r WHERE r.id = router_cards.router_id AND r.owner_id = auth.uid()));

CREATE TABLE public.router_sessions (
  router_id uuid NOT NULL REFERENCES public.routers(id) ON DELETE CASCADE,
  source text NOT NULL,
  username text NOT NULL,
  address text,
  mac text,
  uptime_s bigint NOT NULL DEFAULT 0,
  bytes bigint NOT NULL DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (router_id, source, username, mac)
);
GRANT SELECT ON public.router_sessions TO authenticated;
GRANT ALL ON public.router_sessions TO service_role;
ALTER TABLE public.router_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read router sessions" ON public.router_sessions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.routers r WHERE r.id = router_sessions.router_id AND r.owner_id = auth.uid()));

CREATE TABLE public.router_profiles (
  router_id uuid NOT NULL REFERENCES public.routers(id) ON DELETE CASCADE,
  source text NOT NULL,
  name text NOT NULL,
  rate_limit text,
  shared_users text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (router_id, source, name)
);
GRANT SELECT ON public.router_profiles TO authenticated;
GRANT ALL ON public.router_profiles TO service_role;
ALTER TABLE public.router_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read router profiles" ON public.router_profiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.routers r WHERE r.id = router_profiles.router_id AND r.owner_id = auth.uid()));