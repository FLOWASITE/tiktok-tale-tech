/**
 * useAutoImagePipeline
 * 
 * Orchestrates automatic image generation for all channels
 * immediately after multichannel content is created.
 * 
 * Uses V3 Suggestion Engine to auto-select optimal styles
 * and triggers parallel batch generation via useAutoImageGeneration.
 */

import { useState, useCallback, useRef } from 'react';
import { Channel, MultiChannelContent, ChannelImage } from '@/types/multichannel';
import { useAutoImageGeneration, AutoGenerateOptions, GeneratedImage } from './useAutoImageGeneration';
import { suggestImageStylesV3 } from '@/lib/imageSuggestionEngine';
import type { ChannelKey, ContentGoal, ContentAngle, ContentRole, Industry } from '@/config/visualScoringConfig';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { resolveOverlayText } from '@/lib/imageOverlayText';

export type PipelinePhase = 'idle' | 'preparing' | 'generating_images' | 'complete' | 'error';

interface BrandFooterInfo {
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
}

interface AutoImagePipelineOptions {
  /** Brand template ID for brand-aware generation */
  brandTemplateId?: string;
  /** Brand logo URL for overlay */
  brandLogoUrl?: string | null;
  /** Brand primary color for footer fallback styling */
  brandPrimaryColor?: string | null;
  /** Brand footer info for deterministic footer fallback */
  brandFooterInfo?: BrandFooterInfo | null;
  /** Brand industry for V3 scoring */
  brandIndustry?: string[];
  /** Brand country code for overlay language matching */
  brandCountryCode?: string | null;
  /** Organization ID for task tracking */
  organizationId?: string;
  /** Whether to auto-save images to DB immediately */
  autoSave?: boolean;
}

interface PipelineHookData {
  selectedHooks?: Array<{
    channel: Channel;
    opening_line: string;
    hook_type?: string;
    psychology?: string;
    text_overlay?: string;
  }>;
  globalHook?: {
    opening_line: string;
    hook_type?: string;
    psychology?: string;
    text_overlay?: string;
  };
}

function buildFooterItems(footerInfo?: BrandFooterInfo | null) {
  if (!footerInfo) return [];
  return [
    footerInfo.phone ? { icon: 'phone', text: footerInfo.phone } : null,
    footerInfo.website ? { icon: 'globe', text: footerInfo.website } : null,
    footerInfo.email ? { icon: 'mail', text: footerInfo.email } : null,
    footerInfo.address ? { icon: 'map-pin', text: footerInfo.address } : null,
  ].filter(Boolean) as { icon?: string; text: string }[];
}

// Map frontend Channel to V3 ChannelKey
function toChannelKey(ch: Channel): ChannelKey {
  if (ch === 'instagram') return 'instagram_feed';
  return ch as ChannelKey;
}

