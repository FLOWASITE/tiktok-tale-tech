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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Plus, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import type {
  CharacterAppearance,
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
  brand: { id: string; name: string } | null;
  existingNames: string[];
  onCreateProfile: (input: CharacterProfileInput) => Promise<CharacterProfile>;
  onUpdateProfile: (input: CharacterProfileInput & { id: string }) => Promise<unknown>;
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
  const [charCount, setCharCount] = useState('2');
  const [autoGenImage, setAutoGenImage] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedChars, setGeneratedChars] = useState<GeneratedChar[]>([]);
  const [savingBatch, setSavingBatch] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; phase: string } | null>(null);

  const reset = () => {
    setGeneratedChars([]);
    setRoleHint('');
    setCharCount('2');
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
          count: parseInt(charCount) || 2,
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
        if (data?.error) {
          console.warn('[generate-character-image]', data.error);
          return null;
        }
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
              console.warn('[update profile with image]', e);
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
  }, [generatedChars, autoGenImage, onCreateProfile, onUpdateProfile, generateAvatarFor, brand?.id, onOpenChange]);

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-foreground" /> AI tạo nhân vật từ Brand
          </SheetTitle>
          <SheetDescription className="text-xs">
            {brand ? (
              <>
                AI phân tích brand <strong>{brand.name}</strong> để gợi ý nhân vật phù hợp tone, đối tượng, ngành nghề.
              </>
            ) : (
              'Vui lòng chọn brand trước.'
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Gợi ý vai trò</Label>
              <Input
                placeholder="VD: Bác sĩ tư vấn, KOL review…"
                value={roleHint}
                onChange={(e) => setRoleHint(e.target.value)}
                className="text-sm h-9"
                disabled={generating}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Số lượng</Label>
              <Select value={charCount} onValueChange={setCharCount} disabled={generating}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2.5">
            <div className="space-y-0.5 flex-1 min-w-0">
              <Label htmlFor="auto-gen-image" className="text-xs flex items-center gap-1.5 cursor-pointer">
                <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                Tự động tạo ảnh chân dung
              </Label>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Sau khi lưu, AI render ảnh front-view cho từng nhân vật (tốn thêm credit ảnh).
              </p>
            </div>
            <Switch
              id="auto-gen-image"
              checked={autoGenImage}
              onCheckedChange={setAutoGenImage}
              disabled={savingBatch}
            />
          </div>

          {existingNames.length > 0 && generatedChars.length === 0 && (
            <p className="text-[10px] text-muted-foreground">
              Đã có {existingNames.length} nhân vật — AI sẽ tránh tạo trùng.
            </p>
          )}

          {generatedChars.length === 0 ? (
            <Button onClick={generateCharacters} disabled={generating || !brand} className="w-full gap-2">
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang phân tích brand…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Tạo nhân vật
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">Chọn nhân vật muốn lưu:</Label>
              {generatedChars.map((c, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'p-3 rounded-xl border transition-colors cursor-pointer',
                    c.selected ? 'border-foreground/30 bg-muted/30' : 'border-border bg-muted/10',
                  )}
                  onClick={() =>
                    setGeneratedChars((prev) => prev.map((x, i) => (i === idx ? { ...x, selected: !x.selected } : x)))
                  }
                >
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={c.selected} readOnly className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{c.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.appearance?.gender && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-muted/50 rounded">{c.appearance.gender}</span>
                        )}
                        {c.appearance?.age_range && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-muted/50 rounded">{c.appearance.age_range}</span>
                        )}
                        {c.appearance?.hair && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-muted/50 rounded">{c.appearance.hair}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">{c.description}</p>
                      {c.wardrobe && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 italic truncate">{c.wardrobe}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {progress && savingBatch && (
                <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {progress.phase} ({progress.done}/{progress.total})
                </div>
              )}
            </div>
          )}
        </div>

        {generatedChars.length > 0 && (
          <div className="border-t px-5 py-3 flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setGeneratedChars([])} disabled={savingBatch} className="flex-1">
              Tạo lại
            </Button>
            <Button
              size="sm"
              onClick={saveSelectedGenerated}
              disabled={savingBatch || generatedChars.every((c) => !c.selected)}
              className="flex-1 gap-1.5"
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
