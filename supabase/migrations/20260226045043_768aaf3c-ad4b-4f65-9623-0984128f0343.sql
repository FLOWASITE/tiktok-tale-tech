
-- Sprint 10: Fix all remaining WARN + ERROR security findings

-- 1. Fix service-role policies using {public} → restrict to {service_role}

DROP POLICY IF EXISTS "Service role can insert metrics" ON public.ai_metrics;
CREATE POLICY "Service role can insert metrics"
ON public.ai_metrics FOR INSERT TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert circuit breaker events" ON public.circuit_breaker_events;
CREATE POLICY "Service role can insert circuit breaker events"
ON public.circuit_breaker_events FOR INSERT TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert security events" ON public.security_events;
CREATE POLICY "Service role can insert security events"
ON public.security_events FOR INSERT TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage brand_memory" ON public.brand_memory;
CREATE POLICY "Service role can manage brand_memory"
ON public.brand_memory FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on workflow_checkpoints" ON public.workflow_checkpoints;
CREATE POLICY "Service role full access on workflow_checkpoints"
ON public.workflow_checkpoints FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 2. blog_comments: Validate anonymous insert
DROP POLICY IF EXISTS "Anyone can add comments" ON public.blog_comments;
CREATE POLICY "Validated insert comments"
ON public.blog_comments FOR INSERT
WITH CHECK (
  post_slug IS NOT NULL 
  AND content IS NOT NULL 
  AND author_name IS NOT NULL
  AND length(content) <= 2000
  AND length(author_name) <= 100
);

-- 3. profiles: Restrict to authenticated role
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Org members can view profiles of other members" ON public.profiles;
CREATE POLICY "Org members can view profiles of other members"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM organization_members om1
    JOIN organization_members om2 ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = auth.uid() AND om2.user_id = profiles.id
  )
);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert profiles"
ON public.profiles FOR INSERT TO service_role
WITH CHECK (true);

-- 4. sales_chat_leads: Admin only read (PII)
DROP POLICY IF EXISTS "Authenticated can read leads" ON public.sales_chat_leads;
CREATE POLICY "Admins can read leads"
ON public.sales_chat_leads FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. sales_chat_analytics: Admin only read
DROP POLICY IF EXISTS "Allow authenticated read on sales_chat_analytics" ON public.sales_chat_analytics;
CREATE POLICY "Admins can read analytics"
ON public.sales_chat_analytics FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6. ad_copy_benchmarks: Admin only read
DROP POLICY IF EXISTS "Benchmarks are readable by authenticated users" ON public.ad_copy_benchmarks;
CREATE POLICY "Admins can read benchmarks"
ON public.ad_copy_benchmarks FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage benchmarks"
ON public.ad_copy_benchmarks FOR ALL TO service_role
USING (true) WITH CHECK (true);
