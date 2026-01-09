-- Create AI Function Categories table
CREATE TABLE public.ai_function_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT DEFAULT 'zap',
  color TEXT DEFAULT '#6b7280',
  sort_order INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(organization_id, slug)
);

-- Create unique constraint for system categories (org_id is null)
CREATE UNIQUE INDEX ai_function_categories_system_slug_idx 
  ON public.ai_function_categories (slug) 
  WHERE organization_id IS NULL;

-- Seed system categories
INSERT INTO public.ai_function_categories (slug, label, icon, color, is_system, sort_order) VALUES
  ('content', 'Content', 'zap', '#3b82f6', true, 1),
  ('ideation', 'Ideation', 'lightbulb', '#eab308', true, 2),
  ('chat', 'Chat', 'message-square', '#22c55e', true, 3),
  ('brand', 'Brand', 'wand-2', '#f97316', true, 4),
  ('image', 'Image', 'image', '#ec4899', true, 5),
  ('analysis', 'Analysis', 'search', '#06b6d4', true, 6),
  ('research', 'Research', 'globe', '#a855f7', true, 7),
  ('other', 'Other/Unknown', 'help-circle', '#6b7280', true, 99);

-- Enable RLS
ALTER TABLE public.ai_function_categories ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view categories
CREATE POLICY "Categories are viewable by authenticated users"
  ON public.ai_function_categories
  FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL 
    OR public.is_org_member(auth.uid(), organization_id)
  );

-- Policy: Only org admins can insert custom categories
CREATE POLICY "Org admins can create custom categories"
  ON public.ai_function_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_system = false
    AND organization_id IS NOT NULL
    AND public.is_org_admin(auth.uid(), organization_id)
  );

-- Policy: Only org admins can update their custom categories
CREATE POLICY "Org admins can update custom categories"
  ON public.ai_function_categories
  FOR UPDATE
  TO authenticated
  USING (
    is_system = false
    AND organization_id IS NOT NULL
    AND public.is_org_admin(auth.uid(), organization_id)
  );

-- Policy: Only org admins can delete their custom categories
CREATE POLICY "Org admins can delete custom categories"
  ON public.ai_function_categories
  FOR DELETE
  TO authenticated
  USING (
    is_system = false
    AND organization_id IS NOT NULL
    AND public.is_org_admin(auth.uid(), organization_id)
  );

-- Trigger for updated_at
CREATE TRIGGER update_ai_function_categories_updated_at
  BEFORE UPDATE ON public.ai_function_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();