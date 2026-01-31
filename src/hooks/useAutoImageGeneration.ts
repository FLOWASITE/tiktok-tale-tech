import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Channel, ChannelImage } from '@/types/multichannel';
import { toast } from 'sonner';

export type ImageGenerationStatus = 'pending' | 'generating' | 'overlaying' | 'done' | 'error';
export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type AspectRatioOption = '16:9' | '1:1' | '9:16' | '4:5' | 'auto';

// Map channels to optimal aspect ratios
export const CHANNEL_OPTIMAL_ASPECT_RATIO: Partial<Record<Channel, '16:9' | '1:1' | '9:16' | '4:5'>> = {
  website: '16:9',
  youtube: '16:9',
  linkedin: '16:9',
  twitter: '16:9',
  facebook: '1:1',
  instagram: '1:1',
  threads: '1:1',
  tiktok: '9:16',
};

export type ImageStylePreset = 'photorealistic' | 'illustration' | 'minimalist' | '3d_render' | 'flat_design' | 'watercolor' | 'cinematic';

export interface AutoGenerateOptions {
  contentId: string;
  brandTemplateId: string;
  channels: Channel[];
  contentSummaries: Record<Channel, string>;
  includeLogo?: boolean;
  logoPosition?: LogoPosition;
  logoUrl?: string;
  aspectRatio?: AspectRatioOption;
  imageStylePreset?: ImageStylePreset;
  negativePrompt?: string;
}

export interface GeneratedImage {
  channel: Channel;
  imageUrl: string;
  prompt: string;
  generatedAt: string;
  aspectRatio: string;
  logoOverlayFailed?: boolean; // Track if logo overlay failed
}

export interface ChannelProgress {
  status: ImageGenerationStatus;
  startTime?: number; // Timestamp when generation started
}

