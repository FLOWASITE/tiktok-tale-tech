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

export type PipelinePhase = 'idle' | 'preparing' | 'generating_images' | 'complete' | 'error';

interface AutoImagePipelineOptions {
  /** Brand template ID for brand-aware generation */
  brandTemplateId?: string;
  /** Brand logo URL for overlay */
  brandLogoUrl?: string | null;
  /** Brand industry for V3 scoring */
  brandIndustry?: string[];
  /** Whether to auto-save images to DB immediately */
  autoSave?: boolean;
}

// Map frontend Channel to V3 ChannelKey
function toChannelKey(ch: Channel): ChannelKey {
  if (ch === 'instagram') return 'instagram_feed';
  return ch as ChannelKey;
}

// Extract first meaningful sentence for image context
function extractContentSummary(channelContent: string): string {
  if (!channelContent) return '';
  // Remove markdown formatting
  const cleaned = channelContent
    .replace(/#{1,6}\s?/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Get first 2-3 sentences
  const sentences = cleaned.split(/[.!?]\s+/).filter(s => s.trim().length > 10);
  return sentences.slice(0, 3).join('. ').substring(0, 500);
}

export function useAutoImagePipeline(options: AutoImagePipelineOptions = {}) {
  const { brandTemplateId, brandLogoUrl, brandIndustry, autoSave = true } = options;
  
  const [phase, setPhase] = useState<PipelinePhase>('idle');
  const [imageResults, setImageResults] = useState<{ successful: Channel[]; failed: Channel[] } | null>(null);
  const abortRef = useRef(false);

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
    }
  ) => {
    if (!brandTemplateId || channels.length === 0) {
      console.warn('[AutoImagePipeline] Missing brandTemplateId or channels');
      return;
    }

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
      // Step 1: Use V3 Suggestion Engine to pick best style for the first channel
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
      const imageStylePreset = topSuggestion?.style || 'photorealistic';

      console.log(`[AutoImagePipeline] ✓ V3 style selected: ${imageStylePreset}`, {
        score: topSuggestion?.score || 0,
        top3: suggestions.slice(0, 3).map(s => `${s.style}(${s.score})`),
        industry,
      });

      // Step 2: Build content summaries per channel
      const contentSummaries: Record<Channel, string> = {} as Record<Channel, string>;
      channels.forEach(ch => {
        contentSummaries[ch] = extractContentSummary(channelTexts[ch] || contentMeta.topic || '');
      });

      if (abortRef.current) return;

      // Step 3: Start parallel image generation
      setPhase('generating_images');

      const mode = contentMeta.promptMode || 'full';

      // Mode-specific rules:
      // - full: V3 style + strategic context + logo
      // - brand_only: brand colors + logo, no strategic AI directives
      // - raw: NO logo, NO brand styling, pure AI generation
      const shouldIncludeLogo = mode !== 'raw' && !!brandLogoUrl;

      const genOptions: AutoGenerateOptions = {
        contentId,
        brandTemplateId,
        channels,
        contentSummaries,
        aspectRatio: 'auto',
        promptMode: mode,
        // Only send V3 auto-selected style in 'full' mode; other modes let user/brand decide
        imageStylePreset: mode === 'full' ? (imageStylePreset as any) : undefined,
        // Strategic context only for 'full' — other modes skip AI intervention
        contentRole: mode === 'full' ? ((contentMeta.contentRole || 'seed') as any) : undefined,
        contentAngle: mode === 'full' ? contentMeta.contentAngle : undefined,
        // Logo: ON for full/brand_only, OFF for raw
        includeLogo: shouldIncludeLogo,
        logoPosition: 'auto',
        logoUrl: shouldIncludeLogo ? (brandLogoUrl || undefined) : undefined,
        // Content type: full mode defaults to with_text, others should receive from caller
        imageContentType: contentMeta.imageContentType || 'with_text',
        // Default to ai_render mode — AI renders text directly, no Satori overlay needed
        overlayMode: 'ai_render',
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
    }
  }, [brandTemplateId, brandIndustry, autoSave, autoImageGen]);

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
