-- Extend brand_products with reference_images + appearance for product consistency
ALTER TABLE public.brand_products
  ADD COLUMN IF NOT EXISTS reference_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS appearance jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.brand_products.reference_images IS 'Array of {url, label} where label in front|back|side|in-use|packaging (max 5)';
COMMENT ON COLUMN public.brand_products.appearance IS 'Object {color, material, size, distinctive_features} for AI prompt block';

-- Storage bucket for product reference images (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-references', 'product-references', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies on storage.objects scoped to this bucket
DROP POLICY IF EXISTS "product_refs_public_read" ON storage.objects;
CREATE POLICY "product_refs_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-references');

DROP POLICY IF EXISTS "product_refs_authenticated_insert" ON storage.objects;
CREATE POLICY "product_refs_authenticated_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-references');

DROP POLICY IF EXISTS "product_refs_authenticated_update" ON storage.objects;
CREATE POLICY "product_refs_authenticated_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-references');

DROP POLICY IF EXISTS "product_refs_authenticated_delete" ON storage.objects;
CREATE POLICY "product_refs_authenticated_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-references');