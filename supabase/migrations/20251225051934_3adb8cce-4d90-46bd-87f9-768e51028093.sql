-- Add script_purpose column to scripts table
ALTER TABLE public.scripts 
ADD COLUMN script_purpose text NOT NULL DEFAULT 'ai_video_veo3';

-- Add comment
COMMENT ON COLUMN public.scripts.script_purpose IS 'Purpose of the script: ai_video_veo3, ai_video_minimax, teleprompter, voiceover, production';