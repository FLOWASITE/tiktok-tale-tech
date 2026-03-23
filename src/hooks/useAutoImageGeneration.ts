import { useState, useCallback } from 'react';
import { Channel, ChannelImage } from '@/types/multichannel';
import { invokeWithTimeout } from '@/lib/invokeEdgeFunctionWithTimeout';
import { toast } from 'sonner';

export type ImageGenerationStatus = 'pending' | 'generating' | 'overlaying' | 'done' | 'error';
export type LogoPosition = 
  | 'auto'
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

// Auto-select optimal logo position based on channel & aspect ratio
export function autoSelectLogoPosition(
  channel: Channel,
  aspectRatio?: AspectRatioOption
): Exclude<LogoPosition, 'auto'> {
  // TikTok 9:16: top-right (avoid avatar on left, safe zone at bottom)
  if (channel === 'tiktok') return 'top-right';
  // YouTube 16:9: top-left (traditional placement)
  if (channel === 'youtube') return 'top-left';
  // Zalo OA (25:16 banner): bottom-right
  if (channel === 'zalo_oa') return 'bottom-right';
  // Instagram/Threads (1:1): bottom-right
  if (channel === 'instagram' || channel === 'threads') return 'bottom-right';
  // Facebook/LinkedIn (16:9): bottom-right
  if (channel === 'facebook' || channel === 'linkedin') return 'bottom-right';
  // Default
  return 'bottom-right';
}
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
  typographyStyle?: 'modern' | 'classic' | 'bold' | 'minimal' | 'clean' | 'outline' | 'glow';
  // Canvas fallback: overlay text programmatically for 100% accuracy
  useCanvasFallback?: boolean;
  // Prompt mode: full | brand_only | raw
  promptMode?: 'full' | 'brand_only' | 'raw';
  // Structured overlay for complex infographic layouts
  structuredOverlay?: {
    layout: 'banner_cards' | 'hero_text' | 'simple' | 'split' | 'stack';
    elements: {
      banner?: { text: string; bgColor: string; position: 'top' | 'bottom' };
      heroText?: { text: string; fontSize: 'xl' | '2xl' | '3xl'; effect: 'none' | 'gradient' };
      cards?: { items: { icon?: string; label: string; number?: number }[]; layout: 'grid-2x2' | 'horizontal' | 'vertical' };
      headline?: string;
      cta?: string;
      summaryRibbon?: { text: string; bgColor?: string };
    };
    colors: { primary: string; secondary: string; text: string };
  };
  // Overlay mode: 'satori' (default, programmatic) or 'ai_render' (AI renders text directly)
  overlayMode?: 'satori' | 'ai_render';
  // Template ID for AI layout guidance in ai_render mode
  structuredTemplate?: string;
}

