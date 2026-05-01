import { useState, useCallback } from 'react';
import { useCharacterProfiles, type CharacterProfile, type CharacterAppearance } from '@/hooks/useCharacterProfiles';
import { useCurrentBrand } from '@/contexts/BrandContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, X, Sparkles, Loader2, Check, Plus, ArrowUp, ArrowDown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MultiCharacterPickerProps {
  value: string[];
  onChange: (profileIds: string[], profiles: CharacterProfile[]) => void;
  className?: string;
  max?: number;
}

interface GeneratedChar {
  name: string;
  description: string;
  appearance: CharacterAppearance;
  wardrobe: string;
  selected: boolean;
}

export function MultiCharacterPicker({ value, onChange, className, max = 3 }: MultiCharacterPickerProps) {
  const { profiles, isLoading, createProfile } = useCharacterProfiles();
  const { currentBrand } = useCurrentBrand();

  const [showAIDialog, setShowAIDialog] = useState(false);
  const [roleHint, setRoleHint] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedChars, setGeneratedChars] = useState<GeneratedChar[]>([]);
  const [saving, setSaving] = useState(false);

  const selected = profiles.filter(p => value.includes(p.id));
  const available = profiles.filter(p => !value.includes(p.id));

  const addCharacter = (id: string) => {
    if (value.length >= max) return;
    const newIds = [...value, id];
    onChange(newIds, profiles.filter(p => newIds.includes(p.id)));
  };

  const removeCharacter = (id: string) => {
    const newIds = value.filter(v => v !== id);
    onChange(newIds, profiles.filter(p => newIds.includes(p.id)));
  };

  const moveCharacter = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= value.length) return;
    const newIds = [...value];
    const [moved] = newIds.splice(fromIdx, 1);
    newIds.splice(toIdx, 0, moved);
    onChange(newIds, profiles.filter(p => newIds.includes(p.id)));
  };

  const generateCharacters = useCallback(async () => {
    if (!currentBrand?.id) {
      toast.error('Vui lòng chọn Brand trước');
      return;
    }
    setGenerating(true);
    setGeneratedChars([]);
    try {
      const remaining = max - value.length;
      const count = Math.max(1, Math.min(remaining, 2));

      const { data, error } = await supabase.functions.invoke('generate-character', {
        body: {
          brand_template_id: currentBrand.id,
          role_hint: roleHint.trim() || undefined,
          count,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const chars: GeneratedChar[] = (data.characters || []).map((c: any) => ({
        ...c,
        selected: true,
      }));
      setGeneratedChars(chars);
    } catch (e: any) {
      console.error('[AI Character] Error:', e);
      toast.error(e.message || 'Không thể tạo nhân vật');
    } finally {
      setGenerating(false);
    }
  }, [currentBrand?.id, roleHint, max, value.length]);

  const saveSelected = useCallback(async () => {
    const toSave = generatedChars.filter(c => c.selected);
    if (toSave.length === 0) return;

    setSaving(true);
    try {
      const newIds: string[] = [...value];
      for (const c of toSave) {
        const result = await createProfile.mutateAsync({
          name: c.name,
          description: c.description,
          appearance: c.appearance,
          wardrobe: c.wardrobe,
          brand_template_id: currentBrand?.id || null,
        });
        if (result?.id && newIds.length < max) {
          newIds.push(result.id);
        }
      }
      // After profiles are saved and query invalidated, update selection
      // Small delay to let query refetch
      setTimeout(() => {
        setShowAIDialog(false);
        setGeneratedChars([]);
        setRoleHint('');
        toast.success(`Đã tạo ${toSave.length} nhân vật từ AI`);
      }, 500);
    } catch (e: any) {
      toast.error(e.message || 'Lỗi khi lưu nhân vật');
    } finally {
      setSaving(false);
    }
  }, [generatedChars, value, max, createProfile, currentBrand?.id]);

  const toggleChar = (idx: number) => {
    setGeneratedChars(prev => prev.map((c, i) => i === idx ? { ...c, selected: !c.selected } : c));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">
          Nhân vật ({selected.length}/{max})
        </label>
        {currentBrand && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] gap-1 text-primary hover:text-primary"
            onClick={() => setShowAIDialog(true)}
          >
            <Sparkles className="w-3 h-3" />
            AI tạo nhân vật
          </Button>
        )}
      </div>
      
      {selected.length > 0 && (
        <div className="space-y-1.5">
          {selected.map((p, idx) => {
            const roleLabel = idx === 0 ? 'Vai chính' : `Vai phụ ${selected.length > 2 ? idx : ''}`;
            return (
              <div
                key={p.id}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md border text-xs transition-colors",
                  idx === 0
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-muted/30"
                )}
              >
                {/* Reorder buttons */}
                {selected.length > 1 && (
                  <div className="flex flex-col -my-0.5">
                    <button
                      onClick={() => moveCharacter(idx, idx - 1)}
                      disabled={idx === 0}
                      className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-20"
                      title="Đưa lên"
                    >
                      <ArrowUp className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={() => moveCharacter(idx, idx + 1)}
                      disabled={idx === selected.length - 1}
                      className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-20"
                      title="Đưa xuống"
                    >
                      <ArrowDown className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}

                {/* Avatar */}
                {p.reference_image_url ? (
                  <img src={p.reference_image_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}

                {/* Name + role */}
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block">{p.name}</span>
                </div>

                {/* Role badge */}
                <Badge
                  variant={idx === 0 ? "default" : "outline"}
                  className={cn(
                    "text-[9px] h-4 shrink-0",
                    idx === 0 && "gap-0.5"
                  )}
                >
                  {idx === 0 && <Star className="w-2 h-2" />}
                  {roleLabel}
                </Badge>

                {/* Remove */}
                <button
                  onClick={() => removeCharacter(p.id)}
                  className="shrink-0 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
          {selected.length > 1 && (
            <p className="text-[10px] text-muted-foreground italic">
              ↕ Kéo thứ tự để đổi vai chính / phụ
            </p>
          )}
        </div>
      )}

      {value.length < max && available.length > 0 && (
        <Select onValueChange={addCharacter}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="+ Thêm nhân vật..." />
          </SelectTrigger>
          <SelectContent>
            {available.map(p => {
              const app = p.appearance as CharacterAppearance;
              return (
                <SelectItem key={p.id} value={p.id}>
                  <div className="flex items-center gap-2">
                    {p.reference_image_url ? (
                      <img src={p.reference_image_url} alt="" className="w-4 h-4 rounded-sm object-cover" />
                    ) : (
                      <User className="w-3 h-3 text-muted-foreground" />
                    )}
                    <span>{p.name}</span>
                    {app.gender && <span className="text-[10px] text-muted-foreground">· {app.gender}</span>}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}

      {/* Empty state with AI button */}
      {!isLoading && profiles.length === 0 && currentBrand && (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs gap-1.5 border-dashed"
          onClick={() => setShowAIDialog(true)}
        >
          <Sparkles className="w-3 h-3" />
          AI tạo nhân vật từ Brand
        </Button>
      )}

      {/* AI Generation Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI tạo nhân vật từ Brand
            </DialogTitle>
            <DialogDescription>
              AI sẽ phân tích brand "{currentBrand?.name}" để tạo nhân vật phù hợp với tone, đối tượng và ngành nghề.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-hint" className="text-xs">
                Gợi ý vai trò (tuỳ chọn)
              </Label>
              <Input
                id="role-hint"
                placeholder="VD: Bác sĩ tư vấn, KOL review, Nhân viên chăm sóc..."
                value={roleHint}
                onChange={e => setRoleHint(e.target.value)}
                className="text-sm"
                disabled={generating}
              />
            </div>

            {generatedChars.length === 0 ? (
              <Button
                onClick={generateCharacters}
                disabled={generating}
                className="w-full gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang phân tích brand...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Tạo nhân vật
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">Kết quả — chọn nhân vật muốn lưu:</Label>
                {generatedChars.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleChar(idx)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-colors",
                      c.selected
                        ? "border-primary/50 bg-primary/5"
                        : "border-border bg-muted/30 opacity-60"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0",
                        c.selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                      )}>
                        {c.selected && <Check className="w-3 h-3" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{c.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {c.appearance.gender} · {c.appearance.age_range}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {c.appearance.hair && (
                            <Badge variant="outline" className="text-[9px] h-4">Tóc: {c.appearance.hair}</Badge>
                          )}
                          {c.appearance.skin_tone && (
                            <Badge variant="outline" className="text-[9px] h-4">Da: {c.appearance.skin_tone}</Badge>
                          )}
                          {c.wardrobe && (
                            <Badge variant="outline" className="text-[9px] h-4">🧥 {c.wardrobe}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs gap-1"
                  onClick={generateCharacters}
                  disabled={generating}
                >
                  {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Tạo lại
                </Button>
              </div>
            )}
          </div>

          {generatedChars.length > 0 && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAIDialog(false)}>
                Huỷ
              </Button>
              <Button
                onClick={saveSelected}
                disabled={saving || generatedChars.filter(c => c.selected).length === 0}
                className="gap-1.5"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Lưu {generatedChars.filter(c => c.selected).length} nhân vật
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
