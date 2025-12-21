-- Create brand_templates table
CREATE TABLE public.brand_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  brand_guideline TEXT NOT NULL,
  include_logo BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Anyone can view brand_templates"
ON public.brand_templates
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create brand_templates"
ON public.brand_templates
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update brand_templates"
ON public.brand_templates
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete brand_templates"
ON public.brand_templates
FOR DELETE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_brand_templates_updated_at
BEFORE UPDATE ON public.brand_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default template
INSERT INTO public.brand_templates (name, brand_name, brand_guideline, include_logo, is_default)
VALUES (
  'Thuế Hộ by TAF.vn',
  'Thuế Hộ by TAF.vn',
  'Professional tax expert infographic style.
Use Thuế Hộ by TAF.vn official branding.
Primary colors: TAF red, black, white, high contrast.
Clean, minimal, mobile-first layout.
Clear Vietnamese text, sans-serif font, no distortion.
Include Thuế Hộ by TAF.vn logo at bottom corner, subtle and professional.
Tone: expert, serious, legal-compliance focused.
Avoid cartoon, playful, decorative styles.',
  true,
  true
);