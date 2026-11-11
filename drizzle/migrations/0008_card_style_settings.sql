ALTER TABLE public.router_cards ADD COLUMN IF NOT EXISTS pw_mode text;
CREATE TABLE public.network_settings (
  owner_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('hotspot','usermanager')),
  mode text NOT NULL CHECK (mode IN ('number_only','number_password')),
  length int NOT NULL DEFAULT 8 CHECK (length BETWEEN 4 AND 16),
  charset text NOT NULL DEFAULT 'digits' CHECK (charset IN ('digits','letters','mixed')),
  prefix text NOT NULL DEFAULT '' CHECK (char_length(prefix) <= 6),
  confirmed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, source)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.network_settings TO authenticated;
GRANT ALL ON public.network_settings TO service_role;
ALTER TABLE public.network_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read settings" ON public.network_settings FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners insert settings" ON public.network_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update settings" ON public.network_settings FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners delete settings" ON public.network_settings FOR DELETE TO authenticated USING (auth.uid() = owner_id);