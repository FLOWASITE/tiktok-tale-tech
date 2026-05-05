import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  useCharacterProfiles,
  type CharacterProfileInput,
  type CharacterAppearance,
  type CharacterProfile,
  type ReferenceImage,
  type ReferenceImageLabel,
} from '@/hooks/useCharacterProfiles';
import { Plus, Trash2, Edit2, User, Upload, Loader2, ImagePlus, X, Sparkles, Mic, Copy, Wand2, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useCurrentBrand } from '@/contexts/BrandContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const GENDER_OPTIONS = ['Nam', 'Nữ', 'Phi nhị nguyên'];
const AGE_OPTIONS = ['18-25', '25-35', '35-45', '45-55', '55+'];
const HAIR_OPTIONS = ['Đen dài', 'Đen ngắn', 'Nâu', 'Vàng', 'Bạc/Trắng', 'Đỏ', 'Xoăn đen', 'Húi cua'];
const SKIN_OPTIONS = ['Trắng sáng', 'Ngăm', 'Nâu ấm', 'Da ngâm đậm'];

const REF_IMAGE_LABELS: { value: ReferenceImageLabel; label: string }[] = [
  { value: 'front', label: 'Chính diện' },
  { value: 'side', label: 'Nghiêng' },
  { value: 'full-body', label: 'Toàn thân' },
  { value: 'close-up', label: 'Cận mặt' },
  { value: 'outfit', label: 'Trang phục' },
];

interface FormState extends CharacterProfileInput {
  appearance: CharacterAppearance;
  reference_images: ReferenceImage[];
}

interface GeneratedChar {
  name: string;
  description: string;
  appearance: CharacterAppearance;
  wardrobe: string;
  selected: boolean;
}

function MultiReferenceImageUpload({
  images,
  onChange,
  uploading,
  onUpload,
  onAiGenerate,
  aiGenerating,
}: {
  images: ReferenceImage[];
  onChange: (imgs: ReferenceImage[]) => void;
  uploading: boolean;
  onUpload: (file: File, label: ReferenceImageLabel) => Promise<void>;
  onAiGenerate: (label: ReferenceImageLabel) => Promise<void>;
  aiGenerating: ReferenceImageLabel | null;
}) {
  const [uploadLabel, setUploadLabel] = useState<ReferenceImageLabel>('front');
  const usedLabels = new Set(images.map((i) => i.label));
  const availableLabels = REF_IMAGE_LABELS.filter((l) => !usedLabels.has(l.value));

  return (
    <div className="space-y-2">
      <Label>Ảnh tham chiếu (tối đa 5)</Label>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, idx) => (
            <div key={idx} className="relative group">
              <img
                src={img.url}
                alt={img.label}
                className="w-16 h-16 rounded-xl object-cover border border-border/30"
              />
              <Badge
                variant="secondary"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] px-1 py-0 whitespace-nowrap"
              >
                {REF_IMAGE_LABELS.find((l) => l.value === img.label)?.label || img.label}
              </Badge>
              <button
                type="button"
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onChange(images.filter((_, i) => i !== idx))}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {images.length < 5 && availableLabels.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={uploadLabel} onValueChange={(v) => setUploadLabel(v as ReferenceImageLabel)}>
            <SelectTrigger className="h-8 text-xs w-28">
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
          <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-dashed border-border/50 cursor-pointer hover:bg-muted/30 transition-colors text-xs text-muted-foreground">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
            {uploading ? 'Đang tải...' : 'Upload'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file, uploadLabel);
              }}
            />
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-dashed"
            disabled={!!aiGenerating}
            onClick={() => onAiGenerate(uploadLabel)}
          >
            {aiGenerating === uploadLabel ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Wand2 className="w-3 h-3" />
            )}
            Tạo bằng AI
          </Button>
        </div>
      )}
    </div>
  );
}

