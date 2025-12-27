-- Create brand_products table
CREATE TABLE public.brand_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_template_id UUID NOT NULL REFERENCES public.brand_templates(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  user_id UUID,
  
  -- Product Info
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  description TEXT,
  price_display TEXT,
  image_url TEXT,
  
  -- Marketing Data for AI
  unique_selling_points TEXT[] DEFAULT '{}',
  target_audience TEXT,
  pain_points_solved TEXT[] DEFAULT '{}',
  benefits TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  
  -- Content Hints
  suggested_content_angles TEXT[] DEFAULT '{}',
  best_channels TEXT[] DEFAULT '{}',
  
  -- Status
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies (similar to brand_templates pattern)
CREATE POLICY "Users can view own brand_products"
ON public.brand_products FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view org brand_products"
ON public.brand_products FOR SELECT
USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can insert brand_products"
ON public.brand_products FOR INSERT
WITH CHECK (
  (organization_id IS NULL AND user_id = auth.uid()) OR 
  (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id))
);

CREATE POLICY "Users can update own brand_products"
ON public.brand_products FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update org brand_products"
ON public.brand_products FOR UPDATE
USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can delete own brand_products"
ON public.brand_products FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Org admins can delete org brand_products"
ON public.brand_products FOR DELETE
USING (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id));

-- Create index for performance
CREATE INDEX idx_brand_products_brand_template_id ON public.brand_products(brand_template_id);
CREATE INDEX idx_brand_products_organization_id ON public.brand_products(organization_id);

-- Trigger for updated_at
CREATE TRIGGER update_brand_products_updated_at
BEFORE UPDATE ON public.brand_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();