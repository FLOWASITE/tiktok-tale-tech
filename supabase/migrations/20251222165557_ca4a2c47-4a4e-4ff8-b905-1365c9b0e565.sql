-- Add approval settings columns to organizations
ALTER TABLE public.organizations 
ADD COLUMN skip_approval boolean DEFAULT false,
ADD COLUMN approver_roles text[] DEFAULT ARRAY['owner', 'admin']::text[];