function CharacterFormFields({
  form,
  setForm,
  uploading,
  onUploadImage,
  onUploadRefImage,
  onAiAnalyze,
  analyzing,
  onAiGenerateRef,
  aiGenerating,
  onAiGenerateMain,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  uploading: boolean;
  onUploadImage: (file: File) => Promise<void>;
  onUploadRefImage: (file: File, label: ReferenceImageLabel) => Promise<void>;
  onAiAnalyze: () => Promise<void>;
  analyzing: boolean;
  onAiGenerateRef: (label: ReferenceImageLabel) => Promise<void>;
  aiGenerating: ReferenceImageLabel | null;
  onAiGenerateMain: () => Promise<void>;
}) {
  const updateAppearance = (key: keyof CharacterAppearance, value: string) => {
    setForm((prev) => ({ ...prev, appearance: { ...prev.appearance, [key]: value } }));
  };

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      <div>
        <Label>Tên nhân vật *</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Bác sĩ Minh, Cô gái Gen Z..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Giới tính</Label>
          <Select value={form.appearance.gender || ''} onValueChange={(v) => updateAppearance('gender', v)}>
            <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Độ tuổi</Label>
          <Select value={form.appearance.age_range || ''} onValueChange={(v) => updateAppearance('age_range', v)}>
            <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
            <SelectContent>
              {AGE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Kiểu tóc</Label>
          <Select value={form.appearance.hair || ''} onValueChange={(v) => updateAppearance('hair', v)}>
            <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
            <SelectContent>
              {HAIR_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Màu da</Label>
          <Select value={form.appearance.skin_tone || ''} onValueChange={(v) => updateAppearance('skin_tone', v)}>
            <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
            <SelectContent>
              {SKIN_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Trang phục mặc định</Label>
        <Input
          value={form.wardrobe || ''}
          onChange={(e) => setForm((p) => ({ ...p, wardrobe: e.target.value }))}
          placeholder="Áo blouse trắng, vest đen..."
        />
      </div>

      <div>
        <Label>Đặc điểm nhận dạng</Label>
        <Input
          value={form.appearance.distinctive_features || ''}
          onChange={(e) => updateAppearance('distinctive_features', e.target.value)}
          placeholder="Nốt ruồi má trái, đeo kính gọng vàng..."
        />
      </div>

      <div>
        <Label>Mô tả chi tiết</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="Mô tả chi tiết ngoại hình, vóc dáng, phong cách..."
          rows={3}
        />
      </div>

      {/* Legacy single reference image */}
      <div>
        <Label>Ảnh đại diện chính</Label>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {form.reference_image_url && (
            <img src={form.reference_image_url} alt="ref" className="w-16 h-16 rounded-xl object-cover border border-border/30" />
          )}
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border/50 cursor-pointer hover:bg-muted/30 transition-colors text-sm text-muted-foreground">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Đang tải...' : 'Upload'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadImage(file);
              }}
            />
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-dashed"
            onClick={onAiGenerateMain}
            disabled={!!aiGenerating || !form.name.trim()}
          >
            {aiGenerating === 'front' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            Tạo ảnh AI
          </Button>
        </div>
        {!form.name.trim() && (
          <p className="text-[10px] text-muted-foreground mt-1">Cần nhập tên trước khi tạo ảnh AI</p>
        )}
        {/* AI Auto-fill button */}
        {form.reference_image_url && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs mt-2"
            onClick={onAiAnalyze}
            disabled={analyzing}
          >
            {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {analyzing ? 'Đang phân tích...' : 'AI tự điền từ ảnh'}
          </Button>
        )}
      </div>

      {/* Multi-reference images */}
      <MultiReferenceImageUpload
        images={form.reference_images}
        onChange={(imgs) => setForm((p) => ({ ...p, reference_images: imgs }))}
        uploading={uploading}
        onUpload={onUploadRefImage}
        onAiGenerate={onAiGenerateRef}
        aiGenerating={aiGenerating}
      />

      {/* Voice binding */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="flex items-center gap-1.5"><Mic className="w-3 h-3" /> Voice ID</Label>
          <Input
            value={form.default_voice_id || ''}
            onChange={(e) => setForm((p) => ({ ...p, default_voice_id: e.target.value }))}
            placeholder="voice-id từ TTS provider"
            className="text-xs"
          />
        </div>
        <div>
          <Label>Provider</Label>
          <Select value={form.default_voice_provider || ''} onValueChange={(v) => setForm((p) => ({ ...p, default_voice_provider: v }))}>
            <SelectTrigger className="text-xs"><SelectValue placeholder="Chọn..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
              <SelectItem value="google">Google TTS</SelectItem>
              <SelectItem value="openai">OpenAI TTS</SelectItem>
              <SelectItem value="lovable">Lovable AI</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  appearance: {},
  wardrobe: '',
  reference_image_url: '',
  reference_images: [],
  default_voice_id: '',
  default_voice_provider: '',
  brand_template_id: null,
};

export function CharacterProfileManager() {
  const { profiles, isLoading, createProfile, updateProfile, deleteProfile } = useCharacterProfiles();
  const { currentOrganization } = useOrganizationContext();
  const { currentBrand, brands } = useCurrentBrand();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiGenerating, setAiGenerating] = useState<ReferenceImageLabel | null>(null);
  const [filterByBrand, setFilterByBrand] = useState(true);

  // AI bulk generate dialog
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [roleHint, setRoleHint] = useState('');
  const [charCount, setCharCount] = useState('2');
  const [generating, setGenerating] = useState(false);
  const [generatedChars, setGeneratedChars] = useState<GeneratedChar[]>([]);
  const [savingBatch, setSavingBatch] = useState(false);

  const brandNameMap = useMemo(() => {
    const m = new Map<string, string>();
    brands?.forEach((b: any) => m.set(b.id, b.name));
    return m;
  }, [brands]);

  const visibleProfiles = useMemo(() => {
    if (!filterByBrand || !currentBrand?.id) return profiles;
    return profiles.filter((p) => !p.brand_template_id || p.brand_template_id === currentBrand.id);
  }, [profiles, filterByBrand, currentBrand?.id]);

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!currentOrganization?.id) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${currentOrganization.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('character-references').upload(path, file);
    if (error) { toast.error('Upload thất bại'); return null; }
    const { data: { publicUrl } } = supabase.storage.from('character-references').getPublicUrl(path);
    return publicUrl;
  };

  const handleUploadImage = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadFile(file);
      if (url) setForm((p) => ({ ...p, reference_image_url: url }));
    } finally {
      setUploading(false);
    }
  };

  const handleUploadRefImage = async (file: File, label: ReferenceImageLabel) => {
    setUploading(true);
    try {
      const url = await uploadFile(file);
      if (url) {
        setForm((p) => ({
          ...p,
          reference_images: [...p.reference_images, { url, label }],
        }));
      }
    } finally {
      setUploading(false);
    }
  };

  const handleAiAnalyze = async () => {
    if (!form.reference_image_url) return;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-character-image', {
        body: { image_url: form.reference_image_url },
      });
      if (error) throw error;
      if (data?.appearance) {
        setForm((p) => ({
          ...p,
          appearance: { ...p.appearance, ...data.appearance },
          description: data.description || p.description,
          wardrobe: data.wardrobe || p.wardrobe,
        }));
        toast.success('AI đã phân tích ảnh và điền thông tin nhân vật');
      }
    } catch (e) {
      console.error('[AI analyze]', e);
      toast.error('Không thể phân tích ảnh — thử lại sau');
    } finally {
      setAnalyzing(false);
    }
  };

  const callGenerateImage = async (label: ReferenceImageLabel): Promise<string | null> => {
    if (!currentOrganization?.id || !form.name.trim()) return null;
    setAiGenerating(label);
    try {
      const { data, error } = await supabase.functions.invoke('generate-character-image', {
        body: {
          name: form.name,
          appearance: form.appearance,
          wardrobe: form.wardrobe,
          description: form.description,
          view: label,
          organization_id: currentOrganization.id,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return null;
      }
      return data?.url ?? null;
    } catch (e: any) {
      console.error('[generate-character-image]', e);
      const msg = e?.message || '';
      if (msg.includes('429')) toast.error('Quá tải AI, thử lại sau ít phút.');
      else if (msg.includes('402')) toast.error('Hết quota AI, vui lòng nạp thêm credits.');
      else toast.error('Không thể tạo ảnh — thử lại sau');
      return null;
    } finally {
      setAiGenerating(null);
    }
  };

  const handleAiGenerateMain = async () => {
    const url = await callGenerateImage('front');
    if (url) {
      setForm((p) => ({ ...p, reference_image_url: url }));
      toast.success('Đã tạo ảnh đại diện AI');
    }
  };

  const handleAiGenerateRef = async (label: ReferenceImageLabel) => {
    const url = await callGenerateImage(label);
    if (url) {
      setForm((p) => ({ ...p, reference_images: [...p.reference_images, { url, label }] }));
      toast.success(`Đã tạo ảnh ${REF_IMAGE_LABELS.find((l) => l.value === label)?.label || label}`);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editingId) {
      await updateProfile.mutateAsync({ id: editingId, ...form });
    } else {
      await createProfile.mutateAsync({
        ...form,
        brand_template_id: form.brand_template_id ?? currentBrand?.id ?? null,
      });
    }
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const profileToForm = (profile: CharacterProfile): FormState => ({
    name: profile.name,
    description: profile.description,
    appearance: (profile.appearance as CharacterAppearance) || {},
    wardrobe: profile.wardrobe || '',
    reference_image_url: profile.reference_image_url || '',
    reference_images: (Array.isArray(profile.reference_images) ? profile.reference_images : []) as ReferenceImage[],
    default_voice_id: profile.default_voice_id || '',
    default_voice_provider: profile.default_voice_provider || '',
    brand_template_id: profile.brand_template_id ?? null,
  });

  const handleEdit = (profile: CharacterProfile) => {
    setEditingId(profile.id);
    setForm(profileToForm(profile));
    setOpen(true);
  };

  const handleClone = (profile: CharacterProfile) => {
    setEditingId(null);
    setForm({
      ...profileToForm(profile),
      name: `${profile.name} (bản sao)`,
      brand_template_id: currentBrand?.id ?? profile.brand_template_id ?? null,
    });
    setOpen(true);
  };

  const handleNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, brand_template_id: currentBrand?.id ?? null });
    setOpen(true);
  };

  // ===== AI bulk generate =====
  const generateCharacters = useCallback(async () => {
    if (!currentBrand?.id) {
      toast.error('Vui lòng chọn Brand trước');
      return;
    }
    setGenerating(true);
    setGeneratedChars([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-character', {
        body: {
          brand_template_id: currentBrand.id,
          role_hint: roleHint.trim() || undefined,
          count: parseInt(charCount) || 2,
          existing_names: profiles.map((p) => p.name),
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
  }, [currentBrand?.id, roleHint, charCount, profiles]);

  const saveSelectedGenerated = useCallback(async () => {
    const toSave = generatedChars.filter((c) => c.selected);
    if (toSave.length === 0) return;
    setSavingBatch(true);
    try {
      for (const c of toSave) {
        await createProfile.mutateAsync({
          name: c.name,
          description: c.description,
          appearance: c.appearance,
          wardrobe: c.wardrobe,
          brand_template_id: currentBrand?.id ?? null,
        });
      }
      setShowAIDialog(false);
      setGeneratedChars([]);
      setRoleHint('');
      toast.success(`Đã tạo ${toSave.length} nhân vật`);
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi khi lưu nhân vật');
    } finally {
      setSavingBatch(false);
    }
  }, [generatedChars, createProfile, currentBrand?.id]);

  const isSaving = createProfile.isPending || updateProfile.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Nhân vật</h3>
          <p className="text-xs text-muted-foreground">Tạo hồ sơ nhân vật để giữ đồng nhất ngoại hình xuyên suốt các scene video</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {currentBrand && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Switch
                checked={filterByBrand}
                onCheckedChange={setFilterByBrand}
                className="h-4 w-7 [&>span]:h-3 [&>span]:w-3"
              />
              <span>Chỉ brand hiện tại</span>
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setShowAIDialog(true)}
            disabled={!currentBrand}
            title={!currentBrand ? 'Chọn Brand trước' : 'AI tạo nhân vật từ Brand'}
          >
            <Sparkles className="w-3.5 h-3.5" /> Tạo bằng AI
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5" onClick={handleNew}>
                <Plus className="w-3.5 h-3.5" /> Thêm thủ công
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Sửa nhân vật' : 'Tạo nhân vật mới'}</DialogTitle>
                {currentBrand && !editingId && (
                  <DialogDescription className="text-xs">
                    Nhân vật sẽ được gắn với brand <strong>{currentBrand.name}</strong>
                  </DialogDescription>
                )}
              </DialogHeader>
              <CharacterFormFields
                form={form}
                setForm={setForm}
                uploading={uploading}
                onUploadImage={handleUploadImage}
                onUploadRefImage={handleUploadRefImage}
                onAiAnalyze={handleAiAnalyze}
                analyzing={analyzing}
                onAiGenerateRef={handleAiGenerateRef}
                aiGenerating={aiGenerating}
                onAiGenerateMain={handleAiGenerateMain}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Hủy</Button>
                <Button size="sm" onClick={handleSave} disabled={!form.name.trim() || isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {editingId ? 'Cập nhật' : 'Tạo'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : visibleProfiles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-8">
            <User className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {profiles.length === 0 ? 'Chưa có nhân vật nào' : 'Không có nhân vật cho brand này'}
            </p>
            <div className="flex gap-2 mt-1">
              {currentBrand && (
                <Button size="sm" variant="outline" onClick={() => setShowAIDialog(true)} className="gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Tạo bằng AI
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handleNew} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Thêm thủ công
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibleProfiles.map((p) => {
            const app = p.appearance as CharacterAppearance;
            const refCount = Array.isArray(p.reference_images) ? p.reference_images.length : 0;
            const isCrossBrand = p.brand_template_id && p.brand_template_id !== currentBrand?.id;
            const brandName = p.brand_template_id ? brandNameMap.get(p.brand_template_id) : null;
            return (
              <Card key={p.id} className="group hover:border-primary/20 transition-colors">
                <CardContent className="p-3 flex gap-3">
                  {p.reference_image_url ? (
                    <img src={p.reference_image_url} alt={p.name} className="w-14 h-14 rounded-xl object-cover shrink-0 border border-border/20" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-muted/30 flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      {isCrossBrand && brandName && (
                        <Badge variant="outline" className="text-[9px] h-4 gap-0.5 px-1">
                          <Tag className="w-2 h-2" /> {brandName}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {app.gender && <span className="text-[10px] px-1.5 py-0.5 bg-muted/40 rounded-md">{app.gender}</span>}
                      {app.age_range && <span className="text-[10px] px-1.5 py-0.5 bg-muted/40 rounded-md">{app.age_range}</span>}
                      {app.hair && <span className="text-[10px] px-1.5 py-0.5 bg-muted/40 rounded-md">{app.hair}</span>}
                      {refCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-md">{refCount} ảnh ref</span>
                      )}
                    </div>
                    {p.wardrobe && <p className="text-[11px] text-muted-foreground mt-1 truncate">{p.wardrobe}</p>}
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(p)} title="Sửa">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleClone(p)} title="Nhân bản">
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteProfile.mutate(p.id)}
                      title="Xoá"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* AI bulk generate dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> AI tạo nhân vật từ Brand
            </DialogTitle>
            <DialogDescription>
              {currentBrand
                ? <>AI phân tích brand <strong>{currentBrand.name}</strong> để gợi ý nhân vật phù hợp tone, đối tượng, ngành nghề.</>
                : 'Vui lòng chọn brand trước.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_80px] gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Gợi ý vai trò</Label>
                <Input
                  placeholder="VD: Bác sĩ tư vấn, KOL review..."
                  value={roleHint}
                  onChange={(e) => setRoleHint(e.target.value)}
                  className="text-sm h-9"
                  disabled={generating}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Số lượng</Label>
                <Select value={charCount} onValueChange={setCharCount} disabled={generating}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {profiles.length > 0 && generatedChars.length === 0 && (
              <p className="text-[10px] text-muted-foreground">Đã có {profiles.length} nhân vật — AI sẽ tránh tạo trùng.</p>
            )}

            {generatedChars.length === 0 ? (
              <Button onClick={generateCharacters} disabled={generating || !currentBrand} className="w-full gap-2">
                {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang phân tích brand...</> : <><Sparkles className="w-4 h-4" /> Tạo nhân vật</>}
              </Button>
            ) : (
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">Chọn nhân vật muốn lưu:</Label>
                {generatedChars.map((c, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'p-3 rounded-xl border transition-colors cursor-pointer',
                      c.selected ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20'
                    )}
                    onClick={() => setGeneratedChars((prev) => prev.map((x, i) => i === idx ? { ...x, selected: !x.selected } : x))}
                  >
                    <div className="flex items-start gap-2">
                      <input type="checkbox" checked={c.selected} readOnly className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{c.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.appearance.gender && <span className="text-[10px] px-1.5 py-0.5 bg-muted/50 rounded">{c.appearance.gender}</span>}
                          {c.appearance.age_range && <span className="text-[10px] px-1.5 py-0.5 bg-muted/50 rounded">{c.appearance.age_range}</span>}
                          {c.appearance.hair && <span className="text-[10px] px-1.5 py-0.5 bg-muted/50 rounded">{c.appearance.hair}</span>}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">{c.description}</p>
                        {c.wardrobe && <p className="text-[10px] text-muted-foreground mt-0.5 italic truncate">👔 {c.wardrobe}</p>}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <Button variant="ghost" size="sm" onClick={() => setGeneratedChars([])} disabled={savingBatch} className="flex-1">
                    Tạo lại
                  </Button>
                  <Button size="sm" onClick={saveSelectedGenerated} disabled={savingBatch || generatedChars.every((c) => !c.selected)} className="flex-1 gap-1.5">
                    {savingBatch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Lưu {generatedChars.filter((c) => c.selected).length} nhân vật
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
