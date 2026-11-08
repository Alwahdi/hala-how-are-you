CREATE TABLE public.early_access_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, language text NOT NULL CHECK (language IN ('ar','en')), source text NOT NULL DEFAULT 'direct', created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.early_access_requests TO service_role;
ALTER TABLE public.early_access_requests ENABLE ROW LEVEL SECURITY;