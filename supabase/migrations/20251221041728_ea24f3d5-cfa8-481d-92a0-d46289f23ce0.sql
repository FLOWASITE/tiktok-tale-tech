-- Create scripts table to store generated video scripts
CREATE TABLE public.scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 60,
  video_type TEXT NOT NULL DEFAULT 'expert_share',
  character_type TEXT NOT NULL DEFAULT 'male_expert',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

-- Create public read/write policies (no auth required for this app)
CREATE POLICY "Anyone can view scripts" 
ON public.scripts 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create scripts" 
ON public.scripts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update scripts" 
ON public.scripts 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete scripts" 
ON public.scripts 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_scripts_updated_at
BEFORE UPDATE ON public.scripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();