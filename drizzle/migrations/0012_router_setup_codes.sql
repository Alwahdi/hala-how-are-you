CREATE TABLE public.router_setups (
  code_hash TEXT PRIMARY KEY,
  router_id UUID NOT NULL REFERENCES public.routers(id) ON DELETE CASCADE,
  sealed TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  fetch_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX router_setups_router_idx ON public.router_setups(router_id);
GRANT ALL ON public.router_setups TO service_role;
ALTER TABLE public.router_setups ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.router_setups IS 'Short-lived router setup codes. Payload is encrypted with a key derived from the code, which is never stored. Server-only.';