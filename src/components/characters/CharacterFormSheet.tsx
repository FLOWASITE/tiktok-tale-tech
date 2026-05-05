import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Wand2, Upload, ImagePlus, X, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCharacterImageActions } from '@/hooks/useCharacterImageActions';
import {
  characterSchema,
  type CharacterFormValues,
  EMPTY_CHARACTER_FORM,
  profileToFormValues,
  REF_IMAGE_LABELS,
  GENDER_OPTIONS,
  AGE_OPTIONS,
  HAIR_OPTIONS,
  SKIN_OPTIONS,
  calcCompleteness,
} from '@/lib/characterSchema';
import type { CharacterProfile, ReferenceImageLabel } from '@/hooks/useCharacterProfiles';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingProfile: CharacterProfile | null;
  defaultBrandId: string | null;
  brands: { id: string; name: string }[];
  onSubmit: (values: CharacterFormValues, id?: string) => Promise<void>;
  isSaving: boolean;
}

const DRAFT_KEY = (id: string | 'new') => `character-draft-${id}`;

export function CharacterFormSheet({
  open,
  onOpenChange,
  editingProfile,
  defaultBrandId,
  brands,
  onSubmit,
  isSaving,
}: Props) {
  const draftKey = DRAFT_KEY(editingProfile?.id ?? 'new');

  const initial = useMemo<CharacterFormValues>(() => {
    if (editingProfile) return profileToFormValues(editingProfile);
    return { ...EMPTY_CHARACTER_FORM, brand_template_id: defaultBrandId };
  }, [editingProfile, defaultBrandId]);

  const form = useForm<CharacterFormValues>({
    resolver: zodResolver(characterSchema) as any,
    defaultValues: initial,
    mode: 'onBlur',
  });

  // Reset form when target changes / sheet opens
  useEffect(() => {
    if (!open) return;
    // Try restore draft (only for new or matching id)
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as CharacterFormValues;
        form.reset(draft);
        toast.message('Đã khôi phục bản nháp', { description: 'Tiếp tục từ lần chỉnh sửa trước' });
        return;
      }
    } catch {}
    form.reset(initial);
  }, [open, draftKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const watched = useWatch({ control: form.control });

  // Autosave draft
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!open) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(watched));
      } catch {}
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [watched, draftKey, open]);

  const completeness = useMemo(
    () => calcCompleteness(watched as CharacterFormValues),
    [watched],
  );

  const imageActions = useCharacterImageActions({
    name: watched.name,
    appearance: watched.appearance,
    wardrobe: watched.wardrobe,
    description: watched.description,
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values, editingProfile?.id);
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    onOpenChange(false);
  });

  const handleResetDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    form.reset(initial);
    toast.success('Đã xoá bản nháp');
  };

  const refImages = form.watch('reference_images') ?? [];
  const refMainUrl = form.watch('reference_image_url') ?? '';

  const handleUploadMain = async (file: File) => {
    const url = await imageActions.uploadFile(file);
    if (url) form.setValue('reference_image_url', url, { shouldDirty: true });
  };

  const handleAiGenerateMain = async () => {
    // Nếu đã có ảnh chính → dùng làm reference để giữ identity nhất quán
    const url = await imageActions.generateImage('front', refMainUrl || undefined);
    if (url) {
      form.setValue('reference_image_url', url, { shouldDirty: true });
      toast.success(refMainUrl ? 'Đã tái tạo ảnh AI từ ảnh tham chiếu' : 'Đã tạo ảnh đại diện AI');
    }
  };

  const handleAiAnalyze = async () => {
    if (!refMainUrl) return;
    const data = await imageActions.analyzeImage(refMainUrl);
    if (data?.appearance) {
      form.setValue('appearance', { ...watched.appearance, ...data.appearance } as any, { shouldDirty: true });
      if (data.description) form.setValue('description', data.description, { shouldDirty: true });
      if (data.wardrobe) form.setValue('wardrobe', data.wardrobe, { shouldDirty: true });
      toast.success('AI đã phân tích & điền thông tin');
    }
  };

  const handleUploadRef = async (file: File, label: ReferenceImageLabel) => {
    if (refImages.length >= 5) {
      toast.error('Tối đa 5 ảnh tham chiếu');
      return;
    }
    const url = await imageActions.uploadFile(file);
    if (url) form.setValue('reference_images', [...refImages, { url, label }], { shouldDirty: true });
  };

  const handleAiGenerateRef = async (label: ReferenceImageLabel) => {
    if (refImages.length >= 5) {
      toast.error('Tối đa 5 ảnh tham chiếu');
      return;
    }
    if (!refMainUrl) {
      toast.error('Hãy upload hoặc tạo ảnh đại diện chính trước — AI sẽ dùng ảnh này làm tham chiếu để các góc đồng nhất.');
      return;
    }
    const url = await imageActions.generateImage(label, refMainUrl);
    if (url) {
      form.setValue('reference_images', [...refImages, { url, label }], { shouldDirty: true });
      toast.success(`Đã tạo ảnh ${REF_IMAGE_LABELS.find((l) => l.value === label)?.label} từ ảnh chính`);
    }
  };

  const [bulkGenerating, setBulkGenerating] = useState(false);
  const handleAiGenerateAllRefs = async () => {
    if (!refMainUrl) {
      toast.error('Cần ảnh đại diện chính làm tham chiếu');
      return;
    }
    if (!watched.name?.trim()) {
      toast.error('Cần nhập tên nhân vật');
      return;
    }
    const current = form.getValues('reference_images') ?? [];
    const used = new Set(current.map((i) => i.label));
    const missing = REF_IMAGE_LABELS.filter((l) => !used.has(l.value));
    if (missing.length === 0) return;
    setBulkGenerating(true);
    let done = 0;
    try {
      for (const l of missing) {
        toast.info(`Đang tạo ${l.label} (${done + 1}/${missing.length})…`);
        const url = await imageActions.generateImage(l.value, refMainUrl);
        if (!url) break;
        const list = form.getValues('reference_images') ?? [];
        form.setValue('reference_images', [...list, { url, label: l.value }], { shouldDirty: true });
        done++;
      }
      if (done > 0) toast.success(`Đã tạo ${done}/${missing.length} góc ảnh`);
    } finally {
      setBulkGenerating(false);
    }
  };

  const removeRefImage = (idx: number) => {
    form.setValue(
      'reference_images',
      refImages.filter((_, i) => i !== idx),
      { shouldDirty: true },
    );
  };

  const usedLabels = new Set(refImages.map((i) => i.label));
  const availableLabels = REF_IMAGE_LABELS.filter((l) => !usedLabels.has(l.value));
  const [uploadLabel, setUploadLabel] = useState<ReferenceImageLabel>('front');
  useEffect(() => {
    if (availableLabels.length > 0 && !availableLabels.find((l) => l.value === uploadLabel)) {
      setUploadLabel(availableLabels[0].value);
    }
  }, [availableLabels, uploadLabel]);

  const errorCount = Object.keys(form.formState.errors).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            {editingProfile ? 'Sửa nhân vật' : 'Tạo nhân vật mới'}
            {form.formState.isDirty && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5">Chưa lưu</Badge>
            )}
          </SheetTitle>
          <SheetDescription className="text-xs flex items-center gap-3">
            <span>Hoàn thiện</span>
            <Progress value={completeness} className="h-1.5 flex-1" />
            <span className="tabular-nums font-medium text-foreground">{completeness}%</span>
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <Tabs defaultValue="basic" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mx-5 mt-3 grid grid-cols-4 h-9">
                <TabsTrigger value="basic" className="text-xs">Cơ bản</TabsTrigger>
                <TabsTrigger value="appearance" className="text-xs">Ngoại hình</TabsTrigger>
                <TabsTrigger value="references" className="text-xs gap-1">
                  Ảnh ref {refImages.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[9px]">{refImages.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="voice" className="text-xs">Voice</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {/* ===== Basic ===== */}
                <TabsContent value="basic" className="mt-0 space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên nhân vật *</FormLabel>
                        <FormControl>
                          <Input placeholder="Bác sĩ Minh, Cô gái Gen Z…" maxLength={60} {...field} />
                        </FormControl>
                        <FormDescription className="text-[10px] text-right tabular-nums">
                          {field.value?.length ?? 0}/60
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mô tả chi tiết</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Mô tả vóc dáng, phong cách, tính cách…"
                            rows={4}
                            maxLength={500}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-[10px] text-right tabular-nums">
                          {field.value?.length ?? 0}/500
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="wardrobe"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trang phục mặc định</FormLabel>
                        <FormControl>
                          <Input placeholder="Áo blouse trắng, vest đen…" maxLength={200} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="brand_template_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand</FormLabel>
                        <Select
                          value={field.value ?? '__none__'}
                          onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn brand…" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">Không gắn brand</SelectItem>
                            {brands.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-[10px]">
                          Nhân vật sẽ chỉ hiển thị mặc định trong brand này.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* ===== Appearance ===== */}
                <TabsContent value="appearance" className="mt-0 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <SelectField name="appearance.gender" label="Giới tính" options={GENDER_OPTIONS} form={form} />
                    <SelectField name="appearance.age_range" label="Độ tuổi" options={AGE_OPTIONS} form={form} />
                    <SelectField name="appearance.hair" label="Kiểu tóc" options={HAIR_OPTIONS} form={form} />
                    <SelectField name="appearance.skin_tone" label="Màu da" options={SKIN_OPTIONS} form={form} />
                  </div>
                  <FormField
                    control={form.control}
                    name="appearance.body_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vóc dáng</FormLabel>
                        <FormControl>
                          <Input placeholder="Cao gầy, cân đối, mảnh khảnh…" maxLength={60} {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="appearance.distinctive_features"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Đặc điểm nhận dạng</FormLabel>
                        <FormControl>
                          <Input placeholder="Nốt ruồi má trái, đeo kính gọng vàng…" maxLength={200} {...field} />
                        </FormControl>
                        <FormDescription className="text-[10px]">
                          Càng cụ thể càng giúp AI giữ nhân vật nhất quán.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* ===== References ===== */}
                <TabsContent value="references" className="mt-0 space-y-5">
                  {/* Main avatar */}
                  <div>
                    <FormLabel>Ảnh đại diện chính</FormLabel>
                    <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                      {refMainUrl ? (
                        <div className="relative group">
                          <img src={refMainUrl} alt="ref" className="w-20 h-20 rounded-2xl object-cover ring-1 ring-border" />
                          <button
                            type="button"
                            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
                            onClick={() => form.setValue('reference_image_url', '', { shouldDirty: true })}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-muted/30 ring-1 ring-dashed ring-border flex items-center justify-center text-muted-foreground/50 text-[10px]">
                          chưa có ảnh
                        </div>
                      )}
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-dashed cursor-pointer hover:bg-muted/30 text-xs">
                          {imageActions.uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={imageActions.uploading}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUploadMain(f);
                            }}
                          />
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1.5 text-xs border-dashed"
                          onClick={handleAiGenerateMain}
                          disabled={!!imageActions.aiGenerating || !watched.name?.trim()}
                        >
                          {imageActions.aiGenerating === 'front' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Wand2 className="w-3.5 h-3.5" />
                          )}
                          Tạo bằng AI
                        </Button>
                      </div>
                    </div>
                    {refMainUrl && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full mt-2 gap-1.5 text-xs"
                        onClick={handleAiAnalyze}
                        disabled={imageActions.analyzing}
                      >
                        {imageActions.analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        AI tự điền từ ảnh
                      </Button>
                    )}
                  </div>

                  {/* Multi reference */}
                  <div>
                    <FormLabel>Ảnh tham chiếu (tối đa 5)</FormLabel>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      💡 Upload 1 ảnh đại diện chính rồi bấm <strong>AI</strong> cho từng góc — nhân vật sẽ đồng nhất hơn vì AI dùng ảnh chính làm tham chiếu identity.
                    </p>
                    {refImages.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                        {refImages.map((img, idx) => (
                          <div key={idx} className="relative group">
                            <img src={img.url} alt={img.label} className="w-full aspect-square rounded-xl object-cover ring-1 ring-border" />
                            <Badge variant="secondary" className="absolute bottom-1 left-1 right-1 text-[9px] justify-center bg-background/85 backdrop-blur">
                              {REF_IMAGE_LABELS.find((l) => l.value === img.label)?.label}
                            </Badge>
                            <button
                              type="button"
                              className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100"
                              onClick={() => removeRefImage(idx)}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {refImages.length < 5 && availableLabels.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Select value={uploadLabel} onValueChange={(v) => setUploadLabel(v as ReferenceImageLabel)}>
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableLabels.map((l) => (
                              <SelectItem key={l.value} value={l.value}>
                                {l.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-dashed cursor-pointer hover:bg-muted/30 text-xs">
                          {imageActions.uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={imageActions.uploading}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUploadRef(f, uploadLabel);
                            }}
                          />
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5 border-dashed"
                          disabled={!!imageActions.aiGenerating || !watched.name?.trim() || !refMainUrl}
                          onClick={() => handleAiGenerateRef(uploadLabel)}
                          title={!refMainUrl ? 'Cần ảnh đại diện chính làm tham chiếu' : 'Tạo ảnh AI từ ảnh chính'}
                        >
                          {imageActions.aiGenerating === uploadLabel ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                          AI
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ===== Voice ===== */}
                <TabsContent value="voice" className="mt-0 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="default_voice_provider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provider</FormLabel>
                          <Select value={field.value || '__none__'} onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Chọn…" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">— Không gắn —</SelectItem>
                              <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                              <SelectItem value="google">Google TTS</SelectItem>
                              <SelectItem value="openai">OpenAI TTS</SelectItem>
                              <SelectItem value="lovable">Lovable AI</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="default_voice_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Voice ID</FormLabel>
                          <FormControl>
                            <Input placeholder="voice-id từ provider" maxLength={100} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="appearance.regional_accent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Giọng vùng miền</FormLabel>
                        <FormControl>
                          <Input placeholder="Bắc Hà Nội, Nam Sài Gòn, Trung Huế…" maxLength={60} {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="appearance.honorific"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Xưng hô mặc định</FormLabel>
                        <FormControl>
                          <Input placeholder='"tôi", "mình", "em", "chị"…' maxLength={40} {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="appearance.speech_style"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phong cách thoại</FormLabel>
                        <FormControl>
                          <Input placeholder="Nhẹ nhàng thuyết phục, năng động trẻ trung…" maxLength={120} {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </div>
            </Tabs>

            {/* Footer */}
            <div className="border-t px-5 py-3 flex items-center gap-2 bg-background/95 backdrop-blur">
              {errorCount > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  {errorCount} lỗi
                </Badge>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs gap-1.5 text-muted-foreground"
                onClick={handleResetDraft}
                title="Xoá bản nháp đang lưu"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </Button>
              <div className="flex-1" />
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Huỷ
              </Button>
              <Button type="submit" size="sm" disabled={isSaving} className="gap-1.5">
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {editingProfile ? 'Cập nhật' : 'Tạo nhân vật'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

function SelectField({
  name,
  label,
  options,
  form,
}: {
  name: any;
  label: string;
  options: string[];
  form: any;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select value={field.value || '__none__'} onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Chọn…" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="__none__">— Không chọn —</SelectItem>
              {options.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
}
