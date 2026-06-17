import { useState, useCallback } from 'react';
import { Channel, ChannelImage } from '@/types/multichannel';
import { invokeWithTimeout } from '@/lib/invokeEdgeFunctionWithTimeout';
import { IMAGE_GENERATION_TIMEOUT_MS } from '@/lib/imageGenerationConfig';
import { createImageGenerationTask } from '@/lib/imageGenerationTasks';
import { isRecoverableBrandImageError, waitForRecoveredBrandImage } from '@/lib/recoverGeneratedBrandImage';
import { parseEdgeFunctionError } from '@/lib/edgeFunctionErrors';
import { detectOverlayTextLanguage, doesOverlayTextMatchBrandLanguage, isValidOverlayText, type OverlayTextDetectedLanguage, type OverlayTextSource } from '@/lib/imageOverlayText';
import { isTrustedTextBakingModel } from '@/lib/trustedTextBakingModels';
import { toast } from 'sonner';
import { getUILanguageFromCountry } from '@/utils/countryLanguageMap';

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
export type AspectRatioOption = '16:9' | '1:1' | '9:16' | '4:5' | '2:3' | 'auto';
export type LogoStyle = 'clean' | 'shadow' | 'glass' | 'pill' | 'outline' | 'subtle';

function isNonRetryableImageError(errorCode?: string, message?: string): boolean {
  return (
    errorCode === 'CREDITS_EXHAUSTED' ||
    errorCode === 'RATE_LIMIT' ||
    errorCode === 'ALL_PROVIDERS_DOWN' ||
    errorCode === 'IDLE_TIMEOUT' ||
    /CREDITS_EXHAUSTED|RATE_LIMIT|ALL_PROVIDERS_DOWN|IDLE_TIMEOUT|idle timeout|504|402|429/i.test(message || '')
  );
}

// Import from shared config - single source of truth
import { CHANNEL_OPTIMAL_ASPECT_RATIO, CHANNEL_IMAGE_CONFIG } from '@/config/channelImageConfig';

// Re-export for backward compatibility
export { CHANNEL_OPTIMAL_ASPECT_RATIO };

export type ImageStylePreset = 'photorealistic' | 'illustration' | 'minimalist' | '3d_render' | 'flat_design' | 'watercolor' | 'cinematic' | 'abstract' | 'geometric' | 'isometric' | 'gradient' | 'product_only';

export interface AutoGenerateOptions {
  contentId: string;
  brandTemplateId: string;
  /** Organization the task belongs to — used for generation_tasks tracking */
  organizationId?: string;
  channels: Channel[];
  contentSummaries: Record<Channel, string>;
  brandCountryCode?: string;
  includeLogo?: boolean;
  logoPosition?: LogoPosition;
  logoUrl?: string;
  logoStyle?: LogoStyle;
  logoSizePercent?: number; // 5-30%
  logoOpacity?: number; // 30-100%
  aspectRatio?: AspectRatioOption;
  imageStylePreset?: ImageStylePreset;
  /** Per-channel style override — falls back to imageStylePreset when missing */
  imageStylePresetPerChannel?: Record<Channel, ImageStylePreset>;
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
  fullStructuredOverlay?: {
    layout: 'banner_cards' | 'hero_text' | 'simple' | 'split' | 'stack';
    elements: {
      banner?: { text: string; bgColor: string; position: 'top' | 'bottom' };
      heroText?: { text: string; fontSize: 'xl' | '2xl' | '3xl'; effect: 'none' | 'gradient' };
      cards?: { items: { icon?: string; label: string; number?: number }[]; layout: 'grid-2x2' | 'horizontal' | 'vertical' };
      headline?: string;
      cta?: string;
      footer?: { items: { icon?: string; text: string }[] };
      summaryRibbon?: { text: string; bgColor?: string };
    };
    colors: { primary: string; secondary: string; text: string };
  };
  footerOverlay?: {
    layout: 'simple' | 'stack';
    footerMode?: 'auto' | 'single-row' | 'two-row' | 'vertical-compact';
    elements: {
      footer: {
        items: { icon?: string; text: string }[];
      };
    };
    colors: { primary: string; secondary: string; text: string };
  };
  // Overlay mode: 'satori' (default, programmatic) or 'ai_render' (AI renders text directly)
  overlayMode?: 'satori' | 'ai_render';
  fallbackStrategy?: 'none' | 'text_only' | 'structured' | 'full';
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
  promptMode?: 'full' | 'brand_only' | 'raw';
  renderDebug?: RenderDebugInfo;
}

