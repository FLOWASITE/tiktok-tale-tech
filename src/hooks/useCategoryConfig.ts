import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CategoryConfig {
  id: string;
  slug: string;
  label: string;
  icon: string;
  color: string;
  sortOrder: number;
  isSystem: boolean;
  organizationId: string | null;
}

interface DbCategory {
  id: string;
  slug: string;
  label: string;
  icon: string;
  color: string;
  sort_order: number;
  is_system: boolean;
  organization_id: string | null;
}

const mapDbToCategory = (db: DbCategory): CategoryConfig => ({
  id: db.id,
  slug: db.slug,
  label: db.label,
  icon: db.icon,
  color: db.color,
  sortOrder: db.sort_order,
  isSystem: db.is_system,
  organizationId: db.organization_id,
});

export function useCategoryConfig(organizationId?: string) {
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ['ai-function-categories', organizationId],
    queryFn: async () => {
      let query = supabase
        .from('ai_function_categories')
        .select('*')
        .order('sort_order');
      
      if (organizationId) {
        query = query.or(`organization_id.is.null,organization_id.eq.${organizationId}`);
      } else {
        query = query.is('organization_id', null);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return (data as DbCategory[]).map(mapDbToCategory);
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (category: Omit<CategoryConfig, 'id' | 'isSystem' | 'organizationId'>) => {
      if (!organizationId) throw new Error('Organization ID required');
      
      const { data, error } = await supabase
        .from('ai_function_categories')
        .insert({
          slug: category.slug,
          label: category.label,
          icon: category.icon,
          color: category.color,
          sort_order: category.sortOrder,
          is_system: false,
          organization_id: organizationId,
        })
        .select()
        .single();
      
      if (error) throw error;
      return mapDbToCategory(data as DbCategory);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-function-categories'] });
      toast.success('Đã tạo category mới');
    },
    onError: (error: Error) => {
      toast.error(`Lỗi tạo category: ${error.message}`);
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CategoryConfig> & { id: string }) => {
      const { data, error } = await supabase
        .from('ai_function_categories')
        .update({
          label: updates.label,
          icon: updates.icon,
          color: updates.color,
          sort_order: updates.sortOrder,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return mapDbToCategory(data as DbCategory);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-function-categories'] });
      toast.success('Đã cập nhật category');
    },
    onError: (error: Error) => {
      toast.error(`Lỗi cập nhật: ${error.message}`);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_function_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-function-categories'] });
      toast.success('Đã xóa category');
    },
    onError: (error: Error) => {
      toast.error(`Lỗi xóa: ${error.message}`);
    },
  });

  const getCategoryConfig = (slug: string): CategoryConfig | undefined => {
    const categories = categoriesQuery.data || [];
    return categories.find(c => c.slug === slug) 
      || categories.find(c => c.slug === 'other');
  };

  const getUnknownFunctionsCount = (functionCategories: string[]): number => {
    const categories = categoriesQuery.data || [];
    const knownSlugs = categories.map(c => c.slug);
    return functionCategories.filter(cat => !knownSlugs.includes(cat)).length;
  };

  return {
    categories: categoriesQuery.data || [],
    isLoading: categoriesQuery.isLoading,
    error: categoriesQuery.error,
    getCategoryConfig,
    getUnknownFunctionsCount,
    createCategory: createCategoryMutation.mutate,
    updateCategory: updateCategoryMutation.mutate,
    deleteCategory: deleteCategoryMutation.mutate,
    isCreating: createCategoryMutation.isPending,
    isUpdating: updateCategoryMutation.isPending,
    isDeleting: deleteCategoryMutation.isPending,
  };
}
