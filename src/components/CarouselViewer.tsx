import { Carousel, CarouselStatus, CarouselSlide, CarouselStyleType, CAROUSEL_STYLE_OPTIONS, VISUAL_PRESET_OPTIONS, VisualPresetType, textContentToString } from '@/types/carousel';
import { SlidePromptCard } from './SlidePromptCard';
import { SortableSlideCard } from './SortableSlideCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Copy,
  Check,
  Images,
  MessageSquare,
  Megaphone,
  Download,
  Sparkles,
  Loader2,
  ImageIcon,
  TrendingUp,
  Send,
  LayoutGrid,
  Layers,
  GraduationCap,
  ListOrdered,
  Images as ImagesIcon2,
  Minus,
  BarChart3,
  Blend,
  Hexagon,
  Paintbrush,
  Focus,
  Info,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TopicPerformanceUpdater } from '@/components/topic/TopicPerformanceUpdater';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useBackgroundGeneration } from '@/hooks/useBackgroundGeneration';
import { useQuery } from '@tanstack/react-query';
import { ModelUsedBadge } from '@/components/ui/ModelUsedBadge';
import { toast } from 'sonner';
import { formatAllSlidesPrompt } from '@/utils/parseCarouselSlides';
import { GeneratedImagesGallery } from './GeneratedImagesGallery';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { useCarouselImages } from '@/hooks/useCarouselImages';
import { StatusSelector, ContentStatus } from '@/components/StatusSelector';
import { supabase } from '@/integrations/supabase/client';
import { useCreatorProfiles } from '@/hooks/useCreatorProfiles';
import { CreatorCell } from '@/components/CreatorCell';
import { IndustryGuardrailBadge } from '@/components/IndustryGuardrailBadge';
import { useIndustryMemoryById } from '@/hooks/useIndustryMemory';
import { DirectPublishButton } from '@/components/social/DirectPublishButton';
import { SchedulePopoverButton } from '@/components/carousel/SchedulePopoverButton';
import { useSeamlessValidation } from '@/hooks/useSeamlessValidation';
import { ChannelMockupFrame } from '@/components/preview/ChannelMockupFrame';
import { SeamlessConsistencyCard } from '@/components/carousel/SeamlessConsistencyCard';
import { useSocialConnections } from '@/hooks/useSocialConnections';
import { useOrganization } from '@/hooks/useOrganization';
import { useQueryClient } from '@tanstack/react-query';


// Icon maps for badge rendering
const STYLE_ICON_MAP: Record<string, LucideIcon> = {
  Layers,
  GraduationCap,
  ListOrdered,
  Images: ImagesIcon2,
};
const PRESET_ICON_MAP: Record<string, LucideIcon> = {
  Minus,
  BarChart3,
  Blend,
  Hexagon,
  Paintbrush,
  Focus,
};

interface CarouselViewerProps {
  carousel: Carousel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCarouselUpdate?: (updatedCarousel: Carousel) => void;
  autoGenerateImages?: boolean;
}

const platformLabels: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
};

const generateExportContent = (carousel: Carousel): string => {
  const header = `═══════════════════════════════════════════════════════════════
CAROUSEL PROMPTS - ${carousel.title}
═══════════════════════════════════════════════════════════════

📋 Thông tin:
- Chủ đề: ${carousel.topic}
- Nền tảng: ${platformLabels[carousel.platform]}
- Công cụ AI: Lovable AI
- Số slides: ${carousel.slide_count}
- Brand: ${carousel.brand_name}
- Ngày tạo: ${new Date(carousel.created_at).toLocaleDateString('vi-VN')}

═══════════════════════════════════════════════════════════════
PROMPTS CHO TỪNG SLIDE
═══════════════════════════════════════════════════════════════

`;

  const slidesContent = carousel.slides_content
    .map(
      (slide) => `
───────────────────────────────────────────────────────────────
📌 SLIDE ${slide.slideNumber}/${carousel.slide_count}
───────────────────────────────────────────────────────────────

[1] MỤC TIÊU SLIDE:
${slide.objective}

[2] NỘI DUNG CHỮ TRÊN ẢNH:
${textContentToString(slide.textContent)}

[3] PHONG CÁCH THIẾT KẾ:
${slide.designStyle}

[4] MÀU SẮC – BỐ CỤC:
${slide.colorLayout}

[5] TỈ LỆ KHUNG HÌNH:
${slide.aspectRatio}

[6] YÊU CẦU KỸ THUẬT:
${slide.technicalRequirements}

🎨 PROMPT HOÀN CHỈNH (Copy để sử dụng):
────────────────────────────────────────
${slide.fullPrompt}
────────────────────────────────────────
`
    )
    .join('\n');

  const footer = `

═══════════════════════════════════════════════════════════════
GỢI Ý ĐĂNG BÀI
═══════════════════════════════════════════════════════════════

📝 CAPTION:
${carousel.caption_suggestion || 'Chưa có gợi ý'}

📣 CTA KÉO TƯƠNG TÁC:
${carousel.cta_suggestion || 'Chưa có gợi ý'}

═══════════════════════════════════════════════════════════════
Được tạo bởi Content AI - ${new Date().toLocaleDateString('vi-VN')}
═══════════════════════════════════════════════════════════════
`;

  return header + slidesContent + footer;
};

