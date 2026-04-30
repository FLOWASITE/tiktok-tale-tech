import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Check, Sparkles, Info } from 'lucide-react';
import { ChannelIcon } from '@/components/multichannel/streaming/ChannelIcon';
import {
  SOCIAL_FORMAT_PRESETS,
  SOCIAL_PLATFORM_LABELS,
  SOCIAL_GROUP_LABELS,
  getPlatformsByGroup,
  getPresetByPlatformFormat,
  getPresetById,
  isRecommendedPreset,
  getEstimatedScenes,
  getEstimatedRenderMinutes,
  type SocialPlatform,
  type SocialFormatLength,
  type SocialFormatPreset,
  type SocialGroup,
  type AspectRatio,
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
  'fb-reels': 'facebook',
  pinterest: 'pinterest',
  threads: 'threads',
  facebook: 'facebook',
  linkedin: 'linkedin',
  x: 'twitter',
  youtube: 'youtube',
};

const SHORT_FORM_PLATFORMS = getPlatformsByGroup('short-form');
const LONG_FORM_PLATFORMS = getPlatformsByGroup('long-form');

/** Mini visual rectangle thể hiện aspect ratio */
function AspectMini({ ratio, active }: { ratio: AspectRatio; active?: boolean }) {
  const dims =
    ratio === '9:16'
      ? 'w-2.5 h-[18px]'
      : ratio === '16:9'
      ? 'w-[18px] h-2.5'
      : ratio === '2:3'
      ? 'w-3 h-[18px]'
      : ratio === '4:5'
      ? 'w-[14px] h-[18px]'
      : 'w-3 h-3';
  return (
    <span
      className={cn(
        'inline-block rounded-[2px] border transition-colors shrink-0',
        active
          ? 'bg-foreground/30 border-foreground/40'
          : 'bg-foreground/10 border-foreground/20',
        dims,
      )}
      aria-label={`Aspect ${ratio}`}
    />
  );
}

interface SocialFormatPickerProps {
  value?: string; // preset id
  onChange: (preset: SocialFormatPreset) => void;
  disabled?: boolean;
}

interface PlatformGroupRowProps {
  group: SocialGroup;
  platforms: SocialPlatform[];
  activePlatform: SocialPlatform;
  currentPlatform?: SocialPlatform;
  disabled?: boolean;
  onSelect: (p: SocialPlatform) => void;
  desktopCols: string;
  /** Mobile layout: 'scroll' for horizontal scroll-snap, or grid cols class */
  mobileLayout: 'scroll' | string;
}

