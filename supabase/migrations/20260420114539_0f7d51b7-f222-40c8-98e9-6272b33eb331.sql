ALTER TABLE public.telegram_chat_bindings
ADD COLUMN IF NOT EXISTS active_brand_template_id uuid REFERENCES public.brand_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_telegram_chat_bindings_active_brand
ON public.telegram_chat_bindings(active_brand_template_id);