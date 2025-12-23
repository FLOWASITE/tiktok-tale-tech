import { useState } from 'react';
import { BrandVoiceVariant, ChannelSampleTexts } from '@/hooks/useBrandVoiceVariants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Trash2, 
  Eye, 
  ArrowLeftRight, 
  Clock,
  Sparkles,
  Save,
  Loader2,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChannelMockupFrame } from './preview/ChannelMockupFrame';
import { ChannelType } from '@/utils/generateSampleText';

interface SavedSamplesManagerProps {
  variants: BrandVoiceVariant[];
  brandName: string;
  currentSampleTexts: Record<string, string> | null;
  isGenerating: boolean;
  onGenerateSample: () => void;
  onSaveSample: () => Promise<void>;
  onDeleteVariant: (id: string) => Promise<boolean>;
  onCompareVariants?: (variants: BrandVoiceVariant[]) => void;
}

const VISIBLE_CHANNELS: ChannelType[] = ['facebook', 'linkedin', 'instagram', 'tiktok', 'email'];

const CHANNEL_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  email: 'Email',
};

// Helper to format tone of voice
function formatToneOfVoice(tones: string[] | null): string {
  if (!tones || tones.length === 0) return 'Chưa đặt';
  return tones.slice(0, 2).join(', ') + (tones.length > 2 ? ` +${tones.length - 2}` : '');
}

// Helper to format formality
function formatFormality(level: string | null): string {
  const labels: Record<string, string> = {
    formal: 'Trang trọng',
    semi_formal: 'Bán trang trọng',
    casual: 'Thân mật',
    friendly: 'Gần gũi',
  };
  return level ? labels[level] || level : 'Chưa đặt';
}

export function SavedSamplesManager({
  variants,
  brandName,
  currentSampleTexts,
  isGenerating,
  onGenerateSample,
  onSaveSample,
  onDeleteVariant,
  onCompareVariants,
}: SavedSamplesManagerProps) {
  const [previewVariant, setPreviewVariant] = useState<BrandVoiceVariant | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [activePreviewChannel, setActivePreviewChannel] = useState<ChannelType>('facebook');

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSample();
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await onDeleteVariant(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  // Toggle compare selection
  const toggleCompareSelection = (id: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  // Get preview sample
  const getPreviewSample = (variant: BrandVoiceVariant, channel: ChannelType): string => {
    if (!variant.sample_texts) return '';
    const sample = variant.sample_texts[channel];
    if (typeof sample === 'string') return sample;
    if (sample && typeof sample === 'object' && 'subject' in sample && 'body' in sample) {
      return `📧 Subject: ${sample.subject}\n\n${sample.body}`;
    }
    return '';
  };

  const hasCurrentSample = currentSampleTexts && Object.keys(currentSampleTexts).length > 0;

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Nội dung mẫu</h3>
          <Badge variant="secondary" className="text-xs">
            {variants.length} mẫu đã lưu
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedForCompare.length >= 2 && onCompareVariants && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const selected = variants.filter(v => selectedForCompare.includes(v.id));
                onCompareVariants(selected);
                setSelectedForCompare([]);
              }}
              className="gap-1.5"
            >
              <ArrowLeftRight className="w-4 h-4" />
              So sánh ({selectedForCompare.length})
            </Button>
          )}
        </div>
      </div>

      {/* Current sample preview & actions */}
      <Card className={cn(
        "border-dashed transition-all",
        hasCurrentSample ? "border-primary/40 bg-primary/5" : ""
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1">
                {hasCurrentSample ? 'Mẫu hiện tại (chưa lưu)' : 'Tạo nội dung mẫu'}
              </p>
              <p className="text-xs text-muted-foreground">
                {hasCurrentSample 
                  ? 'Bấm "Lưu Mẫu" để lưu vào danh sách và so sánh sau' 
                  : 'Tạo nội dung mẫu dựa trên Brand Voice đã cấu hình'}
              </p>
              
              {/* Quick preview of current sample */}
              {hasCurrentSample && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {VISIBLE_CHANNELS.slice(0, 3).map(channel => (
                    <div key={channel} className="bg-background rounded-md p-2 text-xs">
                      <div className="font-medium text-muted-foreground mb-1">{CHANNEL_LABELS[channel]}</div>
                      <p className="line-clamp-2">{currentSampleTexts[channel] || '...'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-2 shrink-0">
              <Button
                onClick={onGenerateSample}
                disabled={isGenerating}
                size="sm"
                variant={hasCurrentSample ? "outline" : "default"}
                className="gap-1.5"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {hasCurrentSample ? 'Tạo lại' : 'Tạo mẫu'}
                  </>
                )}
              </Button>
              
              {hasCurrentSample && (
                <Button
                  onClick={handleSave}
                  disabled={isSaving || isGenerating}
                  size="sm"
                  className="gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Lưu mẫu
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saved samples list */}
      {variants.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">Các mẫu đã lưu</div>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {variants.map((variant) => (
                <Card 
                  key={variant.id} 
                  className={cn(
                    "transition-all cursor-pointer hover:border-primary/30",
                    selectedForCompare.includes(variant.id) && "border-primary ring-1 ring-primary/20"
                  )}
                  onClick={() => toggleCompareSelection(variant.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{variant.name}</span>
                          {variant.is_control && (
                            <Badge variant="secondary" className="text-xs">Control</Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(variant.created_at), 'dd/MM HH:mm', { locale: vi })}
                          </span>
                          <span>Tone: {formatToneOfVoice(variant.tone_of_voice)}</span>
                          <span>Phong cách: {formatFormality(variant.formality_level)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPreviewVariant(variant)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        {!variant.is_control && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(variant.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
          
          <p className="text-xs text-muted-foreground text-center">
            Bấm vào mẫu để chọn so sánh (tối đa 3)
          </p>
        </div>
      )}

      {/* Empty state */}
      {variants.length === 0 && !hasCurrentSample && (
        <div className="text-center py-8 text-muted-foreground">
          <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Chưa có mẫu nào được lưu</p>
          <p className="text-xs mt-1">Tạo nội dung mẫu và lưu để so sánh sau</p>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewVariant} onOpenChange={(open) => !open && setPreviewVariant(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              {previewVariant?.name}
            </DialogTitle>
          </DialogHeader>
          
          {previewVariant && (
            <div className="p-6">
              {/* Channel tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {VISIBLE_CHANNELS.map(channel => (
                  <Button
                    key={channel}
                    variant={activePreviewChannel === channel ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActivePreviewChannel(channel)}
                    className="shrink-0"
                  >
                    {CHANNEL_LABELS[channel]}
                  </Button>
                ))}
              </div>
              
              {/* Mockup preview */}
              <div className="flex justify-center">
                <div className="w-full max-w-md">
                  <ChannelMockupFrame
                    channel={activePreviewChannel}
                    content={getPreviewSample(previewVariant, activePreviewChannel)}
                    brandName={brandName}
                  />
                </div>
              </div>
              
              {/* Voice settings summary */}
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Tone of Voice</div>
                    <div className="font-medium">{formatToneOfVoice(previewVariant.tone_of_voice)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Phong cách</div>
                    <div className="font-medium">{formatFormality(previewVariant.formality_level)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Emoji</div>
                    <div className="font-medium">{previewVariant.allow_emoji ? 'Có' : 'Không'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Tạo lúc</div>
                    <div className="font-medium">
                      {format(new Date(previewVariant.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa mẫu này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Mẫu sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
