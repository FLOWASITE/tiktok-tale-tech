-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;

-- Create new INSERT policy with PERMISSIVE (default)
CREATE POLICY "Users can create organizations" 
ON public.organizations 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = owner_id);