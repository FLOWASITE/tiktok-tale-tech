import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { ChannelIcon } from '@/components/multichannel/streaming/ChannelIcon';
import {
  SOCIAL_FORMAT_PRESETS,
  SOCIAL_PLATFORM_LABELS,
  type SocialPlatform,
  type SocialFormatLength,
  type SocialFormatPreset,
  getPresetByPlatformFormat,
  getPresetById,
} from '@/types/socialFormat';

const FORMAT_LABELS: Record<SocialFormatLength, { label: string; vi: string }> = {
  short: { label: 'Short', vi: 'Ngắn' },
  standard: { label: 'Standard', vi: 'Vừa' },
  long: { label: 'Long', vi: 'Dài' },
};

/** Map platform → ChannelIcon key */
const PLATFORM_ICON_KEY: Record<SocialPlatform, string> = {
  tiktok: 'tiktok',
  reels: 'instagram',
  shorts: 'youtube',
  facebook: 'facebook',
  linkedin: 'linkedin',
  youtube: 'youtube',
};

const PLATFORMS: SocialPlatform[] = ['tiktok', 'reels', 'shorts', 'facebook', 'linkedin', 'youtube'];

interface SocialFormatPickerProps {
  value?: string; // preset id
  onChange: (preset: SocialFormatPreset) => void;
  disabled?: boolean;
}

export function SocialFormatPicker({ value, onChange, disabled }: SocialFormatPickerProps) {
  const currentPreset = getPresetById(value);
  const [activePlatform, setActivePlatform] = useState<SocialPlatform>(
    currentPreset?.platform ?? 'tiktok',
  );

  const formatsForPlatform = useMemo(
    () => SOCIAL_FORMAT_PRESETS.filter((p) => p.platform === activePlatform),
    [activePlatform],
  );

  return (
    <div className="space-y-3">
      {/* Platform row */}
      <div>
        <p className="text-[10px] font-medium text-muted-foreground/70 tracking-wide uppercase mb-2">
          Platform
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {PLATFORMS.map((platform) => {
            const isActive = activePlatform === platform;
            const isCurrent = currentPreset?.platform === platform;
            return (
              <button
                key={platform}
                type="button"
                disabled={disabled}
                onClick={() => setActivePlatform(platform)}
                className={cn(
                  'group flex flex-col items-center gap-1 p-2 rounded-lg border transition-all',
                  isActive
                    ? 'border-foreground/30 bg-foreground/[0.04]'
                    : 'border-border/40 bg-background hover:border-foreground/20 hover:bg-muted/30',
                  disabled && 'opacity-50 cursor-not-allowed',
                )}
                title={SOCIAL_PLATFORM_LABELS[platform].tagline}
              >
                <ChannelIcon channel={PLATFORM_ICON_KEY[platform]} size="sm" />
                <span
                  className={cn(
                    'text-[10px] font-medium tracking-tight truncate w-full text-center',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {SOCIAL_PLATFORM_LABELS[platform].label}
                </span>
                {isCurrent && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-foreground/80 flex items-center justify-center">
                    <Check className="w-2 h-2 text-background" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Format segmented */}
      <div>
        <p className="text-[10px] font-medium text-muted-foreground/70 tracking-wide uppercase mb-2">
          Độ dài · {SOCIAL_PLATFORM_LABELS[activePlatform].tagline}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {(['short', 'standard', 'long'] as SocialFormatLength[]).map((fmt) => {
            const preset = getPresetByPlatformFormat(activePlatform, fmt);
            if (!preset) return null;
            const isSelected = value === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(preset)}
                className={cn(
                  'flex flex-col items-start gap-0.5 p-2.5 rounded-lg border text-left transition-all',
                  isSelected
                    ? 'border-foreground/40 bg-foreground/[0.05] shadow-sm'
                    : 'border-border/40 bg-background hover:border-foreground/20 hover:bg-muted/30',
                  disabled && 'opacity-50 cursor-not-allowed',
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-semibold text-foreground">
                    {FORMAT_LABELS[fmt].vi}
                  </span>
                  {isSelected && <Check className="w-3 h-3 text-foreground" />}
                </div>
                <span className="text-sm font-bold tracking-tight text-foreground">
                  {preset.shortLabel}
                </span>
                <span className="text-[9px] text-muted-foreground/80 font-mono">
                  {preset.aspectRatio}
                </span>
              </button>
            );
          })}
        </div>
        {currentPreset && currentPreset.duration > 60 && (
          <p className="text-[10px] text-muted-foreground/70 mt-2 leading-relaxed">
            ⓘ Sẽ chia thành {Math.ceil(currentPreset.duration / 10)} scenes × 10s do giới hạn AI video model.
          </p>
        )}
      </div>
    </div>
  );
}
