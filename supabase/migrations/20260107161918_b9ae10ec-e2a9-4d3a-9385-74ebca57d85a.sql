-- Create table for global social platform settings (Admin configures Consumer Key/Secret)
CREATE TABLE public.social_platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL UNIQUE,
  app_name TEXT,
  consumer_key TEXT,
  consumer_secret TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_platform_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view platform settings
CREATE POLICY "Admins can view platform settings"
ON public.social_platform_settings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Only admins can insert platform settings
CREATE POLICY "Admins can insert platform settings"
ON public.social_platform_settings
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy: Only admins can update platform settings
CREATE POLICY "Admins can update platform settings"
ON public.social_platform_settings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Only admins can delete platform settings
CREATE POLICY "Admins can delete platform settings"
ON public.social_platform_settings
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_social_platform_settings_updated_at
BEFORE UPDATE ON public.social_platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();