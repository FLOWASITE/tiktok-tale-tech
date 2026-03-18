import { useState, useMemo, useEffect, useCallback } from 'react';
import { analyzeContentComplexity } from '@/lib/contentComplexityAnalyzer';
import { ComplexityWarning } from './ComplexityWarning';
import { decomposeRequest, decomposeRequestWithAI, applyTemplate, autoSelectTemplate } from '@/lib/hybridImageGenerator';
import { OverlayTemplatePicker } from './OverlayTemplatePicker';
import { useGenerationSignals } from '@/hooks/useGenerationSignals';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Loader2, ArrowLeft, AlertTriangle, Image as ImageIcon, Minimize2, Shield, SlidersHorizontal, Camera, Brush, LayoutGrid, Box, Layers, Droplets, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Channel, MultiChannelContent, ChannelImage } from '@/types/multichannel';
import {
  useAutoImageGeneration,
  AspectRatioOption,
  ImageStylePreset,
} from '@/hooks/useAutoImageGeneration';
import { useSocialImageGeneration, type ImageContentType, type TextPosition, type TypographyStyle, type PromptMode } from '@/hooks/useSocialImageGeneration';
import { CHANNEL_OPTIMAL_ASPECT_RATIO } from '@/config/channelImageConfig';
import { cn } from '@/lib/utils';
import { ImageStreamingGrid } from './streaming/ImageStreamingGrid';
import { ImageChannelPicker } from './ImageChannelPicker';
import { ImageAdvancedOptions } from './ImageAdvancedOptions';
import { ImageSettingsSummary } from './ImageSettingsSummary';
import { PromptPreview } from './PromptPreview';
import { BackgroundEditor } from './BackgroundEditor';
import { useBackgroundEditor } from '@/hooks/useBackgroundEditor';
import { V3StylePreview } from './V3StylePreview';
import { AIReadyCard } from './AIReadyCard';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { toast } from 'sonner';
import { suggestImageStylesV3, type SuggestionV3, type SuggestionInputV3 } from '@/lib/imageSuggestionEngine';
import type { ChannelKey, ContentGoal, ContentAngle, ContentRole, Industry } from '@/config/visualScoringConfig';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LogoPosition, LogoStyle } from './LogoOptionsPanel';
import { NEGATIVE_PROMPT_DEFAULTS } from '@/lib/imagePromptDefaults';

// Map frontend Channel to V3 ChannelKey
function toChannelKey(ch: Channel): ChannelKey {
  if (ch === 'instagram') return 'instagram_feed';
  return ch as ChannelKey;
}

// ─── Props ────────────────────────────────────────────────────────
export interface ImageGenProgressInfo {
  isGenerating: boolean;
  completedCount: number;
  totalCount: number;
  progress: Record<string, string>; // channel -> status
  generatedImages: Record<string, any>;
}

interface SimpleImageGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: MultiChannelContent;
  brandLogoUrl?: string | null;
  brandPrimaryColor?: string | null;
  brandIndustry?: string[];
  onImageGenerated?: (channel: Channel, image: ChannelImage) => Promise<void>;
  initialChannel?: Channel;
  initialMode?: 'single' | 'batch';
  /** Called when user minimizes during generation */
  onMinimize?: () => void;
  /** Report progress to parent for floating indicator */
  onProgressChange?: (info: ImageGenProgressInfo) => void;
}

type ViewMode = 'setup' | 'streaming' | 'preview';

