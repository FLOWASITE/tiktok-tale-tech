-- Add brand-level default board reference
ALTER TABLE public.brand_templates
  ADD COLUMN IF NOT EXISTS pinterest_default_board_id text;

-- Add per-content pin type override + published pin URL for analytics
ALTER TABLE public.multi_channel_contents
  ADD COLUMN IF NOT EXISTS pinterest_pin_type text,
  ADD COLUMN IF NOT EXISTS pinterest_post_url text,
  ADD COLUMN IF NOT EXISTS pinterest_post_id text;

-- Constrain pin type values
DO $$ BEGIN
  ALTER TABLE public.multi_channel_contents DROP CONSTRAINT IF EXISTS mcc_pinterest_pin_type_check;
  ALTER TABLE public.multi_channel_contents
    ADD CONSTRAINT mcc_pinterest_pin_type_check
    CHECK (pinterest_pin_type IS NULL OR pinterest_pin_type IN ('auto','image','carousel','video','idea'));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Index lookup of pinned posts that need analytics
CREATE INDEX IF NOT EXISTS idx_mcc_pinterest_post_id
  ON public.multi_channel_contents(pinterest_post_id)
  WHERE pinterest_post_id IS NOT NULL;