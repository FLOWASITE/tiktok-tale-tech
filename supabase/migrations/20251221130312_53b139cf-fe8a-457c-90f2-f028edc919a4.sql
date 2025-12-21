
-- Phase 1: Database Schema for Multi-tenant Organizations

-- 1.1 Create org_role enum
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- 1.2 Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#000000',
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.3 Create organization_members table
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  invited_by UUID,
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- 1.4 Add organization_id to content tables
ALTER TABLE public.brand_templates ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.scripts ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.carousels ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.multi_channel_contents ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 1.5 Create indexes for performance
CREATE INDEX idx_organizations_owner ON public.organizations(owner_id);
CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_brand_templates_org ON public.brand_templates(organization_id);
CREATE INDEX idx_scripts_org ON public.scripts(organization_id);
CREATE INDEX idx_carousels_org ON public.carousels(organization_id);
CREATE INDEX idx_multi_channel_org ON public.multi_channel_contents(organization_id);

-- 1.6 Add updated_at trigger for organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 2: RLS Helper Functions and Policies

-- 2.1 Check if user is member of organization
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- 2.2 Check if user has specific role in organization
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _org_id UUID, _role public.org_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id 
      AND organization_id = _org_id 
      AND role = _role
  )
$$;

-- 2.3 Check if user has admin-level role (owner or admin) in organization
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id 
      AND organization_id = _org_id 
      AND role IN ('owner', 'admin')
  )
$$;

-- 2.4 Get user's organization_id (first org they belong to, for default context)
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'owner' THEN 1 
      WHEN 'admin' THEN 2 
      WHEN 'member' THEN 3 
      ELSE 4 
    END,
    created_at ASC
  LIMIT 1
$$;

-- 2.5 Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 2.6 RLS Policies for organizations table
CREATE POLICY "Users can view organizations they belong to"
  ON public.organizations FOR SELECT
  USING (public.is_org_member(auth.uid(), id));

CREATE POLICY "Users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Only org admins can update organization"
  ON public.organizations FOR UPDATE
  USING (public.is_org_admin(auth.uid(), id));

CREATE POLICY "Only org owner can delete organization"
  ON public.organizations FOR DELETE
  USING (public.has_org_role(auth.uid(), id, 'owner'));

-- 2.7 RLS Policies for organization_members table
CREATE POLICY "Users can view members of their organizations"
  ON public.organization_members FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can add members"
  ON public.organization_members FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update member roles"
  ON public.organization_members FOR UPDATE
  USING (
    public.is_org_admin(auth.uid(), organization_id)
    AND NOT public.has_org_role(user_id, organization_id, 'owner')
  );

CREATE POLICY "Org admins can remove members except owner"
  ON public.organization_members FOR DELETE
  USING (
    public.is_org_admin(auth.uid(), organization_id)
    AND NOT public.has_org_role(user_id, organization_id, 'owner')
  );

-- 2.8 Update RLS for brand_templates (keep user-level + add org-level)
CREATE POLICY "Users can view org brand_templates"
  ON public.brand_templates FOR SELECT
  USING (
    organization_id IS NOT NULL 
    AND public.is_org_member(auth.uid(), organization_id)
  );

CREATE POLICY "Users can insert org brand_templates"
  ON public.brand_templates FOR INSERT
  WITH CHECK (
    organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id)
  );

CREATE POLICY "Users can update org brand_templates"
  ON public.brand_templates FOR UPDATE
  USING (
    organization_id IS NOT NULL 
    AND public.is_org_member(auth.uid(), organization_id)
  );

CREATE POLICY "Org admins can delete org brand_templates"
  ON public.brand_templates FOR DELETE
  USING (
    organization_id IS NOT NULL 
    AND public.is_org_admin(auth.uid(), organization_id)
  );

-- 2.9 Update RLS for scripts
CREATE POLICY "Users can view org scripts"
  ON public.scripts FOR SELECT
  USING (
    organization_id IS NOT NULL 
    AND public.is_org_member(auth.uid(), organization_id)
  );

CREATE POLICY "Users can insert org scripts"
  ON public.scripts FOR INSERT
  WITH CHECK (
    organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id)
  );

