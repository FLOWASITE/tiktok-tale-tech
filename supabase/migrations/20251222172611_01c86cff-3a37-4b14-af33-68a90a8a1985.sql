-- Add auto_submit_review column to organizations table
ALTER TABLE public.organizations ADD COLUMN auto_submit_review boolean DEFAULT false;

COMMENT ON COLUMN public.organizations.auto_submit_review IS 'When true, newly created content will automatically be set to review status';