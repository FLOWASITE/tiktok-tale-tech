-- Create generation_tasks table for background task tracking
CREATE TABLE public.generation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Task type: 'core_content' | 'multichannel'
  task_type TEXT NOT NULL CHECK (task_type IN ('core_content', 'multichannel')),
  
  -- Status: 'pending' | 'generating' | 'completed' | 'failed'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  
  -- Progress tracking (0-100)
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  progress_message TEXT,
  current_step TEXT,
  
  -- Input parameters (JSON)
  input_params JSONB NOT NULL DEFAULT '{}',
  
  -- Result references
  result_id UUID,
  result_type TEXT CHECK (result_type IS NULL OR result_type IN ('core_contents', 'multi_channel_contents')),
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Enable RLS
ALTER TABLE public.generation_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own tasks"
  ON public.generation_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tasks"
  ON public.generation_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON public.generation_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON public.generation_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Index for quick lookups
CREATE INDEX idx_generation_tasks_user_status 
  ON public.generation_tasks(user_id, status);

CREATE INDEX idx_generation_tasks_expires 
  ON public.generation_tasks(expires_at);

-- Trigger for updated_at
CREATE TRIGGER update_generation_tasks_updated_at
  BEFORE UPDATE ON public.generation_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- Function to cleanup expired tasks
CREATE OR REPLACE FUNCTION public.cleanup_expired_generation_tasks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.generation_tasks
  WHERE expires_at < NOW()
    OR (status IN ('completed', 'failed') AND completed_at < NOW() - INTERVAL '7 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;