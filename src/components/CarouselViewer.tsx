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
import { Copy, Check, Images, MessageSquare, Megaphone, Download, Sparkles, Loader2, ImageIcon, TrendingUp, Send, LayoutGrid, Layers, GraduationCap, ListOrdered, Images as ImagesIcon2, Minus, BarChart3, Blend, Hexagon, Paintbrush, Focus, type LucideIcon } from 'lucide-react';
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
import { useState, useEffect, useRef, useCallback } from 'react';
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
import { useSeamlessValidation } from '@/hooks/useSeamlessValidation';
import { CarouselLayoutPreview } from '@/components/carousel/CarouselLayoutPreview';
import { SeamlessConsistencyCard } from '@/components/carousel/SeamlessConsistencyCard';

// Icon maps for badge rendering
const STYLE_ICON_MAP: Record<string, LucideIcon> = {
  Layers, GraduationCap, ListOrdered, Images: ImagesIcon2,
};
const PRESET_ICON_MAP: Record<string, LucideIcon> = {
  Minus, BarChart3, Blend, Hexagon, Paintbrush, Focus,
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
  tiktok: 'TikTok',
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

  const slidesContent = carousel.slides_content.map((slide) => `
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
`).join('\n');

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

export function CarouselViewer({ carousel, open, onOpenChange, onCarouselUpdate, autoGenerateImages }: CarouselViewerProps) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedCta, setCopiedCta] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [generatingStartTime, setGeneratingStartTime] = useState<number | null>(null);
  const [currentGeneratingSlide, setCurrentGeneratingSlide] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastModelUsed, setLastModelUsed] = useState<string | null>(null);
  const lastAutoGenCarouselIdRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { generating, generatedImages, generateImage, getImageForSlide: getGeneratedImage, deleteImage, setImages } = useImageGeneration();
  const { images: savedImages, loading: loadingImages, saveImage, deleteImage: deleteSavedImage, getImageForSlide: getSavedImage } = useCarouselImages(carousel?.id || null);
  const { validating: seamlessValidating, result: seamlessResult, validate: validateSeamless } = useSeamlessValidation();

  // Sync saved images into generatedImages state on load
  const [syncedCarouselId, setSyncedCarouselId] = useState<string | null>(null);
  
  useEffect(() => {
    if (!loadingImages && savedImages.length > 0 && carousel?.id && syncedCarouselId !== carousel.id) {
      const mapped = savedImages.map(img => ({
        slideNumber: img.slide_number,
        imageUrl: img.image_url,
        generatedAt: img.created_at || new Date().toISOString(),
      }));
      setImages(mapped);
      setSyncedCarouselId(carousel.id);
    }
  }, [loadingImages, savedImages, carousel?.id, syncedCarouselId, setImages]);

  // Fetch creator profile
  const { profiles, isLoading: isLoadingProfile } = useCreatorProfiles([carousel?.user_id]);
  const creatorProfile = carousel?.user_id ? profiles[carousel.user_id] : undefined;

  // Fetch Industry Memory
  const { data: industryMemory, isLoading: isLoadingIndustry } = useIndustryMemoryById(carousel?.industry_template_id);

  // Lookup brand_template_id from brand_name for social connection resolution
  const { data: brandTemplate } = useQuery({
    queryKey: ['brand-template-by-name', carousel?.brand_name],
    queryFn: async () => {
      const { data } = await supabase
        .from('brand_templates')
        .select('id')
        .eq('brand_name', carousel!.brand_name)
        .limit(1)
        .single();
      return data;
    },
    enabled: !!carousel?.brand_name,
  });

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
      // Use a small delay to ensure the component is fully rendered
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

  /** Extract brand colors from carousel brand_guideline for Phase C */
  const extractBrandColors = (): { textColor?: string; backgroundColor?: string } | undefined => {
    if (!carousel.brand_guideline) return undefined;
    try {
      const parsed = typeof carousel.brand_guideline === 'string' 
        ? JSON.parse(carousel.brand_guideline) 
        : carousel.brand_guideline;
      if (parsed?.colors || parsed?.primaryColor || parsed?.textColor) {
        return {
          textColor: parsed.textColor || parsed.colors?.text || parsed.colors?.primary,
          backgroundColor: parsed.backgroundColor || parsed.colors?.background || parsed.colors?.secondary,
        };
      }
    } catch {
      // brand_guideline is plain text, try to extract color hints
      const hexColors = (carousel.brand_guideline as string).match(/#[0-9A-Fa-f]{3,8}/g);
      if (hexColors && hexColors.length >= 2) {
        return { textColor: hexColors[0], backgroundColor: hexColors[1] };
      }
      if (hexColors && hexColors.length === 1) {
        return { textColor: hexColors[0] };
      }
    }
    return undefined;
  };

  const handleGenerateImage = async (slideNumber: number, prompt: string) => {
    const slide = carousel.slides_content.find(s => s.slideNumber === slideNumber);
    const brandColors = extractBrandColors();

    // Build cross-slide context for visual continuity (all styles, not just seamless)
    const colorPalette = carousel.slides_content.length > 0
      ? extractColorPalette(carousel.slides_content[0])
      : null;
    const prevSlide = carousel.slides_content.find(s => s.slideNumber === slideNumber - 1);
    const previousSceneDescription = prevSlide
      ? (prevSlide.objective || (typeof prevSlide.textContent === 'object' ? prevSlide.textContent.headline : null))
      : null;
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

    // Extract dominant colors from slide design info for seamless continuity
    const colorPalette = carousel.slides_content.length > 0
      ? extractColorPalette(carousel.slides_content[0])
      : null;

    let previousSceneDescription: string | null = null;
    let successCount = 0;
    const collectedUrls: string[] = [];

    for (const slide of carousel.slides_content) {
      setCurrentGeneratingSlide(slide.slideNumber);
      const isSeamless = carousel.carousel_style === 'seamless';

      const brandColors = extractBrandColors();
      const result = await generateImage(slide.fullPrompt, carousel.id, slide.slideNumber, {
        textContent: slide.textContent,
        platform: carousel.platform,
        brandColors,
        carouselStyle: carousel.carousel_style,
        totalSlides: carousel.slides_content.length,
        slideObjective: slide.objective,
        visualPreset: carousel.visual_preset || 'minimalist',
        seamlessContext: isSeamless ? {
          colorPalette,
          previousSceneDescription,
          sequencePosition: slide.slideNumber,
          totalInSequence: carousel.slides_content.length,
        } : undefined,
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

      // Phase F: Use AI-extracted scene description for better seamless continuity
      if (isSeamless) {
        previousSceneDescription = result?.sceneDescription || slide.objective || slide.fullPrompt.slice(0, 200);
      }

      setGeneratingProgress(prev => prev + 1);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    setGeneratingAll(false);
    setGeneratingProgress(0);
    setCurrentGeneratingSlide(null);
    setGeneratingStartTime(null);

    if (successCount === carousel.slides_content.length) {
      toast.success(`🎉 Đã tạo xong ${successCount} ảnh!`);
      
      // Phase 2: Non-blocking seamless consistency validation — use collected URLs
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
    // Match hex colors
    const hexMatches = colorText.match(/#[0-9A-Fa-f]{3,8}/g);
    if (hexMatches && hexMatches.length > 0) return hexMatches;
    // Match common color keywords from design descriptions
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
    // Re-assign slideNumbers
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] xs:w-full h-[95vh] xs:h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-3 xs:px-6 pt-3 xs:pt-6 pb-3 xs:pb-4 border-b border-border/50">
          <div className="flex flex-col xs:flex-row xs:items-start xs:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col xs:flex-row xs:items-start justify-between gap-2 mb-2">
                <DialogTitle className="text-base xs:text-xl font-bold line-clamp-2">
                  {carousel.title}
                </DialogTitle>
                <StatusSelector 
                  status={(carousel.status as ContentStatus) || 'draft'} 
                  onStatusChange={handleStatusChange}
                  disabled={generatingAll}
                />
              </div>
              <p className="text-xs xs:text-sm text-muted-foreground mb-2 xs:mb-3 line-clamp-2">{carousel.topic}</p>
              <div className="flex flex-wrap items-center gap-1.5 xs:gap-2">
                <Badge variant="secondary" className="text-[10px] xs:text-xs">{platformLabels[carousel.platform]}</Badge>
                <Badge variant="outline" className="text-[10px] xs:text-xs">
                  <Images className="w-2.5 h-2.5 xs:w-3 xs:h-3 mr-0.5 xs:mr-1" />
                  {carousel.slide_count} slides
                </Badge>
                {carousel.carousel_style && (() => {
                  const styleOpt = CAROUSEL_STYLE_OPTIONS.find(s => s.value === carousel.carousel_style);
                  const StyleIcon = styleOpt ? STYLE_ICON_MAP[styleOpt.icon] : null;
                  return (
                    <Badge variant="outline" className="text-[10px] xs:text-xs bg-accent/30 gap-1">
                      {StyleIcon ? <StyleIcon className="w-3 h-3" /> : '📚'}
                      {styleOpt?.label || carousel.carousel_style}
                    </Badge>
                  );
                })()}
                {carousel.visual_preset && (() => {
                  const presetOpt = VISUAL_PRESET_OPTIONS.find(s => s.value === carousel.visual_preset);
                  const PresetIcon = presetOpt ? PRESET_ICON_MAP[presetOpt.icon] : null;
                  return (
                    <Badge variant="outline" className="text-[10px] xs:text-xs bg-primary/10 border-primary/30 gap-1">
                      {PresetIcon ? <PresetIcon className="w-3 h-3" /> : '✨'}
                      {presetOpt?.label || carousel.visual_preset}
                    </Badge>
                  );
                })()}
                <Badge variant="outline" className="text-[10px] xs:text-xs hidden xs:inline-flex">{carousel.brand_name}</Badge>
              </div>
              {/* Creator & Time - Hidden on very small screens */}
              <div className="hidden xs:flex flex-wrap items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                <span>Tạo bởi:</span>
                <CreatorCell profile={creatorProfile} isLoading={isLoadingProfile} />
                <span className="mx-1">•</span>
                <span>{new Date(carousel.created_at).toLocaleDateString('vi-VN')}</span>
              </div>
              {/* Industry Guardrail Badge */}
              <IndustryGuardrailBadge 
                industryMemory={industryMemory} 
                isLoading={isLoadingIndustry}
                className="mt-2"
              />
            </div>
            <div className="flex gap-1.5 xs:gap-2 shrink-0">
              {/* Facebook Publish */}
              {generatedImages.length > 0 && (
                <DirectPublishButton
                  content={carousel.caption_suggestion || carousel.topic}
                  contentId={carousel.id}
                  channel="facebook"
                  brandTemplateId={brandTemplate?.id}
                  mediaUrls={generatedImages.map(img => img.imageUrl)}
                  variant="outline"
                  size="sm"
                  className="h-7 xs:h-8 text-[10px] xs:text-xs px-2 xs:px-3"
                />
              )}
              {/* Performance Tracking - only when published */}
              {carousel.status === 'published' && (
                <TopicPerformanceUpdater
                  contentId={carousel.id}
                  onUpdate={() => {}}
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border hover:border-emerald-500 hover:bg-emerald-500/10 h-7 xs:h-8 text-[10px] xs:text-xs px-2 xs:px-3"
                    >
                      <TrendingUp className="w-3 h-3 xs:w-4 xs:h-4" />
                      <span className="hidden xs:inline ml-1.5">Hiệu suất</span>
                    </Button>
                  }
                />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportTxt}
                className="h-7 xs:h-8 text-[10px] xs:text-xs px-2 xs:px-3"
              >
                <Download className="w-3 h-3 xs:w-4 xs:h-4" />
                <span className="hidden xs:inline ml-1.5">Export</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyAll}
                className="h-7 xs:h-8 text-[10px] xs:text-xs px-2 xs:px-3"
              >
                {copiedAll ? (
                  <Check className="w-3 h-3 xs:w-4 xs:h-4 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3 xs:w-4 xs:h-4" />
                )}
                <span className="hidden xs:inline ml-1.5">Copy</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="preview" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 xs:px-6 pt-2 space-y-2 xs:space-y-3">
            <TabsList className="w-full xs:w-fit h-auto flex-wrap justify-start gap-1">
              <TabsTrigger value="preview" className="gap-1 xs:gap-1.5 text-[10px] xs:text-sm px-2 xs:px-3 py-1.5">
                <LayoutGrid className="w-3 h-3 xs:w-4 xs:h-4" />
                <span className="hidden xs:inline">Preview</span>
              </TabsTrigger>
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
                <span className="hidden xs:inline">Caption</span>
              </TabsTrigger>
              <TabsTrigger value="cta" className="gap-1 xs:gap-1.5 text-[10px] xs:text-sm px-2 xs:px-3 py-1.5">
                <Megaphone className="w-3 h-3 xs:w-4 xs:h-4" />
                <span className="hidden xs:inline">CTA</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-3 xs:px-6 py-3 xs:py-4">
            <TabsContent value="preview" className="mt-0 space-y-4">
              <CarouselLayoutPreview
                slides={carousel.slides_content}
                visualPreset={carousel.visual_preset as VisualPresetType}
                carouselStyle={carousel.carousel_style as CarouselStyleType}
                platform={carousel.platform}
              />
              {/* Seamless consistency result card */}
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
                    {/* Slide progress steps */}
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
                    {/* Progress bar + info */}
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

            <TabsContent value="images" className="mt-0">
              <GeneratedImagesGallery
                images={generatedImages}
                totalSlides={carousel.slide_count}
                slides={carousel.slides_content}
                carouselTitle={carousel.title}
                onDeleteImage={handleDeleteImage}
                onGenerateAll={handleGenerateAllImages}
              />
            </TabsContent>

            <TabsContent value="caption" className="mt-0">
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
            </TabsContent>

            <TabsContent value="cta" className="mt-0">
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
