import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Paperclip, Image as ImageIcon, X } from 'lucide-react';
import { useProductImageActions } from '@/hooks/useProductImageActions';
import { PRODUCT_REF_LABELS, type ProductReferenceImage, type ProductRefLabel, type ProductAppearance } from '@/types/product';
import { toast } from 'sonner';

const EDIT_MODEL_OPTIONS = [
  { value: 'auto', label: 'Tự động (khuyến nghị)', hint: 'Hệ thống chọn model edit phù hợp' },
  { value: 'poyo/seedream-5.0-lite-edit', label: 'Seedream 5 Edit', hint: 'Giữ packaging/label rất mạnh' },
  { value: 'poyo/nano-banana-pro', label: 'Nano Banana Pro', hint: 'Gemini 3 Pro identity tốt' },
  { value: 'poyo/flux-kontext-max', label: 'Flux Kontext Max', hint: 'Instruction edit chính xác' },
  { value: 'google/gemini-3-pro-image-preview', label: 'Gemini 3 Pro (Lovable)', hint: 'Fallback không cần PoYo' },
];

interface Props {
  productName: string;
  category?: string;
  description?: string;
  appearance?: ProductAppearance;
  primaryImageUrl?: string;
  referenceImages: ProductReferenceImage[];
  onChange: (next: ProductReferenceImage[]) => void;
}

export function ProductReferenceImagesEditor({
  productName,
  category,
  description,
  appearance,
  primaryImageUrl,
  referenceImages,
  onChange,
}: Props) {
  const [editModel, setEditModel] = useState('auto');
  const [attachedRefs, setAttachedRefs] = useState<Record<string, string>>({});
  const [perLabelLoading, setPerLabelLoading] = useState<string | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);

  const actions = useProductImageActions({
    name: productName,
    category,
    description,
    appearance,
  });

  const usedLabels = new Set(referenceImages.map(r => r.label));
  const availableLabels = PRODUCT_REF_LABELS.filter(l => !usedLabels.has(l.value));
  const refMain = primaryImageUrl || '';

  const handleAttach = async (label: string, file: File) => {
    setPerLabelLoading(label);
    try {
      const url = await actions.uploadFile(file);
      if (url) {
        setAttachedRefs(prev => ({ ...prev, [label]: url }));
        toast.success('Đã đính kèm ảnh tham chiếu');
      }
    } finally {
      setPerLabelLoading(null);
    }
  };

  const handleGenerateOne = async (label: ProductRefLabel) => {
    const refForThis = attachedRefs[label] || refMain;
    if (!refForThis) {
      toast.error('Cần ảnh tham chiếu (đính kèm hoặc ảnh chính) trước');
      return;
    }
    setPerLabelLoading(label);
    try {
      const url = await actions.generateImage(label, refForThis, {
        editModel: editModel === 'auto' ? undefined : editModel,
      });
      if (!url) return;
      onChange([...referenceImages, { url, label }]);
      setAttachedRefs(prev => {
        const { [label]: _drop, ...rest } = prev;
        return rest;
      });
      toast.success(`Đã tạo ${PRODUCT_REF_LABELS.find(l => l.value === label)?.label}`);
    } finally {
      setPerLabelLoading(null);
    }
  };

  const handleGenerateAll = async () => {
    if (!refMain) {
      toast.error('Cần ảnh chính trước');
      return;
    }
    setBulkGenerating(true);
    let current = [...referenceImages];
    let count = 0;
    try {
      for (const l of availableLabels) {
        toast.info(`Đang tạo ${l.label} (${count + 1}/${availableLabels.length})…`);
        const ref = attachedRefs[l.value] || refMain;
        const url = await actions.generateImage(l.value, ref, {
          editModel: editModel === 'auto' ? undefined : editModel,
        });
        if (!url) break;
        current = [...current, { url, label: l.value }];
        onChange(current);
        count++;
      }
      if (count > 0) toast.success(`Đã tạo ${count} góc`);
    } finally {
      setBulkGenerating(false);
    }
  };

  const handleRemove = (label: string) => {
    onChange(referenceImages.filter(r => r.label !== label));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Ảnh tham chiếu sản phẩm</p>
          <p className="text-[10px] text-muted-foreground">Đa góc giúp AI giữ đúng bao bì/màu/nhãn xuyên suốt video & ảnh.</p>
        </div>
        <Badge variant="outline" className="text-[10px]">{referenceImages.length}/5</Badge>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-medium text-muted-foreground">Model AI khi có ảnh tham chiếu</label>
        <Select value={editModel} onValueChange={setEditModel}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EDIT_MODEL_OPTIONS.map(m => (
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

      {refMain && availableLabels.length > 0 && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full gap-1.5 text-xs"
          disabled={bulkGenerating || !!perLabelLoading}
          onClick={handleGenerateAll}
        >
          {bulkGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Tạo {availableLabels.length} góc còn lại bằng AI
        </Button>
      )}

      {referenceImages.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {referenceImages.map((img, i) => (
            <div key={i} className="relative group">
              <img
                src={img.url}
                alt={img.label}
                className="w-full aspect-square rounded-lg object-cover ring-1 ring-border"
              />
              <Badge variant="secondary" className="absolute bottom-1 left-1 right-1 text-[9px] justify-center bg-background/85 backdrop-blur">
                {PRODUCT_REF_LABELS.find(l => l.value === img.label)?.label ?? img.label}
              </Badge>
              <button
                type="button"
                onClick={() => handleRemove(img.label)}
                className="absolute top-1 right-1 p-0.5 rounded bg-background/80 backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity"
                title="Xoá"
              >
                <X className="w-3 h-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      {availableLabels.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground">Tạo từng góc (đính kèm ảnh tham chiếu tuỳ chọn)</p>
          {availableLabels.map(l => {
            const attached = attachedRefs[l.value];
            const busy = perLabelLoading === l.value || actions.aiGenerating === l.value;
            return (
              <div key={l.value} className="flex items-center gap-2 p-2 rounded-lg ring-1 ring-border bg-muted/20">
                <div className="w-10 h-10 rounded-md overflow-hidden ring-1 ring-border flex-shrink-0 bg-muted flex items-center justify-center">
                  {attached ? (
                    <img src={attached} alt="ref" className="w-full h-full object-cover" />
                  ) : refMain ? (
                    <img src={refMain} alt="main" className="w-full h-full object-cover opacity-60" />
                  ) : (
                    <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{l.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {attached ? 'Đính kèm riêng' : refMain ? 'Dùng ảnh chính' : 'Chưa có ref'}
                  </p>
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={busy}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleAttach(l.value, f);
                      e.target.value = '';
                    }}
                  />
                  <span className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted text-muted-foreground" title="Đính kèm ảnh">
                    <Paperclip className="w-3.5 h-3.5" />
                  </span>
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 gap-1"
                  disabled={busy || (!attached && !refMain)}
                  onClick={() => handleGenerateOne(l.value)}
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span className="text-[10px]">Tạo</span>
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {referenceImages.length === 0 && !refMain && availableLabels.length > 0 && (
        <div className="text-center py-4 text-xs text-muted-foreground">
          Thêm ảnh chính ở phần trên hoặc đính kèm ảnh tham chiếu cho từng góc.
        </div>
      )}
    </div>
  );
}
