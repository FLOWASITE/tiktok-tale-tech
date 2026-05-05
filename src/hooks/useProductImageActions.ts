import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import type { ProductRefLabel, ProductAppearance } from '@/types/product';

/**
 * Helper hook for product image AI actions: upload, analyze, generate.
 * Mirrors useCharacterImageActions but for products.
 */
export function useProductImageActions(opts: {
  name?: string;
  category?: string;
  description?: string;
  appearance?: ProductAppearance;
}) {
  const { currentOrganization } = useOrganizationContext();
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiGenerating, setAiGenerating] = useState<ProductRefLabel | null>(null);

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      if (!currentOrganization?.id) return null;
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${currentOrganization.id}/${crypto.randomUUID()}.${ext}`;
      setUploading(true);
      try {
        const { error } = await supabase.storage.from('product-references').upload(path, file);
        if (error) {
          toast.error('Upload thất bại');
          return null;
        }
        const { data: { publicUrl } } = supabase.storage.from('product-references').getPublicUrl(path);
        return publicUrl;
      } finally {
        setUploading(false);
      }
    },
    [currentOrganization?.id],
  );

  const analyzeImage = useCallback(
    async (image_url: string) => {
      if (!image_url) return null;
      setAnalyzing(true);
      try {
        const { data, error } = await supabase.functions.invoke('analyze-product-image', {
          body: { image_url },
        });
        if (error) throw error;
        return data;
      } catch (e) {
        console.error('[analyze-product-image]', e);
        toast.error('Không thể phân tích ảnh — thử lại sau');
        return null;
      } finally {
        setAnalyzing(false);
      }
    },
    [],
  );

  const generateImage = useCallback(
    async (
      label: ProductRefLabel,
      referenceImageUrl?: string,
      options?: { editModel?: string },
    ): Promise<string | null> => {
      if (!currentOrganization?.id || !opts.name?.trim()) {
        toast.error('Cần nhập tên sản phẩm trước khi tạo ảnh AI');
        return null;
      }
      setAiGenerating(label);
      try {
        const { data, error } = await supabase.functions.invoke('generate-product-image', {
          body: {
            name: opts.name,
            appearance: opts.appearance ?? {},
            category: opts.category ?? '',
            description: opts.description ?? '',
            view: label,
            organization_id: currentOrganization.id,
            reference_image_url: referenceImageUrl?.trim() || undefined,
            preferred_edit_model: options?.editModel || undefined,
          },
        });
        if (error) throw error;
        if (data?.error) {
          toast.error(data.error);
          return null;
        }
        return data?.url ?? null;
      } catch (e: any) {
        console.error('[generate-product-image]', e);
        const msg = e?.message || '';
        if (msg.includes('429')) toast.error('Quá tải AI, thử lại sau ít phút.');
        else if (msg.includes('402')) toast.error('Hết quota AI hoặc lỗi billing provider.');
        else toast.error('Không thể tạo ảnh — thử lại sau');
        return null;
      } finally {
        setAiGenerating(null);
      }
    },
    [currentOrganization?.id, opts.name, opts.category, opts.description, opts.appearance],
  );

  return { uploading, analyzing, aiGenerating, uploadFile, analyzeImage, generateImage };
}