export function useAutoImageGeneration() {
  const [generatingChannels, setGeneratingChannels] = useState<Channel[]>([]);
  const [progress, setProgress] = useState<Record<Channel, ImageGenerationStatus>>({} as Record<Channel, ImageGenerationStatus>);
  const [progressTimes, setProgressTimes] = useState<Record<Channel, number>>({} as Record<Channel, number>);
  const [logoOverlayFailures, setLogoOverlayFailures] = useState<Record<Channel, boolean>>({} as Record<Channel, boolean>);
  const [generatedImages, setGeneratedImages] = useState<Record<Channel, GeneratedImage>>({} as Record<Channel, GeneratedImage>);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const getAspectRatioForChannel = useCallback((channel: Channel, aspectRatio: AspectRatioOption): '16:9' | '1:1' | '9:16' | '4:5' => {
    if (aspectRatio === 'auto') {
      return CHANNEL_OPTIMAL_ASPECT_RATIO[channel] || '16:9';
    }
    return aspectRatio;
  }, []);

  // Generate with retry logic and exponential backoff
  const generateWithRetry = useCallback(async (
    channel: Channel,
    options: AutoGenerateOptions,
    maxRetries = 2
  ): Promise<GeneratedImage | null> => {
    const { contentId, brandTemplateId, contentSummaries, includeLogo, logoPosition, logoUrl, aspectRatio = '16:9', imageStylePreset, negativePrompt } = options;
    
    const channelAspectRatio = getAspectRatioForChannel(channel, aspectRatio);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[useAutoImageGeneration] Retry attempt ${attempt} for ${channel}`);
        }
        
        // Set status and track start time
        const startTime = Date.now();
        setProgress(prev => ({ ...prev, [channel]: 'generating' }));
        setProgressTimes(prev => ({ ...prev, [channel]: startTime }));
        
        console.log(`[useAutoImageGeneration] Generating image for ${channel} with aspect ratio ${channelAspectRatio}, style: ${imageStylePreset || 'default'}`);

        // Step 1: Generate base image with brand colors and optional style preset
        const { data: imageData, error: imageError } = await supabase.functions.invoke('generate-brand-image', {
          body: {
            contentId,
            channel,
            contentSummary: contentSummaries[channel] || `Content for ${channel}`,
            brandTemplateId,
            aspectRatio: channelAspectRatio,
            imageStylePreset,
            negativePrompt,
          },
        });

        if (imageError || !imageData?.success) {
          console.error(`[useAutoImageGeneration] Generate error for ${channel}:`, imageError || imageData?.error);
          throw new Error(imageData?.error || imageError?.message || 'Failed to generate image');
        }

        let finalImageUrl = imageData.imageUrl;
        let logoFailed = false;

        // Step 2: Overlay logo if requested (using canvas-based overlay for speed)
        if (includeLogo && logoUrl) {
          setProgress(prev => ({ ...prev, [channel]: 'overlaying' }));
          
          const { data: overlayData, error: overlayError } = await supabase.functions.invoke('overlay-logo-canvas', {
            body: {
              baseImageUrl: finalImageUrl,
              logoUrl,
              position: logoPosition || 'bottom-right',
              // Make logo more visible by default
              logoSizePercent: 18,
              padding: 20,
              contentId,
              channel,
            },
          });

          if (overlayError || !overlayData?.success) {
            console.warn(`[useAutoImageGeneration] Logo overlay failed for ${channel}, using base image:`, overlayError?.message || overlayData?.error);
            logoFailed = true;
            setLogoOverlayFailures(prev => ({ ...prev, [channel]: true }));
            // Show toast notification about logo failure
            toast.warning(`${channel}: Không thể thêm logo, sử dụng ảnh gốc`, {
              description: 'Bạn có thể thử tạo lại để thêm logo',
              duration: 5000,
            });
          } else {
            finalImageUrl = overlayData.imageUrl;
          }
        }

        const result: GeneratedImage = {
          channel,
          imageUrl: finalImageUrl,
          prompt: imageData.prompt,
          generatedAt: new Date().toISOString(),
          aspectRatio: channelAspectRatio,
          logoOverlayFailed: logoFailed,
        };

        setProgress(prev => ({ ...prev, [channel]: 'done' }));
        setGeneratedImages(prev => ({ ...prev, [channel]: result }));

        return result;
      } catch (err) {
        console.error(`[useAutoImageGeneration] Attempt ${attempt + 1} error for ${channel}:`, err);
        
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = 1000 * Math.pow(2, attempt);
          console.log(`[useAutoImageGeneration] Waiting ${delay}ms before retry...`);
          await new Promise(r => setTimeout(r, delay));
        } else {
          setProgress(prev => ({ ...prev, [channel]: 'error' }));
          return null;
        }
      }
    }
    
    return null;
  }, [getAspectRatioForChannel]);

  const generateForChannel = useCallback(async (
    channel: Channel,
    options: AutoGenerateOptions
  ): Promise<GeneratedImage | null> => {
    return generateWithRetry(channel, options, 2);
  }, [generateWithRetry]);

  const generateAllImages = useCallback(async (
    options: AutoGenerateOptions,
    onImageGenerated?: (channel: Channel, image: ChannelImage) => Promise<void>,
    saveImmediately: boolean = true
  ): Promise<{ successful: Channel[]; failed: Channel[] }> => {
    const { channels } = options;
    
    setGeneratingChannels(channels);
    setError(null);
    setGeneratedImages({} as Record<Channel, GeneratedImage>);
    setPreviewMode(!saveImmediately);
    setLogoOverlayFailures({} as Record<Channel, boolean>);
    setProgressTimes({} as Record<Channel, number>);
    
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
          
          // Only save immediately if not in preview mode
          if (saveImmediately && onImageGenerated) {
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
    if (successful.length > 0 && saveImmediately) {
      toast.success(`Đã tạo ảnh cho ${successful.length} kênh thành công!`);
    }

    return { successful, failed };
  }, [generateForChannel]);

  const regenerateForChannel = useCallback(async (
    channel: Channel,
    options: AutoGenerateOptions,
    onImageGenerated?: (channel: Channel, image: ChannelImage) => Promise<void>
  ): Promise<GeneratedImage | null> => {
    const result = await generateForChannel(channel, options);
    
    if (result && onImageGenerated) {
      try {
        await onImageGenerated(channel, {
          url: result.imageUrl,
          prompt: result.prompt,
          provider: 'lovable-ai',
          generatedAt: result.generatedAt,
        });
        toast.success(`Đã tạo lại ảnh cho ${channel} thành công!`);
      } catch (saveErr) {
        console.error(`[useAutoImageGeneration] Failed to save regenerated image for ${channel}:`, saveErr);
        toast.error(`Không thể lưu ảnh cho ${channel}`);
      }
    }
    
    return result;
  }, [generateForChannel]);

  const savePreviewImages = useCallback(async (
    channels: Channel[],
    onImageGenerated: (channel: Channel, image: ChannelImage) => Promise<void>
  ) => {
    let savedCount = 0;
    
    for (const channel of channels) {
      const image = generatedImages[channel];
      if (image) {
        try {
          await onImageGenerated(channel, {
            url: image.imageUrl,
            prompt: image.prompt,
            provider: 'lovable-ai',
            generatedAt: image.generatedAt,
          });
          savedCount++;
        } catch (err) {
          console.error(`[useAutoImageGeneration] Failed to save ${channel}:`, err);
        }
      }
    }
    
    if (savedCount > 0) {
      toast.success(`Đã lưu ${savedCount} ảnh thành công!`);
    }
    
    setPreviewMode(false);
  }, [generatedImages]);

  const resetProgress = useCallback(() => {
    setProgress({} as Record<Channel, ImageGenerationStatus>);
    setProgressTimes({} as Record<Channel, number>);
    setLogoOverlayFailures({} as Record<Channel, boolean>);
    setGeneratedImages({} as Record<Channel, GeneratedImage>);
    setError(null);
    setGeneratingChannels([]);
    setPreviewMode(false);
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
    progressTimes,
    logoOverlayFailures,
    generatedImages,
    error,
    completedCount,
    totalCount,
    previewMode,
    generateAllImages,
    regenerateForChannel,
    savePreviewImages,
    resetProgress,
    getAspectRatioForChannel,
  };
}
