import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import type { ReferenceImageLabel } from '@/hooks/useCharacterProfiles';

/** Hook helper để upload, AI analyze, AI generate ảnh nhân vật. Tách khỏi component để tái dùng. */
export function useCharacterImageActions(opts: {
  name?: string;
  appearance?: Record<string, any>;
  wardrobe?: string;
  description?: string;
}) {
  const { currentOrganization } = useOrganizationContext();
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiGenerating, setAiGenerating] = useState<ReferenceImageLabel | null>(null);

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      if (!currentOrganization?.id) return null;
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${currentOrganization.id}/${crypto.randomUUID()}.${ext}`;
      setUploading(true);
      try {
        const { error } = await supabase.storage.from('character-references').upload(path, file);
        if (error) {
          toast.error('Upload thất bại');
          return null;
        }
        const {
          data: { publicUrl },
        } = supabase.storage.from('character-references').getPublicUrl(path);
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
        const { data, error } = await supabase.functions.invoke('analyze-character-image', {
          body: { image_url },
        });
        if (error) throw error;
        return data;
      } catch (e) {
        console.error('[AI analyze]', e);
        toast.error('Không thể phân tích ảnh — thử lại sau');
        return null;
      } finally {
        setAnalyzing(false);
      }
    },
    [],
  );

  const generateImage = useCallback(
    async (label: ReferenceImageLabel): Promise<string | null> => {
      if (!currentOrganization?.id || !opts.name?.trim()) {
        toast.error('Cần nhập tên nhân vật trước khi tạo ảnh AI');
        return null;
      }
      setAiGenerating(label);
      try {
        const { data, error } = await supabase.functions.invoke('generate-character-image', {
          body: {
            name: opts.name,
            appearance: opts.appearance,
            wardrobe: opts.wardrobe,
            description: opts.description,
            view: label,
            organization_id: currentOrganization.id,
          },
        });
        if (error) throw error;
        if (data?.error) {
          toast.error(data.error);
          return null;
        }
        return data?.url ?? null;
      } catch (e: any) {
        console.error('[generate-character-image]', e);
        const msg = e?.message || '';
        if (msg.includes('429')) toast.error('Quá tải AI, thử lại sau ít phút.');
        else if (msg.includes('402')) toast.error('Hết quota AI hoặc lỗi billing provider.');
        else toast.error('Không thể tạo ảnh — thử lại sau');
        return null;
      } finally {
        setAiGenerating(null);
      }
    },
    [currentOrganization?.id, opts.name, opts.appearance, opts.wardrobe, opts.description],
  );

  return { uploading, analyzing, aiGenerating, uploadFile, analyzeImage, generateImage };
}
