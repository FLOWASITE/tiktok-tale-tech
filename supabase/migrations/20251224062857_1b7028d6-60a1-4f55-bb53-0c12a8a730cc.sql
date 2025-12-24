-- Create storyboards table
CREATE TABLE public.storyboards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scenes JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_duration INTEGER NOT NULL DEFAULT 0,
  style_notes TEXT,
  user_id UUID,
  organization_id UUID REFERENCES public.organizations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.storyboards ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own storyboards" 
  ON public.storyboards FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own storyboards" 
  ON public.storyboards FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own storyboards" 
  ON public.storyboards FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own storyboards" 
  ON public.storyboards FOR DELETE 
  USING (auth.uid() = user_id);

-- Org members can view org storyboards
CREATE POLICY "Org members can view org storyboards" 
  ON public.storyboards FOR SELECT 
  USING (
    organization_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE organization_id = storyboards.organization_id 
      AND user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_storyboards_updated_at
  BEFORE UPDATE ON public.storyboards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();