function PlatformGroupRow({
  group,
  platforms,
  activePlatform,
  currentPlatform,
  disabled,
  onSelect,
  desktopCols,
  mobileLayout,
}: PlatformGroupRowProps) {
  const meta = SOCIAL_GROUP_LABELS[group];
  const isMobileScroll = mobileLayout === 'scroll';

  const buttonNode = (platform: SocialPlatform) => {
    const isActive = activePlatform === platform;
    const isCurrent = currentPlatform === platform;
    return (
      <button
        key={platform}
        type="button"
        disabled={disabled}
        onClick={() => onSelect(platform)}
        className={cn(
          'relative group flex flex-col items-center gap-1 p-2 rounded-lg border transition-all',
          isMobileScroll && 'min-w-[68px] snap-start md:min-w-0',
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
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[10px] font-semibold text-foreground/80 tracking-wide uppercase">
          {meta.label}
        </p>
        <span className="text-[9px] text-muted-foreground/70 truncate ml-2">
          {meta.description}
        </span>
      </div>
      {isMobileScroll ? (
        <div
          className={cn(
            'flex gap-1.5 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1',
            'md:grid md:gap-1.5 md:overflow-visible md:snap-none md:mx-0 md:px-0',
            desktopCols,
            'scrollbar-hide',
          )}
          style={{ scrollbarWidth: 'none' }}
        >
          {platforms.map(buttonNode)}
        </div>
      ) : (
        <div className={cn('grid gap-1.5', mobileLayout, desktopCols)}>
          {platforms.map(buttonNode)}
        </div>
      )}
    </div>
  );
}

export function SocialFormatPicker({ value, onChange, disabled }: SocialFormatPickerProps) {
  const currentPreset = getPresetById(value);
  const [activePlatform, setActivePlatform] = useState<SocialPlatform>(
    currentPreset?.platform ?? 'tiktok',
  );

  // Keep activePlatform in sync if value changes externally (e.g. quick-pick chip)
  useEffect(() => {
    if (currentPreset && currentPreset.platform !== activePlatform) {
      setActivePlatform(currentPreset.platform);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="space-y-4">
      {/* Short-form group */}
      <PlatformGroupRow
        group="short-form"
        platforms={SHORT_FORM_PLATFORMS}
        activePlatform={activePlatform}
        currentPlatform={currentPreset?.platform}
        disabled={disabled}
        onSelect={setActivePlatform}
        mobileLayout="scroll"
        desktopCols="md:grid-cols-5"
      />

      {/* Long-form group */}
      <PlatformGroupRow
        group="long-form"
        platforms={LONG_FORM_PLATFORMS}
        activePlatform={activePlatform}
        currentPlatform={currentPreset?.platform}
        disabled={disabled}
        onSelect={setActivePlatform}
        mobileLayout="grid-cols-2"
        desktopCols="md:grid-cols-4"
      />

      {/* Format segmented */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-foreground/80 tracking-wide uppercase">
            Độ dài
          </p>
          <span className="text-[9px] text-muted-foreground/70 truncate ml-2 max-w-[60%] text-right">
            {SOCIAL_PLATFORM_LABELS[activePlatform].tagline}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(['short', 'standard', 'long'] as SocialFormatLength[]).map((fmt) => {
            const preset = getPresetByPlatformFormat(activePlatform, fmt);
            if (!preset) return null;
            const isSelected = value === preset.id;
            const isRecommended = isRecommendedPreset(preset);
            return (
              <button
                key={preset.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(preset)}
                className={cn(
                  'relative flex flex-col items-start gap-1 p-2.5 rounded-lg border text-left transition-all',
                  isSelected
                    ? 'border-foreground/40 bg-foreground/[0.05] shadow-sm ring-1 ring-foreground/10'
                    : 'border-border/40 bg-background hover:border-foreground/20 hover:bg-muted/30',
                  disabled && 'opacity-50 cursor-not-allowed',
                )}
              >
                {/* Recommended badge */}
                {isRecommended && !isSelected && (
                  <span className="absolute top-1 right-1 inline-flex items-center gap-0.5 px-1 py-0.5 rounded-sm bg-foreground/8 text-[8px] font-medium text-foreground/70 tracking-tight">
                    <Sparkles className="w-2 h-2" />
                    Phổ biến
                  </span>
                )}
                {isSelected && (
                  <Check className="absolute top-1.5 right-1.5 w-3 h-3 text-foreground" />
                )}

                {/* Format label */}
                <span className="text-[11px] font-semibold text-foreground">
                  {FORMAT_LABELS[fmt].vi}
                </span>

                {/* Duration + aspect mini */}
                <div className="flex items-center gap-1.5 w-full">
                  <span className="text-sm font-bold tracking-tight text-foreground">
                    {preset.shortLabel}
                  </span>
                  <AspectMini ratio={preset.aspectRatio} active={isSelected} />
                  <span className="text-[9px] text-muted-foreground/80 font-mono ml-auto">
                    {preset.aspectRatio}
                  </span>
                </div>

                {/* Description (tone/use-case) */}
                <span className="text-[9px] text-muted-foreground/80 leading-tight line-clamp-2 min-h-[20px]">
                  {preset.description}
                </span>
              </button>
            );
          })}
        </div>

        {/* Alert card khi duration > 60s */}
        {currentPreset && currentPreset.duration > 60 && (() => {
          const scenes = getEstimatedScenes(currentPreset.duration);
          const renderMin = getEstimatedRenderMinutes(scenes);
          return (
            <div className="mt-3 flex gap-2 p-2.5 rounded-lg border border-foreground/15 bg-foreground/[0.03]">
              <Info className="w-3.5 h-3.5 text-foreground/60 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-0.5">
                <p className="text-[11px] font-medium text-foreground/90 leading-tight">
                  Video sẽ chia thành {scenes} scenes × 10s
                </p>
                <p className="text-[10px] text-muted-foreground/80 leading-snug">
                  Do giới hạn AI video model. Ước tính render: ~{renderMin} phút.
                </p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
