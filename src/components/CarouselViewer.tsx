import { Carousel, CarouselStatus, CarouselSlide, CAROUSEL_STYLE_OPTIONS } from '@/types/carousel';
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
import { Copy, Check, Images, MessageSquare, Megaphone, Download, Sparkles, Loader2, ImageIcon, TrendingUp, Send } from 'lucide-react';
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
import { useState, useEffect } from 'react';
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

interface CarouselViewerProps {
  carousel: Carousel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCarouselUpdate?: (updatedCarousel: Carousel) => void;
}

const platformLabels: Record<string, string> = {
  facebook: 'Facebook',
  tiktok: 'TikTok',
};

const aiToolLabels: Record<string, string> = {
  ideogram: 'Ideogram',
  midjourney: 'Midjourney',
  dalle: 'DALL·E',
  leonardo: 'Leonardo',
};

const generateExportContent = (carousel: Carousel): string => {
  const header = `═══════════════════════════════════════════════════════════════
CAROUSEL PROMPTS - ${carousel.title}
═══════════════════════════════════════════════════════════════

📋 Thông tin:
- Chủ đề: ${carousel.topic}
- Nền tảng: ${platformLabels[carousel.platform]}
- Công cụ AI: ${aiToolLabels[carousel.ai_tool]}
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
${slide.textContent}

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

export function CarouselViewer({ carousel, open, onOpenChange, onCarouselUpdate }: CarouselViewerProps) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedCta, setCopiedCta] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { generating, generatedImages, generateImage, getImageForSlide: getGeneratedImage, deleteImage, setImages } = useImageGeneration();
  const { images: savedImages, loading: loadingImages, saveImage, deleteImage: deleteSavedImage, getImageForSlide: getSavedImage } = useCarouselImages(carousel?.id || null);

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

  const handleGenerateImage = async (slideNumber: number, prompt: string) => {
    const slide = carousel.slides_content.find(s => s.slideNumber === slideNumber);
    const imageUrl = await generateImage(prompt, carousel.id, slideNumber, {
      textContent: slide?.textContent,
      platform: carousel.platform,
    });
    if (imageUrl) {
      await saveImage(slideNumber, imageUrl, prompt);
    }
  };

  const handleGenerateAllImages = async () => {
    setGeneratingAll(true);
    toast.info(`Bắt đầu tạo ${carousel.slides_content.length} ảnh...`);

    for (const slide of carousel.slides_content) {
      const imageUrl = await generateImage(slide.fullPrompt, carousel.id, slide.slideNumber, {
        textContent: slide.textContent,
        platform: carousel.platform,
      });
      if (imageUrl) {
        await saveImage(slide.slideNumber, imageUrl, slide.fullPrompt);
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    setGeneratingAll(false);
    toast.success('Đã tạo xong tất cả ảnh!');
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
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] xs:text-xs">
                  {aiToolLabels[carousel.ai_tool]}
                </Badge>
                {carousel.carousel_style && (
                  <Badge variant="outline" className="text-[10px] xs:text-xs bg-accent/30">
                    {CAROUSEL_STYLE_OPTIONS.find(s => s.value === carousel.carousel_style)?.icon || '📚'}{' '}
                    {CAROUSEL_STYLE_OPTIONS.find(s => s.value === carousel.carousel_style)?.label || carousel.carousel_style}
                  </Badge>
                )}
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

        <Tabs defaultValue="slides" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 xs:px-6 pt-2 space-y-2 xs:space-y-3">
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
                <span className="hidden xs:inline">Caption</span>
              </TabsTrigger>
              <TabsTrigger value="cta" className="gap-1 xs:gap-1.5 text-[10px] xs:text-sm px-2 xs:px-3 py-1.5">
                <Megaphone className="w-3 h-3 xs:w-4 xs:h-4" />
                <span className="hidden xs:inline">CTA</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-3 xs:px-6 py-3 xs:py-4">
            <TabsContent value="slides" className="mt-0 space-y-3 xs:space-y-4">
              {/* Generate All Button */}
              <div className="flex justify-end">
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
