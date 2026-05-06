import { useCallback, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Loader2, Plus, ImageIcon, Star, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import type {
  CharacterAppearance,
  CharacterDefaultRole,
  CharacterProfile,
  CharacterProfileInput,
} from '@/hooks/useCharacterProfiles';

interface GeneratedChar {
  name: string;
  description: string;
  appearance: CharacterAppearance;
  wardrobe: string;
  selected: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  brand: { id: string; name: string; industry?: string | null; tone_of_voice?: string[] | null } | null;
  existingNames: string[];
  onCreateProfile: (input: CharacterProfileInput) => Promise<CharacterProfile>;
  onUpdateProfile: (input: CharacterProfileInput & { id: string }) => Promise<unknown>;
}

const ROLE_PRESETS = ['Bác sĩ', 'KOL review', 'Khách hàng thật', 'Chuyên gia', 'Mentor', 'Founder'];
const COUNT_OPTIONS = [1, 2, 3, 4];

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/60">
      {children}
    </span>
  );
}

export function AIBulkGenerateSheet({
  open,
  onOpenChange,
  brand,
  existingNames,
  onCreateProfile,
  onUpdateProfile,
}: Props) {
  const { currentOrganization } = useOrganizationContext();
  const [roleHint, setRoleHint] = useState('');
  const [charCount, setCharCount] = useState(2);
  const [defaultRole, setDefaultRole] = useState<CharacterDefaultRole>('supporting');
  const [autoGenImage, setAutoGenImage] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedChars, setGeneratedChars] = useState<GeneratedChar[]>([]);
  const [savingBatch, setSavingBatch] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; phase: string } | null>(null);

  const reset = () => {
    setGeneratedChars([]);
    setRoleHint('');
    setCharCount(2);
    setDefaultRole('supporting');
    setProgress(null);
  };

  const generateCharacters = useCallback(async () => {
    if (!brand?.id) {
      toast.error('Vui lòng chọn Brand trước');
      return;
    }
    setGenerating(true);
    setGeneratedChars([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-character', {
        body: {
          brand_template_id: brand.id,
          role_hint: roleHint.trim() || undefined,
          count: charCount,
          existing_names: existingNames,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      const chars: GeneratedChar[] = (data.characters || []).map((c: any) => ({
        name: c.name,
        description: c.description,
        appearance: c.appearance,
        wardrobe: c.wardrobe,
        selected: true,
      }));
      setGeneratedChars(chars);
    } catch (e: any) {
      console.error('[AI Character Manager]', e);
      toast.error(e?.message || 'Không thể tạo nhân vật');
    } finally {
      setGenerating(false);
    }
  }, [brand?.id, roleHint, charCount, existingNames]);

  const generateAvatarFor = useCallback(
    async (profile: { name: string; appearance?: any; wardrobe?: string; description?: string }): Promise<string | null> => {
      if (!currentOrganization?.id) return null;
      try {
        const { data, error } = await supabase.functions.invoke('generate-character-image', {
          body: {
            name: profile.name,
            appearance: profile.appearance ?? {},
            wardrobe: profile.wardrobe ?? '',
            description: profile.description ?? '',
            view: 'front',
            organization_id: currentOrganization.id,
          },
        });
        if (error) throw error;
        if (data?.error) return null;
        return data?.url ?? null;
      } catch (e) {
        console.warn('[generate-character-image] failed', e);
        return null;
      }
    },
    [currentOrganization?.id],
  );

  const saveSelectedGenerated = useCallback(async () => {
    const toSave = generatedChars.filter((c) => c.selected);
    if (toSave.length === 0) return;
    setSavingBatch(true);
    let imgFails = 0;
    try {
      setProgress({ done: 0, total: toSave.length, phase: 'Đang lưu nhân vật' });
      for (let i = 0; i < toSave.length; i++) {
        const c = toSave[i];
        setProgress({
          done: i,
          total: toSave.length,
          phase: autoGenImage ? `Đang tạo ảnh ${i + 1}/${toSave.length}` : `Đang lưu ${i + 1}/${toSave.length}`,
        });
        const created = await onCreateProfile({
          name: c.name,
          description: c.description,
          appearance: c.appearance,
          wardrobe: c.wardrobe,
          brand_template_id: brand?.id ?? null,
          default_role: defaultRole,
        });
        if (autoGenImage && created?.id) {
          const url = await generateAvatarFor(c);
          if (url) {
            try {
              await onUpdateProfile({
                id: created.id,
                name: created.name,
                description: created.description ?? '',
                reference_image_url: url,
                reference_images: [{ url, label: 'front' }],
              });
            } catch (e) {
              imgFails++;
            }
          } else {
            imgFails++;
          }
        }
      }
      setProgress({ done: toSave.length, total: toSave.length, phase: 'Hoàn tất' });
      if (autoGenImage && imgFails > 0) {
        toast.warning(
          `Đã tạo ${toSave.length} nhân vật, ${imgFails}/${toSave.length} ảnh chưa tạo được — bấm "Tạo ảnh AI" trên thẻ để thử lại.`,
        );
      } else {
        toast.success(`Đã tạo ${toSave.length} nhân vật`);
      }
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi khi lưu nhân vật');
    } finally {
      setSavingBatch(false);
    }
  }, [generatedChars, autoGenImage, defaultRole, onCreateProfile, onUpdateProfile, generateAvatarFor, brand?.id, onOpenChange]);

  const tone = brand?.tone_of_voice?.[0];

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-muted to-muted/40 ring-1 ring-border/80 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-foreground/80" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base leading-tight">AI tạo nhân vật từ Brand</SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                Phân tích brand để gợi ý nhân vật phù hợp.
              </SheetDescription>
            </div>
          </div>

          {brand && (
            <div className="flex flex-wrap gap-1.5">
              <Chip>🏷 {brand.name}</Chip>
              {brand.industry && <Chip>{brand.industry}</Chip>}
              {tone && <Chip>Tone: {tone}</Chip>}
              {existingNames.length > 0 && <Chip>Đã có {existingNames.length} nhân vật</Chip>}
            </div>
          )}
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Role hint */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Gợi ý vai trò</Label>
            <Input
              placeholder="VD: Bác sĩ tư vấn, KOL review…"
              value={roleHint}
              onChange={(e) => setRoleHint(e.target.value)}
              className="text-sm h-9"
              disabled={generating}
            />
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {ROLE_PRESETS.map((r) => {
                const active = roleHint === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleHint(active ? '' : r)}
                    disabled={generating}
                    className={cn(
                      'text-[11px] px-2.5 py-1 rounded-full border transition-colors',
                      active
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Số lượng segmented */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Số lượng</Label>
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-lg bg-muted/40 border border-border/60">
              {COUNT_OPTIONS.map((n) => {
                const active = charCount === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCharCount(n)}
                    disabled={generating}
                    className={cn(
                      'h-8 rounded-md text-sm font-medium transition-all',
                      active
                        ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vai mặc định */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Vai mặc định</Label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-muted/40 border border-border/60">
              <button
                type="button"
                onClick={() => setDefaultRole('main')}
                disabled={generating}
                className={cn(
                  'h-9 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-1.5',
                  defaultRole === 'main'
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Star className={cn('w-3.5 h-3.5', defaultRole === 'main' && 'fill-amber-400 text-amber-500')} />
                Vai chính
              </button>
              <button
                type="button"
                onClick={() => setDefaultRole('supporting')}
                disabled={generating}
                className={cn(
                  'h-9 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-1.5',
                  defaultRole === 'supporting'
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <User className="w-3.5 h-3.5" />
                Vai phụ
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Nhân vật tạo ra sẽ được gắn vai này — có thể đổi sau trong từng nhân vật.
            </p>
          </div>

          {/* Auto-gen image */}
          <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
            <div className="space-y-0.5 flex-1 min-w-0">
              <Label htmlFor="auto-gen-image" className="text-xs font-medium flex items-center gap-1.5 cursor-pointer">
                <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                Tự động tạo ảnh chân dung
                <span className="text-[9px] font-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                  +1 credit/nv
                </span>
              </Label>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                AI render ảnh front-view sau khi lưu.
              </p>
            </div>
            <Switch
              id="auto-gen-image"
              checked={autoGenImage}
              onCheckedChange={setAutoGenImage}
              disabled={savingBatch}
            />
          </div>

          {/* Generated cards or skeleton */}
          {generating && (
            <div className="space-y-2">
              {Array.from({ length: charCount }).map((_, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-border/60 bg-muted/20 animate-pulse flex gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 bg-muted rounded" />
                    <div className="h-2 w-2/3 bg-muted rounded" />
                    <div className="h-2 w-1/2 bg-muted rounded" />
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground flex items-center gap-2 justify-center pt-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Đang phân tích brand…
              </p>
            </div>
          )}

          {!generating && generatedChars.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Chọn nhân vật muốn lưu:</Label>
              {generatedChars.map((c, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'p-3 rounded-xl border bg-background transition-all cursor-pointer',
                    c.selected
                      ? 'border-foreground/30 ring-1 ring-foreground/10 shadow-sm'
                      : 'border-border/60 hover:border-border',
                  )}
                  onClick={() =>
                    setGeneratedChars((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, selected: !x.selected } : x)),
                    )
                  }
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-muted to-muted/40 ring-1 ring-border flex items-center justify-center shrink-0 text-xs font-semibold text-foreground/70">
                      {getInitials(c.name) || <User className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold truncate">{c.name}</p>
                        <Checkbox checked={c.selected} className="shrink-0" />
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.appearance?.gender && <Chip>{c.appearance.gender}</Chip>}
                        {c.appearance?.age_range && <Chip>{c.appearance.age_range}</Chip>}
                        {c.appearance?.hair && <Chip>{c.appearance.hair}</Chip>}
                        <Chip>
                          {defaultRole === 'main' ? (
                            <span className="flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" /> Vai chính
                            </span>
                          ) : (
                            'Vai phụ'
                          )}
                        </Chip>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                        {c.description}
                      </p>
                      {c.wardrobe && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 italic truncate">{c.wardrobe}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {progress && savingBatch && (
                <div className="text-[11px] text-muted-foreground flex items-center gap-2 pt-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {progress.phase} ({progress.done}/{progress.total})
                </div>
              )}
            </div>
          )}

          {/* CTA when empty */}
          {!generating && generatedChars.length === 0 && (
            <Button
              onClick={generateCharacters}
              disabled={!brand}
              className="w-full gap-2 bg-foreground text-background hover:bg-foreground/90"
            >
              <Sparkles className="w-4 h-4" />
              Tạo {charCount} nhân vật
            </Button>
          )}
        </div>

        {/* Footer */}
        {generatedChars.length > 0 && !generating && (
          <div className="border-t px-5 py-3 flex gap-2 bg-background">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGeneratedChars([])}
              disabled={savingBatch}
              className="flex-1"
            >
              Tạo lại
            </Button>
            <Button
              size="sm"
              onClick={saveSelectedGenerated}
              disabled={savingBatch || generatedChars.every((c) => !c.selected)}
              className="flex-1 gap-1.5 bg-foreground text-background hover:bg-foreground/90"
            >
              {savingBatch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Lưu {generatedChars.filter((c) => c.selected).length} nhân vật
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
