import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Channel, ChannelImage } from '@/types/multichannel';
import { toast } from 'sonner';

export type ImageGenerationStatus = 'pending' | 'generating' | 'overlaying' | 'done' | 'error';
export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface AutoGenerateOptions {
  contentId: string;
  brandTemplateId: string;
  channels: Channel[];
  contentSummaries: Record<Channel, string>;
  includeLogo?: boolean;
  logoPosition?: LogoPosition;
  logoUrl?: string;
  aspectRatio?: '16:9' | '1:1' | '9:16' | '4:5';
}

interface GeneratedImage {
  channel: Channel;
  imageUrl: string;
  prompt: string;
  generatedAt: string;
}

export function useAutoImageGeneration() {
  const [generatingChannels, setGeneratingChannels] = useState<Channel[]>([]);
  const [progress, setProgress] = useState<Record<Channel, ImageGenerationStatus>>({} as Record<Channel, ImageGenerationStatus>);
  const [generatedImages, setGeneratedImages] = useState<Record<Channel, GeneratedImage>>({} as Record<Channel, GeneratedImage>);
  const [error, setError] = useState<string | null>(null);

  const generateForChannel = useCallback(async (
    channel: Channel,
    options: AutoGenerateOptions
  ): Promise<GeneratedImage | null> => {
    const { contentId, brandTemplateId, contentSummaries, includeLogo, logoPosition, logoUrl, aspectRatio } = options;
    
    try {
      setProgress(prev => ({ ...prev, [channel]: 'generating' }));
      
      console.log(`[useAutoImageGeneration] Generating image for ${channel}`);

      // Step 1: Generate base image with brand colors
      const { data: imageData, error: imageError } = await supabase.functions.invoke('generate-brand-image', {
        body: {
          contentId,
          channel,
          contentSummary: contentSummaries[channel] || `Content for ${channel}`,
          brandTemplateId,
          aspectRatio,
        },
      });

      if (imageError || !imageData?.success) {
        console.error(`[useAutoImageGeneration] Generate error for ${channel}:`, imageError || imageData?.error);
        throw new Error(imageData?.error || imageError?.message || 'Failed to generate image');
      }

      let finalImageUrl = imageData.imageUrl;

      // Step 2: Overlay logo if requested
      if (includeLogo && logoUrl) {
        setProgress(prev => ({ ...prev, [channel]: 'overlaying' }));
        
        const { data: overlayData, error: overlayError } = await supabase.functions.invoke('overlay-brand-logo', {
          body: {
            imageUrl: finalImageUrl,
            logoUrl,
            position: logoPosition || 'bottom-right',
            logoScale: 0.12,
            padding: 20,
            contentId,
            channel,
          },
        });

        if (overlayError || !overlayData?.success) {
          console.warn(`[useAutoImageGeneration] Logo overlay failed for ${channel}, using base image`);
          // Continue with base image if overlay fails
        } else {
          finalImageUrl = overlayData.imageUrl;
        }
      }

      const result: GeneratedImage = {
        channel,
        imageUrl: finalImageUrl,
        prompt: imageData.prompt,
        generatedAt: new Date().toISOString(),
      };

      setProgress(prev => ({ ...prev, [channel]: 'done' }));
      setGeneratedImages(prev => ({ ...prev, [channel]: result }));

      return result;
    } catch (err) {
      console.error(`[useAutoImageGeneration] Error for ${channel}:`, err);
      setProgress(prev => ({ ...prev, [channel]: 'error' }));
      return null;
    }
  }, []);

  const generateAllImages = useCallback(async (
    options: AutoGenerateOptions,
    onImageGenerated?: (channel: Channel, image: ChannelImage) => Promise<void>
  ): Promise<{ successful: Channel[]; failed: Channel[] }> => {
    const { channels } = options;
    
    setGeneratingChannels(channels);
    setError(null);
    setGeneratedImages({} as Record<Channel, GeneratedImage>);
    
    // Initialize progress for all channels
    const initialProgress: Record<Channel, ImageGenerationStatus> = {} as Record<Channel, ImageGenerationStatus>;
    channels.forEach(ch => {
      initialProgress[ch] = 'pending';
    });
    setProgress(initialProgress);

    const successful: Channel[] = [];
    const failed: Channel[] = [];

    // Process in batches of 2 to avoid rate limits
    const batchSize = 2;
    for (let i = 0; i < channels.length; i += batchSize) {
      const batch = channels.slice(i, i + batchSize);
      
      const results = await Promise.all(
        batch.map(channel => generateForChannel(channel, options))
      );

      for (let j = 0; j < batch.length; j++) {
        const channel = batch[j];
        const result = results[j];

        if (result) {
          successful.push(channel);
          
          // Call callback to save image to DB
          if (onImageGenerated) {
            try {
              await onImageGenerated(channel, {
                url: result.imageUrl,
                prompt: result.prompt,
                provider: 'lovable-ai',
                generatedAt: result.generatedAt,
              });
            } catch (saveErr) {
              console.error(`[useAutoImageGeneration] Failed to save image for ${channel}:`, saveErr);
            }
          }
        } else {
          failed.push(channel);
        }
      }

      // Small delay between batches to avoid rate limits
      if (i + batchSize < channels.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setGeneratingChannels([]);

    if (failed.length > 0) {
      toast.error(`Không thể tạo ảnh cho ${failed.length} kênh`);
    }
    if (successful.length > 0) {
      toast.success(`Đã tạo ảnh cho ${successful.length} kênh thành công!`);
    }

    return { successful, failed };
  }, [generateForChannel]);

  const resetProgress = useCallback(() => {
    setProgress({} as Record<Channel, ImageGenerationStatus>);
    setGeneratedImages({} as Record<Channel, GeneratedImage>);
    setError(null);
    setGeneratingChannels([]);
  }, []);

  const isGenerating = generatingChannels.length > 0;

  const completedCount = Object.values(progress).filter(
    s => s === 'done' || s === 'error'
  ).length;

  const totalCount = Object.keys(progress).length;

  return {
    isGenerating,
    generatingChannels,
    progress,
    generatedImages,
    error,
    completedCount,
    totalCount,
    generateAllImages,
    resetProgress,
  };
}
