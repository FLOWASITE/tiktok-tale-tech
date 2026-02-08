-- Create enum for script status (if not exists)
DO $$ BEGIN
  CREATE TYPE public.script_status AS ENUM ('draft', 'pending_approval', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add collaboration columns to scripts table
ALTER TABLE public.scripts 
ADD COLUMN IF NOT EXISTS status public.script_status DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS shared_with_org BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create script_versions table for changelog/history
CREATE TABLE IF NOT EXISTS public.script_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE NOT NULL,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  topic TEXT,
  duration INTEGER,
  video_type TEXT,
  character_type TEXT,
  storyboard JSONB,
  analysis_cache JSONB,
  change_summary TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(script_id, version)
);

-- Create script_approvals table for approval workflow
CREATE TABLE IF NOT EXISTS public.script_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE NOT NULL,
  requested_by UUID REFERENCES auth.users(id) NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  status public.script_status DEFAULT 'pending_approval',
  notes TEXT,
  version_at_request INTEGER NOT NULL,
  organization_id UUID REFERENCES public.organizations(id)
);

-- Enable RLS
ALTER TABLE public.script_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_approvals ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles using organization_members
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _org_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role::text = _role
  )
$$;

-- Check if user has any role in org (member check)
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
  )
$$;

-- RLS for script_versions
DROP POLICY IF EXISTS "Users can view versions of their own scripts" ON public.script_versions;
CREATE POLICY "Users can view versions of their own scripts"
ON public.script_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.scripts 
    WHERE scripts.id = script_versions.script_id 
    AND scripts.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Org members can view shared script versions" ON public.script_versions;
CREATE POLICY "Org members can view shared script versions"
ON public.script_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.scripts 
    WHERE scripts.id = script_versions.script_id 
    AND scripts.shared_with_org = true
    AND public.is_org_member(auth.uid(), scripts.organization_id)
  )
);

DROP POLICY IF EXISTS "Users can create versions for their own scripts" ON public.script_versions;
CREATE POLICY "Users can create versions for their own scripts"
ON public.script_versions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scripts 
    WHERE scripts.id = script_versions.script_id 
    AND scripts.user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- RLS for script_approvals
DROP POLICY IF EXISTS "Users can view approvals for their scripts" ON public.script_approvals;
CREATE POLICY "Users can view approvals for their scripts"
ON public.script_approvals FOR SELECT
USING (
  requested_by = auth.uid() 
  OR reviewer_id = auth.uid()
  OR public.is_org_member(auth.uid(), organization_id)
);

DROP POLICY IF EXISTS "Users can request approval for their scripts" ON public.script_approvals;
CREATE POLICY "Users can request approval for their scripts"
ON public.script_approvals FOR INSERT
WITH CHECK (
  requested_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.scripts 
    WHERE scripts.id = script_approvals.script_id 
    AND scripts.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins/Editors can update approvals" ON public.script_approvals;
CREATE POLICY "Admins/Editors can update approvals"
ON public.script_approvals FOR UPDATE
USING (
  public.has_org_role(auth.uid(), organization_id, 'admin')
  OR public.has_org_role(auth.uid(), organization_id, 'owner')
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_script_versions_script_id ON public.script_versions(script_id);
CREATE INDEX IF NOT EXISTS idx_script_versions_version ON public.script_versions(script_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_script_approvals_script_id ON public.script_approvals(script_id);
CREATE INDEX IF NOT EXISTS idx_script_approvals_status ON public.script_approvals(status);

-- Update scripts RLS to allow org members to view shared scripts
DROP POLICY IF EXISTS "Org members can view shared scripts" ON public.scripts;
CREATE POLICY "Org members can view shared scripts"
ON public.scripts FOR SELECT
USING (
  shared_with_org = true
  AND public.is_org_member(auth.uid(), organization_id)
);