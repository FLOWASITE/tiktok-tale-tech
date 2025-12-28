import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { 
  IndustryGlossaryTerm, 
  IndustryGlossaryTranslation,
  IndustryGlossaryTermWithTranslation,
  GlossaryCategory 
} from '@/types/industryGlossary';

interface UseIndustryGlossaryOptions {
  industryTemplateId?: string;
  languageCode?: string;
  category?: GlossaryCategory;
  searchQuery?: string;
  onlyPreferred?: boolean;
}

export function useIndustryGlossary(options: UseIndustryGlossaryOptions = {}) {
  const { 
    industryTemplateId, 
    languageCode = 'vi', 
    category,
    searchQuery,
    onlyPreferred 
  } = options;

  const glossaryQuery = useQuery({
    queryKey: ['industry-glossary', industryTemplateId, languageCode, category, searchQuery, onlyPreferred],
    queryFn: async (): Promise<IndustryGlossaryTermWithTranslation[]> => {
      if (!industryTemplateId) return [];

      let query = supabase
        .from('industry_glossary')
        .select(`
          *,
          industry_glossary_translations!inner (
            definition,
            example_usage,
            notes
          )
        `)
        .eq('industry_template_id', industryTemplateId)
        .eq('is_active', true)
        .eq('industry_glossary_translations.language_code', languageCode)
        .order('sort_order', { ascending: true })
        .order('term', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      if (onlyPreferred) {
        query = query.eq('is_preferred', true);
      }

      if (searchQuery) {
        query = query.or(`term.ilike.%${searchQuery}%,abbreviation.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(item => ({
        ...item,
        definition: item.industry_glossary_translations[0]?.definition || '',
        example_usage: item.industry_glossary_translations[0]?.example_usage || null,
        notes: item.industry_glossary_translations[0]?.notes || null,
      }));
    },
    enabled: !!industryTemplateId,
  });

  return {
    glossary: glossaryQuery.data || [],
    isLoading: glossaryQuery.isLoading,
    error: glossaryQuery.error,
    refetch: glossaryQuery.refetch,
  };
}

// Admin hook for CRUD operations
export function useIndustryGlossaryAdmin() {
  const queryClient = useQueryClient();

  const createTermMutation = useMutation({
    mutationFn: async (params: {
      industryTemplateId: string;
      term: string;
      abbreviation?: string;
      category: GlossaryCategory;
      relatedTerms?: string[];
      usageContext?: string;
      isPreferred?: boolean;
      sortOrder?: number;
      translations: {
        languageCode: string;
        definition: string;
        exampleUsage?: string;
        notes?: string;
      }[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Insert glossary term
      const { data: glossaryTerm, error: termError } = await supabase
        .from('industry_glossary')
        .insert({
          industry_template_id: params.industryTemplateId,
          term: params.term,
          abbreviation: params.abbreviation || null,
          category: params.category,
          related_terms: params.relatedTerms || [],
          usage_context: params.usageContext || null,
          is_preferred: params.isPreferred ?? true,
          sort_order: params.sortOrder ?? 0,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (termError) throw termError;

      // Insert translations
      const translationsToInsert = params.translations.map(t => ({
        glossary_id: glossaryTerm.id,
        language_code: t.languageCode,
        definition: t.definition,
        example_usage: t.exampleUsage || null,
        notes: t.notes || null,
      }));

      const { error: translationError } = await supabase
        .from('industry_glossary_translations')
        .insert(translationsToInsert);

      if (translationError) throw translationError;

      return glossaryTerm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industry-glossary'] });
    },
  });

  const updateTermMutation = useMutation({
    mutationFn: async (params: {
      id: string;
      term?: string;
      abbreviation?: string | null;
      category?: GlossaryCategory;
      relatedTerms?: string[];
      usageContext?: string | null;
      isPreferred?: boolean;
      isActive?: boolean;
      sortOrder?: number;
    }) => {
      const { id, ...updates } = params;
      
      const dbUpdates: Record<string, unknown> = {};
      if (updates.term !== undefined) dbUpdates.term = updates.term;
      if (updates.abbreviation !== undefined) dbUpdates.abbreviation = updates.abbreviation;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.relatedTerms !== undefined) dbUpdates.related_terms = updates.relatedTerms;
      if (updates.usageContext !== undefined) dbUpdates.usage_context = updates.usageContext;
      if (updates.isPreferred !== undefined) dbUpdates.is_preferred = updates.isPreferred;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

      const { data, error } = await supabase
        .from('industry_glossary')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industry-glossary'] });
    },
  });

  const updateTranslationMutation = useMutation({
    mutationFn: async (params: {
      glossaryId: string;
      languageCode: string;
      definition: string;
      exampleUsage?: string | null;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('industry_glossary_translations')
        .upsert({
          glossary_id: params.glossaryId,
          language_code: params.languageCode,
          definition: params.definition,
          example_usage: params.exampleUsage || null,
          notes: params.notes || null,
        }, {
          onConflict: 'glossary_id,language_code',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industry-glossary'] });
    },
  });

  const deleteTermMutation = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('industry_glossary')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industry-glossary'] });
    },
  });

  const permanentDeleteTermMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete translations first (cascade should handle this, but being explicit)
      await supabase
        .from('industry_glossary_translations')
        .delete()
        .eq('glossary_id', id);

      const { error } = await supabase
        .from('industry_glossary')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industry-glossary'] });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (params: {
      industryTemplateId: string;
      terms: {
        term: string;
        abbreviation?: string;
        category: GlossaryCategory;
        definition: string;
        exampleUsage?: string;
      }[];
      languageCode?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const languageCode = params.languageCode || 'vi';

      // Insert all terms
      const termsToInsert = params.terms.map((t, index) => ({
        industry_template_id: params.industryTemplateId,
        term: t.term,
        abbreviation: t.abbreviation || null,
        category: t.category,
        related_terms: [],
        is_preferred: true,
        sort_order: index,
        created_by: user?.id || null,
      }));

      const { data: insertedTerms, error: termsError } = await supabase
        .from('industry_glossary')
        .insert(termsToInsert)
        .select();

      if (termsError) throw termsError;

      // Insert translations
      const translationsToInsert = insertedTerms.map((term, index) => ({
        glossary_id: term.id,
        language_code: languageCode,
        definition: params.terms[index].definition,
        example_usage: params.terms[index].exampleUsage || null,
      }));

      const { error: translationsError } = await supabase
        .from('industry_glossary_translations')
        .insert(translationsToInsert);

      if (translationsError) throw translationsError;

      return insertedTerms;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industry-glossary'] });
    },
  });

  return {
    createTerm: createTermMutation.mutateAsync,
    updateTerm: updateTermMutation.mutateAsync,
    updateTranslation: updateTranslationMutation.mutateAsync,
    deleteTerm: deleteTermMutation.mutateAsync,
    permanentDeleteTerm: permanentDeleteTermMutation.mutateAsync,
    bulkImport: bulkImportMutation.mutateAsync,
    isCreating: createTermMutation.isPending,
    isUpdating: updateTermMutation.isPending || updateTranslationMutation.isPending,
    isDeleting: deleteTermMutation.isPending || permanentDeleteTermMutation.isPending,
    isImporting: bulkImportMutation.isPending,
  };
}
