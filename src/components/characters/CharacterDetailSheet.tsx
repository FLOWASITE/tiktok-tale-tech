import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Edit2, Copy, Trash2, User, Mic, Tag, Sparkles, X, Loader2, Paperclip, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CharacterProfile, CharacterAppearance, ReferenceImage, ReferenceImageLabel } from '@/hooks/useCharacterProfiles';
import { REF_IMAGE_LABELS, calcCompleteness } from '@/lib/characterSchema';
import { Progress } from '@/components/ui/progress';
import { useCharacterImageActions } from '@/hooks/useCharacterImageActions';
import { useCharacterProfiles } from '@/hooks/useCharacterProfiles';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const EDIT_MODEL_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: 'auto', label: 'Tự động (khuyến nghị)', hint: 'Hệ thống chọn model edit phù hợp' },
  { value: 'poyo/seedream-5.0-lite-edit', label: 'Seedream 5 Edit', hint: 'Character lock mạnh, multi-ref' },
  { value: 'poyo/nano-banana-pro', label: 'Nano Banana Pro', hint: 'Gemini 3 Pro, identity tốt' },
  { value: 'poyo/flux-kontext-max', label: 'Flux Kontext Max', hint: 'Instruction-following edit' },
  { value: 'google/gemini-3-pro-image-preview', label: 'Gemini 3 Pro (Lovable)', hint: 'Fallback không cần PoYo key' },
];

interface Props {
  profile: CharacterProfile | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  brandName?: string | null;
  onEdit: () => void;
  onClone: () => void;
  onDelete: () => void;
}

