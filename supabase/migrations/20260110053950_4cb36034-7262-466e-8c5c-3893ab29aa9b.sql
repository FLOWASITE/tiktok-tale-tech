-- Add Style Guide columns to brand_templates
ALTER TABLE public.brand_templates 
  ADD COLUMN IF NOT EXISTS sentence_style text DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS emoji_policy text DEFAULT 'minimal';

-- Note: preferred_words and forbidden_words already exist in brand_templates
-- We will use forbidden_words as banned_words (already exists)

-- Add comment for clarity
COMMENT ON COLUMN public.brand_templates.sentence_style IS 'Writing style: short, balanced, long';
COMMENT ON COLUMN public.brand_templates.emoji_policy IS 'Emoji usage: none, minimal, moderate';