// ─── Helpers (reused from UnifiedImageGenerator) ──────────────────
/** Extract keywords from text for content-aware image generation */
function extractContentKeywords(text: string): string[] {
  if (!text) return [];
  const original = text;
  const cleaned = text
    .replace(/#{1,6}\s?/g, '').replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ"]/gi, ' ');
  const phrases: string[] = [];

  // 1. Quoted phrases (Vietnamese often uses quotes for key terms)
  const quoted = original.match(/[""]([^""]+)[""]|"([^"]+)"/g);
  if (quoted) {
    phrases.push(...quoted.map(q => q.replace(/["""]/g, '').trim()).filter(q => q.length > 1 && q.length < 50).slice(0, 3));
  }

  // 2. Number + context patterns (e.g., "5 cách", "top 10", "3 bước")
  const numPatterns = cleaned.match(/(?:top\s+)?\d+\s+[a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+(?:\s+[a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+){0,2}/gi);
  if (numPatterns) phrases.push(...numPatterns.slice(0, 2));

  // 3. Capitalized phrases (English/proper nouns)
  const capMatches = cleaned.match(/[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+(?:\s+[A-Za-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+){0,3}/g);
  if (capMatches) phrases.push(...capMatches.slice(0, 3));

  // 4. Vietnamese keyword phrases after indicator words
  const vnIndicators = cleaned.match(/(?:về|cho|của|với|trong|cách|bí quyết|hướng dẫn|mẹo|lợi ích|tại sao|làm sao)\s+([a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+(?:\s+[a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+){0,3})/gi);
  if (vnIndicators) phrases.push(...vnIndicators.map(m => m.trim()).slice(0, 3));

  // 5. Fallback: first 3-5 meaningful words from topic/text
  if (phrases.length === 0) {
    const words = cleaned.split(/\s+/).filter(w => w.length > 2).slice(0, 5);
    if (words.length > 0) phrases.push(words.join(' '));
  }

  return [...new Set(phrases.map(p => p.trim()).filter(p => p.length > 1))].slice(0, 5);
}

function getContentSummary(content: MultiChannelContent, channel: Channel): string {
  const fieldMap: Partial<Record<Channel, string | null>> = {
    website: content.website_content, facebook: content.facebook_content,
    instagram: content.instagram_content, twitter: content.twitter_content,
    linkedin: content.linkedin_content, youtube: content.youtube_content,
    tiktok: content.tiktok_content, threads: content.threads_content,
    zalo_oa: (content as any).zalo_oa_content, telegram: (content as any).telegram_content,
  };
  const rawText = (fieldMap[channel] ?? content.topic ?? '')
    .replace(/#{1,6}\s?/g, '').replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  const keywords = extractContentKeywords(rawText);
  const hookInfo = getHookForChannel(content, channel);
  const goal = content.content_goal || '';
  const role = content.content_role || '';
  const angle = content.content_angle || '';

  let summary = `Topic: ${content.topic}.`;
  if (goal) summary += ` Goal: ${goal}.`;
  if (role) summary += ` Role: ${role}.`;
  if (angle) summary += ` Angle: ${angle}.`;
  if (hookInfo.hookMessage) summary += ` Core message: ${hookInfo.hookMessage}.`;
  if (keywords.length > 0) summary += ` Key concepts: ${keywords.join(', ')}.`;
  summary += ` Content: ${rawText.slice(0, 400)}`;
  return summary.slice(0, 600);
}

/** Get full channel content for deep AI analysis (up to 2000 chars) */
function getFullChannelContent(content: MultiChannelContent, channel: Channel): string {
  const fieldMap: Partial<Record<Channel, string | null>> = {
    website: content.website_content, facebook: content.facebook_content,
    instagram: content.instagram_content, twitter: content.twitter_content,
    linkedin: content.linkedin_content, youtube: content.youtube_content,
    tiktok: content.tiktok_content, threads: content.threads_content,
    zalo_oa: (content as any).zalo_oa_content, telegram: (content as any).telegram_content,
    email: content.email_content, google_maps: content.google_maps_content,
  };
  const rawText = (fieldMap[channel] ?? content.topic ?? '')
    .replace(/#{1,6}\s?/g, '').replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  return rawText.slice(0, 2000);
}

function getHookForChannel(content: MultiChannelContent, channel: Channel) {
  const ch = content.selected_hooks?.find(h => h.channel === channel);
  if (ch?.opening_line) return { hookMessage: ch.opening_line, hookType: ch.hook_type };
  const g = content.global_hook;
  if (g?.opening_line) return { hookMessage: g.opening_line, hookType: g.hook_type };
  return {};
}

function getBestOverlayText(content: MultiChannelContent, channel: Channel): string {
  const sh = content.selected_hooks; const gh = content.global_hook;
  const ch = sh?.find(h => h.channel === channel);
  if (ch?.text_overlay) return ch.text_overlay;
  if (gh?.text_overlay) return gh.text_overlay;
  if (ch?.opening_line) return ch.opening_line;
  if (gh?.opening_line) return gh.opening_line;
  const map: Partial<Record<Channel, string | null>> = {
    facebook: content.facebook_content, instagram: content.instagram_content,
    twitter: content.twitter_content, linkedin: content.linkedin_content,
    youtube: content.youtube_content, tiktok: content.tiktok_content,
    threads: content.threads_content, website: content.website_content,
    zalo_oa: content.zalo_oa_content, telegram: content.telegram_content,
    email: content.email_content, google_maps: content.google_maps_content,
  };
  const raw = map[channel];
  if (raw) {
    const clean = raw.replace(/#{1,6}\s?/g, '').replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\n+/g, ' ').trim();
    const first = clean.match(/^[^.!?]+[.!?]/);
    const s = first ? first[0] : clean.slice(0, 100);
    return s.length > 100 ? s.slice(0, 97) + '...' : s;
  }
  return content.topic?.slice(0, 100) || '';
}

// ─── Component ────────────────────────────────────────────────────
export function SimpleImageGenerator({
  open, onOpenChange, content,
  brandLogoUrl, brandPrimaryColor, brandIndustry,
  onImageGenerated, initialChannel, initialMode = 'batch',
  onMinimize, onProgressChange,
}: SimpleImageGeneratorProps) {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>('setup');

  // Core settings
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>(content?.selected_channels ?? []);
  const [imageContentType, setImageContentType] = useState<ImageContentType>('with_text');
  const [textToInclude, setTextToInclude] = useState('');
  const [useSharedText, setUseSharedText] = useState(true);
  const [textsPerChannel, setTextsPerChannel] = useState<Record<Channel, string>>({} as Record<Channel, string>);
  const [isOptimizingText, setIsOptimizingText] = useState(false);

  // Advanced (with smart defaults)
  const [imageStyle, setImageStyle] = useState<ImageStylePreset | 'auto'>('auto');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('auto');
  const [includeLogo, setIncludeLogo] = useState(true);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>('top-left');
  const [logoStyle, setLogoStyle] = useState<LogoStyle>('clean');
  const [logoSize, setLogoSize] = useState(15);
  const [logoOpacity, setLogoOpacity] = useState(100);
  const [textPosition, setTextPosition] = useState<TextPosition>('center');
  const [typographyStyle, setTypographyStyle] = useState<TypographyStyle>('modern');
  const [negativePrompt, setNegativePrompt] = useState(NEGATIVE_PROMPT_DEFAULTS['full']);
  const [isNegativePromptCustomized, setIsNegativePromptCustomized] = useState(false);
  const [promptMode, setPromptMode] = useState<PromptMode>('full');
  const [v3Suggestions, setV3Suggestions] = useState<SuggestionV3[]>([]);

  // Background editor
  const [bgEditorOpen, setBgEditorOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [regeneratingChannel, setRegeneratingChannel] = useState<Channel | null>(null);
  const [useHybridMode, setUseHybridMode] = useState(false);
  const [overlayMode, setOverlayMode] = useState<'satori' | 'ai_render'>('satori');
  const [overlayTemplate, setOverlayTemplate] = useState<string>('auto');

  // Hooks
  const batchGen = useAutoImageGeneration();
  const refineTextEditor = useBackgroundEditor();
  const signals = useGenerationSignals();

  // Report progress to parent for floating indicator
  useEffect(() => {
    onProgressChange?.({
      isGenerating: batchGen.isGenerating,
      completedCount: batchGen.completedCount,
      totalCount: batchGen.totalCount,
      progress: Object.fromEntries(
        Object.entries(batchGen.progress).map(([k, v]) => [k, v])
      ),
      generatedImages: batchGen.generatedImages,
    });
  }, [batchGen.isGenerating, batchGen.completedCount, batchGen.totalCount, batchGen.progress, batchGen.generatedImages, onProgressChange]);

  // Fetch brand template for style suggestions
  const { data: brandTemplate } = useQuery({
    queryKey: ['brand-tpl-simple-img', content?.brand_template_id],
    queryFn: async () => {
      if (!content?.brand_template_id) return null;
      const { data } = await supabase
        .from('brand_templates')
        .select('industry, tone_of_voice, image_style, formality_level, footer_info')
        .eq('id', content.brand_template_id)
        .single();
      return data;
    },
    enabled: !!content?.brand_template_id,
  });

  // Fetch content_role from core_contents if missing on the record
  const { data: coreContentMeta } = useQuery({
    queryKey: ['core-content-role', content?.core_content_id],
    queryFn: async () => {
      if (!content?.core_content_id) return null;
      const { data } = await supabase
        .from('core_contents')
        .select('content_role, content_angle')
        .eq('id', content.core_content_id)
        .single();
      return data;
    },
    enabled: !!content?.core_content_id && !content?.content_role,
  });

  // Extract content context — fallback to core_contents if local record is missing
  const contentGoal = content.content_goal as ContentGoal | undefined;
  const contentRole = (content.content_role || coreContentMeta?.content_role) as ContentRole | undefined;
  const contentAngle = (content.content_angle || coreContentMeta?.content_angle) as ContentAngle | undefined;

  // Build content summary for V3 engine
  const currentChannelSummary = useMemo(() => {
    const ch = selectedChannels[0] || 'instagram';
    return getContentSummary(content, ch as Channel);
  }, [content, selectedChannels]);

  // Extract keywords for preview
  const previewKeywords = useMemo(() => {
    const fieldMap: Partial<Record<Channel, string | null>> = {
      website: content.website_content, facebook: content.facebook_content,
      instagram: content.instagram_content, twitter: content.twitter_content,
      linkedin: content.linkedin_content, youtube: content.youtube_content,
      tiktok: content.tiktok_content, threads: content.threads_content,
    };
    const ch = selectedChannels[0] || 'instagram';
    const rawText = (fieldMap[ch as Channel] ?? content.topic ?? '');
    return extractContentKeywords(rawText);
  }, [content, selectedChannels]);

  useEffect(() => {
    // Determine industry from brand template or props
    const rawIndustry = brandTemplate?.industry || brandIndustry;
    const industry: Industry = (Array.isArray(rawIndustry) ? rawIndustry[0] : rawIndustry) as Industry || 'service';

    // Build V3 input from content context
    const input: SuggestionInputV3 = {
      contentGoal: contentGoal || 'education',
      contentAngle: (contentAngle as ContentAngle) || 'educational',
      contentRole: (contentRole as ContentRole) || 'sprout',
      channel: toChannelKey(selectedChannels[0] || 'instagram'),
      industry,
      contentSummary: currentChannelSummary,
    };

    const suggestions = suggestImageStylesV3(input);
    setV3Suggestions(suggestions);

    // Auto-apply top suggestion when style is 'auto'
    setImageStyle(cur => {
      if (cur === 'auto' && suggestions.length > 0) {
        const topStyle = suggestions[0].style as ImageStylePreset;
        // Only apply if it's one of the supported presets in the UI
        const uiStyles: ImageStylePreset[] = ['photorealistic', 'illustration', 'minimalist', '3d_render', 'flat_design', 'watercolor', 'cinematic'];
        if (uiStyles.includes(topStyle)) return topStyle;
      }
      return cur;
    });
  }, [brandTemplate, brandIndustry, contentGoal, contentAngle, contentRole, selectedChannels, currentChannelSummary]);

  // Fill hook text for a specific channel
  const fillHookText = useCallback((channel: Channel) => {
    const best = getBestOverlayText(content, channel);
    if (best) return best;
    return '';
  }, [content]);

  // Auto-fill text from hooks when opening
  useEffect(() => {
    if (!open || selectedChannels.length === 0) return;
    if (!textToInclude) {
      const best = fillHookText(selectedChannels[0]);
      if (best) setTextToInclude(best);
    }
    // Also fill per-channel texts that are empty
    if (!useSharedText) {
      setTextsPerChannel(prev => {
        const updated = { ...prev };
        let changed = false;
        selectedChannels.forEach(ch => {
          if (!updated[ch]) {
            const t = fillHookText(ch);
            if (t) { updated[ch] = t; changed = true; }
          }
        });
        return changed ? updated : prev;
      });
    }
  }, [open, selectedChannels, content, useSharedText]);

  // Reset when dialog closes (but NOT when minimized)
  useEffect(() => {
    if (!open && !batchGen.isGenerating) {
      batchGen.resetProgress();
      setViewMode('setup');
    }
  }, [open]);

  // If initialChannel provided, select only that channel
  useEffect(() => {
    if (open && initialChannel) {
      setSelectedChannels([initialChannel]);
    } else if (open) {
      setSelectedChannels(content?.selected_channels ?? []);
    }
  }, [open, initialChannel]);

  // ─── Computed ─────────────────────
  const contentSummaries = useMemo(() => {
    const s: Record<Channel, string> = {} as any;
    selectedChannels.forEach(ch => { s[ch] = getContentSummary(content, ch); });
    return s;
  }, [content, selectedChannels]);

  const hookMessages = useMemo(() => {
    const h: Record<Channel, { hookMessage?: string; hookType?: string }> = {} as any;
    selectedChannels.forEach(ch => { h[ch] = getHookForChannel(content, ch); });
    return h;
  }, [content, selectedChannels]);


  // Complexity analysis for hybrid mode auto-detection
  const complexityAnalysis = useMemo(() => {
    const summaryText = Object.values(contentSummaries).join(' ');
    return analyzeContentComplexity(summaryText + ' ' + textToInclude);
  }, [contentSummaries, textToInclude]);

  // Auto-enable hybrid mode when complexity is high OR when "Để AI lo" mode
  useEffect(() => {
    if (complexityAnalysis.score === 'complex') {
      setUseHybridMode(true);
    }
  }, [complexityAnalysis.score]);

  useEffect(() => {
    if (promptMode === 'full') {
      setUseHybridMode(true);
      setOverlayMode('ai_render');
    } else {
      setOverlayMode('satori');
    }
  }, [promptMode]);

  useEffect(() => {
    if (!isNegativePromptCustomized) {
      setNegativePrompt(NEGATIVE_PROMPT_DEFAULTS[promptMode]);
    }
  }, [promptMode, isNegativePromptCustomized]);

  // Build structured overlay AND background prompt from content when hybrid mode is active
  // V2: Uses AI decomposition (Gemini Flash) with regex fallback
  const [hybridOverlay, setHybridOverlay] = useState<any>(undefined);
  const [hybridBackgroundPrompt, setHybridBackgroundPrompt] = useState<string | undefined>(undefined);
  const [isDecomposing, setIsDecomposing] = useState(false);

  useEffect(() => {
    if (!useHybridMode) {
      setHybridOverlay(undefined);
      setHybridBackgroundPrompt(undefined);
      return;
    }

    const summaryText = Object.values(contentSummaries).join(' ') + ' ' + textToInclude;
    if (!summaryText.trim()) return;

    // Get full channel content for deeper AI analysis (up to 2000 chars)
    const firstChannel = selectedChannels[0] || 'instagram';
    const fullContent = getFullChannelContent(content, firstChannel);
    const aiInput = fullContent || summaryText;

    // Build strategic context for AI layout selection
    const decomposeContext = {
      contentRole: contentRole || undefined,
      contentGoal: contentGoal || undefined,
      contentAngle: contentAngle || undefined,
      topic: content?.topic || undefined,
      textToInclude: textToInclude || undefined,
    };

    let cancelled = false;
    setIsDecomposing(true);

    const resolvedImageStyle = imageStyle !== 'auto' ? imageStyle : (v3Suggestions[0]?.style as string | undefined);
    decomposeRequestWithAI(aiInput, brandPrimaryColor || '#DC2626', '#FFFFFF', decomposeContext, resolvedImageStyle)
      .then((decomposed) => {
        if (cancelled) return;
        // Use AI-suggested layout when in auto mode, fallback to heuristic
        const selectedTemplate = overlayTemplate !== 'auto'
          ? overlayTemplate
          : decomposed.suggestedLayout || autoSelectTemplate(summaryText, decomposed.overlayConfig);
        console.log('[AutoTemplate] Selected:', selectedTemplate, 'suggestedLayout:', decomposed.suggestedLayout, 'from overlayTemplate:', overlayTemplate);
        const applyResult = applyTemplate(selectedTemplate, decomposed, summaryText, brandPrimaryColor || '#DC2626');
        const { backgroundPrompt, overlayConfig } = applyResult;
        const resolvedLayout = applyResult.layout || (overlayConfig.cards ? 'banner_cards' : overlayConfig.heroText ? 'hero_text' : 'simple');
        setHybridOverlay({
          layout: resolvedLayout as 'banner_cards' | 'hero_text' | 'simple' | 'split' | 'stack',
          elements: {
            banner: overlayConfig.banner,
            heroText: overlayConfig.heroText,
            cards: overlayConfig.cards,
            headline: overlayConfig.headline,
            cta: overlayConfig.cta,
            footer: overlayConfig.footer,
            summaryRibbon: overlayConfig.summaryRibbon,
          },
          colors: overlayConfig.colors,
        });
        setHybridBackgroundPrompt(backgroundPrompt.description);
      })
      .catch(() => {
        if (cancelled) return;
        const rawDecomposed = decomposeRequest(summaryText, brandPrimaryColor || '#DC2626');
        const selectedTemplate = overlayTemplate !== 'auto'
          ? overlayTemplate
          : autoSelectTemplate(summaryText, rawDecomposed.overlayConfig);
        console.log('[AutoTemplate] Fallback selected:', selectedTemplate);
        const fallbackResult = applyTemplate(selectedTemplate, rawDecomposed, summaryText, brandPrimaryColor || '#DC2626');
        const { backgroundPrompt: fbBgPrompt, overlayConfig: fbOverlay } = fallbackResult;
        const fbLayout = fallbackResult.layout || (fbOverlay.cards ? 'banner_cards' : fbOverlay.heroText ? 'hero_text' : 'simple');
        setHybridOverlay({
          layout: fbLayout as 'banner_cards' | 'hero_text' | 'simple' | 'split' | 'stack',
          elements: {
            banner: fbOverlay.banner,
            heroText: fbOverlay.heroText,
            cards: fbOverlay.cards,
            headline: fbOverlay.headline,
            cta: fbOverlay.cta,
            footer: fbOverlay.footer,
            summaryRibbon: fbOverlay.summaryRibbon,
          },
          colors: fbOverlay.colors,
        });
        setHybridBackgroundPrompt(fbBgPrompt.description);
      })
      .finally(() => {
        if (!cancelled) setIsDecomposing(false);
      });

    return () => { cancelled = true; };
  }, [useHybridMode, contentSummaries, textToInclude, brandPrimaryColor, overlayTemplate, selectedChannels, content, contentRole, contentGoal, contentAngle]);

  const batchOptions = useMemo(() => ({
    contentId: content?.id ?? '',
    brandTemplateId: content?.brand_template_id || '',
    channels: selectedChannels,
    contentSummaries: useHybridMode && hybridBackgroundPrompt
      ? Object.fromEntries(selectedChannels.map(ch => [ch, hybridBackgroundPrompt])) as Record<string, string>
      : contentSummaries,
    includeLogo: includeLogo && !!brandLogoUrl,
    logoPosition,
    logoUrl: brandLogoUrl || undefined,
    logoStyle, logoSizePercent: logoSize, logoOpacity,
    aspectRatio,
    // Full mode: pass V3-auto-selected style (stored in imageStyle after auto-apply)
    // brand_only/raw: pass user-selected style if not 'auto'
    imageStylePreset: promptMode === 'full'
      ? (imageStyle !== 'auto' ? imageStyle : (v3Suggestions[0]?.style as ImageStylePreset | undefined))
      : (imageStyle !== 'auto' ? imageStyle : undefined),
    negativePrompt: negativePrompt.trim() || undefined,
    // Full mode: pass contentRole from content record, fallback to V3 default 'sprout'
    contentRole: promptMode === 'full' ? (contentRole || 'sprout') : undefined,
    contentAngle: promptMode === 'full' ? (contentAngle || 'educational') : undefined,
    hookMessages: promptMode === 'full' ? hookMessages : undefined,
    imageContentType,
    textToInclude: imageContentType === 'with_text' && useSharedText ? textToInclude : undefined,
    textsPerChannel: imageContentType === 'with_text' && !useSharedText ? textsPerChannel : undefined,
    textPosition: imageContentType === 'with_text' ? textPosition : undefined,
    typographyStyle: imageContentType === 'with_text' ? typographyStyle : undefined,
    useCanvasFallback: imageContentType === 'with_text' ? true : undefined,
    promptMode,
    structuredOverlay: hybridOverlay,
    overlayMode: useHybridMode ? overlayMode : undefined,
    structuredTemplate: useHybridMode ? overlayTemplate : undefined,
  }), [content?.id, content?.brand_template_id, selectedChannels, contentSummaries, hybridBackgroundPrompt, useHybridMode,
    includeLogo, brandLogoUrl, logoPosition, logoStyle, logoSize, logoOpacity,
    aspectRatio, imageStyle, negativePrompt, contentRole, contentAngle, hookMessages,
    imageContentType, textToInclude, textsPerChannel, useSharedText, textPosition, typographyStyle, promptMode, hybridOverlay, overlayMode, overlayTemplate, v3Suggestions]);

  // ─── Handlers ─────────────────────
  const handleGenerate = async () => {
    if (!content.brand_template_id) {
      toast.error('Vui lòng chọn brand template trước');
      return;
    }
    if (selectedChannels.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 kênh');
      return;
    }
    if (promptMode !== 'full' && imageContentType === 'with_text') {
      if (useSharedText && !textToInclude.trim()) {
        toast.error('Vui lòng nhập text để hiển thị trên ảnh');
        return;
      }
      if (!useSharedText) {
        const missing = selectedChannels.filter(ch => !textsPerChannel[ch]?.trim());
        if (missing.length > 0) {
          toast.error(`Vui lòng nhập text cho: ${missing.join(', ')}`);
          return;
        }
      }
    }

    // Auto-optimize long text before generation (>80 chars)
    if (imageContentType === 'with_text' && useSharedText && textToInclude.trim().length > 80) {
      try {
        toast.info('Đang tối ưu text cho ảnh...', { duration: 2000 });
        const { data, error } = await supabase.functions.invoke('optimize-social-text', {
          body: { text: textToInclude, maxLength: 60, style: 'punchy' },
        });
        if (!error && data?.optimizedText && data?.wasOptimized) {
          setTextToInclude(data.optimizedText);
          toast.success(`Text đã rút gọn: ${data.originalLength} → ${data.optimizedLength} ký tự`);
          // Wait a tick for state to propagate
          await new Promise(r => setTimeout(r, 100));
        }
      } catch {
        // Silently continue with original text if optimization fails
        console.warn('[SimpleImageGenerator] Auto-optimize failed, using original text');
      }
    }

    setViewMode('streaming');
    const result = await batchGen.generateAllImages(batchOptions, onImageGenerated, true);
    
    // Record generation signal
    signals.recordGeneration({
      brandId: content?.brand_template_id || undefined,
      promptMode,
      channel: selectedChannels[0] || 'instagram',
      imageStyle: imageStyle !== 'auto' ? imageStyle : undefined,
    });
    
    if (result.successful.length > 0) setViewMode('preview');
  };



  const handleRegenerateChannel = async (channel: Channel) => {
    setRegeneratingChannel(channel);
    signals.markRegenerated();
    await batchGen.regenerateForChannel(channel, batchOptions);
    setRegeneratingChannel(null);
  };

  const handleDownloadImage = (channel: Channel) => {
    const img = batchGen.generatedImages[channel];
    if (!img) return;
    signals.markAccepted();
    const link = document.createElement('a');
    link.href = img.imageUrl;
    link.download = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}-${channel}.png`;
    link.target = '_blank';
    link.click();
  };

  const handleEditBackground = (channel: Channel) => {
    const img = batchGen.generatedImages[channel];
    if (!img?.imageUrl) { toast.error('Không có ảnh để chỉnh sửa'); return; }
    signals.markEditedBackground();
    setEditingChannel(channel);
    setBgEditorOpen(true);
  };

  const handleBackgroundEdited = async (newImageUrl: string) => {
    if (!editingChannel) return;
    batchGen.updateGeneratedImage(editingChannel, { imageUrl: newImageUrl });
    toast.success('Đã cập nhật ảnh');
  };

  const handleRefineText = async (channel: Channel) => {
    const img = batchGen.generatedImages[channel];
    if (!img?.imageUrl) { toast.error('Không có ảnh để sửa chữ'); return; }
    signals.markEditedText();
    toast.info('Đang sửa chữ trên ảnh...', { duration: 2000 });
    const result = await refineTextEditor.editBackground({
      imageUrl: img.imageUrl,
      editType: 'refine_text',
      contentId: content.id,
      channel,
    });
    if (result.success && result.imageUrl) {
      batchGen.updateGeneratedImage(channel, { imageUrl: result.imageUrl });
      toast.success('Đã sửa chữ trên ảnh');
    }
  };

  const handleClose = () => {
    if (batchGen.isGenerating) {
      // Minimize instead of blocking close
      if (onMinimize) {
        onMinimize();
        onOpenChange(false);
        toast.info('Ảnh đang tạo sẽ tiếp tục ở nền', { duration: 3000 });
      }
      return;
    }
    batchGen.resetProgress();
    setViewMode('setup');
    onOpenChange(false);
  };

  const handleBackToSetup = () => {
    if (!batchGen.isGenerating) {
      batchGen.resetProgress();
    }
    setViewMode('setup');
  };

  const handleOptimizeText = async () => {
    if (!textToInclude.trim()) return;
    setIsOptimizingText(true);
    try {
      const { data, error } = await supabase.functions.invoke('optimize-social-text', {
        body: { text: textToInclude, channel: selectedChannels[0] || 'facebook' },
      });
      if (!error && data?.optimizedText) {
        setTextToInclude(data.optimizedText);
        toast.success('Đã tối ưu text');
      }
    } catch {
      toast.error('Không thể tối ưu text');
    } finally {
      setIsOptimizingText(false);
    }
  };

  const hasImages = Object.keys(batchGen.generatedImages).length > 0;

  // ─── Shared content ───────────────────────
  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7 -ml-1" onClick={viewMode === 'setup' ? () => onOpenChange(false) : handleBackToSetup}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Sparkles className="w-5 h-5 text-primary" />
        {viewMode === 'setup' && 'Tạo ảnh AI'}
        {viewMode === 'streaming' && 'Đang tạo ảnh...'}
        {viewMode === 'preview' && 'Xem trước ảnh'}
      </div>
      {batchGen.isGenerating && onMinimize && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground"
          onClick={() => {
            onMinimize();
            onOpenChange(false);
          }}
        >
          <Minimize2 className="w-3.5 h-3.5" />
          Thu nhỏ
        </Button>
      )}
    </div>
  );

  // Shared form fields (used by both mobile and desktop)
  const setupFields = (
    <div className="space-y-5 pb-4">
      {/* Brand template warning */}
      {!content.brand_template_id && (
        <Alert className="border-yellow-500/30 bg-yellow-500/5">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="text-xs text-yellow-800 dark:text-yellow-300">
            Chưa chọn brand template. AI sẽ tạo ảnh nhưng không áp dụng màu sắc thương hiệu.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick start hint */}
      <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
        <p className="text-xs text-primary/80">
          💡 <span className="font-medium">Bắt đầu nhanh:</span> Chọn kênh → nhấn <span className="font-semibold">Tạo ảnh</span>. AI sẽ tự tối ưu mọi thứ!
        </p>
      </div>

      {/* Step 1: Channel Picker */}
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</span>
          <div>
            <p className="text-sm font-medium text-foreground">Chọn kênh</p>
            <p className="text-[11px] text-muted-foreground">Chọn các kênh cần tạo ảnh. Mỗi kênh sẽ được tối ưu riêng.</p>
          </div>
        </div>
        <ImageChannelPicker
          availableChannels={content.selected_channels || []}
          selectedChannels={selectedChannels}
          onSelectedChange={setSelectedChannels}
        />
      </div>

      {/* Step 2: AI Control Level */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</span>
          <div>
            <p className="text-sm font-medium text-foreground">Kiểm soát AI</p>
            <p className="text-[11px] text-muted-foreground">Chọn mức độ AI can thiệp vào quá trình tạo ảnh.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {([
            { value: 'full' as const, label: 'Để AI lo', icon: <Sparkles className="w-5 h-5" />, desc: 'AI tự tối ưu phong cách, bố cục và text', hint: '✨ Phù hợp cho hầu hết trường hợp' },
            { value: 'brand_only' as const, label: 'Giữ Brand', icon: <Shield className="w-5 h-5" />, desc: 'Giữ logo & màu brand, bạn tự chọn bố cục', hint: '🎨 Khi cần nhất quán thương hiệu' },
            { value: 'raw' as const, label: 'Toàn quyền', icon: <SlidersHorizontal className="w-5 h-5" />, desc: 'Bạn kiểm soát 100% mọi tùy chọn', hint: '⚡ Cho người dùng nâng cao' },
          ]).map(mode => (
            <button
              key={mode.value}
              type="button"
              onClick={() => {
                setPromptMode(mode.value);
                // Auto-enable logo for brand_only and full modes
                if ((mode.value === 'brand_only' || mode.value === 'full') && brandLogoUrl) {
                  setIncludeLogo(true);
                }
              }}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all",
                promptMode === mode.value
                  ? "border-primary bg-primary/10 text-primary shadow-md"
                  : "border-border/40 hover:border-primary/30 hover:bg-muted/30 text-muted-foreground"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
                promptMode === mode.value ? "bg-primary/15" : "bg-muted/60"
              )}>
                {mode.icon}
              </div>
              <span className="text-xs font-semibold leading-tight">{mode.label}</span>
              <span className="text-[10px] opacity-70 leading-tight">{mode.desc}</span>
            </button>
          ))}
        </div>

        {/* Mode hint */}
        <div className={cn(
          "text-xs rounded-lg px-3 py-2 border",
          promptMode === 'full' && "text-primary/80 bg-primary/5 border-primary/15",
          promptMode === 'brand_only' && "text-amber-700 dark:text-amber-400 bg-amber-500/5 border-amber-500/15",
          promptMode === 'raw' && "text-violet-700 dark:text-violet-400 bg-violet-500/5 border-violet-500/15",
        )}>
          {promptMode === 'full' && '✨ AI tự tối ưu phong cách, bố cục và text. Bạn chỉ cần duyệt.'}
          {promptMode === 'brand_only' && '🎨 Giữ logo & màu brand. Bạn chọn phong cách và bố cục text.'}
          {promptMode === 'raw' && '⚡ Bạn kiểm soát 100%: phong cách, logo, text, bố cục.'}
        </div>
      </div>{/* end Step 2 */}

      {/* Step 3: Preview & Create */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">3</span>
          <div>
            <p className="text-sm font-medium text-foreground">
              {promptMode === 'full' ? 'AI sẵn sàng' : 'Xem trước & Tạo ảnh'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {promptMode === 'full'
                ? 'Mọi thông số đã được AI tối ưu. Nhấn tạo ảnh để bắt đầu.'
                : 'AI phân tích nội dung và gợi ý phong cách phù hợp nhất.'}
            </p>
          </div>
        </div>

      {/* ── FULL MODE: Premium AIReadyCard ── */}
      {promptMode === 'full' ? (
        <AIReadyCard
          selectedChannels={selectedChannels}
          v3TopSuggestion={v3Suggestions[0]}
          previewKeywords={previewKeywords}
          topic={content.topic}
          isGenerating={batchGen.isGenerating}
          isDecomposing={isDecomposing}
          onGenerate={handleGenerate}
        />
      ) : (
        <>
          {/* V3 Style Suggestions Preview — brand_only only (AI gợi ý) */}
          {promptMode === 'brand_only' && v3Suggestions.length > 0 && (
            <V3StylePreview
              suggestions={v3Suggestions}
              selectedStyle={imageStyle}
              onStyleSelect={(style) => setImageStyle(style)}
            />
          )}

          {/* Inline Style Grid — raw mode (user tự chọn 100%) */}
          {promptMode === 'raw' && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Phong cách ảnh</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  { value: 'auto' as const, label: 'Tự động', icon: <Sparkles className="w-3.5 h-3.5" /> },
                  { value: 'photorealistic' as const, label: 'Chân thực', icon: <Camera className="w-3.5 h-3.5" /> },
                  { value: 'illustration' as const, label: 'Minh họa', icon: <Brush className="w-3.5 h-3.5" /> },
                  { value: 'minimalist' as const, label: 'Tối giản', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
                  { value: '3d_render' as const, label: '3D', icon: <Box className="w-3.5 h-3.5" /> },
                  { value: 'flat_design' as const, label: 'Flat', icon: <Layers className="w-3.5 h-3.5" /> },
                  { value: 'watercolor' as const, label: 'Màu nước', icon: <Droplets className="w-3.5 h-3.5" /> },
                  { value: 'cinematic' as const, label: 'Điện ảnh', icon: <Film className="w-3.5 h-3.5" /> },
                ]).map(s => {
                  const isSelected = imageStyle === s.value;
                  return (
                    <button
                      key={s.value}
                      onClick={() => setImageStyle(s.value)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-xs",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 hover:border-primary/30 text-muted-foreground"
                      )}
                    >
                      {s.icon}
                      <span className="font-medium">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Content Context Preview */}
          {previewKeywords.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                AI sẽ tạo ảnh liên quan đến:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {previewKeywords.map((kw, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {kw}
                  </span>
                ))}
              </div>
              {content.topic && (
                <p className="text-xs text-muted-foreground/80 truncate">
                  Chủ đề: {content.topic}
                </p>
              )}
            </div>
          )}

          {/* Prompt Preview — collapsible summary of what AI will use */}
          <PromptPreview
            channels={selectedChannels}
            promptMode={promptMode}
            imageStyle={imageStyle === 'auto' ? 'auto' : imageStyle}
            brandPrimaryColor={brandPrimaryColor}
            contentRole={contentRole}
            contentAngle={contentAngle}
            hookType={hookMessages[selectedChannels[0]]?.hookType}
            imageContentType={imageContentType}
            countryCode={(content as any).country_code}
            personaName={(content as any).persona_name}
          />

          {/* Settings Summary + CTA */}
          <div className="space-y-2">
            <ImageSettingsSummary
              imageStyle={imageStyle}
              aspectRatio={aspectRatio}
              includeLogo={includeLogo}
              logoPosition={logoPosition}
              hasBrandLogo={!!brandLogoUrl}
              imageContentType={imageContentType}
              v3TopSuggestion={v3Suggestions.find(s => s.style === imageStyle)}
            />
            <ComplexityWarning analysis={complexityAnalysis} />

            {/* Hybrid mode toggle — shown when complexity is moderate or complex */}
            {complexityAnalysis.score !== 'simple' && (
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/30 cursor-pointer">
                  <Checkbox
                    checked={useHybridMode}
                    onCheckedChange={(checked) => setUseHybridMode(checked === true)}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">Chế độ Hybrid (AI nền + text chính xác)</p>
                    <p className="text-xs text-muted-foreground">
                      AI tạo nền visual, text/cards được render chính xác bằng engine riêng
                    </p>
                  </div>
                </label>

                {useHybridMode && (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground">🧪 AI tự render text</p>
                      <p className="text-xs text-muted-foreground">
                        AI vẽ text trực tiếp trong ảnh (thử nghiệm — chữ Việt có thể bị sai)
                      </p>
                    </div>
                    <Switch
                      checked={overlayMode === 'ai_render'}
                      onCheckedChange={(checked) => setOverlayMode(checked ? 'ai_render' : 'satori')}
                    />
                  </div>
                )}

                {useHybridMode && (
                  <OverlayTemplatePicker
                    value={overlayTemplate}
                    onChange={setOverlayTemplate}
                  />
                )}
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={batchGen.isGenerating || selectedChannels.length === 0 || isDecomposing}
              className="w-full h-11 gap-2 text-base"
              size="lg"
            >
              {batchGen.isGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Tạo {selectedChannels.length} ảnh</>
              )}
            </Button>
          </div>

          {/* Advanced Options — hidden in full mode */}
          <ImageAdvancedOptions
            imageStyle={imageStyle}
            onImageStyleChange={setImageStyle}
            v3Suggestions={v3Suggestions}
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
            includeLogo={includeLogo}
            onIncludeLogoChange={setIncludeLogo}
            logoPosition={logoPosition}
            onLogoPositionChange={setLogoPosition}
            logoStyle={logoStyle}
            onLogoStyleChange={setLogoStyle}
            logoSize={logoSize}
            onLogoSizeChange={setLogoSize}
            logoOpacity={logoOpacity}
            onLogoOpacityChange={setLogoOpacity}
            brandLogoUrl={brandLogoUrl}
            hasText={imageContentType === 'with_text'}
            textPosition={textPosition}
            onTextPositionChange={setTextPosition}
            typographyStyle={typographyStyle}
            onTypographyStyleChange={setTypographyStyle}
            textPreview={textToInclude}
            negativePrompt={negativePrompt}
            onNegativePromptChange={(val) => { setNegativePrompt(val); setIsNegativePromptCustomized(true); }}
            contentRole={contentRole}
            contentAngle={contentAngle}
            selectedChannels={selectedChannels}
            hookMessages={hookMessages}
            imageContentType={imageContentType}
            onImageContentTypeChange={setImageContentType}
            useSharedText={useSharedText}
            onUseSharedTextChange={setUseSharedText}
            textToInclude={textToInclude}
            onTextToIncludeChange={setTextToInclude}
            textsPerChannel={textsPerChannel}
            onTextsPerChannelChange={setTextsPerChannel}
            promptMode={promptMode}
            onPromptModeChange={setPromptMode}
            onRefineTextContent={() => handleOptimizeText()}
            isRefiningText={isOptimizingText}
            hidePromptModeSelector
            hideStyleGrid={promptMode === 'raw'}
          />
        </>
      )}
      </div>{/* end Step 3 */}
    </div>
  );

  const streamingPreviewContent = (
    <>
      <ImageStreamingGrid
        progress={batchGen.progress}
        progressTimes={batchGen.progressTimes}
        logoOverlayFailures={batchGen.logoOverlayFailures}
        generatedImages={batchGen.generatedImages}
        onRetryChannel={handleRegenerateChannel}
        onDownloadImage={handleDownloadImage}
        onEditBackground={handleEditBackground}
        onRefineText={handleRefineText}
        retryingChannel={regeneratingChannel}
      />
      {viewMode === 'preview' && hasImages && (
        <div className="flex justify-end gap-2 mt-4 pb-2">
          <Button variant="outline" onClick={handleBackToSetup}>
            Tạo lại
          </Button>
        </div>
      )}
    </>
  );

  // Mobile body: no ScrollArea, uses native scroll from parent div
  const mobileBodyContent = (
    <div className="flex-1">
      {viewMode === 'setup' && setupFields}
      {(viewMode === 'streaming' || viewMode === 'preview') && streamingPreviewContent}
    </div>
  );

  const bodyContent = (
    <div className="flex-1 min-h-0 overflow-y-auto pr-2">
      {viewMode === 'setup' && setupFields}
      {(viewMode === 'streaming' || viewMode === 'preview') && streamingPreviewContent}
    </div>
  );

  const bgEditor = editingChannel ? (
    <BackgroundEditor
      open={bgEditorOpen}
      onOpenChange={setBgEditorOpen}
      imageUrl={batchGen.generatedImages[editingChannel]?.imageUrl || ''}
      channel={editingChannel}
      contentId={content.id}
      onImageEdited={handleBackgroundEdited}
    />
  ) : null;

  // ─── Render: Drawer on mobile, Dialog on desktop ───────────────────────
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(isOpen) => {
        if (!isOpen && !batchGen.isGenerating) handleClose();
      }}>
        <DrawerContent 
          className="max-h-[90vh] overflow-hidden flex flex-col"
        >
          <DrawerHeader className="flex-shrink-0 border-b border-border/50 pb-3">
            <DrawerTitle>{headerContent}</DrawerTitle>
            {viewMode === 'setup' && (
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                {brandLogoUrl && (
                  <img src={brandLogoUrl} alt="" className="w-5 h-5 rounded object-contain" />
                )}
                {content.brand_name || 'Chọn kênh và nhấn Tạo ảnh'}
              </p>
            )}
          </DrawerHeader>
          <div className="overflow-y-auto flex-1 px-4 pb-4" style={{ touchAction: 'manipulation', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
            {mobileBodyContent}
          </div>
          {bgEditor}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          "transition-all duration-300 max-h-[92vh] overflow-hidden flex flex-col",
          viewMode === 'setup' ? "sm:max-w-3xl" : "sm:max-w-5xl"
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{headerContent}</DialogTitle>
          <DialogDescription>
            {viewMode === 'setup' && (
              <span className="flex items-center gap-2">
                {brandLogoUrl && (
                  <img src={brandLogoUrl} alt="" className="w-5 h-5 rounded object-contain" />
                )}
                {content.brand_name || 'Chọn kênh và nhấn Tạo ảnh'}
              </span>
            )}
            {viewMode === 'streaming' && 'AI đang tạo ảnh cho các kênh đã chọn'}
            {viewMode === 'preview' && 'Kiểm tra và lưu ảnh'}
          </DialogDescription>
        </DialogHeader>
        {bodyContent}
        {bgEditor}
      </DialogContent>
    </Dialog>
  );
}
