import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContentViolation {
  term: string;
  type: 'forbidden_term' | 'forbidden_word' | 'forbidden_pattern';
  severity: 'error' | 'warning';
  channel?: string;
  context: string; // snippet showing where the term appears
}

export interface ValidationResult {
  isValid: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  violations: ContentViolation[];
  errorCount: number;
  warningCount: number;
}

interface IndustryRulesForValidation {
  forbidden_terms: string[];
  forbidden_words: string[];
  forbidden_patterns: string[];
}

/**
 * Hook to validate content against Industry Memory rules
 * Accepts brandTemplateId to look up the linked industry template
 * 
 * PRIORITY:
 * 1. forbidden_terms (HARD LOCK - errors, cannot publish)
 * 2. forbidden_patterns (HARD LOCK - errors)
 * 3. forbidden_words (SOFT - warnings, can still publish)
 */
export function useContentValidation(brandTemplateId: string | null | undefined) {
  // First get industry_template_id from brand, then fetch rules
  const { data: industryRules, isLoading } = useQuery({
    queryKey: ['content-validation-rules', brandTemplateId],
    queryFn: async (): Promise<IndustryRulesForValidation | null> => {
      if (!brandTemplateId) return null;

      // Get industry_template_id from brand
      const { data: brandData, error: brandError } = await supabase
        .from('brand_templates')
        .select('industry_template_id')
        .eq('id', brandTemplateId)
        .single();

      if (brandError || !brandData?.industry_template_id) {
        return null;
      }

      // Fetch industry rules
      const { data, error } = await supabase
        .from('industry_templates')
        .select(`
          forbidden_terms,
          argument_patterns,
          industry_template_translations!inner (
            forbidden_words
          )
        `)
        .eq('id', brandData.industry_template_id)
        .eq('industry_template_translations.language_code', 'vi')
        .single();

      if (error || !data) {
        console.warn('Failed to fetch industry rules for validation:', error);
        return null;
      }

      const rawData = data as any;
      const translation = rawData.industry_template_translations?.[0];

      return {
        forbidden_terms: rawData.forbidden_terms || [],
        forbidden_words: translation?.forbidden_words || [],
        forbidden_patterns: rawData.argument_patterns?.forbidden_patterns || [],
      };
    },
    enabled: !!brandTemplateId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  /**
   * Extract context snippet around a found term
   */
  const extractContext = useCallback((content: string, term: string): string => {
    const lowerContent = content.toLowerCase();
    const lowerTerm = term.toLowerCase();
    const index = lowerContent.indexOf(lowerTerm);
    
    if (index === -1) return '';
    
    const start = Math.max(0, index - 20);
    const end = Math.min(content.length, index + term.length + 20);
    
    let snippet = content.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';
    
    return snippet;
  }, []);

  /**
   * Check if content contains a term (case-insensitive, word boundary aware)
   */
  const containsTerm = useCallback((content: string, term: string): boolean => {
    if (!content || !term) return false;
    
    // Create word boundary regex for more accurate matching
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedTerm}\\b`, 'gi');
    return regex.test(content);
  }, []);

  /**
   * Validate a single piece of content
   */
  const validateContent = useCallback((
    content: string,
    channel?: string
  ): ValidationResult => {
    const violations: ContentViolation[] = [];
    
    if (!content || !industryRules) {
      return {
        isValid: true,
        hasErrors: false,
        hasWarnings: false,
        violations: [],
        errorCount: 0,
        warningCount: 0,
      };
    }

    // 1. Check forbidden_terms (HARD LOCK - errors)
    for (const term of industryRules.forbidden_terms) {
      if (containsTerm(content, term)) {
        violations.push({
          term,
          type: 'forbidden_term',
          severity: 'error',
          channel,
          context: extractContext(content, term),
        });
      }
    }

    // 2. Check forbidden_patterns (HARD LOCK - errors)
    for (const pattern of industryRules.forbidden_patterns) {
      if (containsTerm(content, pattern)) {
        violations.push({
          term: pattern,
          type: 'forbidden_pattern',
          severity: 'error',
          channel,
          context: extractContext(content, pattern),
        });
      }
    }

    // 3. Check forbidden_words (SOFT - warnings)
    for (const word of industryRules.forbidden_words) {
      if (containsTerm(content, word)) {
        violations.push({
          term: word,
          type: 'forbidden_word',
          severity: 'warning',
          channel,
          context: extractContext(content, word),
        });
      }
    }

    const errorCount = violations.filter(v => v.severity === 'error').length;
    const warningCount = violations.filter(v => v.severity === 'warning').length;

    return {
      isValid: errorCount === 0,
      hasErrors: errorCount > 0,
      hasWarnings: warningCount > 0,
      violations,
      errorCount,
      warningCount,
    };
  }, [industryRules, containsTerm, extractContext]);

  /**
   * Validate multiple channel contents at once
   */
  const validateMultiChannelContent = useCallback((
    channelContents: Record<string, string | null | undefined>
  ): ValidationResult => {
    const allViolations: ContentViolation[] = [];

    for (const [channel, content] of Object.entries(channelContents)) {
      if (content) {
        const result = validateContent(content, channel);
        allViolations.push(...result.violations);
      }
    }

    // Deduplicate violations by term (keep first occurrence)
    const uniqueViolations = allViolations.reduce((acc, violation) => {
      const key = `${violation.term}-${violation.type}`;
      if (!acc.find(v => `${v.term}-${v.type}` === key)) {
        acc.push(violation);
      }
      return acc;
    }, [] as ContentViolation[]);

    const errorCount = uniqueViolations.filter(v => v.severity === 'error').length;
    const warningCount = uniqueViolations.filter(v => v.severity === 'warning').length;

    return {
      isValid: errorCount === 0,
      hasErrors: errorCount > 0,
      hasWarnings: warningCount > 0,
      violations: uniqueViolations,
      errorCount,
      warningCount,
    };
  }, [validateContent]);

  return {
    validateContent,
    validateMultiChannelContent,
    industryRules,
    hasIndustryRules: !!industryRules,
    isLoading,
  };
}
