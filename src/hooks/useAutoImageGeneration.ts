import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Channel, ChannelImage } from '@/types/multichannel';
import { toast } from 'sonner';

export type ImageGenerationStatus = 'pending' | 'generating' | 'overlaying' | 'done' | 'error';
export type LogoPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';
export type AspectRatioOption = '16:9' | '1:1' | '9:16' | '4:5' | 'auto';
export type LogoStyle = 'clean' | 'shadow' | 'glass' | 'pill' | 'outline' | 'subtle';

// Import from shared config - single source of truth
import { CHANNEL_OPTIMAL_ASPECT_RATIO, CHANNEL_IMAGE_CONFIG } from '@/config/channelImageConfig';

// Re-export for backward compatibility
export { CHANNEL_OPTIMAL_ASPECT_RATIO };

export type ImageStylePreset = 'photorealistic' | 'illustration' | 'minimalist' | '3d_render' | 'flat_design' | 'watercolor' | 'cinematic' | 'abstract' | 'geometric' | 'isometric' | 'gradient' | 'product_only';

export interface AutoGenerateOptions {
  contentId: string;
  brandTemplateId: string;
  channels: Channel[];
  contentSummaries: Record<Channel, string>;
  includeLogo?: boolean;
  logoPosition?: LogoPosition;
  logoUrl?: string;
  logoStyle?: LogoStyle;
  logoSizePercent?: number; // 5-30%
  logoOpacity?: number; // 30-100%
  aspectRatio?: AspectRatioOption;
  imageStylePreset?: ImageStylePreset;
  negativePrompt?: string;
  // Strategic content context for more relevant images
  contentRole?: 'seed' | 'sprout' | 'harvest';
  contentAngle?: string;
  hookMessages?: Record<Channel, { hookMessage?: string; hookType?: string }>;
  // Social Graphics (text-in-image) params for batch mode
  imageContentType?: 'background_only' | 'with_text';
  textToInclude?: string; // Shared text for all channels
  textsPerChannel?: Record<Channel, string>; // NEW: Channel-specific texts
  textPosition?: 'center' | 'top' | 'bottom' | 'top-left' | 'bottom-right';
  typographyStyle?: 'modern' | 'classic' | 'bold' | 'minimal';
  // Canvas fallback: overlay text programmatically for 100% accuracy
  useCanvasFallback?: boolean;
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
      const optimal = CHANNEL_OPTIMAL_ASPECT_RATIO[channel];
      // Cast string to specific type with fallback
      if (optimal === '16:9' || optimal === '1:1' || optimal === '9:16' || optimal === '4:5') {
        return optimal;
      }
      return '16:9';
    }
    return aspectRatio;
  }, []);

  // Generate with retry logic and exponential backoff
  const generateWithRetry = useCallback(async (
    channel: Channel,
    options: AutoGenerateOptions,
    maxRetries = 2
  ): Promise<GeneratedImage | null> => {
    const { 
      contentId, brandTemplateId, contentSummaries, includeLogo, logoPosition, logoUrl,
      logoStyle = 'shadow', logoSizePercent = 15, logoOpacity = 100,
      aspectRatio = '16:9', imageStylePreset, negativePrompt,
      // Strategic context for more relevant images
      contentRole, contentAngle, hookMessages,
      // Social Graphics (text-in-image) params
      imageContentType, textToInclude, textsPerChannel, textPosition, typographyStyle,
      // Canvas fallback for 100% accurate text
      useCanvasFallback,
    } = options;
    
    const channelAspectRatio = getAspectRatioForChannel(channel, aspectRatio);
    
    // Get hook for this specific channel
    const channelHook = hookMessages?.[channel];
    
    // Get text for this specific channel: prioritize channel-specific, fallback to shared
    const channelText = textsPerChannel?.[channel] || textToInclude;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[useAutoImageGeneration] Retry attempt ${attempt} for ${channel}`);
        }
        
        // Set status and track start time
        const startTime = Date.now();
        setProgress(prev => ({ ...prev, [channel]: 'generating' }));
        setProgressTimes(prev => ({ ...prev, [channel]: startTime }));
        
        console.log(`[useAutoImageGeneration] Generating image for ${channel} with aspect ratio ${channelAspectRatio}, style: ${imageStylePreset || 'default'}, role: ${contentRole || 'none'}`);

        // Step 1: Generate base image with brand colors, style preset, and strategic context
        // If using canvas fallback, always generate background_only and add text later
        const effectiveContentType = useCanvasFallback ? 'background_only' : imageContentType;
        
        const { data: imageData, error: imageError } = await supabase.functions.invoke('generate-brand-image', {
          body: {
            contentId,
            channel,
            contentSummary: contentSummaries[channel] || `Content for ${channel}`,
            brandTemplateId,
            aspectRatio: channelAspectRatio,
            imageStylePreset,
            negativePrompt,
            // Strategic context for content-aware generation
            contentRole,
            contentAngle,
            hookMessage: channelHook?.hookMessage,
            hookType: channelHook?.hookType,
            // Social Graphics (text-in-image) params - use effective type and channel-specific text
            imageContentType: effectiveContentType,
            textToInclude: effectiveContentType === 'with_text' ? channelText : undefined,
            textPosition: effectiveContentType === 'with_text' ? textPosition : undefined,
            typographyStyle: effectiveContentType === 'with_text' ? typographyStyle : undefined,
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
              logoStyle: logoStyle || 'shadow',
              logoSizePercent: logoSizePercent || 15,
              logoOpacity: logoOpacity || 100,
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

        // Step 3: Overlay text using canvas if useCanvasFallback is enabled
        if (useCanvasFallback && imageContentType === 'with_text' && channelText) {
          console.log(`[useAutoImageGeneration] Applying canvas text overlay for ${channel}`);
          
          // Parse dimensions from channel config
          const channelConfig = CHANNEL_IMAGE_CONFIG[channel];
          const [widthStr, heightStr] = channelConfig.size.split('x');
          const imageWidth = parseInt(widthStr, 10) || 1200;
          const imageHeight = parseInt(heightStr, 10) || 630;
          
          const { data: textData, error: textError } = await supabase.functions.invoke('overlay-text-canvas', {
            body: {
              baseImageUrl: finalImageUrl,
              text: channelText, // Use channel-specific text
              position: textPosition || 'center',
              typographyStyle: typographyStyle || 'modern',
              textColor: '#FFFFFF',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              padding: 40,
              contentId,
              channel,
              imageWidth,
              imageHeight,
            },
          });

          if (textError || !textData?.success) {
            console.warn(`[useAutoImageGeneration] Canvas text overlay failed for ${channel}:`, textError?.message || textData?.error);
            toast.warning(`${channel}: Text overlay thất bại, sử dụng ảnh gốc`, {
              description: 'AI không thể render text chính xác',
              duration: 5000,
            });
          } else {
            finalImageUrl = textData.imageUrl;
            console.log(`[useAutoImageGeneration] Canvas text overlay success for ${channel}`);
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

  // Dynamic batch size based on number of channels
  const getBatchSize = useCallback((totalChannels: number): number => {
    // 1-3 channels: sequential (batch of 1) for better reliability
    if (totalChannels <= 3) return 1;
    // 4-6 channels: batch of 2
    if (totalChannels <= 6) return 2;
    // 7+ channels: batch of 3 (more aggressive batching)
    return 3;
  }, []);

  // Get delay between batches based on batch size
  const getBatchDelay = useCallback((batchSize: number): number => {
    // Larger batches need longer delays to avoid rate limits
    if (batchSize === 1) return 500;
    if (batchSize === 2) return 1000;
    return 1500;
  }, []);

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

    // Dynamic batch size based on total channels
    const batchSize = getBatchSize(channels.length);
    const batchDelay = getBatchDelay(batchSize);
    
    console.log(`[useAutoImageGeneration] Processing ${channels.length} channels with batch size ${batchSize}`);
    
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

      // Dynamic delay between batches
      if (i + batchSize < channels.length) {
        await new Promise(resolve => setTimeout(resolve, batchDelay));
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

  // Update a single generated image (e.g., after background editing)
  const updateGeneratedImage = useCallback((
    channel: Channel, 
    updates: Partial<GeneratedImage>
  ) => {
    setGeneratedImages(prev => {
      if (!prev[channel]) return prev;
      return {
        ...prev,
        [channel]: {
          ...prev[channel],
          ...updates,
        }
      };
    });
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
    updateGeneratedImage,
    getAspectRatioForChannel,
  };
}