export function CarouselViewer({
  carousel,
  open,
  onOpenChange,
  onCarouselUpdate,
  autoGenerateImages,
}: CarouselViewerProps) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [localPublishedChannels, setLocalPublishedChannels] = useState<Set<string>>(new Set());
  const [copiedCta, setCopiedCta] = useState(false);
  const [copiedCaptionAll, setCopiedCaptionAll] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [generatingStartTime, setGeneratingStartTime] = useState<number | null>(null);
  const [currentGeneratingSlide, setCurrentGeneratingSlide] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastModelUsed, setLastModelUsed] = useState<string | null>(null);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [regeneratingCaption, setRegeneratingCaption] = useState(false);
  const lastAutoGenCarouselIdRef = useRef<string | null>(null);

  const handleRegenerateCaption = async () => {
    if (!carousel || regeneratingCaption) return;
    setRegeneratingCaption(true);
    try {
      const { data, error } = await supabase.functions.invoke('regenerate-carousel-caption', {
        body: { carouselId: carousel.id },
      });
      if (error) {
        const { parseEdgeFunctionError } = await import('@/lib/edgeFunctionErrors');
        const parsed = parseEdgeFunctionError(error, 'Không thể tạo lại caption. Vui lòng thử lại.');
        if (parsed.code === 'CREDITS_EXHAUSTED') {
          toast.error('Đã hết credits AI. Vui lòng nâng cấp gói để tiếp tục.');
        } else if (parsed.code === 'RATE_LIMIT') {
          toast.error('Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau ít phút.');
        } else {
          toast.error(parsed.message);
        }
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      const updated = {
        ...carousel,
        caption_suggestion: data.captionSuggestion,
        cta_suggestion: data.ctaSuggestion,
      } as Carousel;
      onCarouselUpdate?.(updated);
      toast.success('Đã tạo lại Caption & CTA!');
    } catch (e) {
      console.error('Regenerate caption error:', e);
      toast.error('Không thể tạo lại caption. Vui lòng thử lại.');
    } finally {
      setRegeneratingCaption(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const {
    generating,
    generatedImages,
    generateImage,
    getImageForSlide: getGeneratedImage,
    deleteImage,
    setImages,
  } = useImageGeneration();
  const {
    images: savedImages,
    loading: loadingImages,
    saveImage,
    deleteImage: deleteSavedImage,
    getImageForSlide: getSavedImage,
  } = useCarouselImages(carousel?.id || null);
  const { validating: seamlessValidating, result: seamlessResult, validate: validateSeamless } = useSeamlessValidation();

  // Background generation task tracking
  const { activeTasks: bgTasks } = useBackgroundGeneration({
    onTaskComplete: (task) => {
      if (task.task_type === 'carousel_image' && task.input_params?.carouselId === carousel?.id) {
        toast.success('Ảnh carousel đã tạo xong!');
      }
    },
  });
  const activeCarouselTask = bgTasks.find(
    t => t.task_type === 'carousel_image' && 
         (t.input_params?.carouselId === carousel?.id) &&
         (t.status === 'pending' || t.status === 'generating')
  );

  // Sync saved images into generatedImages state on load — single effect to avoid race condition
  const [syncedCarouselId, setSyncedCarouselId] = useState<string | null>(null);
  const prevCarouselIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Detect carousel switch → clear and bail out (sync on next render when new data arrives)
    if (carousel?.id !== prevCarouselIdRef.current) {
      setImages([]);
      setSyncedCarouselId(null);
      prevCarouselIdRef.current = carousel?.id || null;
      return;
    }

    // Only sync after loading completes for the NEW carousel
    if (!loadingImages && carousel?.id && syncedCarouselId !== carousel.id) {
      if (savedImages.length > 0) {
        const mapped = savedImages.map(img => ({
          slideNumber: img.slide_number,
          imageUrl: img.image_url,
          generatedAt: img.created_at,
        }));
        setImages(mapped);
      } else {
        setImages([]);
      }
      setSyncedCarouselId(carousel.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingImages, savedImages, carousel?.id, syncedCarouselId]);

  // Fetch creator profile
  const { profiles, isLoading: isLoadingProfile } = useCreatorProfiles([carousel?.user_id]);
  const creatorProfile = carousel?.user_id ? profiles[carousel.user_id] : undefined;

  // Fetch Industry Memory
  const { data: industryMemory, isLoading: isLoadingIndustry } = useIndustryMemoryById(carousel?.industry_template_id);

  // Lookup brand template by brand_template_id (preferred) or fallback to brand_name
  const { data: brandTemplate } = useQuery({
    queryKey: ['brand-template-for-carousel', carousel?.brand_template_id, carousel?.brand_name],
    queryFn: async () => {
      // Prefer direct ID lookup
      if (carousel?.brand_template_id) {
        const { data } = await supabase
          .from('brand_templates')
          .select('id, primary_color, secondary_colors')
          .eq('id', carousel.brand_template_id)
          .single();
        if (data) return data;
      }
      // Fallback: match by brand_name for older carousels
      if (carousel?.brand_name) {
        const { data } = await supabase
          .from('brand_templates')
          .select('id, primary_color, secondary_colors')
          .or(`brand_name.eq.${carousel.brand_name},name.eq.${carousel.brand_name}`)
          .limit(1)
          .maybeSingle();
        return data;
      }
      return null;
    },
    enabled: !!(carousel?.brand_template_id || carousel?.brand_name),
  });

  // Social connections for multi-channel publish
  const { currentOrganization } = useOrganization();
  const { connections: socialConnections } = useSocialConnections({
    brandTemplateId: brandTemplate?.id || carousel?.brand_template_id || undefined,
    organizationId: currentOrganization?.id,
  });
  const queryClient = useQueryClient();

  // Channels available for this carousel based on platform + active connections
  const ALL_CAROUSEL_CHANNELS = ['facebook', 'instagram', 'linkedin', 'twitter', 'tiktok'];

  // Set of channels that have an active social connection
  const connectedChannelSet = useMemo(() => {
    const CHANNEL_TO_PLATFORM: Record<string, string> = {
      facebook: 'facebook', instagram: 'instagram', linkedin: 'linkedin',
      twitter: 'twitter', tiktok: 'tiktok',
    };
    const set = new Set<string>();
    for (const ch of ALL_CAROUSEL_CHANNELS) {
      const platform = CHANNEL_TO_PLATFORM[ch];
      if (
        platform &&
        socialConnections?.some(
          (c: any) => c.platform?.toLowerCase() === platform && c.is_active,
        )
      ) {
        set.add(ch);
      }
    }
    return set;
  }, [socialConnections]);

  // Publishing logs for this carousel — track per-channel status
  const { data: publishingLogs } = useQuery({
    queryKey: ['carousel-publishing-logs', carousel?.id],
    queryFn: async () => {
      if (!carousel?.id) return [];
      const { data, error } = await supabase
        .from('content_publishing_logs')
        .select('*')
        .eq('content_id', carousel.id)
        .in('action', ['published', 'publish', 'auto_publish'])
        .order('performed_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!carousel?.id,
  });

  // Persisted published state for carousels comes from the carousel row itself.
  // Logs are kept as an auxiliary signal only because content_publishing_logs cannot
  // reliably persist carousel IDs.
  const persistedPublishedChannels = useMemo(() => {
    const channels = new Set<string>(carousel?.published_channels || []);
    publishingLogs?.forEach((log: any) => {
      if (log.channel) channels.add(log.channel);
    });
    return channels;
  }, [carousel?.published_channels, publishingLogs]);

  // Merge DB-derived channels with immediate local state for instant UI feedback
  const effectivePublishedChannels = useMemo(() => 
    new Set([...Array.from(persistedPublishedChannels), ...Array.from(localPublishedChannels)]),
    [persistedPublishedChannels, localPublishedChannels]
  );

  // Reset local published channels when carousel changes
  useEffect(() => {
    setLocalPublishedChannels(new Set());
  }, [carousel?.id]);


  const getChannelsForPlatform = (platform: string): string[] => {
    const rest = ALL_CAROUSEL_CHANNELS.filter(ch => ch !== platform);
    return ALL_CAROUSEL_CHANNELS.includes(platform)
      ? [platform, ...rest]
      : ALL_CAROUSEL_CHANNELS;
  };

  const availableChannels = useMemo(() => {
    return getChannelsForPlatform(carousel?.platform || 'facebook');
  }, [carousel?.platform]);

  // onPublishSuccess handler — update UI immediately + persist publish log correctly
  const handlePublishSuccess = useCallback(async (channel: string) => {
    if (!carousel) return;

    const timestamp = new Date().toISOString();
    const nextPublishedChannels = Array.from(
      new Set([
        ...Array.from(persistedPublishedChannels),
        ...Array.from(localPublishedChannels),
        channel,
      ])
    );
    const channelsToEvaluate = availableChannels.length > 0 ? availableChannels : [carousel.platform];
    const optimisticLog = {
      id: `local-${carousel.id}-${channel}-${timestamp}`,
      content_id: carousel.id,
      channel,
      organization_id: currentOrganization?.id ?? null,
      action: 'published',
      performed_by: null,
      performed_at: timestamp,
      details: { source: 'carousel_viewer_fallback' },
      error_message: null,
      created_at: timestamp,
    };

    // Immediate local/UI sync
    setLocalPublishedChannels(prev => new Set([...Array.from(prev), channel]));
    queryClient.setQueryData(['carousel-publishing-logs', carousel.id], (prev: any[] | undefined) => {
      const existing = Array.isArray(prev) ? prev : [];
      if (existing.some((log) => log.channel === channel && ['published', 'publish', 'auto_publish'].includes(log.action))) {
        return existing;
      }
      return [optimisticLog, ...existing];
    });

    // Refetch publishing logs
    queryClient.invalidateQueries({ queryKey: ['carousel-publishing-logs', carousel.id] });

    const allChannelsPublished = channelsToEvaluate.length > 0 && 
      channelsToEvaluate.every(ch => nextPublishedChannels.includes(ch));
    const newStatus = allChannelsPublished ? 'published' : 'partially_published';

    try {
      const { error } = await supabase
        .from('carousels')
        .update({
          status: newStatus,
          published_channels: nextPublishedChannels,
          updated_at: timestamp,
        })
        .eq('id', carousel.id);

      if (error) throw error;

      const updatedCarousel = {
        ...carousel,
        status: newStatus as CarouselStatus,
        published_channels: nextPublishedChannels,
        updated_at: timestamp,
      };
      onCarouselUpdate?.(updatedCarousel);
    } catch (err) {
      console.error('Failed to update carousel status after publish:', err);
    }
  }, [carousel, currentOrganization?.id, persistedPublishedChannels, localPublishedChannels, availableChannels, queryClient, onCarouselUpdate]);

  // Ref to hold the auto-generate function (defined after early return)
  const autoGenFnRef = useRef<(() => Promise<void>) | null>(null);

  // Auto-trigger image generation when autoGenerateImages flag is set
  useEffect(() => {
    if (
      autoGenerateImages &&
      carousel?.id &&
      open &&
      lastAutoGenCarouselIdRef.current !== carousel.id
    ) {
      lastAutoGenCarouselIdRef.current = carousel.id;
      const timer = setTimeout(() => {
        toast.info('🎨 Đang tự động tạo ảnh cho tất cả slides...');
        autoGenFnRef.current?.();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [autoGenerateImages, carousel?.id, open]);

  // Reset auto-gen tracking when viewer closes
  useEffect(() => {
    if (!open) {
      lastAutoGenCarouselIdRef.current = null;
    }
  }, [open]);

  // Elapsed time ticker for generation progress
  useEffect(() => {
    if (!generatingStartTime) {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - generatingStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [generatingStartTime]);

  if (!carousel) return null;

  const handleDeleteImage = async (slideNumber: number) => {
    await deleteImage(slideNumber, carousel.id);
    await deleteSavedImage(slideNumber);
  };

  const handleCopyAll = async () => {
    try {
      const allPrompts = formatAllSlidesPrompt(carousel.slides_content);
      await navigator.clipboard.writeText(allPrompts);
      setCopiedAll(true);
      toast.success('Đã copy tất cả prompts!');
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      toast.error('Không thể copy');
    }
  };

  const handleCopyCaption = async () => {
    if (!carousel.caption_suggestion) return;
    try {
      await navigator.clipboard.writeText(carousel.caption_suggestion);
      setCopiedCaption(true);
      toast.success('Đã copy caption!');
      setTimeout(() => setCopiedCaption(false), 2000);
    } catch {
      toast.error('Không thể copy');
    }
  };

  const handleCopyCta = async () => {
    if (!carousel.cta_suggestion) return;
    try {
      await navigator.clipboard.writeText(carousel.cta_suggestion);
      setCopiedCta(true);
      toast.success('Đã copy CTA!');
      setTimeout(() => setCopiedCta(false), 2000);
    } catch {
      toast.error('Không thể copy');
    }
  };

  const handleCopyCaptionAll = async () => {
    const parts: string[] = [];
    if (carousel.caption_suggestion) parts.push(carousel.caption_suggestion);
    if (carousel.cta_suggestion) parts.push(carousel.cta_suggestion);
    if (parts.length === 0) return;
    try {
      await navigator.clipboard.writeText(parts.join('\n\n---\n\n'));
      setCopiedCaptionAll(true);
      toast.success('Đã copy Caption & CTA!');
      setTimeout(() => setCopiedCaptionAll(false), 2000);
    } catch {
      toast.error('Không thể copy');
    }
  };

  const handleExportTxt = () => {
    const content = generateExportContent(carousel);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carousel-${carousel.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Đã xuất file TXT!');
  };

  /** Extract brand colors from carousel brand_guideline or brand template fallback */
  const extractBrandColors = (): { textColor?: string; backgroundColor?: string } | undefined => {
    // Try parsing brand_guideline first (may contain embedded colors)
    if (carousel.brand_guideline) {
      try {
        const parsed = typeof carousel.brand_guideline === 'string' 
          ? JSON.parse(carousel.brand_guideline) 
          : carousel.brand_guideline;
        if (parsed?.primaryColor) {
          const secondaries = parsed.secondaryColors as string[] | undefined;
          return {
            textColor: parsed.primaryColor,
            backgroundColor: secondaries?.[0] || parsed.backgroundColor || undefined,
          };
        }
        if (parsed?.colors || parsed?.textColor) {
          return {
            textColor: parsed.textColor || parsed.colors?.text || parsed.colors?.primary,
            backgroundColor: parsed.backgroundColor || parsed.colors?.background || parsed.colors?.secondary,
          };
        }
      } catch {
        const hexColors = (carousel.brand_guideline as string).match(/#[0-9A-Fa-f]{3,8}/g);
        if (hexColors && hexColors.length >= 2) {
          return { textColor: hexColors[0], backgroundColor: hexColors[1] };
        }
        if (hexColors && hexColors.length === 1) {
          return { textColor: hexColors[0] };
        }
      }
    }

    // Fallback: use brand template colors
    if (brandTemplate?.primary_color) {
      return {
        textColor: brandTemplate.primary_color,
        backgroundColor: (brandTemplate as any).secondary_colors?.[0] || undefined,
      };
    }

    return undefined;
  };

  const handleGenerateImage = async (slideNumber: number, prompt: string) => {
    const slide = carousel.slides_content.find(s => s.slideNumber === slideNumber);
    const brandColors = extractBrandColors();

    const colorPalette = carousel.slides_content.length > 0
      ? extractColorPalette(carousel.slides_content[0])
      : null;
    const prevSlide = carousel.slides_content.find(s => s.slideNumber === slideNumber - 1);
    const previousSceneDescription = prevSlide
      ? (prevSlide.objective || (typeof prevSlide.textContent === 'object' ? prevSlide.textContent.headline : null))
      : null;

    // Look up the actual previously-generated image URL for img2img continuity (slide N-1).
    // This makes single-slide regeneration also benefit from sequential_v2 seamless logic.
    const prevGenerated = slideNumber > 1 ? getGeneratedImage(slideNumber - 1) : null;
    const prevSaved = slideNumber > 1 ? getSavedImage(slideNumber - 1) : null;
    const previousImageUrl: string | null =
      prevGenerated?.imageUrl || (prevSaved as any)?.image_url || null;

    const seamlessContext = {
      colorPalette,
      previousSceneDescription,
      sequencePosition: slideNumber,
      totalInSequence: carousel.slides_content.length,
    };

    const result = await generateImage(prompt, carousel.id, slideNumber, {
      textContent: slide?.textContent,
      platform: carousel.platform,
      brandColors,
      carouselStyle: carousel.carousel_style,
      totalSlides: carousel.slides_content.length,
      slideObjective: slide?.objective,
      visualPreset: carousel.visual_preset || 'minimalist',
      carouselTopic: carousel.topic,
      previousImageUrl,
      seamlessContext,
    });
    if (result?.imageUrl) {
      await saveImage(slideNumber, result.imageUrl, prompt);
      if (result.modelUsed) {
        setLastModelUsed(result.modelUsed);
        if (result.modelUsed.includes('fallback')) {
          toast.warning('Model được cấu hình thất bại, đã dùng Lovable AI thay thế.');
        }
      }
    }
  };

  const handleGenerateAllImages = async () => {
    setGeneratingAll(true);
    setGeneratingProgress(0);
    setGeneratingStartTime(Date.now());
    setCurrentGeneratingSlide(null);

    const colorPalette = carousel.slides_content.length > 0
      ? extractColorPalette(carousel.slides_content[0])
      : null;

    let previousSceneDescription: string | null = null;
    let successCount = 0;
    const collectedUrls: string[] = [];

    for (const slide of carousel.slides_content) {
      setCurrentGeneratingSlide(slide.slideNumber);

      const brandColors = extractBrandColors();
      const result = await generateImage(slide.fullPrompt, carousel.id, slide.slideNumber, {
        textContent: slide.textContent,
        platform: carousel.platform,
        brandColors,
        carouselStyle: carousel.carousel_style,
        totalSlides: carousel.slides_content.length,
        slideObjective: slide.objective,
        visualPreset: carousel.visual_preset || 'minimalist',
        carouselTopic: carousel.topic,
        seamlessContext: {
          colorPalette,
          previousSceneDescription,
          sequencePosition: slide.slideNumber,
          totalInSequence: carousel.slides_content.length,
        },
      });
      if (result?.imageUrl) {
        await saveImage(slide.slideNumber, result.imageUrl, slide.fullPrompt);
        successCount++;
        collectedUrls.push(result.imageUrl);
        if (result.modelUsed) {
          setLastModelUsed(result.modelUsed);
          if (result.modelUsed.includes('fallback') && successCount === 1) {
            toast.warning('Model được cấu hình thất bại, đã dùng Lovable AI thay thế.');
          }
        }
      }

      previousSceneDescription = result?.sceneDescription || slide.objective || slide.fullPrompt.slice(0, 200);

      setGeneratingProgress(prev => prev + 1);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    setGeneratingAll(false);
    setGeneratingProgress(0);
    setCurrentGeneratingSlide(null);
    setGeneratingStartTime(null);

    if (successCount === carousel.slides_content.length) {
      toast.success(`🎉 Đã tạo xong ${successCount} ảnh!`);
      
      if (carousel.carousel_style === 'seamless' && collectedUrls.length >= 2) {
        toast.info('🔍 Đang kiểm tra tính liên tục thị giác...');
        validateSeamless(carousel.id, collectedUrls);
      }
    } else if (successCount > 0) {
      toast.warning(`Tạo được ${successCount}/${carousel.slides_content.length} ảnh. Một số slide gặp lỗi.`);
    } else {
      toast.error('Không tạo được ảnh nào. Vui lòng thử lại.');
    }
  };

  // Set the ref so the auto-trigger effect can call it
  autoGenFnRef.current = handleGenerateAllImages;

  const extractColorPalette = (slide: CarouselSlide): string[] | null => {
    const colorText = slide.colorLayout || '';
    const hexMatches = colorText.match(/#[0-9A-Fa-f]{3,8}/g);
    if (hexMatches && hexMatches.length > 0) return hexMatches;
    const colorKeywords = colorText.match(/(?:xanh|đỏ|vàng|cam|tím|hồng|trắng|đen|xám|navy|blue|red|green|yellow|orange|purple|pink|white|black|gray|gold|silver)/gi);
    if (colorKeywords && colorKeywords.length > 0) return [...new Set(colorKeywords)];
    return null;
  };

  const handleSlideUpdate = async (updatedSlide: CarouselSlide) => {
    if (!carousel) return;

    const updatedSlides = carousel.slides_content.map(s =>
      s.slideNumber === updatedSlide.slideNumber ? updatedSlide : s
    );

    try {
      const { error } = await supabase
        .from('carousels')
        .update({
          slides_content: JSON.parse(JSON.stringify(updatedSlides)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', carousel.id);

      if (error) throw error;

      const updatedCarousel = { ...carousel, slides_content: updatedSlides, updated_at: new Date().toISOString() };
      onCarouselUpdate?.(updatedCarousel);
    } catch (error) {
      console.error('Error updating slide:', error);
      throw error;
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !carousel) return;

    const oldIndex = carousel.slides_content.findIndex(s => `slide-${s.slideNumber}` === active.id);
    const newIndex = carousel.slides_content.findIndex(s => `slide-${s.slideNumber}` === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove([...carousel.slides_content], oldIndex, newIndex);
    const renumbered = reordered.map((slide, i) => ({ ...slide, slideNumber: i + 1 }));

    try {
      const { error } = await supabase
        .from('carousels')
        .update({
          slides_content: JSON.parse(JSON.stringify(renumbered)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', carousel.id);

      if (error) throw error;

      const updatedCarousel = { ...carousel, slides_content: renumbered, updated_at: new Date().toISOString() };
      onCarouselUpdate?.(updatedCarousel);
      toast.success('Đã sắp xếp lại slides!');
    } catch (error) {
      console.error('Error reordering slides:', error);
      toast.error('Không thể sắp xếp lại');
    }
  };

  const handleStatusChange = async (newStatus: ContentStatus) => {
    if (!carousel) return;

    try {
      const { error } = await supabase
        .from('carousels')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', carousel.id);

      if (error) throw error;

      const updatedCarousel = { ...carousel, status: newStatus as CarouselStatus, updated_at: new Date().toISOString() };
      onCarouselUpdate?.(updatedCarousel);
      toast.success('Đã cập nhật trạng thái!');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  // Build compact detail badges for popover
  const styleOpt = CAROUSEL_STYLE_OPTIONS.find(s => s.value === carousel.carousel_style);
  const presetOpt = VISUAL_PRESET_OPTIONS.find(s => s.value === carousel.visual_preset);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] xs:w-full h-[95vh] xs:h-[90vh] flex flex-col p-0">
        {/* ===== COMPACT HEADER ===== */}
        <DialogHeader className="px-3 xs:px-5 pt-2.5 xs:pt-4 pb-2 xs:pb-3 border-b border-border/50 space-y-1.5">
          {/* Row 1: Title + Status */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <DialogTitle className="text-sm xs:text-base font-bold truncate">
                {carousel.title}
              </DialogTitle>
              <StatusSelector 
                status={(carousel.status as ContentStatus) || 'draft'} 
                onStatusChange={handleStatusChange}
                disabled={generatingAll}
              />
            </div>
            <p className="text-[10px] xs:text-xs text-muted-foreground truncate">{carousel.topic}</p>
          </div>

          {/* Row 2: Publish icon buttons (compact) */}
          {generatedImages.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                {(availableChannels.length > 0 ? availableChannels : [carousel.platform]).map(channel => (
                  <DirectPublishButton
                    key={channel}
                    content={carousel.caption_suggestion || carousel.topic}
                    contentId={carousel.id}
                    channel={channel}
                    brandTemplateId={brandTemplate?.id}
                    mediaUrls={generatedImages.map(img => img.imageUrl)}
                    iconOnly
                    channelStatus={effectivePublishedChannels.has(channel) ? 'published' : undefined}
                    onPublishSuccess={() => handlePublishSuccess(channel)}
                  />
                ))}
              </div>
               <div className="h-5 w-px bg-border shrink-0" />
              <SchedulePopoverButton
                contentId={carousel.id}
                availableChannels={availableChannels.length > 0 ? availableChannels : [carousel.platform]}
                connectedChannels={connectedChannelSet}
              />
            </div>
          )}

          {/* Row 3: Badges + utility buttons */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{platformLabels[carousel.platform]}</Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {carousel.slide_count} slides
              </Badge>
              {effectivePublishedChannels.size > 0 && (
                <>
                  {Array.from(effectivePublishedChannels).map(ch => (
                    <Badge key={ch} variant="default" className="text-[10px] px-1.5 py-0 bg-green-600 hover:bg-green-700">
                      ✓ {platformLabels[ch] || ch}
                    </Badge>
                  ))}
                </>
              )}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 rounded hover:bg-muted/50">
                    <Info className="w-3 h-3" />
                    <span className="hidden xs:inline">Chi tiết</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 space-y-2 text-xs" align="start">
                  {styleOpt && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-16 shrink-0">Style:</span>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        {(() => { const I = STYLE_ICON_MAP[styleOpt.icon]; return I ? <I className="w-3 h-3" /> : null; })()}
                        {styleOpt.label}
                      </Badge>
                    </div>
                  )}
                  {presetOpt && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-16 shrink-0">Preset:</span>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        {(() => { const I = PRESET_ICON_MAP[presetOpt.icon]; return I ? <I className="w-3 h-3" /> : null; })()}
                        {presetOpt.label}
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-16 shrink-0">Brand:</span>
                    <span>{carousel.brand_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-16 shrink-0">Tạo bởi:</span>
                    <CreatorCell profile={creatorProfile} isLoading={isLoadingProfile} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-16 shrink-0">Ngày:</span>
                    <span>{new Date(carousel.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <IndustryGuardrailBadge 
                    industryMemory={industryMemory} 
                    isLoading={isLoadingIndustry}
                  />
                </PopoverContent>
              </Popover>
            </div>
            {/* Utility buttons */}
            <div className="flex items-center gap-1 shrink-0">
              {(carousel.status === 'published' || carousel.status === 'partially_published') && (
                <TopicPerformanceUpdater
                  contentId={carousel.id}
                  onUpdate={() => {}}
                  trigger={
                    <Button variant="outline" size="sm" className="h-7 text-[10px] xs:text-xs px-2">
                      <TrendingUp className="w-3 h-3" />
                    </Button>
                  }
                />
              )}
              <Button variant="outline" size="sm" onClick={handleExportTxt} className="h-7 px-2">
                <Download className="w-3 h-3" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyAll} className="h-7 px-2">
                {copiedAll ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="slides" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 xs:px-5 pt-1.5">
            <TabsList className="w-full xs:w-fit h-auto flex-wrap justify-start gap-1">
              <TabsTrigger value="slides" className="gap-1 xs:gap-1.5 text-[10px] xs:text-sm px-2 xs:px-3 py-1.5">
                <Images className="w-3 h-3 xs:w-4 xs:h-4" />
                <span className="hidden xs:inline">Prompts</span> ({carousel.slides_content.length})
              </TabsTrigger>
              <TabsTrigger value="images" className="gap-1 xs:gap-1.5 text-[10px] xs:text-sm px-2 xs:px-3 py-1.5">
                <ImageIcon className="w-3 h-3 xs:w-4 xs:h-4" />
                <span className="hidden xs:inline">Ảnh</span> ({generatedImages.length})
              </TabsTrigger>
              <TabsTrigger value="caption" className="gap-1 xs:gap-1.5 text-[10px] xs:text-sm px-2 xs:px-3 py-1.5">
                <MessageSquare className="w-3 h-3 xs:w-4 xs:h-4" />
                <span className="hidden xs:inline">Caption & CTA</span>
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-1 xs:gap-1.5 text-[10px] xs:text-sm px-2 xs:px-3 py-1.5">
                <LayoutGrid className="w-3 h-3 xs:w-4 xs:h-4" />
                <span className="hidden xs:inline">Preview</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-3 xs:px-5 py-3 xs:py-4">
            <TabsContent value="preview" className="mt-0 space-y-4">
              {/* Social Mockup Preview */}
              <div className="flex justify-center items-start bg-gradient-to-b from-muted/5 to-muted/20 rounded-xl p-3 min-h-[400px]">
                <div className="w-full max-w-xl">
                  <ChannelMockupFrame
                    channel={carousel.platform}
                    content={carousel.caption_suggestion || `📌 ${carousel.topic}`}
                    brandName={carousel.brand_name || 'Brand'}
                    channelImages={
                      generatedImages.length > 0 
                        ? generatedImages.map(img => img.imageUrl) 
                        : []
                    }
                    slideTitles={carousel.slides_content.map(s => 
                      typeof s.textContent === 'string' ? s.textContent : s.textContent.headline
                    )}
                  />
                </div>
              </div>

              {/* Empty state hint */}
              {generatedImages.length === 0 && (
                <div className="text-center py-2">
                  <p className="text-xs text-muted-foreground">
                    Tạo ảnh để xem preview đầy đủ trên {carousel.platform === 'tiktok' ? 'TikTok' : 'Facebook'}
                  </p>
                </div>
              )}

              {carousel.carousel_style === 'seamless' && (
                <SeamlessConsistencyCard
                  result={seamlessResult}
                  validating={seamlessValidating}
                  onRevalidate={() => {
                    const urls = generatedImages.map(img => img.imageUrl).filter(Boolean);
                    if (urls.length >= 2) {
                      validateSeamless(carousel.id, urls);
                    } else {
                      toast.info('Cần ít nhất 2 ảnh để kiểm tra.');
                    }
                  }}
                />
              )}
              <div className="flex justify-center">
                <Button
                  onClick={handleGenerateAllImages}
                  disabled={generatingAll || generating !== null}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Hài lòng? Tạo ảnh ngay
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="slides" className="mt-0 space-y-3 xs:space-y-4">
              {/* Generate All Button + Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  {lastModelUsed && !generatingAll && (
                    <ModelUsedBadge modelUsed={lastModelUsed} />
                  )}
                  {!lastModelUsed && <div />}
                  <Button
                    onClick={handleGenerateAllImages}
                    disabled={generatingAll || generating !== null}
                    className="gap-1.5 xs:gap-2 h-8 xs:h-9 text-xs xs:text-sm"
                    size="sm"
                  >
                    {generatingAll ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 xs:w-4 xs:h-4 animate-spin" />
                        <span className="hidden xs:inline">Đang tạo...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                        <span className="hidden xs:inline">Tạo tất cả ảnh</span>
                        <span className="xs:hidden">Tạo ảnh</span>
                      </>
                    )}
                  </Button>
                </div>
                {generatingAll && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 xs:p-4 space-y-3 animate-fade-in">
                    <div className="flex flex-wrap gap-1.5">
                      {carousel.slides_content.map((slide) => {
                        const isDone = generatingProgress > slide.slideNumber - 1;
                        const isActive = currentGeneratingSlide === slide.slideNumber;
                        return (
                          <div
                            key={slide.slideNumber}
                            className={cn(
                              "flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium transition-all duration-500",
                              isDone && "bg-primary text-primary-foreground scale-100",
                              isActive && "bg-primary/20 border-2 border-primary text-primary animate-pulse scale-110",
                              !isDone && !isActive && "bg-muted text-muted-foreground"
                            )}
                          >
                            {isDone ? '✓' : slide.slideNumber}
                          </div>
                        );
                      })}
                    </div>
                    <div className="space-y-1.5">
                      <Progress value={(generatingProgress / carousel.slide_count) * 100} className="h-2.5" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-primary animate-pulse" />
                          Slide {currentGeneratingSlide || '...'}/{carousel.slide_count}
                          {currentGeneratingSlide && (
                            <span className="text-muted-foreground/70">
                              · {carousel.slides_content.find(s => s.slideNumber === currentGeneratingSlide)?.objective?.slice(0, 30) || 'Đang xử lý'}...
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums">{Math.round((generatingProgress / carousel.slide_count) * 100)}%</span>
                          <span className="text-muted-foreground/60">·</span>
                          <span className="tabular-nums text-muted-foreground/70">
                            {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground/60">
                        ⏳ Mỗi slide mất ~15-20s · Đừng đóng cửa sổ này
                      </p>
                      {lastModelUsed && <ModelUsedBadge modelUsed={lastModelUsed} />}
                    </div>
                  </div>
                )}
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={carousel.slides_content.map(s => `slide-${s.slideNumber}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {carousel.slides_content.map((slide) => (
                    <SortableSlideCard
                      key={slide.slideNumber}
                      slide={slide}
                      totalSlides={carousel.slide_count}
                      generatedImage={getGeneratedImage(slide.slideNumber)}
                      isGenerating={generating === slide.slideNumber}
                      onGenerateImage={() => handleGenerateImage(slide.slideNumber, slide.fullPrompt)}
                      canGenerateImage={generating === null && !generatingAll}
                      onSlideUpdate={handleSlideUpdate}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </TabsContent>

            <TabsContent value="images" className="mt-0 space-y-4">
              {/* Background generation progress */}
              {activeCarouselTask && (
                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>{activeCarouselTask.progress_message || 'Đang tạo ảnh dưới nền...'}</span>
                  </div>
                  <Progress value={activeCarouselTask.progress || 0} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {activeCarouselTask.progress || 0}% · Bạn có thể đóng cửa sổ này
                  </p>
                </div>
              )}
              <GeneratedImagesGallery
                images={generatedImages}
                totalSlides={carousel.slide_count}
                slides={carousel.slides_content}
                carouselTitle={carousel.title}
                onDeleteImage={handleDeleteImage}
                onGenerateAll={handleGenerateAllImages}
                onGenerateSingle={(slideNumber) => {
                  const slide = carousel.slides_content.find(s => s.slideNumber === slideNumber);
                  if (slide) handleGenerateImage(slideNumber, slide.fullPrompt);
                }}
                isGenerating={generating !== null || generatingAll}
              />
            </TabsContent>

            <TabsContent value="caption" className="mt-0 space-y-4">
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateCaption}
                  disabled={regeneratingCaption}
                  className="h-7 xs:h-8 text-xs"
                >
                  {regeneratingCaption ? (
                    <Loader2 className="w-3.5 h-3.5 xs:w-4 xs:h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                  )}
                  <span className="ml-1 xs:ml-1.5">Tạo lại</span>
                </Button>
                {(carousel.caption_suggestion || carousel.cta_suggestion) && (
                  <Button variant="outline" size="sm" onClick={handleCopyCaptionAll} className="h-7 xs:h-8 text-xs">
                    {copiedCaptionAll ? (
                      <Check className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                    )}
                    <span className="ml-1 xs:ml-1.5">Copy tất cả</span>
                  </Button>
                )}
              </div>

              <div className="gradient-card border border-border/50 rounded-lg p-4 xs:p-6">
                <div className="flex items-center justify-between mb-3 xs:mb-4">
                  <h3 className="font-semibold flex items-center gap-1.5 xs:gap-2 text-sm xs:text-base">
                    <MessageSquare className="w-4 h-4 xs:w-5 xs:h-5 text-primary" />
                    Gợi ý Caption
                  </h3>
                  {carousel.caption_suggestion && (
                    <Button variant="outline" size="sm" onClick={handleCopyCaption} className="h-7 xs:h-8 text-xs">
                      {copiedCaption ? (
                        <Check className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                      )}
                      <span className="ml-1 xs:ml-1.5 hidden xs:inline">Copy</span>
                    </Button>
                  )}
                </div>
                {carousel.caption_suggestion ? (
                  <p className="text-xs xs:text-sm whitespace-pre-wrap bg-muted/30 p-3 xs:p-4 rounded-lg">
                    {carousel.caption_suggestion}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs xs:text-sm">Chưa có gợi ý caption</p>
                )}
              </div>

              <div className="gradient-card border border-border/50 rounded-lg p-4 xs:p-6">
                <div className="flex items-center justify-between mb-3 xs:mb-4">
                  <h3 className="font-semibold flex items-center gap-1.5 xs:gap-2 text-sm xs:text-base">
                    <Megaphone className="w-4 h-4 xs:w-5 xs:h-5 text-primary" />
                    Gợi ý CTA
                  </h3>
                  {carousel.cta_suggestion && (
                    <Button variant="outline" size="sm" onClick={handleCopyCta} className="h-7 xs:h-8 text-xs">
                      {copiedCta ? (
                        <Check className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                      )}
                      <span className="ml-1 xs:ml-1.5 hidden xs:inline">Copy</span>
                    </Button>
                  )}
                </div>
                {carousel.cta_suggestion ? (
                  <p className="text-xs xs:text-sm whitespace-pre-wrap bg-muted/30 p-3 xs:p-4 rounded-lg">
                    {carousel.cta_suggestion}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs xs:text-sm">Chưa có gợi ý CTA</p>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
