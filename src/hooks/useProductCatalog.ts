import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import type { BrandProduct, ProductFormData } from '@/types/product';

export function useProductCatalog(brandTemplateId?: string) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryKey = ['brand-products', brandTemplateId];

  // Fetch products for a brand template
  const { data: products = [], isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!brandTemplateId) return [];
      
      const { data, error } = await supabase
        .from('brand_products')
        .select('*')
        .eq('brand_template_id', brandTemplateId)
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as unknown as BrandProduct[];
    },
    enabled: !!brandTemplateId,
  });

  // Create product
  const createProduct = useCallback(async (formData: ProductFormData) => {
    if (!brandTemplateId || !user) {
      toast.error('Không thể tạo sản phẩm');
      return null;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('brand_products')
        .insert({
          brand_template_id: brandTemplateId,
          organization_id: currentOrganization?.id || null,
          user_id: user.id,
          name: formData.name,
          sku: formData.sku || null,
          category: formData.category || null,
          description: formData.description || null,
          price_display: formData.price_display || null,
          image_url: formData.image_url || null,
          unique_selling_points: formData.unique_selling_points || [],
          target_audience: formData.target_audience || null,
          pain_points_solved: formData.pain_points_solved || [],
          benefits: formData.benefits || [],
          keywords: formData.keywords || [],
          suggested_content_angles: formData.suggested_content_angles || [],
          best_channels: formData.best_channels || [],
          is_featured: formData.is_featured || false,
          is_active: formData.is_active !== false,
          reference_images: formData.reference_images ?? [],
          appearance: formData.appearance ?? {},
        })
        .select()
        .single();

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey });
      toast.success('Đã thêm sản phẩm');
      return data as unknown as BrandProduct;
    } catch (err: any) {
      console.error('Create product error:', err);
      toast.error(err?.message || 'Không thể tạo sản phẩm');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [brandTemplateId, user, currentOrganization, queryClient, queryKey]);

  // Update product
  const updateProduct = useCallback(async (productId: string, formData: Partial<ProductFormData>) => {
    if (!user) {
      toast.error('Không thể cập nhật sản phẩm');
      return null;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('brand_products')
        .update({
          name: formData.name,
          sku: formData.sku || null,
          category: formData.category || null,
          description: formData.description || null,
          price_display: formData.price_display || null,
          image_url: formData.image_url || null,
          unique_selling_points: formData.unique_selling_points || [],
          target_audience: formData.target_audience || null,
          pain_points_solved: formData.pain_points_solved || [],
          benefits: formData.benefits || [],
          keywords: formData.keywords || [],
          suggested_content_angles: formData.suggested_content_angles || [],
          best_channels: formData.best_channels || [],
          is_featured: formData.is_featured,
          is_active: formData.is_active,
        })
        .eq('id', productId)
        .select()
        .single();

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey });
      toast.success('Đã cập nhật sản phẩm');
      return data as unknown as BrandProduct;
    } catch (err: any) {
      console.error('Update product error:', err);
      toast.error(err?.message || 'Không thể cập nhật sản phẩm');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [user, queryClient, queryKey]);

  // Delete product (soft delete)
  const deleteProduct = useCallback(async (productId: string) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('brand_products')
        .update({ is_active: false })
        .eq('id', productId);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey });
      toast.success('Đã xóa sản phẩm');
      return true;
    } catch (err) {
      console.error('Delete product error:', err);
      toast.error('Không thể xóa sản phẩm');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [queryClient, queryKey]);

  // Toggle featured status
  const toggleFeatured = useCallback(async (productId: string, isFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from('brand_products')
        .update({ is_featured: isFeatured })
        .eq('id', productId);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey });
      toast.success(isFeatured ? 'Đã đánh dấu sản phẩm nổi bật' : 'Đã bỏ đánh dấu nổi bật');
      return true;
    } catch (err) {
      console.error('Toggle featured error:', err);
      toast.error('Không thể cập nhật');
      return false;
    }
  }, [queryClient, queryKey]);

  // Get featured products
  const featuredProducts = products.filter(p => p.is_featured);

  return {
    products,
    featuredProducts,
    isLoading,
    isSubmitting,
    error,
    refetch,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleFeatured,
  };
}