export interface GeneratedImage {
  channel: Channel;
  imageUrl: string;
  prompt: string;
  generatedAt: string;
  aspectRatio: string;
  logoOverlayFailed?: boolean;
  modelUsed?: string;
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
  // OPTIMIZATION: Reduced maxRetries from 2 to 1 (server already retries internally)
  const generateWithRetry = useCallback(async (
    channel: Channel,
    options: AutoGenerateOptions,
    maxRetries = 1
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
      // Prompt mode
      promptMode,
      // Structured overlay for complex layouts
      structuredOverlay,
    } = options;
    
    // Resolve 'auto' logo position to channel-specific optimal position
    const resolvedLogoPosition = logoPosition === 'auto' ? autoSelectLogoPosition(channel, aspectRatio) : (logoPosition || 'bottom-right');
    
    const channelAspectRatio = getAspectRatioForChannel(channel, aspectRatio);
    
    // Get hook for this specific channel
    const channelHook = hookMessages?.[channel];
    
    // Get text for this specific channel: prioritize channel-specific, fallback to shared
    const channelText = textsPerChannel?.[channel] || textToInclude;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[Pipeline:${channel}] 🔄 Retry attempt ${attempt}/${maxRetries}`);
        }
        
        // Set status and track start time
        const startTime = Date.now();
        setProgress(prev => ({ ...prev, [channel]: 'generating' }));
        setProgressTimes(prev => ({ ...prev, [channel]: startTime }));
        
        // Determine rendering mode — default to ai_render (AI renders text directly)
        const overlayMode = options.overlayMode || 'ai_render';
        const isAiRenderMode = overlayMode === 'ai_render';
        const effectiveContentType = isAiRenderMode 
          ? (imageContentType || 'with_text')
          : (structuredOverlay ? 'background_only' : (useCanvasFallback ? 'background_only' : imageContentType));
        
        console.log(`[Pipeline:${channel}] ▶ STEP 1/4 — Generate base image`, {
          aspectRatio: channelAspectRatio,
          style: imageStylePreset || 'default',
          role: contentRole || 'none',
          overlayMode,
          isAiRenderMode,
          effectiveContentType,
          promptMode: promptMode || 'full',
          hasStructuredOverlay: !!structuredOverlay,
          hasStructuredTemplate: !!options.structuredTemplate,
        });

        // OPTIMIZATION: Early timeout warning — notify user if AI is slow
        const slowWarningTimer = setTimeout(() => {
          toast.info(`${channel}: AI đang xử lý lâu hơn bình thường...`, {
            description: 'Vui lòng đợi thêm, không cần tải lại trang',
            duration: 15000,
          });
        }, 60_000);

        const { data: imageData, error: imageError } = await invokeWithTimeout<any>('generate-brand-image', {
          body: {
            contentId,
            channel,
            contentSummary: contentSummaries[channel] || `Content for ${channel}`,
            brandTemplateId,
            aspectRatio: channelAspectRatio,
            imageStylePreset,
            negativePrompt,
            contentRole,
            contentAngle,
            hookMessage: channelHook?.hookMessage,
            hookType: channelHook?.hookType,
            imageContentType: effectiveContentType,
            textToInclude: effectiveContentType === 'with_text' ? channelText : undefined,
            textPosition: effectiveContentType === 'with_text' ? textPosition : undefined,
            typographyStyle: effectiveContentType === 'with_text' ? typographyStyle : undefined,
            promptMode,
            // AI Render mode: pass structured elements for AI to render text directly
            structuredElements: isAiRenderMode && structuredOverlay ? structuredOverlay.elements : undefined,
            structuredColors: isAiRenderMode && structuredOverlay ? structuredOverlay.colors : undefined,
            // Template ID for AI layout guidance
            structuredTemplate: isAiRenderMode ? options.structuredTemplate : undefined,
            // Logo safe zone: tell AI to keep logo area clear
            logoSafeZone: includeLogo && logoUrl ? {
              position: resolvedLogoPosition,
              sizePercent: logoSizePercent || 15,
            } : undefined,
          },
          timeoutMs: 120_000,
        });

        clearTimeout(slowWarningTimer);
        const step1Duration = Date.now() - startTime;

        if (imageError || !imageData?.success) {
          console.error(`[Pipeline:${channel}] ✗ STEP 1 FAILED (${step1Duration}ms):`, imageError || imageData?.error);
          throw new Error(imageData?.error || imageError?.message || 'Failed to generate image');
        }
        
        console.log(`[Pipeline:${channel}] ✓ STEP 1 OK (${step1Duration}ms)`, {
          model: imageData.modelUsed || 'unknown',
          imageUrlLength: imageData.imageUrl?.length || 0,
        });

        let finalImageUrl = imageData.imageUrl;
        let logoFailed = false;
        const modelUsed: string = imageData.modelUsed || '';

        // Detect fallback and show warning toast
        if (modelUsed.includes('(fallback from')) {
          const fallbackMatch = modelUsed.match(/^(.+?)\s*\(fallback from (.+?)\)$/);
          if (fallbackMatch) {
            toast.warning(`${channel}: Model "${fallbackMatch[2]}" thất bại`, {
              description: `Đã dùng "${fallbackMatch[1]}" thay thế`,
              duration: 8000,
            });
          }
        }
        // Step 2: Logo overlay EARLY — logo becomes part of background before text/SVG overlay
        if (includeLogo && logoUrl) {
          const step2Start = Date.now();
          console.log(`[Pipeline:${channel}] ▶ STEP 2/4 — Logo overlay`, {
            position: resolvedLogoPosition,
            style: logoStyle || 'shadow',
            sizePercent: logoSizePercent || 15,
          });
          setProgress(prev => ({ ...prev, [channel]: 'overlaying' }));
          
          const { data: overlayData, error: overlayError } = await invokeWithTimeout<any>('overlay-logo-canvas', {
            body: {
              baseImageUrl: finalImageUrl,
              logoUrl,
              position: resolvedLogoPosition,
              logoStyle: logoStyle || 'shadow',
              logoSizePercent: logoSizePercent || 15,
              logoOpacity: logoOpacity || 100,
              padding: 20,
              contentId,
              channel,
            },
            timeoutMs: 30_000,
          });

          const step2Duration = Date.now() - step2Start;
          if (overlayError || !overlayData?.success) {
            console.warn(`[Pipeline:${channel}] ✗ STEP 2 FAILED (${step2Duration}ms):`, overlayError?.message || overlayData?.error);
            logoFailed = true;
            setLogoOverlayFailures(prev => ({ ...prev, [channel]: true }));
            toast.warning(`${channel}: Không thể thêm logo, sử dụng ảnh gốc`, {
              description: 'Bạn có thể thử tạo lại để thêm logo',
              duration: 5000,
            });
          } else {
            finalImageUrl = overlayData.imageUrl;
            console.log(`[Pipeline:${channel}] ✓ STEP 2 OK (${step2Duration}ms)`);
          }
        } else {
          console.log(`[Pipeline:${channel}] ⏭ STEP 2 SKIPPED — no logo configured`);
        }

        // Step 3: Overlay text using canvas if useCanvasFallback is enabled
        // Skip if structuredOverlay is active (Step 4 handles text rendering)
        // Skip entirely in ai_render mode (AI already rendered text)
        if (useCanvasFallback && imageContentType === 'with_text' && channelText && !structuredOverlay && !isAiRenderMode) {
          const step3Start = Date.now();
          console.log(`[Pipeline:${channel}] ▶ STEP 3/4 — Canvas text overlay`, {
            textLength: channelText.length,
            position: textPosition || 'center',
            typography: typographyStyle || 'modern',
          });
          
          const channelConfig = CHANNEL_IMAGE_CONFIG[channel];
          const [widthStr, heightStr] = channelConfig.size.split('x');
          const imageWidth = parseInt(widthStr, 10) || 1200;
          const imageHeight = parseInt(heightStr, 10) || 630;
          
          const { data: textData, error: textError } = await invokeWithTimeout<any>('overlay-text-canvas', {
            body: {
              baseImageUrl: finalImageUrl,
              text: channelText,
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
            timeoutMs: 30_000,
          });

          const step3Duration = Date.now() - step3Start;
          if (textError || !textData?.success) {
            console.warn(`[Pipeline:${channel}] ✗ STEP 3 FAILED (${step3Duration}ms):`, textError?.message || textData?.error);
            toast.warning(`${channel}: Text overlay thất bại, sử dụng ảnh gốc`, {
              description: 'AI không thể render text chính xác',
              duration: 5000,
            });
          } else {
            finalImageUrl = textData.imageUrl;
            console.log(`[Pipeline:${channel}] ✓ STEP 3 OK (${step3Duration}ms)`);
          }
        } else {
          const skipReason = isAiRenderMode ? 'ai_render mode' : structuredOverlay ? 'structured overlay active' : !useCanvasFallback ? 'canvas fallback disabled' : 'no text';
          console.log(`[Pipeline:${channel}] ⏭ STEP 3 SKIPPED — ${skipReason}`);
        }

        // Step 4: Structured multi-block overlay (for complex infographics)
        // Skip in ai_render mode (AI already rendered text directly)
        if (structuredOverlay && !isAiRenderMode) {
          const step4Start = Date.now();
          console.log(`[Pipeline:${channel}] ▶ STEP 4/4 — Structured overlay (Satori)`, {
            layout: structuredOverlay.layout,
            hasBanner: !!structuredOverlay.elements.banner,
            hasHeroText: !!structuredOverlay.elements.heroText,
            cardCount: structuredOverlay.elements.cards?.items?.length || 0,
            hasCta: !!structuredOverlay.elements.cta,
            hasLogoMeta: includeLogo && logoUrl && !logoFailed,
          });
          
          const channelConfig = CHANNEL_IMAGE_CONFIG[channel];
          const [widthStr, heightStr] = channelConfig.size.split('x');
          const imgW = parseInt(widthStr, 10) || 1200;
          const imgH = parseInt(heightStr, 10) || 630;

          const { data: structData, error: structError } = await invokeWithTimeout<any>('overlay-text-canvas', {
            body: {
              baseImageUrl: finalImageUrl,
              layout: structuredOverlay.layout,
              elements: structuredOverlay.elements,
              colors: structuredOverlay.colors,
              imageStyle: imageStylePreset,
              imageWidth: imgW,
              imageHeight: imgH,
              contentId,
              channel,
              logoMeta: (includeLogo && logoUrl && !logoFailed) ? {
                position: resolvedLogoPosition,
                sizePercent: logoSizePercent || 15,
                padding: 20,
              } : undefined,
            },
            timeoutMs: 30_000,
          });

          const step4Duration = Date.now() - step4Start;
          if (structError || !structData?.success) {
            console.warn(`[Pipeline:${channel}] ✗ STEP 4 FAILED (${step4Duration}ms):`, structError?.message || structData?.error);
            toast.warning(`${channel}: Structured overlay thất bại`, { duration: 5000 });
          } else {
            finalImageUrl = structData.imageUrl;
            console.log(`[Pipeline:${channel}] ✓ STEP 4 OK (${step4Duration}ms)`);
          }
        } else {
          const skipReason = isAiRenderMode ? 'ai_render mode (text baked in)' : 'no structured overlay';
          console.log(`[Pipeline:${channel}] ⏭ STEP 4 SKIPPED — ${skipReason}`);
        }

        // Finalize
        const totalDuration = Date.now() - startTime;
        console.log(`[Pipeline:${channel}] ✅ COMPLETE (${totalDuration}ms total)`, {
          logoFailed,
          model: modelUsed,
        });

        const result: GeneratedImage = {
          channel,
          imageUrl: finalImageUrl,
          prompt: imageData.prompt,
          generatedAt: new Date().toISOString(),
          aspectRatio: channelAspectRatio,
          logoOverlayFailed: logoFailed,
          modelUsed,
        };

        setProgress(prev => ({ ...prev, [channel]: 'done' }));
        setGeneratedImages(prev => ({ ...prev, [channel]: result }));

        return result;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[Pipeline:${channel}] ✗ Attempt ${attempt + 1}/${maxRetries + 1} FAILED:`, errMsg);
        
