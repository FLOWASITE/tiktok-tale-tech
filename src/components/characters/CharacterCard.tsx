import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { User, Edit2, Copy, Trash2, Tag, ImageIcon, Mic, Sparkles, Loader2, Star, RefreshCw, UserCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CharacterProfile, CharacterAppearance } from '@/hooks/useCharacterProfiles';
import { calcCompleteness } from '@/lib/characterSchema';

interface Props {
  profile: CharacterProfile;
  brandName?: string | null;
  isCrossBrand?: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onClone: () => void;
  onDelete: () => void;
  onGenerateAvatar?: () => void;
  isGeneratingAvatar?: boolean;
  onToggleRole?: (next: 'main' | 'supporting') => void;
  isUpdatingRole?: boolean;
}

function CompletenessRing({ pct }: { pct: number }) {
  const r = 10;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const colorClass =
    pct >= 80 ? 'text-emerald-500' : pct >= 50 ? 'text-amber-500' : 'text-muted-foreground';
  return (
    <div className="relative w-7 h-7" title={`Hoàn thiện ${pct}%`}>
      <svg className="w-7 h-7 -rotate-90" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r={r} stroke="currentColor" strokeWidth="2" fill="none" className="text-muted/40" />
        <circle
          cx="14"
          cy="14"
          r={r}
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className={colorClass}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-medium tabular-nums">
        {pct}
      </span>
    </div>
  );
}

export function CharacterCard({
  profile,
  brandName,
  isCrossBrand,
  selected,
  onToggleSelect,
  onOpen,
  onEdit,
  onClone,
  onDelete,
  onGenerateAvatar,
  isGeneratingAvatar,
  onToggleRole,
  isUpdatingRole,
}: Props) {
  const app = (profile.appearance ?? {}) as CharacterAppearance;
  const refCount = Array.isArray(profile.reference_images) ? profile.reference_images.length : 0;
  const pct = useMemo(() => calcCompleteness(profile), [profile]);
  const hasVoice = !!profile.default_voice_id;

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all cursor-pointer',
        'ring-1 ring-border/40 hover:ring-foreground/15 hover:shadow-md',
        selected && 'ring-2 ring-foreground/30 bg-muted/20',
      )}
      onClick={onOpen}
    >
      {/* Checkbox */}
      <div
        className={cn(
          'absolute top-2 left-2 z-10 transition-opacity',
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
      >
        <Checkbox checked={selected} className="h-4 w-4 bg-background/80 backdrop-blur" />
      </div>

      {/* Hero image */}
      <div className="relative aspect-[5/4] bg-muted/30 overflow-hidden">
        {profile.reference_image_url ? (
          <img
            src={profile.reference_image_url}
            alt={profile.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <User className="w-10 h-10 text-muted-foreground/30" />
            {onGenerateAvatar && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-[11px] gap-1.5 bg-background/85 backdrop-blur"
                disabled={isGeneratingAvatar}
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateAvatar();
                }}
              >
                {isGeneratingAvatar ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> Đang tạo…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" /> Tạo ảnh AI
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Regenerating overlay */}
        {isGeneratingAvatar && profile.reference_image_url && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-1.5 z-20">
            <Loader2 className="w-5 h-5 animate-spin text-foreground" />
            <span className="text-[11px] font-medium">Đang tạo lại…</span>
          </div>
        )}

        {/* Top-right badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          <CompletenessRing pct={pct} />
          {(() => {
            const isMain = profile.default_role === 'main';
            const next = isMain ? 'supporting' : 'main';
            const label = isMain ? 'Vai chính' : 'Vai phụ';
            const Icon = isUpdatingRole ? Loader2 : isMain ? Star : UserCircle2;
            return (
              <button
                type="button"
                disabled={isUpdatingRole || !onToggleRole}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleRole?.(next);
                }}
                title={onToggleRole ? `Đổi sang ${isMain ? 'Vai phụ' : 'Vai chính'}` : label}
                className={cn(
                  'inline-flex items-center gap-1 h-5 px-1.5 rounded-md text-[10px] font-medium border backdrop-blur transition-colors',
                  isMain
                    ? 'bg-amber-500/90 text-white border-amber-400/40 hover:bg-amber-500'
                    : 'bg-background/85 text-foreground/80 border-border/60 hover:bg-background',
                  (isUpdatingRole || !onToggleRole) && 'cursor-default opacity-80',
                )}
              >
                <Icon className={cn('w-2.5 h-2.5', isUpdatingRole && 'animate-spin', isMain && !isUpdatingRole && 'fill-current')} />
                {label}
              </button>
            );
          })()}
        </div>

        {/* Regenerate avatar — always visible when avatar exists */}
        {profile.reference_image_url && onGenerateAvatar && (
          <button
            type="button"
            disabled={isGeneratingAvatar}
            onClick={(e) => {
              e.stopPropagation();
              onGenerateAvatar();
            }}
            title="Tạo lại ảnh AI"
            className="absolute top-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-medium bg-background/85 text-foreground/80 border border-border/60 backdrop-blur hover:bg-background transition-colors disabled:opacity-70 opacity-0 group-hover:opacity-100"
          >
            {isGeneratingAvatar ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Tạo lại
          </button>
        )}

        {/* Bottom badges */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1 flex-wrap">
          {refCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 gap-1 text-[10px] bg-background/85 backdrop-blur">
              <ImageIcon className="w-2.5 h-2.5" /> {refCount}
            </Badge>
          )}
          {hasVoice && (
            <Badge variant="secondary" className="h-5 px-1.5 gap-1 text-[10px] bg-background/85 backdrop-blur">
              <Mic className="w-2.5 h-2.5" /> Voice
            </Badge>
          )}
          {isCrossBrand && brandName && (
            <Badge variant="outline" className="h-5 px-1.5 gap-1 text-[10px] bg-background/85 backdrop-blur ml-auto">
              <Tag className="w-2.5 h-2.5" /> {brandName}
            </Badge>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        <p className="text-sm font-semibold truncate">{profile.name}</p>
        <div className="flex flex-wrap gap-1 mt-1.5 min-h-[18px]">
          {app.gender && <span className="text-[10px] px-1.5 py-0.5 bg-muted/50 rounded">{app.gender}</span>}
          {app.age_range && <span className="text-[10px] px-1.5 py-0.5 bg-muted/50 rounded">{app.age_range}</span>}
          {app.hair && <span className="text-[10px] px-1.5 py-0.5 bg-muted/50 rounded truncate max-w-[100px]">{app.hair}</span>}
        </div>
        {profile.wardrobe && (
          <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{profile.wardrobe}</p>
        )}
      </div>

      {/* Hover actions */}
      <div
        className={cn(
          'absolute right-2 bottom-[58px] flex gap-1',
          'opacity-0 group-hover:opacity-100 transition-opacity',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {profile.reference_image_url && onGenerateAvatar && (
          <Button
            size="icon"
            variant="secondary"
            className="h-7 w-7 bg-background/85 backdrop-blur"
            onClick={onGenerateAvatar}
            disabled={isGeneratingAvatar}
            title="Tạo lại ảnh AI"
          >
            {isGeneratingAvatar ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
          </Button>
        )}
        <Button size="icon" variant="secondary" className="h-7 w-7 bg-background/85 backdrop-blur" onClick={onEdit} title="Sửa">
          <Edit2 className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon" variant="secondary" className="h-7 w-7 bg-background/85 backdrop-blur" onClick={onClone} title="Nhân bản">
          <Copy className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="h-7 w-7 bg-background/85 backdrop-blur text-destructive hover:text-destructive"
          onClick={onDelete}
          title="Xoá"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </Card>
  );
}
