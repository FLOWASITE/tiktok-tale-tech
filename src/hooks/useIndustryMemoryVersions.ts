import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface IndustryMemoryVersion {
  id: string;
  industry_template_id: string;
  version: string;
  compliance_rules: { rule: string }[];
  forbidden_terms: string[];
  claim_restrictions: { claim: string }[];
  brand_voice: Record<string, unknown>;
  changed_by: string | null;
  change_notes: string | null;
  created_at: string;
}

// Helper to parse JSONB compliance rules
function parseComplianceRules(rules: Json | null): { rule: string }[] {
  if (!rules || !Array.isArray(rules)) return [];
  return rules.map(r => {
    if (typeof r === 'string') return { rule: r };
    if (typeof r === 'object' && r !== null && 'rule' in r) {
      return { rule: String((r as { rule: unknown }).rule) };
    }
    return { rule: String(r) };
  });
}

// Helper to parse JSONB claim restrictions
function parseClaimRestrictions(claims: Json | null): { claim: string }[] {
  if (!claims || !Array.isArray(claims)) return [];
  return claims.map(c => {
    if (typeof c === 'string') return { claim: c };
    if (typeof c === 'object' && c !== null && 'claim' in c) {
      return { claim: String((c as { claim: unknown }).claim) };
    }
    return { claim: String(c) };
  });
}

export function useIndustryMemoryVersions(industryTemplateId?: string) {
  const [versions, setVersions] = useState<IndustryMemoryVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchVersions = useCallback(async () => {
    if (!industryTemplateId) {
      setVersions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('industry_memory_versions')
        .select('*')
        .eq('industry_template_id', industryTemplateId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Parse JSONB fields
      const parsedVersions: IndustryMemoryVersion[] = (data || []).map(v => ({
        id: v.id,
        industry_template_id: v.industry_template_id,
        version: v.version,
        compliance_rules: parseComplianceRules(v.compliance_rules),
        forbidden_terms: v.forbidden_terms || [],
        claim_restrictions: parseClaimRestrictions(v.claim_restrictions),
        brand_voice: typeof v.brand_voice === 'object' && v.brand_voice !== null
          ? v.brand_voice as Record<string, unknown>
          : {},
        changed_by: v.changed_by,
        change_notes: v.change_notes,
        created_at: v.created_at,
      }));

      setVersions(parsedVersions);
    } catch (err) {
      console.error('Error fetching industry memory versions:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch versions'));
    } finally {
      setLoading(false);
    }
  }, [industryTemplateId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  /**
   * Create a new version snapshot
   */
  const createVersion = useCallback(async (
    templateId: string,
    version: string,
    data: {
      compliance_rules?: { rule: string }[];
      forbidden_terms?: string[];
      claim_restrictions?: { claim: string }[];
      brand_voice?: Record<string, unknown>;
      change_notes?: string;
    }
  ): Promise<boolean> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('industry_memory_versions')
        .insert({
          industry_template_id: templateId,
          version,
          compliance_rules: (data.compliance_rules || []) as unknown as Json,
          forbidden_terms: data.forbidden_terms || [],
          claim_restrictions: (data.claim_restrictions || []) as unknown as Json,
          brand_voice: (data.brand_voice || {}) as unknown as Json,
          changed_by: user?.user?.id || null,
          change_notes: data.change_notes || null,
        });

      if (error) throw error;
      
      await fetchVersions();
      return true;
    } catch (err) {
      console.error('Error creating industry memory version:', err);
      return false;
    }
  }, [fetchVersions]);

  /**
   * Get the latest version for a template
   */
  const getLatestVersion = useCallback(async (
    templateId: string
  ): Promise<IndustryMemoryVersion | null> => {
    try {
      const { data, error } = await supabase
        .from('industry_memory_versions')
        .select('*')
        .eq('industry_template_id', templateId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        industry_template_id: data.industry_template_id,
        version: data.version,
        compliance_rules: parseComplianceRules(data.compliance_rules),
        forbidden_terms: data.forbidden_terms || [],
        claim_restrictions: parseClaimRestrictions(data.claim_restrictions),
        brand_voice: typeof data.brand_voice === 'object' && data.brand_voice !== null
          ? data.brand_voice as Record<string, unknown>
          : {},
        changed_by: data.changed_by,
        change_notes: data.change_notes,
        created_at: data.created_at,
      };
    } catch (err) {
      console.error('Error getting latest version:', err);
      return null;
    }
  }, []);

  /**
   * Compare two versions and get changes
   */
  const compareVersions = useCallback((
    oldVersion: IndustryMemoryVersion,
    newVersion: IndustryMemoryVersion
  ) => {
    const changes: {
      type: 'added' | 'removed';
      category: 'compliance_rule' | 'forbidden_term' | 'claim_restriction';
      description: string;
    }[] = [];

    // Compare compliance rules
    const oldRules = new Set(oldVersion.compliance_rules.map(r => r.rule));
    const newRules = new Set(newVersion.compliance_rules.map(r => r.rule));

    newVersion.compliance_rules.forEach(r => {
      if (!oldRules.has(r.rule)) {
        changes.push({ type: 'added', category: 'compliance_rule', description: r.rule });
      }
    });
    oldVersion.compliance_rules.forEach(r => {
      if (!newRules.has(r.rule)) {
        changes.push({ type: 'removed', category: 'compliance_rule', description: r.rule });
      }
    });

    // Compare forbidden terms
    const oldTerms = new Set(oldVersion.forbidden_terms);
    const newTerms = new Set(newVersion.forbidden_terms);

    newVersion.forbidden_terms.forEach(t => {
      if (!oldTerms.has(t)) {
        changes.push({ type: 'added', category: 'forbidden_term', description: `Từ cấm: "${t}"` });
      }
    });
    oldVersion.forbidden_terms.forEach(t => {
      if (!newTerms.has(t)) {
        changes.push({ type: 'removed', category: 'forbidden_term', description: `Từ cấm: "${t}"` });
      }
    });

    // Compare claim restrictions
    const oldClaims = new Set(oldVersion.claim_restrictions.map(c => c.claim));
    const newClaims = new Set(newVersion.claim_restrictions.map(c => c.claim));

    newVersion.claim_restrictions.forEach(c => {
      if (!oldClaims.has(c.claim)) {
        changes.push({ type: 'added', category: 'claim_restriction', description: c.claim });
      }
    });
    oldVersion.claim_restrictions.forEach(c => {
      if (!newClaims.has(c.claim)) {
        changes.push({ type: 'removed', category: 'claim_restriction', description: c.claim });
      }
    });

    return changes;
  }, []);

  return {
    versions,
    loading,
    error,
    refetch: fetchVersions,
    createVersion,
    getLatestVersion,
    compareVersions,
  };
}
