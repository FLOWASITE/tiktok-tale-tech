import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AI_PROVIDERS } from '@/hooks/useAIConfig';

/**
 * Check which provider-level secrets are set in the edge runtime env.
 * Returns a map: { [providerType]: boolean } indicating whether that provider's
 * `secretName` env var is configured. Admin-only endpoint.
 */
export function useProviderEnvSecrets() {
  return useQuery({
    queryKey: ['provider-env-secrets'],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const names = AI_PROVIDERS
        .map((p: any) => p.secretName)
        .filter((n): n is string => typeof n === 'string' && n.length > 0);

      const { data, error } = await supabase.functions.invoke('check-provider-secrets', {
        body: { names },
      });
      if (error) {
        // Non-admin or function error → treat as empty (no badges shown).
        return {} as Record<string, boolean>;
      }
      const secrets = (data?.secrets ?? {}) as Record<string, boolean>;

      // Re-key by providerType for easy consumption.
      const byProvider: Record<string, boolean> = {};
      for (const p of AI_PROVIDERS as readonly any[]) {
        if (p.secretName && secrets[p.secretName]) {
          byProvider[p.type] = true;
        }
      }
      return byProvider;
    },
  });
}
