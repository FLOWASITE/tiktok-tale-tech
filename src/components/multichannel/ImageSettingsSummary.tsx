import { Sparkles, Ratio, Image, AlignCenter } from 'lucide-react';
import type { AspectRatioOption, ImageStylePreset } from '@/hooks/useAutoImageGeneration';
import type { LogoPosition } from './LogoOptionsPanel';

interface ImageSettingsSummaryProps {
  imageStyle: ImageStylePreset | 'auto';
  aspectRatio: AspectRatioOption;
  includeLogo: boolean;
  logoPosition: LogoPosition;
  hasBrandLogo: boolean;
  imageContentType: 'background_only' | 'with_text';
}

const STYLE_LABELS: Record<string, string> = {
  auto: 'Tự động',
  photorealistic: 'Chân thực',
  illustration: 'Minh họa',
  minimalist: 'Tối giản',
  '3d_render': '3D',
  flat_design: 'Flat',
  watercolor: 'Màu nước',
  cinematic: 'Điện ảnh',
};

const LOGO_POS_LABELS: Record<string, string> = {
  'top-left': 'TL', 'top-center': 'TC', 'top-right': 'TR',
  'center-left': 'CL', 'center': 'C', 'center-right': 'CR',
  'bottom-left': 'BL', 'bottom-center': 'BC', 'bottom-right': 'BR',
};

export function ImageSettingsSummary({
  imageStyle, aspectRatio, includeLogo, logoPosition, hasBrandLogo, imageContentType,
}: ImageSettingsSummaryProps) {
  const parts: { icon: React.ReactNode; label: string }[] = [
    {
      icon: <Sparkles className="w-3 h-3" />,
      label: STYLE_LABELS[imageStyle] ?? imageStyle,
    },
    {
      icon: <Ratio className="w-3 h-3" />,
      label: aspectRatio === 'auto' ? 'Tỉ lệ tự động' : aspectRatio,
    },
  ];

  if (hasBrandLogo) {
    parts.push({
      icon: <Image className="w-3 h-3" />,
      label: includeLogo ? `Logo ${LOGO_POS_LABELS[logoPosition] ?? logoPosition}` : 'Không logo',
    });
  }

  if (imageContentType === 'with_text') {
    parts.push({
      icon: <AlignCenter className="w-3 h-3" />,
      label: 'Có text',
    });
  }

  return (
    <div className="flex items-center flex-wrap gap-1.5 px-1">
      {parts.map((p, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/40 rounded-full px-2 py-0.5"
        >
          {p.icon}
          {p.label}
        </span>
      ))}
    </div>
  );
}