// Extract a richer content summary: opening hook + middle context + closing CTA
function extractContentSummary(channelContent: string): string {
  if (!channelContent) return '';
  const cleaned = channelContent
    .replace(/#{1,6}\s?/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`[^`]+`/g, '')
    .trim();

  const sentences = cleaned.split(/[.!?]\s+/).map(s => s.trim()).filter(s => s.length > 10);
  if (sentences.length === 0) return cleaned.substring(0, 600);
  if (sentences.length <= 4) return sentences.join('. ').substring(0, 700);

  // Take opening (2), middle (1), closing (1) — captures full narrative for long-form
  const opening = sentences.slice(0, 2);
  const middle = sentences[Math.floor(sentences.length / 2)];
  const closing = sentences[sentences.length - 1];
  return [...opening, middle, closing].join('. ').substring(0, 800);
}

export function useAutoImagePipeline(options: AutoImagePipelineOptions = {}) {
  const { brandTemplateId, brandLogoUrl, brandIndustry, brandPrimaryColor, brandFooterInfo, brandCountryCode, organizationId, autoSave = true } = options;
  
  const [phase, setPhase] = useState<PipelinePhase>('idle');
  const [imageResults, setImageResults] = useState<{ successful: Channel[]; failed: Channel[] } | null>(null);
  const abortRef = useRef(false);
  // Idempotency guard: chặn concurrent calls cho cùng contentId.
  // Bảo vệ tầng 2 cho trường hợp Layer 1 bị bypass (vd manual trigger nhanh tay).
  const inFlightContentIdRef = useRef<string | null>(null);

  const autoImageGen = useAutoImageGeneration();

  /**
   * Start the auto image pipeline after multichannel content is generated.
   * 
   * @param contentId - The ID of the newly created multichannel content
   * @param channels - List of channels to generate images for
   * @param channelTexts - Map of channel -> generated text content
   * @param contentMeta - Metadata about the content (goal, role, angle)
   */
  const startPipeline = useCallback(async (
    contentId: string,
    channels: Channel[],
    channelTexts: Record<string, string>,
    contentMeta: {
      contentGoal?: string;
      contentRole?: string;
      contentAngle?: string;
      topic?: string;
      promptMode?: 'full' | 'brand_only' | 'raw';
      imageContentType?: 'with_text' | 'background_only';
      structuredTemplate?: string;
      brandCountryCode?: string;
      hooks?: PipelineHookData;
    }
  ) => {
    if (!brandTemplateId || channels.length === 0) {
      console.warn('[AutoImagePipeline] Missing brandTemplateId or channels');
      return;
    }

    // Idempotency: skip nếu đã có pipeline đang chạy cho cùng contentId
    if (inFlightContentIdRef.current === contentId) {
      console.warn('[AutoImagePipeline] ⛔ Already in-flight for contentId:', contentId, '— skipping duplicate call');
      return;
    }
    inFlightContentIdRef.current = contentId;

    abortRef.current = false;
    setPhase('preparing');
    // Only reset results when generating all channels; preserve existing results for single-channel manual triggers
    if (channels.length > 1) {
      setImageResults(null);
    }

    console.log(`[AutoImagePipeline] 🎬 PIPELINE INIT`, {
      contentId,
      channels,
      brandTemplateId,
      promptMode: contentMeta.promptMode || 'full',
      contentGoal: contentMeta.contentGoal,
      contentRole: contentMeta.contentRole,
      contentAngle: contentMeta.contentAngle,
      imageContentType: contentMeta.imageContentType,
      hasBrandLogo: !!brandLogoUrl,
      autoSave,
    });

    try {
      const mode = contentMeta.promptMode || 'full';
      let imageStylePreset = 'photorealistic';

      // Step 1: V3 Suggestion Engine — only for 'full' mode
      if (mode === 'full') {
        const firstChannel = channels[0];
        const industry = (brandIndustry?.[0] || 'general') as Industry;
        
        const suggestions = suggestImageStylesV3({
          contentGoal: (contentMeta.contentGoal || 'engagement') as ContentGoal,
          contentAngle: (contentMeta.contentAngle || 'educational') as ContentAngle,
          contentRole: (contentMeta.contentRole || 'seed') as ContentRole,
          channel: toChannelKey(firstChannel),
          industry,
          contentSummary: channelTexts[firstChannel] || contentMeta.topic,
        });

        const topSuggestion = suggestions[0];
        imageStylePreset = topSuggestion?.style || 'photorealistic';

        console.log(`[AutoImagePipeline] ✓ V3 style selected: ${imageStylePreset}`, {
          score: topSuggestion?.score || 0,
          top3: suggestions.slice(0, 3).map(s => `${s.style}(${s.score})`),
          industry,
        });
      } else {
        console.log(`[AutoImagePipeline] ⏭ V3 style skipped — mode: ${mode}`);
      }

      // Step 2: Build content summaries per channel
      const contentSummaries: Record<Channel, string> = {} as Record<Channel, string>;
      channels.forEach(ch => {
        contentSummaries[ch] = extractContentSummary(channelTexts[ch] || contentMeta.topic || '');
      });

      if (abortRef.current) return;

      // Step 3: Start parallel image generation
      setPhase('generating_images');

      // mode already declared above

      // Mode-specific rules:
      // - full: V3 style + strategic context + logo
      // - brand_only: brand colors + logo, no strategic AI directives
      // - raw: NO logo, NO brand styling, pure AI generation
      const shouldIncludeLogo = mode !== 'raw' && !!brandLogoUrl;
      const footerItems = buildFooterItems(brandFooterInfo);
      const overlayTextResults = channels.map((channel) => {
        const resolved = resolveOverlayText({
          channel,
          channelContent: channelTexts[channel] || contentMeta.topic || '',
          selectedHooks: contentMeta.hooks?.selectedHooks,
          globalHook: contentMeta.hooks?.globalHook,
          brandCountryCode: contentMeta.brandCountryCode || brandCountryCode,
        });

        return [channel, resolved] as const;
      });

      const textsPerChannel = Object.fromEntries(
        overlayTextResults
          .filter(([, resolved]) => !!resolved.text)
          .map(([channel, resolved]) => [channel, resolved.text])
      ) as Record<Channel, string>;
      const hasAnyOverlayText = Object.keys(textsPerChannel).length > 0;
      const uniqueOverlayTexts = [...new Set(Object.values(textsPerChannel))];
      const effectiveImageContentType = hasAnyOverlayText ? 'with_text' : 'background_only';
      const sharedTextToInclude = uniqueOverlayTexts.length === 1 ? uniqueOverlayTexts[0] : undefined;
      const footerOverlay = footerItems.length > 0
        ? {
            layout: 'simple' as const,
            footerMode: 'auto' as const,
            elements: {
              footer: {
                items: footerItems,
              },
            },
            colors: {
              primary: brandPrimaryColor || '#DC2626',
              secondary: '#FFFFFF',
              text: '#FFFFFF',
            },
          }
        : undefined;

      const genOptions: AutoGenerateOptions = {
        contentId,
        brandTemplateId,
        organizationId,
        channels,
        contentSummaries,
        aspectRatio: 'auto',
        promptMode: mode,
        // Only send V3 auto-selected style in 'full' mode; other modes let user/brand decide
        imageStylePreset: mode === 'full' ? (imageStylePreset as any) : undefined,
        // Strategic context only for 'full' — other modes skip AI intervention
        contentRole: mode === 'full' ? ((contentMeta.contentRole || 'seed') as any) : undefined,
        contentAngle: mode === 'full' ? contentMeta.contentAngle : undefined,
        brandCountryCode: contentMeta.brandCountryCode || brandCountryCode || undefined,
        // Logo: ON for full/brand_only, OFF for raw
        includeLogo: shouldIncludeLogo,
        logoPosition: 'auto',
        logoUrl: shouldIncludeLogo ? (brandLogoUrl || undefined) : undefined,
        imageContentType: effectiveImageContentType,
        textToInclude: sharedTextToInclude,
        textsPerChannel: hasAnyOverlayText ? textsPerChannel : undefined,
        useCanvasFallback: hasAnyOverlayText ? true : undefined,
        // Default to ai_render mode — AI renders text directly, no Satori overlay needed
        overlayMode: 'ai_render',
        fallbackStrategy: 'full',
        footerOverlay,
        structuredTemplate: contentMeta.structuredTemplate,
      };

      // Save callback - persists image to multi_channel_contents.channel_images
      const onImageGenerated = autoSave ? async (channel: Channel, image: ChannelImage) => {
        try {
          // Read current channel_images from DB
          const { data: content } = await supabase
            .from('multi_channel_contents')
            .select('channel_images')
            .eq('id', contentId)
            .single();

          const currentImages = (content?.channel_images as Record<string, any>) || {};
          currentImages[channel] = image;

          await supabase
            .from('multi_channel_contents')
            .update({ channel_images: JSON.parse(JSON.stringify(currentImages)) })
            .eq('id', contentId);
        } catch (err) {
          console.error(`[AutoImagePipeline] Failed to save image for ${channel}:`, err);
        }
      } : undefined;

      const result = await autoImageGen.generateAllImages(genOptions, onImageGenerated, autoSave);
      
      // Merge results with existing for additive single-channel generation
      setImageResults(prev => {
        if (!prev) return result;
        return {
          successful: [...new Set([...prev.successful, ...result.successful])],
          failed: prev.failed.filter(ch => !result.successful.includes(ch) && !result.failed.includes(ch)).concat(result.failed),
        };
      });
      // For single-channel manual triggers, return to idle so user can trigger more
      if (channels.length === 1) {
        setPhase('idle');
      } else {
        setPhase(result.failed.length === channels.length ? 'error' : 'complete');
      }

      // Summary toast
      if (result.successful.length > 0 && result.failed.length > 0) {
        toast.info(
          `Ảnh: ${result.successful.length}/${channels.length} kênh thành công`,
          { description: `${result.failed.length} kênh cần thử lại` }
        );
      }
    } catch (err) {
      console.error('[AutoImagePipeline] ❌ PIPELINE ERROR:', err instanceof Error ? err.message : err);
      setPhase('error');
      toast.error('Lỗi tự động tạo ảnh');
    } finally {
      // Clear in-flight guard regardless of success/failure
      if (inFlightContentIdRef.current === contentId) {
        inFlightContentIdRef.current = null;
      }
    }
  }, [brandTemplateId, brandLogoUrl, brandIndustry, brandPrimaryColor, brandFooterInfo, brandCountryCode, organizationId, autoSave, autoImageGen]);

  const cancelPipeline = useCallback(() => {
    abortRef.current = true;
    setPhase('idle');
  }, []);

  const resetPipeline = useCallback(() => {
    abortRef.current = true;
    setPhase('idle');
    setImageResults(null);
    autoImageGen.resetProgress();
  }, [autoImageGen]);

  return {
    // Pipeline state
    phase,
    imageResults,
    
    // Image generation state (forwarded from useAutoImageGeneration)
    imageProgress: autoImageGen.progress,
    imageProgressTimes: autoImageGen.progressTimes,
    logoOverlayFailures: autoImageGen.logoOverlayFailures,
    generatedImages: autoImageGen.generatedImages,
    imageCompletedCount: autoImageGen.completedCount,
    imageTotalCount: autoImageGen.totalCount,
    
    // Actions
    startPipeline,
    cancelPipeline,
    resetPipeline,
    regenerateForChannel: autoImageGen.regenerateForChannel,
  };
}
