CREATE TABLE public.early_access_contacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 contact_method text NOT NULL CHECK (contact_method IN ('email','whatsapp')),
 contact_value text NOT NULL CHECK (length(contact_value) BETWEEN 3 AND 254),
 language text NOT NULL CHECK (language IN ('ar','en')),
 source text NOT NULL DEFAULT 'direct' CHECK (source IN ('direct','campaign','referral')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(contact_method, contact_value)
);
GRANT ALL ON public.early_access_contacts TO service_role;
ALTER TABLE public.early_access_contacts ENABLE ROW LEVEL SECURITY;
INSERT INTO public.early_access_contacts(id,contact_method,contact_value,language,source,created_at)
SELECT id,'email',lower(trim(email)),language,source,created_at FROM public.early_access_requests ON CONFLICT (contact_method,contact_value) DO NOTHING;
COMMENT ON TABLE public.early_access_requests IS 'DEPRECATED: replaced by early_access_contacts; preserved for historical compatibility.';