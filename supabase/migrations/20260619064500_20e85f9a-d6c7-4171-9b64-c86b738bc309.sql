
-- 1. blog_comments: hide author_email from public reads
REVOKE SELECT (author_email) ON public.blog_comments FROM anon;
REVOKE SELECT (author_email) ON public.blog_comments FROM authenticated;

-- 2. gsc_connections: drop the broad org-member SELECT policy (admins still have ALL via org_admins_manage_gsc_conn)
DROP POLICY IF EXISTS "org_members_view_gsc_conn" ON public.gsc_connections;

-- 3. regulation_crawl_history: admin-only read
DROP POLICY IF EXISTS "Authenticated can read crawl history" ON public.regulation_crawl_history;
CREATE POLICY "Admins can read crawl history"
  ON public.regulation_crawl_history
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. regulation_sources: remove public read; add admin read
DROP POLICY IF EXISTS "Allow read access to regulation_sources" ON public.regulation_sources;
CREATE POLICY "Admins can read regulation sources"
  ON public.regulation_sources
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. sales_chat_analytics: drop the meaningless anon UPDATE policy (writes go through edge functions w/ service role)
DROP POLICY IF EXISTS "Validated anonymous update analytics" ON public.sales_chat_analytics;

-- 6. storage: character-references — scope insert/delete to owner folder (first path segment = auth.uid())
DROP POLICY IF EXISTS "Org members can upload character references" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete character references" ON storage.objects;

CREATE POLICY "Users can upload own character references"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'character-references'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own character references"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'character-references'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own character references"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'character-references'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 7. storage: product-references — same ownership check
DROP POLICY IF EXISTS "product_refs_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_refs_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "product_refs_authenticated_delete" ON storage.objects;

CREATE POLICY "product_refs_owner_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-references'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "product_refs_owner_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-references'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "product_refs_owner_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-references'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
