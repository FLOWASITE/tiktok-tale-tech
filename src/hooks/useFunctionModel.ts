import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Read the effective AI model for a given function from `ai_function_configs`.
 * Read-only — model selection is owned by Admin (`/admin/ai` → Functions).
 *
 * Resolution order (frontend best-effort, mirror of edge `getAIConfig`):
 *  1. Org-level `model_override` for this function
 *  2. Global `model_override` for this function
 *  3. fallback (passed defaultModel)
 */
export function useFunctionModel(
  functionName: string,
  defaultModel: string,
  organizationId?: string | null,
) {
  return useQuery({
    queryKey: ['function-model', functionName, organizationId ?? 'global'],
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase
        .from('ai_function_configs')
        .select('model_override, force_provider, organization_id')
        .eq('function_name', functionName)
        .eq('is_enabled', true);

      if (organizationId) {
        query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
      } else {
        query = query.is('organization_id', null);
      }

      const { data } = await query
        .order('organization_id', { nullsFirst: false })
        .limit(1);

      const row = data?.[0] as { model_override?: string | null; force_provider?: string | null } | undefined;
      return {
        model: row?.model_override || defaultModel,
        forceProvider: row?.force_provider || null,
        isAdminConfigured: Boolean(row?.model_override),
      };
    },
  });
}
