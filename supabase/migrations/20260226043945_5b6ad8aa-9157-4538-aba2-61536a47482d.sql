
-- Sprint 9: Security Hardening Phase 2

-- TASK 38: Drop permissive ALL policies on service-role tables
DROP POLICY IF EXISTS "Service role access for agent_blackboard" ON public.agent_blackboard;
DROP POLICY IF EXISTS "Service role access for agent_execution_logs" ON public.agent_execution_logs;
DROP POLICY IF EXISTS "Service role can manage notification logs" ON public.campaign_notification_logs;

-- TASK 39: Drop permissive ALL on analytics/cache
DROP POLICY IF EXISTS "Service role can manage prompt analytics" ON public.prompt_analytics;
DROP POLICY IF EXISTS "Admins can manage all cache entries" ON public.ai_response_cache;

-- TASK 41: Fix regulation_crawl_history public read
DROP POLICY IF EXISTS "Allow read access to crawl_history" ON public.regulation_crawl_history;
CREATE POLICY "Authenticated can read crawl history"
ON public.regulation_crawl_history FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- TASK 42a: Harden blog_reactions
DROP POLICY IF EXISTS "Anyone can add reactions" ON public.blog_reactions;
CREATE POLICY "Validated insert reactions"
ON public.blog_reactions FOR INSERT
WITH CHECK (post_slug IS NOT NULL AND reaction_type IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can remove their reaction" ON public.blog_reactions;
CREATE POLICY "Authenticated can delete own reactions"
ON public.blog_reactions FOR DELETE TO authenticated
USING (visitor_id IS NOT NULL);

-- TASK 42b: Harden sales_chat_analytics
DROP POLICY IF EXISTS "Allow anonymous insert on sales_chat_analytics" ON public.sales_chat_analytics;
CREATE POLICY "Validated anonymous insert analytics"
ON public.sales_chat_analytics FOR INSERT
WITH CHECK (session_id IS NOT NULL);

DROP POLICY IF EXISTS "Allow anonymous update on sales_chat_analytics" ON public.sales_chat_analytics;
CREATE POLICY "Validated anonymous update analytics"
ON public.sales_chat_analytics FOR UPDATE
USING (session_id IS NOT NULL)
WITH CHECK (session_id IS NOT NULL);

-- TASK 42c: Harden sales_chat_leads
DROP POLICY IF EXISTS "Allow anonymous insert leads" ON public.sales_chat_leads;
CREATE POLICY "Validated insert leads"
ON public.sales_chat_leads FOR INSERT TO anon, authenticated
WITH CHECK (session_id IS NOT NULL AND email IS NOT NULL);

DROP POLICY IF EXISTS "Allow anonymous update own leads" ON public.sales_chat_leads;
CREATE POLICY "Validated update own leads"
ON public.sales_chat_leads FOR UPDATE TO anon, authenticated
USING (session_id IS NOT NULL)
WITH CHECK (session_id IS NOT NULL);

-- Restrict lead reads to authenticated only (no org_id column available)
DROP POLICY IF EXISTS "Authenticated can read leads" ON public.sales_chat_leads;
CREATE POLICY "Authenticated can read leads"
ON public.sales_chat_leads FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);
