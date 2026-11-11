ALTER TABLE public.router_jobs DROP CONSTRAINT IF EXISTS router_jobs_kind_check;
ALTER TABLE public.router_jobs ADD CONSTRAINT router_jobs_kind_check CHECK (kind IN ('reboot','remove_cards','card_action'));
ALTER TABLE public.router_cards ADD COLUMN IF NOT EXISTS um_state text;
ALTER TABLE public.router_cards ADD COLUMN IF NOT EXISTS first_used_at timestamptz;
ALTER TABLE public.router_profiles ADD COLUMN IF NOT EXISTS sell_price text;
ALTER TABLE public.router_profiles ADD COLUMN IF NOT EXISTS extra jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Records the moment a card is first used (time starts counting, or User Manager v7 moves it from waiting to running).
CREATE OR REPLACE FUNCTION public.router_cards_first_use()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.first_used_at IS NULL AND (
    (COALESCE(OLD.uptime_s, 0) = 0 AND COALESCE(NEW.uptime_s, 0) > 0)
    OR (OLD.um_state = 'waiting' AND NEW.um_state LIKE 'running%')
  ) THEN
    NEW.first_used_at := now();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS router_cards_first_use ON public.router_cards;
CREATE TRIGGER router_cards_first_use BEFORE UPDATE ON public.router_cards FOR EACH ROW EXECUTE FUNCTION public.router_cards_first_use();