-- Add voice_region and dialogue_style columns to scripts table
ALTER TABLE public.scripts 
ADD COLUMN IF NOT EXISTS voice_region text DEFAULT 'northern',
ADD COLUMN IF NOT EXISTS dialogue_style text DEFAULT 'monologue';

-- Add comment for documentation
COMMENT ON COLUMN public.scripts.voice_region IS 'Voice region: northern, central, southern';
COMMENT ON COLUMN public.scripts.dialogue_style IS 'Dialogue style: monologue, conversational, internal, narrative';