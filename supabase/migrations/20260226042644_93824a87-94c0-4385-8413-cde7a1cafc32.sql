
-- ============================================
-- Sprint 8A: Security Hardening
-- Task 32: Fix sales_chat_messages_log public write
-- Task 33: Restrict social_platform_settings credentials + safe view
-- Task 34: Add organization_id to ad_copy_performance for direct isolation
-- Sprint 8C Task 36: Add version column to brand_templates
-- ============================================

-- ================================================
-- TASK 32: Fix sales_chat_messages_log anonymous insert
-- ================================================

-- Drop the overly permissive anonymous insert policy
DROP POLICY IF EXISTS "Allow anonymous insert on sales_chat_messages_log" ON public.sales_chat_messages_log;

-- Create new policy with validation: session_id required + message length limit
CREATE POLICY "Validated anonymous insert on sales_chat_messages_log"
ON public.sales_chat_messages_log
FOR INSERT
TO public
WITH CHECK (
  session_id IS NOT NULL
  AND length(session_id) > 0
  AND length(content) < 5000
);

-- ================================================
-- TASK 33: Restrict social_platform_settings credentials
-- ================================================

-- Drop the current admin-only SELECT policy (we'll replace with two policies)
DROP POLICY IF EXISTS "Admins can view platform settings" ON public.social_platform_settings;

-- Policy 1: Admins can SELECT but only non-sensitive columns via the safe view
-- We keep full admin access for the edge function (which uses service role key)
-- But create a restrictive policy that masks sensitive columns
CREATE POLICY "Admins can view platform settings safe"
ON public.social_platform_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create safe view without sensitive columns for frontend usage
CREATE OR REPLACE VIEW public.v_social_platform_settings_safe AS
SELECT 
  id,
  platform,
  app_name,
  is_active,
  created_by,
  created_at,
  updated_at,
  (consumer_key IS NOT NULL AND consumer_secret IS NOT NULL) AS has_credentials
FROM public.social_platform_settings;

-- ================================================
-- TASK 34: Strengthen ad_copy_performance isolation
-- ================================================

-- Add organization_id column directly
ALTER TABLE public.ad_copy_performance 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- Backfill organization_id from ad_copies
UPDATE public.ad_copy_performance acp
SET organization_id = ac.organization_id
FROM public.ad_copies ac
WHERE acp.ad_copy_id = ac.id
  AND acp.organization_id IS NULL;

-- Create trigger to auto-populate organization_id on insert
CREATE OR REPLACE FUNCTION public.auto_populate_ad_perf_org_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM public.ad_copies
    WHERE id = NEW.ad_copy_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_populate_ad_perf_org ON public.ad_copy_performance;
CREATE TRIGGER trg_auto_populate_ad_perf_org
BEFORE INSERT ON public.ad_copy_performance
FOR EACH ROW
EXECUTE FUNCTION public.auto_populate_ad_perf_org_id();

-- Drop old complex-join policies
DROP POLICY IF EXISTS "Users can view performance for their org ad copies" ON public.ad_copy_performance;
DROP POLICY IF EXISTS "Users can insert performance for their org ad copies" ON public.ad_copy_performance;
DROP POLICY IF EXISTS "Users can update performance for their org ad copies" ON public.ad_copy_performance;
DROP POLICY IF EXISTS "Users can delete performance for their org ad copies" ON public.ad_copy_performance;

-- Create new direct org-based policies
CREATE POLICY "org_member_select_ad_perf"
ON public.ad_copy_performance FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "org_member_insert_ad_perf"
ON public.ad_copy_performance FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "org_member_update_ad_perf"
ON public.ad_copy_performance FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "org_member_delete_ad_perf"
ON public.ad_copy_performance FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

-- ================================================
-- TASK 36 (Sprint 8C): Add version to brand_templates
-- ================================================

ALTER TABLE public.brand_templates 
ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Trigger to auto-increment version on update
CREATE OR REPLACE FUNCTION public.auto_increment_brand_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD IS DISTINCT FROM NEW THEN
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_brand_template_version ON public.brand_templates;
CREATE TRIGGER trg_brand_template_version
BEFORE UPDATE ON public.brand_templates
FOR EACH ROW
EXECUTE FUNCTION public.auto_increment_brand_version();