export function CharacterDetailSheet({
  profile,
  open,
  onOpenChange,
  brandName,
  onEdit,
  onClone,
  onDelete,
}: Props) {
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [editModel, setEditModel] = useState<string>('auto');
  // Per-label attached avatars (in-memory; flushed into reference_images on AI generate)
  const [attachedRefs, setAttachedRefs] = useState<Record<string, string>>({});
  const [perLabelLoading, setPerLabelLoading] = useState<string | null>(null);

  const imageActions = useCharacterImageActions({
    name: profile?.name,
    appearance: profile?.appearance,
    wardrobe: profile?.wardrobe ?? undefined,
    description: profile?.description,
  });
  const { updateProfile } = useCharacterProfiles();

  if (!profile) return null;
  const app = (profile.appearance ?? {}) as CharacterAppearance;
  const refs = Array.isArray(profile.reference_images) ? profile.reference_images : [];
  const pct = calcCompleteness(profile);
  const usedLabels = new Set(refs.map((r) => r.label));
  const availableLabels = REF_IMAGE_LABELS.filter((l) => !usedLabels.has(l.value));
  const refMainUrl = profile.reference_image_url ?? '';

  const handleGenerateAllRefs = async () => {
    if (!refMainUrl) {
      toast.error('Cần ảnh đại diện chính trước');
      return;
    }
    if (availableLabels.length === 0) return;
    setBulkGenerating(true);
    let current: ReferenceImage[] = [...refs];
    let createdCount = 0;
    try {
      for (const l of availableLabels) {
        toast.info(`Đang tạo ${l.label} (${createdCount + 1}/${availableLabels.length})…`);
        const refForThis = attachedRefs[l.value] || refMainUrl;
        const url = await imageActions.generateImage(
          l.value as ReferenceImageLabel,
          refForThis,
          { editModel: editModel === 'auto' ? undefined : editModel },
        );
        if (!url) break;
        current = [...current, { url, label: l.value as ReferenceImageLabel }];
        await updateProfile.mutateAsync({
          id: profile.id,
          name: profile.name,
          description: profile.description,
          appearance: profile.appearance,
          wardrobe: profile.wardrobe ?? undefined,
          reference_image_url: profile.reference_image_url ?? undefined,
          reference_images: current,
        });
        createdCount++;
      }
      if (createdCount > 0) toast.success(`Đã tạo ${createdCount} góc ảnh`);
    } finally {
      setBulkGenerating(false);
    }
  };

  const handleAttachRef = async (label: string, file: File) => {
    setPerLabelLoading(label);
    try {
      const url = await imageActions.uploadFile(file);
      if (url) {
        setAttachedRefs((prev) => ({ ...prev, [label]: url }));
        toast.success('Đã đính kèm ảnh tham chiếu');
      }
    } finally {
      setPerLabelLoading(null);
    }
  };

  const handleGenerateOne = async (label: string) => {
    const refForThis = attachedRefs[label] || refMainUrl;
    if (!refForThis) {
      toast.error('Cần ảnh tham chiếu (đính kèm hoặc ảnh chính) trước');
      return;
    }
    setPerLabelLoading(label);
    try {
      const url = await imageActions.generateImage(
        label as ReferenceImageLabel,
        refForThis,
        { editModel: editModel === 'auto' ? undefined : editModel },
      );
      if (!url) return;
      const next = [...refs, { url, label: label as ReferenceImageLabel }];
      await updateProfile.mutateAsync({
        id: profile.id,
        name: profile.name,
        description: profile.description,
        appearance: profile.appearance,
        wardrobe: profile.wardrobe ?? undefined,
        reference_image_url: profile.reference_image_url ?? undefined,
        reference_images: next,
      });
      setAttachedRefs((prev) => {
        const { [label]: _drop, ...rest } = prev;
        return rest;
      });
      toast.success(`Đã tạo ${REF_IMAGE_LABELS.find((l) => l.value === label)?.label || label}`);
    } finally {
      setPerLabelLoading(null);
    }
  };

  const traits = [
    app.gender,
    app.age_range,
    app.hair && `tóc ${app.hair.toLowerCase()}`,
    app.skin_tone && `da ${app.skin_tone.toLowerCase()}`,
    app.body_type,
  ].filter(Boolean);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="sr-only">
          <SheetTitle>{profile.name}</SheetTitle>
        </SheetHeader>

        {/* Hero */}
        <div className="relative">
          {profile.reference_image_url ? (
            <img
              src={profile.reference_image_url}
              alt={profile.name}
              className="w-full aspect-[4/3] object-cover cursor-zoom-in"
              onClick={() => setZoomUrl(profile.reference_image_url)}
            />
          ) : (
            <div className="w-full aspect-[4/3] bg-muted/30 flex items-center justify-center">
              <User className="w-16 h-16 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/85 to-transparent px-5 pt-10 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold tracking-tight truncate">{profile.name}</h2>
              {brandName && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Tag className="w-2.5 h-2.5" /> {brandName}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Hoàn thiện</span>
              <Progress value={pct} className="h-1 flex-1 max-w-[160px]" />
              <span className="tabular-nums font-medium text-foreground">{pct}%</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mx-5 mt-3 grid grid-cols-3 h-9">
              <TabsTrigger value="overview" className="text-xs">Tổng quan</TabsTrigger>
              <TabsTrigger value="gallery" className="text-xs gap-1">
                Ảnh ref {refs.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[9px]">{refs.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="voice" className="text-xs">Voice</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="px-5 py-4 space-y-4 mt-0">
              {traits.length > 0 && (
                <Section title="Ngoại hình">
                  <div className="flex flex-wrap gap-1.5">
                    {traits.map((t, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-muted/50 rounded-full">
                        {t}
                      </span>
                    ))}
                  </div>
                </Section>
              )}
              {app.distinctive_features && (
                <Section title="Đặc điểm nhận dạng">
                  <p className="text-sm leading-relaxed">{app.distinctive_features}</p>
                </Section>
              )}
              {profile.wardrobe && (
                <Section title="Trang phục">
                  <p className="text-sm leading-relaxed">{profile.wardrobe}</p>
                </Section>
              )}
              {profile.description && (
                <Section title="Mô tả">
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{profile.description}</p>
                </Section>
              )}
              {!app.distinctive_features && !profile.wardrobe && !profile.description && traits.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  Nhân vật còn thiếu thông tin. Bấm <strong>Sửa</strong> để bổ sung.
                </div>
              )}
            </TabsContent>

            <TabsContent value="gallery" className="px-5 py-4 mt-0 space-y-4">
              {/* Model edit selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Model AI tạo ảnh (khi có ảnh tham chiếu)</label>
                <Select value={editModel} onValueChange={setEditModel}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EDIT_MODEL_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-xs">
                        <div className="flex flex-col">
                          <span>{m.label}</span>
                          <span className="text-[10px] text-muted-foreground">{m.hint}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bulk action */}
              {refMainUrl && availableLabels.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full gap-1.5 text-xs"
                  disabled={bulkGenerating || !!imageActions.aiGenerating || !!perLabelLoading}
                  onClick={handleGenerateAllRefs}
                >
                  {bulkGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Tạo {availableLabels.length} góc còn lại bằng AI
                </Button>
              )}

              {/* Existing refs */}
              {refs.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {refs.map((img, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={img.url}
                        alt={img.label}
                        className="w-full aspect-square rounded-xl object-cover ring-1 ring-border cursor-zoom-in"
                        onClick={() => setZoomUrl(img.url)}
                      />
                      <Badge variant="secondary" className="absolute bottom-1 left-1 right-1 text-[9px] justify-center bg-background/85 backdrop-blur">
                        {REF_IMAGE_LABELS.find((l) => l.value === img.label)?.label ?? img.label}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Per-label generators (for missing labels) */}
              {availableLabels.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Tạo từng góc (đính kèm avatar tuỳ chọn)</p>
                  <div className="grid grid-cols-1 gap-2">
                    {availableLabels.map((l) => {
                      const attached = attachedRefs[l.value];
                      const busy = perLabelLoading === l.value || imageActions.aiGenerating === l.value;
                      return (
                        <div
                          key={l.value}
                          className="flex items-center gap-2 p-2 rounded-lg ring-1 ring-border bg-muted/20"
                        >
                          <div className="w-12 h-12 rounded-md overflow-hidden ring-1 ring-border flex-shrink-0 bg-muted flex items-center justify-center">
                            {attached ? (
                              <img src={attached} alt="ref" className="w-full h-full object-cover" />
                            ) : refMainUrl ? (
                              <img src={refMainUrl} alt="main" className="w-full h-full object-cover opacity-60" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{l.label}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {attached ? 'Avatar đính kèm riêng' : refMainUrl ? 'Dùng ảnh chính' : 'Chưa có ref'}
                            </p>
                          </div>
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={busy}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleAttachRef(l.value, f);
                                e.target.value = '';
                              }}
                            />
                            <span className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted text-muted-foreground" title="Đính kèm avatar">
                              <Paperclip className="w-3.5 h-3.5" />
                            </span>
                          </label>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 gap-1"
                            disabled={busy || (!attached && !refMainUrl)}
                            onClick={() => handleGenerateOne(l.value)}
                          >
                            {busy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            <span className="text-[10px]">Tạo</span>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {refs.length === 0 && !refMainUrl && availableLabels.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Chưa có ảnh tham chiếu nào.
                </div>
              )}
            </TabsContent>

            <TabsContent value="voice" className="px-5 py-4 mt-0 space-y-4">
              {profile.default_voice_id || profile.default_voice_provider ? (
                <Section title="Cấu hình giọng">
                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <Mic className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Provider:</span>
                      <span className="font-medium">{profile.default_voice_provider || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground pl-5">Voice ID:</span>
                      <span className="font-mono text-xs">{profile.default_voice_id || '—'}</span>
                    </div>
                  </div>
                </Section>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Chưa cấu hình voice cho nhân vật này.
                </div>
              )}
              {(app.regional_accent || app.honorific || app.speech_style) && (
                <Section title="Phong cách thoại">
                  <div className="text-sm space-y-1 text-muted-foreground">
                    {app.regional_accent && <p>Giọng vùng: <span className="text-foreground">{app.regional_accent}</span></p>}
                    {app.honorific && <p>Xưng hô: <span className="text-foreground">{app.honorific}</span></p>}
                    {app.speech_style && <p>Style: <span className="text-foreground">{app.speech_style}</span></p>}
                  </div>
                </Section>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="border-t px-5 py-3 flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onClone}>
            <Copy className="w-3.5 h-3.5" /> Nhân bản
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" /> Xoá
          </Button>
          <div className="flex-1" />
          <Button size="sm" className="gap-1.5" onClick={onEdit}>
            <Edit2 className="w-3.5 h-3.5" /> Sửa
          </Button>
        </div>
      </SheetContent>

      {/* Zoom modal */}
      {zoomUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setZoomUrl(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img src={zoomUrl} alt="zoom" className="max-w-full max-h-full object-contain rounded-2xl" />
        </div>
      )}
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}
