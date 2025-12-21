import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CarouselFormData,
  Platform,
  AITool,
  DEFAULT_BRAND_GUIDELINE,
  PLATFORM_OPTIONS,
  AI_TOOL_OPTIONS,
  SLIDE_COUNT_OPTIONS,
} from '@/types/carousel';
import { Images, Loader2 } from 'lucide-react';

interface CarouselFormProps {
  onSubmit: (data: CarouselFormData) => void;
  isLoading: boolean;
}

export function CarouselForm({ onSubmit, isLoading }: CarouselFormProps) {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState<Platform>('facebook');
  const [slideCount, setSlideCount] = useState(6);
  const [aiTool, setAiTool] = useState<AITool>('ideogram');
  const [brandName, setBrandName] = useState('Thuế Hộ by TAF.vn');
  const [brandGuideline, setBrandGuideline] = useState(DEFAULT_BRAND_GUIDELINE);
  const [includeLogo, setIncludeLogo] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    onSubmit({
      topic: topic.trim(),
      platform,
      slideCount,
      aiTool,
      brandName: brandName.trim(),
      brandGuideline: brandGuideline.trim(),
      includeLogo,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Topic */}
      <div className="space-y-2">
        <Label htmlFor="topic" className="text-sm font-medium">
          Chủ đề Carousel <span className="text-destructive">*</span>
        </Label>
        <Input
          id="topic"
          placeholder="VD: Bỏ thuế khoán từ 2026 - Hộ kinh doanh cần chuẩn bị gì?"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="bg-background/50 border-border/50 focus:border-primary"
        />
      </div>

      {/* Platform & Slide Count */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Nền tảng</Label>
          <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
            <SelectTrigger className="bg-background/50 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {PLATFORM_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Số lượng ảnh</Label>
          <Select value={String(slideCount)} onValueChange={(v) => setSlideCount(Number(v))}>
            <SelectTrigger className="bg-background/50 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {SLIDE_COUNT_OPTIONS.map((count) => (
                <SelectItem key={count} value={String(count)}>
                  {count} ảnh
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* AI Tool */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Công cụ tạo ảnh AI</Label>
        <Select value={aiTool} onValueChange={(v) => setAiTool(v as AITool)}>
          <SelectTrigger className="bg-background/50 border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {AI_TOOL_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex items-center gap-2">
                  <span>{opt.label}</span>
                  <span className="text-xs text-muted-foreground">({opt.description})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Brand Name */}
      <div className="space-y-2">
        <Label htmlFor="brandName" className="text-sm font-medium">
          Tên Brand
        </Label>
        <Input
          id="brandName"
          placeholder="VD: Thuế Hộ by TAF.vn"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          className="bg-background/50 border-border/50 focus:border-primary"
        />
      </div>

      {/* Brand Guideline */}
      <div className="space-y-2">
        <Label htmlFor="brandGuideline" className="text-sm font-medium">
          Brand Guideline
        </Label>
        <Textarea
          id="brandGuideline"
          placeholder="Nhập hướng dẫn về thương hiệu..."
          value={brandGuideline}
          onChange={(e) => setBrandGuideline(e.target.value)}
          rows={5}
          className="bg-background/50 border-border/50 focus:border-primary text-sm"
        />
      </div>

      {/* Include Logo */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="includeLogo"
          checked={includeLogo}
          onCheckedChange={(checked) => setIncludeLogo(checked as boolean)}
        />
        <Label htmlFor="includeLogo" className="text-sm font-normal cursor-pointer">
          Bao gồm logo trong thiết kế
        </Label>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={!topic.trim() || isLoading}
        className="w-full gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Đang tạo prompts...
          </>
        ) : (
          <>
            <Images className="w-4 h-4 mr-2" />
            Tạo Prompt Carousel
          </>
        )}
      </Button>
    </form>
  );
}