CREATE POLICY "Users can update org scripts"
  ON public.scripts FOR UPDATE
  USING (
    organization_id IS NOT NULL 
    AND public.is_org_member(auth.uid(), organization_id)
  );

CREATE POLICY "Org admins can delete org scripts"
  ON public.scripts FOR DELETE
  USING (
    organization_id IS NOT NULL 
    AND public.is_org_admin(auth.uid(), organization_id)
  );

-- 2.10 Update RLS for carousels
CREATE POLICY "Users can view org carousels"
  ON public.carousels FOR SELECT
  USING (
    organization_id IS NOT NULL 
    AND public.is_org_member(auth.uid(), organization_id)
  );

CREATE POLICY "Users can insert org carousels"
  ON public.carousels FOR INSERT
  WITH CHECK (
    organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id)
  );

CREATE POLICY "Users can update org carousels"
  ON public.carousels FOR UPDATE
  USING (
    organization_id IS NOT NULL 
    AND public.is_org_member(auth.uid(), organization_id)
  );

CREATE POLICY "Org admins can delete org carousels"
  ON public.carousels FOR DELETE
  USING (
    organization_id IS NOT NULL 
    AND public.is_org_admin(auth.uid(), organization_id)
  );

-- 2.11 Update RLS for multi_channel_contents
CREATE POLICY "Users can view org multi_channel_contents"
  ON public.multi_channel_contents FOR SELECT
  USING (
    organization_id IS NOT NULL 
    AND public.is_org_member(auth.uid(), organization_id)
  );

CREATE POLICY "Users can insert org multi_channel_contents"
  ON public.multi_channel_contents FOR INSERT
  WITH CHECK (
    organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id)
  );

CREATE POLICY "Users can update org multi_channel_contents"
  ON public.multi_channel_contents FOR UPDATE
  USING (
    organization_id IS NOT NULL 
    AND public.is_org_member(auth.uid(), organization_id)
  );

CREATE POLICY "Org admins can delete org multi_channel_contents"
  ON public.multi_channel_contents FOR DELETE
  USING (
    organization_id IS NOT NULL 
    AND public.is_org_admin(auth.uid(), organization_id)
  );

-- Phase 2.5: Update handle_new_user to auto-create organization

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Auto assign admin role for specific email, otherwise user role
  IF NEW.email = 'flowasite@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
  END IF;
  
  -- Create subscription
  INSERT INTO public.subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'free', 'active');
  
  -- Create default organization for new user
  INSERT INTO public.organizations (name, slug, owner_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)) || '''s Workspace',
    NEW.id::text,
    NEW.id
  )
  RETURNING id INTO new_org_id;
  
  -- Add user as owner of the organization
  INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
  VALUES (new_org_id, NEW.id, 'owner', now());
  
  RETURN NEW;
END;
$$;

-- Phase 2.6: Migrate existing users to organizations

-- Create organizations for existing users who don't have one
INSERT INTO public.organizations (name, slug, owner_id)
SELECT 
  COALESCE(p.full_name, split_part(p.email, '@', 1)) || '''s Workspace',
  p.id::text,
  p.id
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizations o WHERE o.owner_id = p.id
);

-- Add existing users as owners of their organizations
INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
SELECT o.id, o.owner_id, 'owner', now()
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_members om 
  WHERE om.organization_id = o.id AND om.user_id = o.owner_id
);

-- Update existing content to belong to user's organization
UPDATE public.brand_templates bt
SET organization_id = o.id
FROM public.organizations o
WHERE bt.user_id = o.owner_id AND bt.organization_id IS NULL;

UPDATE public.scripts s
SET organization_id = o.id
FROM public.organizations o
WHERE s.user_id = o.owner_id AND s.organization_id IS NULL;

UPDATE public.carousels c
SET organization_id = o.id
FROM public.organizations o
WHERE c.user_id = o.owner_id AND c.organization_id IS NULL;

UPDATE public.multi_channel_contents m
SET organization_id = o.id
FROM public.organizations o
WHERE m.user_id = o.owner_id AND m.organization_id IS NULL;
