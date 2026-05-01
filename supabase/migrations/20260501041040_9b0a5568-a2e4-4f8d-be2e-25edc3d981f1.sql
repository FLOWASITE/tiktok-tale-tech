
-- Create character_profiles table for character consistency across video scenes
CREATE TABLE public.character_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  appearance jsonb NOT NULL DEFAULT '{}'::jsonb,
  wardrobe text,
  reference_image_url text,
  brand_template_id uuid REFERENCES public.brand_templates(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_character_profiles_org ON public.character_profiles(organization_id);
CREATE INDEX idx_character_profiles_brand ON public.character_profiles(brand_template_id);

-- Enable RLS
ALTER TABLE public.character_profiles ENABLE ROW LEVEL SECURITY;

-- RLS: org members can view
CREATE POLICY "org_members_can_select_character_profiles"
ON public.character_profiles FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

-- RLS: org members can insert
CREATE POLICY "org_members_can_insert_character_profiles"
ON public.character_profiles FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

-- RLS: org members can update
CREATE POLICY "org_members_can_update_character_profiles"
ON public.character_profiles FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

-- RLS: org members can delete
CREATE POLICY "org_members_can_delete_character_profiles"
ON public.character_profiles FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

-- Updated_at trigger
CREATE TRIGGER update_character_profiles_updated_at
  BEFORE UPDATE ON public.character_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for reference images
INSERT INTO storage.buckets (id, name, public) VALUES ('character-references', 'character-references', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Org members can upload character references"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'character-references' AND auth.uid() IS NOT NULL);

CREATE POLICY "Character references are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'character-references');

CREATE POLICY "Org members can delete character references"
ON storage.objects FOR DELETE
USING (bucket_id = 'character-references' AND auth.uid() IS NOT NULL);
