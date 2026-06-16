-- 1. ai_function_group_configs: admin-only manage
DROP POLICY IF EXISTS "Admins can manage group configs" ON public.ai_function_group_configs;
CREATE POLICY "Admins can manage group configs"
  ON public.ai_function_group_configs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. edge_function_daily_stats: service_role only
DROP POLICY IF EXISTS "Service can manage daily stats" ON public.edge_function_daily_stats;
CREATE POLICY "Service role can manage daily stats"
  ON public.edge_function_daily_stats FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 3. regulation_crawl_history: admin writes
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.regulation_crawl_history;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.regulation_crawl_history;
CREATE POLICY "Admins can insert crawl history"
  ON public.regulation_crawl_history FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update crawl history"
  ON public.regulation_crawl_history FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. regulation_sources: admin writes
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.regulation_sources;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.regulation_sources;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.regulation_sources;
CREATE POLICY "Admins can insert regulation sources"
  ON public.regulation_sources FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update regulation sources"
  ON public.regulation_sources FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete regulation sources"
  ON public.regulation_sources FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. sales_chat_leads: only admins can update
DROP POLICY IF EXISTS "Validated update own leads" ON public.sales_chat_leads;
CREATE POLICY "Admins can update leads"
  ON public.sales_chat_leads FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6. sales_chat_messages_log: admin-only read
DROP POLICY IF EXISTS "Allow authenticated read on sales_chat_messages_log" ON public.sales_chat_messages_log;
CREATE POLICY "Admins can read sales chat messages"
  ON public.sales_chat_messages_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. Storage carousel-images & brand-logos: auth required for writes
DROP POLICY IF EXISTS "Anyone can upload carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload brand logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update brand logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete brand logos" ON storage.objects;

CREATE POLICY "Authenticated can upload carousel images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'carousel-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update carousel images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'carousel-images' AND auth.uid() IS NOT NULL)
  WITH CHECK (bucket_id = 'carousel-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete carousel images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'carousel-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can upload brand logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-logos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update brand logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'brand-logos' AND auth.uid() IS NOT NULL)
  WITH CHECK (bucket_id = 'brand-logos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete brand logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'brand-logos' AND auth.uid() IS NOT NULL);