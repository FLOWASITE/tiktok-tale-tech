import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  useCharacterProfiles,
  type CharacterProfileInput,
  type CharacterAppearance,
  type CharacterProfile,
  type ReferenceImage,
  type ReferenceImageLabel,
} from '@/hooks/useCharacterProfiles';
import { Plus, Trash2, Edit2, User, Upload, Loader2, ImagePlus, X, Sparkles, Mic } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
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

function MultiReferenceImageUpload({
  images,
  onChange,
  uploading,
  onUpload,
}: {
  images: ReferenceImage[];
  onChange: (imgs: ReferenceImage[]) => void;
  uploading: boolean;
  onUpload: (file: File, label: ReferenceImageLabel) => Promise<void>;
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
        <div className="flex items-center gap-2">
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
            {uploading ? 'Đang tải...' : 'Thêm ảnh'}
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
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  uploading: boolean;
  onUploadImage: (file: File) => Promise<void>;
  onUploadRefImage: (file: File, label: ReferenceImageLabel) => Promise<void>;
  onAiAnalyze: () => Promise<void>;
  analyzing: boolean;
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
        <div className="flex items-center gap-3 mt-1">
          {form.reference_image_url && (
            <img src={form.reference_image_url} alt="ref" className="w-16 h-16 rounded-xl object-cover border border-border/30" />
          )}
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border/50 cursor-pointer hover:bg-muted/30 transition-colors text-sm text-muted-foreground">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Đang tải...' : 'Chọn ảnh'}
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
        </div>
        {/* AI Auto-fill button */}
        {form.reference_image_url && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs"
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
};

export function CharacterProfileManager() {
  const { profiles, isLoading, createProfile, updateProfile, deleteProfile } = useCharacterProfiles();
  const { currentOrganization } = useOrganizationContext();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

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

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editingId) {
      await updateProfile.mutateAsync({ id: editingId, ...form });
    } else {
      await createProfile.mutateAsync(form);
    }
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleEdit = (profile: CharacterProfile) => {
    setEditingId(profile.id);
    setForm({
      name: profile.name,
      description: profile.description,
      appearance: (profile.appearance as CharacterAppearance) || {},
      wardrobe: profile.wardrobe || '',
      reference_image_url: profile.reference_image_url || '',
      reference_images: (Array.isArray(profile.reference_images) ? profile.reference_images : []) as ReferenceImage[],
      default_voice_id: profile.default_voice_id || '',
      default_voice_provider: profile.default_voice_provider || '',
    });
    setOpen(true);
  };

  const handleNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const isSaving = createProfile.isPending || updateProfile.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Nhân vật</h3>
          <p className="text-xs text-muted-foreground">Tạo hồ sơ nhân vật để giữ đồng nhất ngoại hình xuyên suốt các scene video</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleNew}>
              <Plus className="w-3.5 h-3.5" /> Thêm
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Sửa nhân vật' : 'Tạo nhân vật mới'}</DialogTitle>
            </DialogHeader>
            <CharacterFormFields
              form={form}
              setForm={setForm}
              uploading={uploading}
              onUploadImage={handleUploadImage}
              onUploadRefImage={handleUploadRefImage}
              onAiAnalyze={handleAiAnalyze}
              analyzing={analyzing}
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

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : profiles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-8">
            <User className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Chưa có nhân vật nào</p>
            <Button size="sm" variant="outline" onClick={handleNew} className="gap-1.5 mt-1">
              <Plus className="w-3.5 h-3.5" /> Tạo nhân vật đầu tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {profiles.map((p) => {
            const app = p.appearance as CharacterAppearance;
            const refCount = Array.isArray(p.reference_images) ? p.reference_images.length : 0;
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
                    <p className="text-sm font-semibold truncate">{p.name}</p>
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
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(p)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteProfile.mutate(p.id)}
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
    </div>
  );
}
