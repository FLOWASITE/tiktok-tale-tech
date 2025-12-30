-- Add AI Enhancement fields to customer_personas table (matching industry_personas structure)
ALTER TABLE public.customer_personas
ADD COLUMN IF NOT EXISTS communication_style TEXT,
ADD COLUMN IF NOT EXISTS response_tone_hints TEXT[],
ADD COLUMN IF NOT EXISTS content_preferences JSONB,
ADD COLUMN IF NOT EXISTS persona_prompt_hints TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.customer_personas.communication_style IS 'Communication style preference: direct, nurturing, consultative, educational, motivational';
COMMENT ON COLUMN public.customer_personas.response_tone_hints IS 'Array of tone hints for AI content generation';
COMMENT ON COLUMN public.customer_personas.content_preferences IS 'JSONB object with content format, visual, storytelling preferences';
COMMENT ON COLUMN public.customer_personas.persona_prompt_hints IS 'Custom prompt hints for AI when generating content for this persona';