export type RenderDebugStepStatus = 'success' | 'failed' | 'skipped';

export interface RenderDebugStep {
  id: 'step1' | 'step2' | 'step3' | 'step4';
  label: string;
  status: RenderDebugStepStatus;
  summary: string;
  durationMs?: number;
  details?: string[];
}

export interface RenderDebugProviderInfo {
  provider?: string;
  fallbackProvider?: string;
  fallbackTried?: boolean;
  providerTimeout?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export interface RenderDebugInfo {
  overlayMode: 'satori' | 'ai_render';
  fallbackStrategy: 'none' | 'text_only' | 'structured' | 'full';
  recommendedOverlayMode?: string;
  providerInfo?: RenderDebugProviderInfo;
  backendRequestedFallback: boolean;
  fallbackReason: string;
  shouldFallbackText: boolean;
  shouldFallbackStructured: boolean;
  requiredBranding: {
    logo: boolean;
    footer: boolean;
    text: boolean;
    structured: boolean;
  };
  payloadPresence: {
    structuredOverlay: boolean;
    fullStructuredOverlay: boolean;
    footerOverlay: boolean;
    textsPerChannel: boolean;
  };
  overlayText: {
    source: OverlayTextSource;
    length: number;
    mode: 'with_text' | 'background_only';
    detectedLanguage?: OverlayTextDetectedLanguage;
    brandLanguage?: string;
    languageMatch: boolean;
    suppressedBecauseTooLong: boolean;
    reason?: string;
  };
  finalPath: 'ai_only' | 'logo_only' | 'text_fallback' | 'structured_fallback' | 'text_and_structured_fallback' | 'satori_forced';
  steps: RenderDebugStep[];
  generatedAt: string;
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

  const getAspectRatioForChannel = useCallback((channel: Channel, aspectRatio: AspectRatioOption): '16:9' | '1:1' | '9:16' | '4:5' | '2:3' => {
    if (aspectRatio === 'auto') {
      const optimal = CHANNEL_OPTIMAL_ASPECT_RATIO[channel];
      // Cast string to specific type with fallback
      if (optimal === '16:9' || optimal === '1:1' || optimal === '9:16' || optimal === '4:5' || optimal === '2:3') {
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
      contentId, brandTemplateId, contentSummaries, brandCountryCode, includeLogo, logoPosition, logoUrl,
      logoStyle = 'shadow', logoSizePercent = 15, logoOpacity = 100,
      aspectRatio = '16:9', imageStylePreset: imageStylePresetGlobal, imageStylePresetPerChannel, negativePrompt,
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
      fullStructuredOverlay,
      footerOverlay,
      fallbackStrategy = 'full',
    } = options;

    // ⚠️ Hard guard: includeLogo=true nhưng logoUrl rỗng → cảnh báo rõ ràng thay vì skip âm thầm
    if (includeLogo && !logoUrl) {
      console.error(`[Pipeline:${channel}] ⚠ includeLogo=true nhưng logoUrl rỗng`, {
        includeLogo, logoUrl, brandTemplateId, contentId,
      });
      toast.warning('Đã bật "Thêm logo" nhưng brand chưa có logo', {
        description: 'Vui lòng upload logo trong trang Brand, hoặc tắt tuỳ chọn này.',
        duration: 7000,
      });
    }

    // Resolve 'auto' logo position to channel-specific optimal position
    const resolvedLogoPosition = logoPosition === 'auto' ? autoSelectLogoPosition(channel, aspectRatio) : (logoPosition || 'bottom-right');
    
    const channelAspectRatio = getAspectRatioForChannel(channel, aspectRatio);
    
    // Get hook for this specific channel
    const channelHook = hookMessages?.[channel];
    
    // Get text for this specific channel: prioritize channel-specific, fallback to shared
    const rawChannelText = textsPerChannel?.[channel] || textToInclude;
    const brandLanguage = getUILanguageFromCountry(brandCountryCode);
    const overlayTextSource: OverlayTextSource = textsPerChannel?.[channel] ? 'text_overlay' : textToInclude ? 'opening_line' : 'suppressed';
    const overlayTextLength = rawChannelText?.trim().length || 0;
    const detectedLanguage = detectOverlayTextLanguage(rawChannelText);
    const languageMatch = !!rawChannelText && doesOverlayTextMatchBrandLanguage(rawChannelText, brandLanguage);
    const textSuppressedBecauseTooLong = !!rawChannelText && !isValidOverlayText(rawChannelText);
    const textSuppressedBecauseLanguageMismatch = !!rawChannelText && !languageMatch;
    const channelText = textSuppressedBecauseTooLong || textSuppressedBecauseLanguageMismatch ? undefined : rawChannelText;
    let lastDebugSteps: RenderDebugStep[] = [];

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
        const debugSteps: RenderDebugStep[] = [];
        lastDebugSteps = debugSteps;
        const effectiveContentType = isAiRenderMode 
          ? ((imageContentType === 'with_text' && channelText) ? 'with_text' : 'background_only')
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
          hasFullStructuredOverlay: !!fullStructuredOverlay,
          hasStructuredTemplate: !!options.structuredTemplate,
        });

        // OPTIMIZATION: Early timeout warning — notify user if AI is slow
        const slowWarningTimer = setTimeout(() => {
          toast.info(`${channel}: AI đang xử lý lâu hơn bình thường...`, {
            description: 'Vui lòng đợi thêm, không cần tải lại trang',
            duration: 15000,
          });
        }, 60_000);

        const taskId = await createImageGenerationTask({
          contentId,
          channel,
          brandTemplateId,
          organizationId: options.organizationId,
          source: 'auto',
        });

        if (!taskId) {
          console.warn(`[Pipeline:${channel}] taskId=null — proceeding without background task tracking (likely RLS/network issue creating generation_tasks row)`);
        } else {
          console.log(`[Pipeline:${channel}] ✓ Task created: ${taskId} — invoking generate-brand-image`);
        }

        let { data: imageData, error: imageError } = await invokeWithTimeout<any>('generate-brand-image', {
          body: {
            taskId,
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
          timeoutMs: IMAGE_GENERATION_TIMEOUT_MS,
        });

        clearTimeout(slowWarningTimer);
        const step1Duration = Date.now() - startTime;

        let providerInfo: RenderDebugProviderInfo = {
          provider: imageData?.provider,
          fallbackProvider: imageData?.fallbackProvider,
          fallbackTried: imageData?.fallbackTried,
          providerTimeout: imageData?.providerTimeout,
          errorCode: imageData?.errorCode,
          errorMessage: imageData?.error,
        };

        if (imageError || !imageData?.success) {
          const recoverableErrorMessage = imageError?.message || imageData?.error || '';
          if (contentId && isRecoverableBrandImageError(recoverableErrorMessage)) {
            console.warn(`[Pipeline:${channel}] Attempting recovery from persisted image after request failure...`, recoverableErrorMessage);
            const recovered = await waitForRecoveredBrandImage(contentId, channel, { timeoutMs: 120_000, pollIntervalMs: 3_000 });

            if (recovered?.imageUrl) {
              console.log(`[Pipeline:${channel}] ✓ RECOVERED persisted image from ${recovered.source}`);
              providerInfo = {
                ...providerInfo,
                errorMessage: recoverableErrorMessage,
              };
              debugSteps.push({
                id: 'step1',
                label: 'STEP 1 — AI/base render',
                status: 'success',
                summary: `Request bị cắt nhưng đã khôi phục ảnh đã lưu (${recovered.source})`,
                durationMs: Date.now() - startTime,
                details: [
                  providerInfo.provider ? `provider=${providerInfo.provider}` : null,
                  `recoveredFrom=${recovered.source}`,
                  recoverableErrorMessage,
                ].filter(Boolean) as string[],
              });

              imageData = {
                ...(imageData || {}),
                success: true,
                imageUrl: recovered.imageUrl,
                prompt: imageData?.prompt || recovered.prompt || contentSummaries[channel] || `Content for ${channel}`,
                aspectRatio: imageData?.aspectRatio || recovered.aspectRatio || channelAspectRatio,
                recommendedOverlayMode: imageData?.recommendedOverlayMode,
                fallbackRecommended: imageData?.fallbackRecommended,
                modelUsed: imageData?.modelUsed,
                provider: imageData?.provider || providerInfo.provider,
                providerTimeout: imageData?.providerTimeout || false,
                fallbackTried: imageData?.fallbackTried || false,
                fallbackProvider: imageData?.fallbackProvider || null,
              };
            }
          }
        }

        if (imageError || !imageData?.success) {
          const parsedImageError = parseEdgeFunctionError(imageError, imageData?.error || 'Failed to generate image');
          const effectiveErrorCode = imageData?.errorCode || parsedImageError.code;
          const effectiveErrorMessage = imageData?.error || parsedImageError.message;
          const step1FailureMessage = imageData?.providerTimeout || effectiveErrorCode === 'IDLE_TIMEOUT'
            ? 'Provider tạo ảnh bị timeout'
            : effectiveErrorCode === 'PROVIDER_ERROR'
              ? 'Provider tạo ảnh thất bại'
              : effectiveErrorCode === 'CREDITS_EXHAUSTED'
                ? 'Provider tạo ảnh đã hết credits'
                : effectiveErrorCode === 'ALL_PROVIDERS_DOWN'
                  ? 'Tất cả provider tạo ảnh đang lỗi'
                : imageError?.message || imageData?.error || 'Failed to generate image';

          console.error(`[Pipeline:${channel}] ✗ STEP 1 FAILED (${step1Duration}ms):`, imageError || imageData?.error);
          debugSteps.push({
            id: 'step1',
            label: 'STEP 1 — AI/base render',
            status: 'failed',
            summary: step1FailureMessage,
            durationMs: step1Duration,
            details: [
              providerInfo.provider ? `provider=${providerInfo.provider}` : null,
              providerInfo.providerTimeout ? 'provider timeout=yes' : null,
              providerInfo.fallbackTried !== undefined ? `fallbackTried=${providerInfo.fallbackTried ? 'yes' : 'no'}` : null,
              providerInfo.fallbackProvider ? `fallbackProvider=${providerInfo.fallbackProvider}` : null,
              effectiveErrorCode ? `errorCode=${effectiveErrorCode}` : null,
              effectiveErrorMessage || null,
            ].filter(Boolean) as string[],
          });

          toast.error(`${channel}: ${step1FailureMessage}`, {
            description: providerInfo.fallbackTried
              ? `Provider chính: ${providerInfo.provider || 'unknown'} • fallback: ${providerInfo.fallbackProvider || 'unknown'}`
              : providerInfo.provider || imageData?.error || imageError?.message,
            duration: 7000,
          });

          const errorToThrow = new Error(effectiveErrorMessage || step1FailureMessage);
          (errorToThrow as Error & { errorCode?: string }).errorCode = effectiveErrorCode;
          throw errorToThrow;
        }
        
        console.log(`[Pipeline:${channel}] ✓ STEP 1 OK (${step1Duration}ms)`, {
          model: imageData.modelUsed || 'unknown',
          imageUrlLength: imageData.imageUrl?.length || 0,
          recommendedOverlayMode: imageData.recommendedOverlayMode,
          fallbackRecommended: imageData.fallbackRecommended,
        });
        debugSteps.push({
          id: 'step1',
          label: 'STEP 1 — AI/base render',
          status: 'success',
          summary: isAiRenderMode ? 'AI render primary đã chạy' : 'Base image cho canvas pipeline đã chạy',
          durationMs: step1Duration,
          details: [
            `overlayMode=${overlayMode}`,
            `effectiveContentType=${effectiveContentType}`,
            `recommended=${imageData.recommendedOverlayMode || 'ai_render'}`,
            providerInfo.provider ? `provider=${providerInfo.provider}` : null,
            providerInfo.fallbackTried ? `fallback=${providerInfo.fallbackProvider || 'yes'}` : null,
          ].filter(Boolean) as string[],
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
            debugSteps.push({
              id: 'step2',
              label: 'STEP 2 — Logo overlay',
              status: 'failed',
              summary: 'Canvas logo overlay lỗi, giữ ảnh gốc',
              durationMs: step2Duration,
              details: [overlayError?.message || overlayData?.error || 'unknown error'],
            });
            setLogoOverlayFailures(prev => ({ ...prev, [channel]: true }));
            toast.warning(`${channel}: Không thể thêm logo, sử dụng ảnh gốc`, {
              description: 'Bạn có thể thử tạo lại để thêm logo',
              duration: 5000,
            });
          } else {
            finalImageUrl = overlayData.imageUrl;
            console.log(`[Pipeline:${channel}] ✓ STEP 2 OK (${step2Duration}ms)`);
            debugSteps.push({
              id: 'step2',
              label: 'STEP 2 — Logo overlay',
              status: 'success',
              summary: 'Canvas logo overlay đã chạy',
              durationMs: step2Duration,
              details: [`position=${resolvedLogoPosition}`, `style=${logoStyle || 'shadow'}`],
            });
          }
        } else {
          const skipReason = !includeLogo
            ? 'includeLogo=false (user tắt)'
            : !logoUrl
              ? 'logoUrl rỗng (brand chưa upload logo)'
              : 'unknown';
          console.log(`[Pipeline:${channel}] ⏭ STEP 2 SKIPPED — ${skipReason}`, { includeLogo, logoUrl });
          debugSteps.push({
            id: 'step2',
            label: 'STEP 2 — Logo overlay',
            status: 'skipped',
            summary: `Bỏ qua: ${skipReason}`,
          });
        }

        // Trust check: if AI used a known good text-baking model, ignore
        // backend hint unless it's a hard satori request — avoids unnecessary
        // canvas overlay double-render.
        const trustedModel = isTrustedTextBakingModel(imageData.modelUsed);
        const hardSatori = imageData.recommendedOverlayMode === 'satori';
        const rawBackendFallback = imageData.fallbackRecommended === true || (isAiRenderMode && imageData.recommendedOverlayMode && imageData.recommendedOverlayMode !== 'ai_render');
        const backendRequestedFallback = hardSatori || (rawBackendFallback && !trustedModel);
        const hasFallbackFooter = !!footerOverlay?.elements?.footer?.items?.length;
        const hasStructuredInput = !!(fullStructuredOverlay || structuredOverlay || footerOverlay);
        const hasChannelSpecificText = !!textsPerChannel?.[channel]?.trim();
        const requiredBranding = {
          logo: !!(includeLogo && logoUrl),
          footer: hasFallbackFooter,
          text: effectiveContentType === 'with_text' && !!channelText,
          structured: !!(fullStructuredOverlay || structuredOverlay),
        };
        const payloadPresence = {
          structuredOverlay: !!structuredOverlay,
          fullStructuredOverlay: !!fullStructuredOverlay,
          footerOverlay: !!footerOverlay,
          textsPerChannel: !!textsPerChannel,
        };
        // FIX: Trust AI render — do NOT force canvas overlay when AI has already baked
        // headline/footer/CTA into the image. Canvas overlay only runs if backend
        // explicitly requests fallback (recommendedOverlayMode !== 'ai_render' or
        // fallbackRecommended === true), or if user forced satori mode.
        // Previously frontendForcedStructured/TextFallback caused double-render:
        // AI bake-in + Satori overlay = duplicated text + occluded footer.
        const shouldFallbackStructured = fallbackStrategy !== 'none' && hasStructuredInput && (!isAiRenderMode || backendRequestedFallback);
        const shouldFallbackText = fallbackStrategy !== 'none' && !!useCanvasFallback && effectiveContentType === 'with_text' && !!channelText && !fullStructuredOverlay && !structuredOverlay && (!isAiRenderMode || backendRequestedFallback);
        const fallbackReasons = [
          imageData.fallbackRecommended === true ? 'backend yêu cầu fallback' : null,
          isAiRenderMode && imageData.recommendedOverlayMode && imageData.recommendedOverlayMode !== 'ai_render'
            ? `recommendedOverlayMode=${imageData.recommendedOverlayMode}`
            : null,
          shouldFallbackStructured ? 'structured overlay fallback bật' : null,
          shouldFallbackText ? 'text overlay fallback bật' : null,
          !backendRequestedFallback && isAiRenderMode ? 'AI accepted — no canvas double-render' : null,
          trustedModel && rawBackendFallback && !hardSatori ? `trusted model "${imageData.modelUsed}" — bypass overlay hint` : null,
          textSuppressedBecauseTooLong ? 'text too long, auto downgraded to background_only' : null,
          textSuppressedBecauseLanguageMismatch ? `language mismatch (${detectedLanguage} != ${brandLanguage}), auto downgraded to background_only` : null,
          !isAiRenderMode ? 'satori forced mode' : null,
        ].filter(Boolean) as string[];
        const fallbackReason = fallbackReasons.join(' • ');

        console.log(`[Pipeline:${channel}] 🔎 FALLBACK CHECK`, {
          backendRequestedFallback,
          fallbackStrategy,
          recommendedOverlayMode: imageData.recommendedOverlayMode || 'ai_render',
          hasFallbackFooter,
          hasStructuredInput,
          requiredBranding,
          payloadPresence,
          hasChannelSpecificText,
          shouldFallbackText,
          shouldFallbackStructured,
        });

        if (!backendRequestedFallback && isAiRenderMode) {
          console.log(`[Pipeline:${channel}] ✅ NO FALLBACK — AI accepted by backend hint`);
        }

        // Step 3: Canvas text overlay — DISABLED globally (text-in-prompt only)
        {
          console.log(`[Pipeline:${channel}] ⏭ STEP 3 SKIPPED — canvas overlay globally disabled`);
          debugSteps.push({
            id: 'step3',
            label: 'STEP 3 — Text fallback',
            status: 'skipped',
            summary: 'Canvas text overlay đã bị tắt toàn cục',
          });
        }

        // Step 4: Structured canvas overlay — DISABLED globally
        {
          console.log(`[Pipeline:${channel}] ⏭ STEP 4 SKIPPED — canvas overlay globally disabled`);
          debugSteps.push({
            id: 'step4',
            label: 'STEP 4 — Structured fallback',
            status: 'skipped',
            summary: 'Structured canvas overlay đã bị tắt toàn cục',
          });
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
          promptMode: promptMode || 'full',
          renderDebug: {
            overlayMode,
            fallbackStrategy,
            recommendedOverlayMode: imageData.recommendedOverlayMode,
            providerInfo,
            backendRequestedFallback,
            fallbackReason,
            shouldFallbackText,
            shouldFallbackStructured,
            requiredBranding,
            payloadPresence,
            overlayText: {
              source: textSuppressedBecauseTooLong || textSuppressedBecauseLanguageMismatch ? 'suppressed' : overlayTextSource,
              length: overlayTextLength,
              mode: effectiveContentType,
              detectedLanguage,
              brandLanguage,
              languageMatch,
              suppressedBecauseTooLong: textSuppressedBecauseTooLong,
              reason: textSuppressedBecauseTooLong ? 'text too long' : textSuppressedBecauseLanguageMismatch ? 'language mismatch' : effectiveContentType === 'background_only' && !rawChannelText ? 'no short hook available' : undefined,
            },
            finalPath: !isAiRenderMode
              ? 'satori_forced'
              : shouldFallbackText && shouldFallbackStructured
                ? 'text_and_structured_fallback'
                : shouldFallbackStructured
                  ? 'structured_fallback'
                  : shouldFallbackText
                    ? 'text_fallback'
                    : includeLogo && logoUrl
                      ? 'logo_only'
                      : 'ai_only',
            steps: lastDebugSteps,
            generatedAt: new Date().toISOString(),
          },
        };

        setProgress(prev => ({ ...prev, [channel]: 'done' }));
        setGeneratedImages(prev => ({ ...prev, [channel]: result }));

        return result;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const errCode = (err as Error & { errorCode?: string } | null)?.errorCode;
        console.error(`[Pipeline:${channel}] ✗ Attempt ${attempt + 1}/${maxRetries + 1} FAILED:`, errMsg);

        const failedOverlayMode = imageContentType === 'with_text' && channelText ? 'with_text' : 'background_only';

        const failureDebug: GeneratedImage = {
          channel,
          imageUrl: '',
          prompt: contentSummaries[channel] || `Content for ${channel}`,
          generatedAt: new Date().toISOString(),
          aspectRatio: channelAspectRatio,
          promptMode: promptMode || 'full',
          renderDebug: {
            overlayMode: options.overlayMode || 'ai_render',
            fallbackStrategy: options.fallbackStrategy || 'full',
            providerInfo: {
              errorMessage: errMsg,
            },
            backendRequestedFallback: false,
            fallbackReason: errMsg,
            shouldFallbackText: false,
            shouldFallbackStructured: false,
            requiredBranding: {
              logo: !!(includeLogo && logoUrl),
              footer: !!footerOverlay?.elements?.footer?.items?.length,
               text: failedOverlayMode === 'with_text' && !!channelText,
              structured: !!(fullStructuredOverlay || structuredOverlay),
            },
            payloadPresence: {
              structuredOverlay: !!structuredOverlay,
              fullStructuredOverlay: !!fullStructuredOverlay,
              footerOverlay: !!footerOverlay,
              textsPerChannel: !!textsPerChannel,
            },
             overlayText: {
               source: textSuppressedBecauseTooLong || textSuppressedBecauseLanguageMismatch ? 'suppressed' : overlayTextSource,
               length: overlayTextLength,
               mode: failedOverlayMode,
               detectedLanguage,
               brandLanguage,
               languageMatch,
               suppressedBecauseTooLong: textSuppressedBecauseTooLong,
               reason: textSuppressedBecauseTooLong ? 'text too long' : textSuppressedBecauseLanguageMismatch ? 'language mismatch' : failedOverlayMode === 'background_only' && !rawChannelText ? 'no short hook available' : undefined,
             },
            finalPath: options.overlayMode === 'satori' ? 'satori_forced' : 'ai_only',
            steps: lastDebugSteps,
            generatedAt: new Date().toISOString(),
          },
        };
        setGeneratedImages(prev => ({ ...prev, [channel]: failureDebug }));
        
        if (isNonRetryableImageError(errCode, errMsg)) {
          console.warn(`[Pipeline:${channel}] Non-retryable provider error, skipping retry:`, errCode || errMsg);
          setProgress(prev => ({ ...prev, [channel]: 'error' }));
          return null;
        }

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
