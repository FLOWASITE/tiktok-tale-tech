import { useState, useCallback } from 'react';
import { useAIProviders } from '@/hooks/useAIProviders';
import { AIProviderType } from '@/types/aiProvider';
import { Channel } from '@/types/multichannel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GeneratedChannelImage {
  channel: Channel;
  imageUrl: string;
  prompt: string;
  provider: AIProviderType;
  generatedAt: string;
}

interface GenerateImageParams {
  prompt: string;
  contentId?: string;
  channel?: Channel;
  size?: string;
}

export function useSocialImageGeneration() {
  const [generating, setGenerating] = useState<Channel | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<Channel, GeneratedChannelImage | null>>({} as Record<Channel, GeneratedChannelImage | null>);
  
  const { getActiveProvider, getProviderConfig, isConfigured } = useAIProviders();

  const generateImage = useCallback(async ({
    prompt,
    contentId,
    channel,
    size = '1024x1024',
  }: GenerateImageParams): Promise<string | null> => {
    const { type: providerType, config: providerConfig } = getActiveProvider();

    if (!providerConfig?.apiKey) {
      toast.error('Vui lòng cấu hình API key cho AI Provider trong Cài đặt');
      return null;
    }

    if (channel) {
      setGenerating(channel);
    }

    try {
      console.log(`[useSocialImageGeneration] Generating with ${providerType} for ${channel || 'generic'}`);

      const requestBody: Record<string, unknown> = {
        prompt,
        provider: providerType,
        apiKey: providerConfig.apiKey,
        size,
      };

      // Add optional params
      if (contentId) requestBody.contentId = contentId;
      if (channel) requestBody.channel = channel;
      if (providerConfig.baseUrl) requestBody.baseUrl = providerConfig.baseUrl;
      if (providerConfig.model) requestBody.model = providerConfig.model;

      const { data, error } = await supabase.functions.invoke('generate-social-image', {
        body: requestBody,
      });

      if (error) {
        console.error('[useSocialImageGeneration] Function error:', error);
        
        // Parse error message for user-friendly display
        if (error.message?.includes('429')) {
          toast.error('Đã vượt giới hạn API. Vui lòng thử lại sau.');
        } else if (error.message?.includes('401') || error.message?.includes('403')) {
          toast.error('API key không hợp lệ. Vui lòng kiểm tra trong Cài đặt.');
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
            provider: providerType,
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
  }, [getActiveProvider]);

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
    isConfigured: isConfigured(),
    getActiveProvider,
  };
}
