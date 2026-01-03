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

interface GenerateImageParams {
  prompt: string;
  contentId?: string;
  channel?: Channel;
  aspectRatio?: string;
  organizationId?: string;
}

export function useSocialImageGeneration() {
  const [generating, setGenerating] = useState<Channel | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<Channel, GeneratedChannelImage | null>>({} as Record<Channel, GeneratedChannelImage | null>);

  const generateImage = useCallback(async ({
    prompt,
    contentId,
    channel,
    aspectRatio = '1:1',
    organizationId,
  }: GenerateImageParams): Promise<string | null> => {
    if (channel) {
      setGenerating(channel);
    }

    try {
      console.log(`[useSocialImageGeneration] Generating for ${channel || 'generic'}`);

      const { data, error } = await supabase.functions.invoke('generate-social-image', {
        body: {
          prompt,
          contentId,
          channel,
          aspectRatio,
          organizationId,
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
            prompt,
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
