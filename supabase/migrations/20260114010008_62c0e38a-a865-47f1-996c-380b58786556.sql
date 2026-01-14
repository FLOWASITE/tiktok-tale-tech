
-- Drop existing functions to allow signature changes
DROP FUNCTION IF EXISTS public.find_duplicate_regulations(double precision, integer);
DROP FUNCTION IF EXISTS public.find_node_duplicates(uuid, double precision, integer);
