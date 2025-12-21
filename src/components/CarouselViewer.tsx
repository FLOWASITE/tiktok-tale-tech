import { Carousel } from '@/types/carousel';
import { SlidePromptCard } from './SlidePromptCard';
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
import { Copy, Check, Images, MessageSquare, Megaphone, Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatAllSlidesPrompt } from '@/utils/parseCarouselSlides';

interface CarouselViewerProps {
  carousel: Carousel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function CarouselViewer({ carousel, open, onOpenChange }: CarouselViewerProps) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedCta, setCopiedCta] = useState(false);

  if (!carousel) return null;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-bold mb-2">
                {carousel.title}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mb-3">{carousel.topic}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{platformLabels[carousel.platform]}</Badge>
                <Badge variant="outline">
                  <Images className="w-3 h-3 mr-1" />
                  {carousel.slide_count} slides
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  {aiToolLabels[carousel.ai_tool]}
                </Badge>
                <Badge variant="outline">{carousel.brand_name}</Badge>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportTxt}
              >
                <Download className="w-4 h-4" />
                <span className="ml-1.5">Export TXT</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyAll}
              >
                {copiedAll ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span className="ml-1.5">Copy Tất Cả</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="slides" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 w-fit">
            <TabsTrigger value="slides" className="gap-1.5">
              <Images className="w-4 h-4" />
              Prompts ({carousel.slides_content.length})
            </TabsTrigger>
            <TabsTrigger value="caption" className="gap-1.5">
              <MessageSquare className="w-4 h-4" />
              Caption
            </TabsTrigger>
            <TabsTrigger value="cta" className="gap-1.5">
              <Megaphone className="w-4 h-4" />
              CTA
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-6 py-4">
            <TabsContent value="slides" className="mt-0 space-y-4">
              {carousel.slides_content.map((slide) => (
                <SlidePromptCard
                  key={slide.slideNumber}
                  slide={slide}
                  totalSlides={carousel.slide_count}
                />
              ))}
            </TabsContent>

            <TabsContent value="caption" className="mt-0">
              <div className="gradient-card border border-border/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Gợi ý Caption đăng bài
                  </h3>
                  {carousel.caption_suggestion && (
                    <Button variant="outline" size="sm" onClick={handleCopyCaption}>
                      {copiedCaption ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span className="ml-1.5">Copy</span>
                    </Button>
                  )}
                </div>
                {carousel.caption_suggestion ? (
                  <p className="text-sm whitespace-pre-wrap bg-muted/30 p-4 rounded-lg">
                    {carousel.caption_suggestion}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">Chưa có gợi ý caption</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="cta" className="mt-0">
              <div className="gradient-card border border-border/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-primary" />
                    Gợi ý CTA kéo tương tác
                  </h3>
                  {carousel.cta_suggestion && (
                    <Button variant="outline" size="sm" onClick={handleCopyCta}>
                      {copiedCta ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span className="ml-1.5">Copy</span>
                    </Button>
                  )}
                </div>
                {carousel.cta_suggestion ? (
                  <p className="text-sm whitespace-pre-wrap bg-muted/30 p-4 rounded-lg">
                    {carousel.cta_suggestion}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">Chưa có gợi ý CTA</p>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
