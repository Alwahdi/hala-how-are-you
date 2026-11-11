CREATE TABLE public.push_subscriptions (
  endpoint text PRIMARY KEY,
  owner_id uuid NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own subscriptions" ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners delete own subscriptions" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE public.alert_prefs (
  owner_id uuid PRIMARY KEY,
  router_down boolean NOT NULL DEFAULT true,
  router_strain boolean NOT NULL DEFAULT true,
  cards_low boolean NOT NULL DEFAULT true,
  daily_report boolean NOT NULL DEFAULT true,
  health boolean NOT NULL DEFAULT true,
  auto_cleanup boolean NOT NULL DEFAULT true,
  cleanup_after_days int NOT NULL DEFAULT 3 CHECK (cleanup_after_days BETWEEN 1 AND 60),
  report_hour int NOT NULL DEFAULT 21 CHECK (report_hour BETWEEN 0 AND 23),
  utc_offset_min int NOT NULL DEFAULT 180 CHECK (utc_offset_min BETWEEN -720 AND 840),
  last_report_on date,
  last_cleanup_on date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.alert_prefs TO authenticated;
GRANT ALL ON public.alert_prefs TO service_role;
ALTER TABLE public.alert_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read prefs" ON public.alert_prefs FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners insert prefs" ON public.alert_prefs FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update prefs" ON public.alert_prefs FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  router_id uuid,
  kind text NOT NULL,
  dedup_key text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  path text NOT NULL DEFAULT '/dashboard',
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warn','critical','ok')),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX alerts_owner_created ON public.alerts (owner_id, created_at DESC);
CREATE INDEX alerts_dedup ON public.alerts (owner_id, dedup_key, created_at DESC);
GRANT SELECT, UPDATE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read alerts" ON public.alerts FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners mark alerts read" ON public.alerts FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.router_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  router_id uuid NOT NULL REFERENCES public.routers(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('reboot','remove_cards')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','done','failed','expired')),
  auto boolean NOT NULL DEFAULT false,
  result text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  done_at timestamptz
);
CREATE INDEX router_jobs_pending ON public.router_jobs (router_id, status, requested_at);
GRANT SELECT ON public.router_jobs TO authenticated;
GRANT ALL ON public.router_jobs TO service_role;
ALTER TABLE public.router_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read jobs" ON public.router_jobs FOR SELECT TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE public.router_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  router_id uuid NOT NULL REFERENCES public.routers(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  kind text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX router_events_owner ON public.router_events (owner_id, created_at DESC);
GRANT SELECT ON public.router_events TO authenticated;
GRANT ALL ON public.router_events TO service_role;
ALTER TABLE public.router_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read events" ON public.router_events FOR SELECT TO authenticated USING (auth.uid() = owner_id);

ALTER TABLE public.router_cards ADD COLUMN IF NOT EXISTS finished_at timestamptz;
ALTER TABLE public.routers ADD COLUMN IF NOT EXISTS watch_state jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.routers ADD COLUMN IF NOT EXISTS health jsonb;
ALTER TABLE public.routers ADD COLUMN IF NOT EXISTS health_checked_at timestamptz;