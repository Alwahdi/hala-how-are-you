ALTER TABLE public.routers ADD COLUMN IF NOT EXISTS card_runs jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.router_cards ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.router_cards ADD COLUMN IF NOT EXISTS last_online_at timestamptz;
ALTER TABLE public.router_jobs DROP CONSTRAINT IF EXISTS router_jobs_kind_check;
ALTER TABLE public.router_jobs ADD CONSTRAINT router_jobs_kind_check CHECK (kind = ANY (ARRAY['reboot'::text, 'remove_cards'::text, 'card_action'::text, 'card_bulk'::text, 'package'::text]));
COMMENT ON COLUMN public.routers.card_runs IS 'Per card source: start time and batch count of the current router card run; removal of vanished cards happens only after a complete run.';