import { Sparkles, Palette, Ratio, MapPin, Type, LayoutGrid, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { SuggestionV3 } from '@/lib/imageSuggestionEngine';
import type { Channel } from '@/types/multichannel';

interface AIReadyCardProps {
  selectedChannels: Channel[];
  v3TopSuggestion?: SuggestionV3;
  previewKeywords: string[];
  topic?: string;
  isGenerating: boolean;
  isDecomposing: boolean;
  onGenerate: () => void;
}

const STYLE_LABELS: Record<string, string> = {
  photorealistic: 'Chân thực', illustration: 'Minh họa', minimalist: 'Tối giản',
  '3d_render': '3D Render', flat_design: 'Flat Design', watercolor: 'Màu nước',
  cinematic: 'Điện ảnh', abstract: 'Trừu tượng', geometric: 'Hình học',
  isometric: 'Isometric', gradient: 'Gradient', product_only: 'Sản phẩm',
};

interface CheckItem {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}

export function AIReadyCard({
  selectedChannels,
  v3TopSuggestion,
  previewKeywords,
  topic,
  isGenerating,
  isDecomposing,
  onGenerate,
}: AIReadyCardProps) {
  const styleName = v3TopSuggestion
    ? STYLE_LABELS[v3TopSuggestion.style] || v3TopSuggestion.style
    : 'Tự động';
  const scoreText = v3TopSuggestion ? `${v3TopSuggestion.matchPercentage}%` : '';

  const checks: CheckItem[] = [
    {
      icon: <Palette className="w-3.5 h-3.5" />,
      label: 'Phong cách',
      value: scoreText ? `${styleName} — ${scoreText} phù hợp` : styleName,
      highlight: true,
    },
    {
      icon: <Ratio className="w-3.5 h-3.5" />,
      label: 'Tỉ lệ',
      value: 'Tự động theo kênh',
    },
    {
      icon: <MapPin className="w-3.5 h-3.5" />,
      label: 'Logo',
      value: 'Tự động theo kênh',
    },
    {
      icon: <Type className="w-3.5 h-3.5" />,
      label: 'Text',
      value: 'AI tự quyết định',
    },
    {
      icon: <LayoutGrid className="w-3.5 h-3.5" />,
      label: 'Layout',
      value: 'AI chọn tối ưu',
    },
  ];

  return (
    <div className="relative rounded-2xl border-2 border-primary/25 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-purple-500/4 to-blue-500/6 pointer-events-none" />
      {/* Subtle animated shimmer */}
      <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,hsl(var(--primary)/0.04)_50%,transparent_75%)] bg-[length:250%_100%] animate-[shimmer_3s_ease-in-out_infinite] pointer-events-none" />

      <div className="relative p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/15">
            <Sparkles className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">AI đã sẵn sàng tạo ảnh</h3>
            <p className="text-[11px] text-muted-foreground">Mọi thông số đã được tối ưu tự động</p>
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-1.5">
          {checks.map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 text-xs">
              <span className={cn(
                "flex items-center justify-center w-5 h-5 rounded-md shrink-0",
                item.highlight ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground"
              )}>
                {item.icon}
              </span>
              <span className="text-muted-foreground w-16 shrink-0">{item.label}</span>
              <span className={cn(
                "font-medium truncate",
                item.highlight ? "text-primary" : "text-foreground"
              )}>
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Keywords */}
        {previewKeywords.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground font-medium">Từ khóa nội dung</p>
            <div className="flex flex-wrap gap-1.5">
              {previewKeywords.map((kw, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium border border-primary/15"
                >
                  {kw}
                </span>
              ))}
            </div>
            {topic && (
              <p className="text-[11px] text-muted-foreground/70 truncate">
                Chủ đề: {topic}
              </p>
            )}
          </div>
        )}

        {/* CTA Button */}
        <Button
          onClick={onGenerate}
          disabled={isGenerating || selectedChannels.length === 0}
          title={
            isGenerating
              ? 'Đang tạo ảnh...'
              : selectedChannels.length === 0
              ? 'Vui lòng chọn ít nhất 1 kênh'
              : isDecomposing
              ? 'Tạo ngay (AI gợi ý layout đang chạy nền)'
              : 'Tạo ảnh AI cho các kênh đã chọn'
          }
          className={cn(
            "w-full h-12 gap-2.5 text-base font-semibold rounded-xl transition-all",
            "bg-gradient-to-r from-primary to-primary/80",
            "hover:from-primary/90 hover:to-primary/70",
            "shadow-[0_0_20px_-4px_hsl(var(--primary)/0.35)]",
            "hover:shadow-[0_0_28px_-4px_hsl(var(--primary)/0.5)]",
          )}
          size="lg"
        >
          {isGenerating ? (
            <><Loader2 className="w-4.5 h-4.5 animate-spin" /> Đang tạo...</>
          ) : (
            <><Sparkles className="w-4.5 h-4.5" /> Tạo {selectedChannels.length} ảnh AI{isDecomposing ? ' (layout chạy nền)' : ''}</>
          )}
        </Button>
      </div>
    </div>
  );
}
