import { useState, useCallback } from 'react';
import { Channel } from '@/types/multichannel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GeneratedChannelImage {
  channel: Channel;
  imageUrl: string;
  prompt: string;
  generatedAt: string;
}

// Re-export types from image-prompt-builder for frontend use
export type ImageStylePreset = 'photorealistic' | 'illustration' | 'minimalist' | '3d_render' | 'flat_design' | 'watercolor' | 'cinematic';

export const IMAGE_STYLE_PRESETS: Record<ImageStylePreset, {
  label: string;
  description: string;
}> = {
  photorealistic: {
    label: 'Ảnh thực',
    description: 'Chất lượng DSLR, ánh sáng tự nhiên',
  },
  illustration: {
    label: 'Minh họa',
    description: 'Digital illustration với màu sắc sống động',
  },
  minimalist: {
    label: 'Tối giản',
    description: 'Thiết kế sạch sẽ, đơn giản',
  },
  '3d_render': {
    label: '3D Render',
    description: 'Đồ họa 3D với chiều sâu',
  },
  flat_design: {
    label: 'Flat Design',
    description: 'Thiết kế phẳng với màu đơn sắc',
  },
  watercolor: {
    label: 'Màu nước',
    description: 'Phong cách tranh màu nước nghệ thuật',
  },
  cinematic: {
    label: 'Điện ảnh',
    description: 'Phong cách phim với ánh sáng dramatic',
  },
};

export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface GenerateImageParams {
  prompt: string;
  contentId?: string;
  channel?: Channel;
  aspectRatio?: string;
  organizationId?: string;
  // Enhanced params for generate-brand-image
  brandTemplateId: string;
  imageStylePreset?: ImageStylePreset;
  negativePrompt?: string;
  includeLogo?: boolean;
  logoPosition?: LogoPosition;
}

export function useSocialImageGeneration() {
  const [generating, setGenerating] = useState<Channel | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<Channel, GeneratedChannelImage | null>>({} as Record<Channel, GeneratedChannelImage | null>);

  const generateImage = useCallback(async ({
    prompt,
    contentId,
    channel,
    aspectRatio = '1:1',
    brandTemplateId,
    imageStylePreset,
    negativePrompt,
  }: GenerateImageParams): Promise<string | null> => {
    if (channel) {
      setGenerating(channel);
    }

    try {
      console.log(`[useSocialImageGeneration] Generating for ${channel || 'generic'} via generate-brand-image`);

      // Call generate-brand-image instead of generate-social-image
      const { data, error } = await supabase.functions.invoke('generate-brand-image', {
        body: {
          contentId,
          channel,
          contentSummary: prompt, // Prompt becomes contentSummary
          brandTemplateId,
          aspectRatio,
          imageStylePreset,
          negativePrompt,
        },
      });

      if (error) {
        console.error('[useSocialImageGeneration] Function error:', error);
        
        if (error.message?.includes('429')) {
          toast.error('Đã vượt giới hạn API. Vui lòng thử lại sau.');
        } else if (error.message?.includes('402')) {
          toast.error('Hết credits. Vui lòng nạp thêm tại Settings → Workspace → Usage.');
        } else {
          toast.error(`Lỗi tạo ảnh: ${error.message}`);
        }
        return null;
      }

      if (!data?.success || !data?.imageUrl) {
        console.error('[useSocialImageGeneration] Generation failed:', data?.error);
        toast.error(data?.error || 'Không thể tạo ảnh');
        return null;
      }

      const imageUrl = data.imageUrl;
      
      // Store generated image info
      if (channel) {
        setGeneratedImages(prev => ({
          ...prev,
          [channel]: {
            channel,
            imageUrl,
            prompt: data.prompt || prompt, // Use the enhanced prompt from response
            generatedAt: new Date().toISOString(),
          },
        }));
      }

      toast.success('Đã tạo ảnh thành công!');
      return imageUrl;
    } catch (err) {
      console.error('[useSocialImageGeneration] Unexpected error:', err);
      toast.error('Lỗi không xác định khi tạo ảnh');
      return null;
    } finally {
      setGenerating(null);
    }
  }, []);

  const getImageForChannel = useCallback((channel: Channel): GeneratedChannelImage | null => {
    return generatedImages[channel] || null;
  }, [generatedImages]);

  const clearImageForChannel = useCallback((channel: Channel) => {
    setGeneratedImages(prev => {
      const newImages = { ...prev };
      delete newImages[channel];
      return newImages;
    });
  }, []);

  const clearAllImages = useCallback(() => {
    setGeneratedImages({} as Record<Channel, GeneratedChannelImage | null>);
  }, []);

  return {
    generating,
    generatedImages,
    generateImage,
    getImageForChannel,
    clearImageForChannel,
    clearAllImages,
  };
}