        if (attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt);
          console.log(`[Pipeline:${channel}] ⏳ Waiting ${delay}ms before retry...`);
          await new Promise(r => setTimeout(r, delay));
        } else {
          console.error(`[Pipeline:${channel}] ❌ ALL ATTEMPTS EXHAUSTED — marking as error`);
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
    return generateWithRetry(channel, options, 1);
  }, [generateWithRetry]);

  // OPTIMIZATION: Increased batch sizes for better parallelism
  const getBatchSize = useCallback((totalChannels: number): number => {
    // 1 channel: sequential
    if (totalChannels <= 1) return 1;
    // 2-3 channels: batch of 2 (was 1, saves ~30-40% time)
    if (totalChannels <= 3) return 2;
    // 4-6 channels: batch of 3 (was 2)
    if (totalChannels <= 6) return 3;
    // 7+ channels: batch of 3
    return 3;
  }, []);

  // Get delay between batches based on batch size
  const getBatchDelay = useCallback((batchSize: number): number => {
    if (batchSize <= 1) return 300;
    if (batchSize === 2) return 500;
    return 1000;
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
    const pipelineStart = Date.now();
    
    console.log(`[Pipeline] 🚀 START — ${channels.length} channels, batch size ${batchSize}, delay ${batchDelay}ms`, {
      channels,
      contentId: options.contentId,
      promptMode: options.promptMode || 'full',
      overlayMode: options.overlayMode || 'satori',
      hasStructuredOverlay: !!options.structuredOverlay,
      includeLogo: !!options.includeLogo,
      style: options.imageStylePreset || 'default',
    });
    
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
    const pipelineDuration = Date.now() - pipelineStart;

    console.log(`[Pipeline] 🏁 FINISHED (${pipelineDuration}ms total)`, {
      successful: successful.length,
      failed: failed.length,
      channels: { successful, failed },
    });

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
