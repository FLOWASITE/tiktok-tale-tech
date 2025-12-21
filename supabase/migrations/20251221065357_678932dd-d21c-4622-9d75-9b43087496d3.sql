-- Create multi_channel_contents table for storing generated multi-channel content
CREATE TABLE public.multi_channel_contents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  industry TEXT,
  content_goal TEXT NOT NULL,
  selected_channels TEXT[] NOT NULL,
  
  -- Brand Integration
  brand_template_id UUID REFERENCES public.brand_templates(id) ON DELETE SET NULL,
  brand_name TEXT NOT NULL,
  brand_guideline TEXT,
  primary_color TEXT,
  
  -- Content for each channel (nullable since user selects channels)
  website_content TEXT,
  facebook_content TEXT,
  instagram_content TEXT,
  twitter_content TEXT,
  google_maps_content TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.multi_channel_contents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access (same pattern as other tables)
CREATE POLICY "Anyone can view multi_channel_contents" 
ON public.multi_channel_contents 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create multi_channel_contents" 
ON public.multi_channel_contents 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update multi_channel_contents" 
ON public.multi_channel_contents 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete multi_channel_contents" 
ON public.multi_channel_contents 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_multi_channel_contents_updated_at
BEFORE UPDATE ON public.multi_channel_contents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();