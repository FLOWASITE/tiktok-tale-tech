-- Step 1: Clean up duplicate records, keeping only the newest one for each (function_name, organization_id)
DELETE FROM ai_function_configs a
WHERE a.id NOT IN (
  SELECT DISTINCT ON (function_name, COALESCE(organization_id::text, '__null__'))
    id
  FROM ai_function_configs
  ORDER BY function_name, COALESCE(organization_id::text, '__null__'), updated_at DESC NULLS LAST
);

-- Step 2: Drop old constraint if exists
ALTER TABLE ai_function_configs 
DROP CONSTRAINT IF EXISTS ai_function_configs_organization_id_function_name_key;

-- Step 3: Create partial unique index for NULL organization_id (global configs)
CREATE UNIQUE INDEX IF NOT EXISTS ai_function_configs_global_function_unique 
ON ai_function_configs (function_name) 
WHERE organization_id IS NULL;

-- Step 4: Create unique index for non-NULL organization_id (org-specific configs)
CREATE UNIQUE INDEX IF NOT EXISTS ai_function_configs_org_function_unique 
ON ai_function_configs (organization_id, function_name) 
WHERE organization_id IS NOT NULL;