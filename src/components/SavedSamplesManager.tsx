import { useState, useMemo } from 'react';
import { BrandVoiceVariant } from '@/hooks/useBrandVoiceVariants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { SamplePreviewDialog } from './SamplePreviewDialog';
import { SampleComparisonDialog, ComparableSample } from './SampleComparisonDialog';

interface PendingSample {
  name: string;
  sample_texts: Record<string, string>;
  brand_positioning: string | null;
  tone_of_voice: string[] | null;
  formality_level: string | null;
  language_style: string[] | null;
  preferred_words: string[] | null;
  forbidden_words: string[] | null;
  allow_emoji: boolean;
}

interface SavedSamplesManagerProps {
  variants: BrandVoiceVariant[];
  pendingSamples?: PendingSample[];
  brandName: string;
  currentSampleTexts: Record<string, string> | null;
  isGenerating: boolean;
  isNewBrand?: boolean;
  onGenerateSample: () => void;
  onSaveSample: (name: string) => Promise<void>;
  onDeleteVariant: (id: string) => Promise<boolean>;
  onDeletePendingSample?: (index: number) => void;
  onCompareVariants?: (variants: BrandVoiceVariant[]) => void;
}

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
  pendingSamples = [],
  brandName,
  currentSampleTexts,
  isGenerating,
  isNewBrand = false,
  onGenerateSample,
  onSaveSample,
  onDeleteVariant,
  onDeletePendingSample,
}: SavedSamplesManagerProps) {
  // Preview states
  const [previewVariant, setPreviewVariant] = useState<BrandVoiceVariant | null>(null);
  const [previewPendingSample, setPreviewPendingSample] = useState<PendingSample | null>(null);
  const [previewCurrentSample, setPreviewCurrentSample] = useState(false);
  
  // Other states
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sampleName, setSampleName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  
  // Compare states
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const [selectedPendingForCompare, setSelectedPendingForCompare] = useState<Set<number>>(new Set());
  const [includeCurrentInCompare, setIncludeCurrentInCompare] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);

  // Handle save
  const handleSave = async () => {
    if (!sampleName.trim()) return;
    setIsSaving(true);
    try {
      await onSaveSample(sampleName.trim());
      setSampleName('');
      setShowNameInput(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await onDeleteVariant(deleteConfirmId);
    setDeleteConfirmId(null);
    // Remove from selection if deleted
    setSelectedForCompare(prev => {
      const next = new Set(prev);
      next.delete(deleteConfirmId);
      return next;
    });
  };

  // Toggle variant compare selection
  const toggleVariantSelection = (id: string) => {
    setSelectedForCompare(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle pending sample compare selection
  const togglePendingSelection = (index: number) => {
    setSelectedPendingForCompare(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Calculate total selected for comparison
  const totalSelectedForCompare = 
    selectedForCompare.size + 
    selectedPendingForCompare.size + 
    (includeCurrentInCompare && currentSampleTexts ? 1 : 0);

  // Build samples for comparison
  const samplesToCompare = useMemo<ComparableSample[]>(() => {
    const result: ComparableSample[] = [];
    
    // Add current sample if selected
    if (includeCurrentInCompare && currentSampleTexts) {
      result.push({
        id: 'current',
        name: 'Mẫu hiện tại',
        sample_texts: currentSampleTexts,
        is_pending: true,
      });
    }
    
    // Add pending samples
    pendingSamples.forEach((sample, index) => {
      if (selectedPendingForCompare.has(index)) {
        result.push({
          id: `pending-${index}`,
          name: sample.name,
          sample_texts: sample.sample_texts,
          tone_of_voice: sample.tone_of_voice,
          formality_level: sample.formality_level,
          allow_emoji: sample.allow_emoji,
          is_pending: true,
        });
      }
    });
    
    // Add saved variants
    variants.forEach(variant => {
      if (selectedForCompare.has(variant.id)) {
        result.push({
          id: variant.id,
          name: variant.name,
          sample_texts: variant.sample_texts || {},
          tone_of_voice: variant.tone_of_voice,
          formality_level: variant.formality_level,
          allow_emoji: variant.allow_emoji ?? true,
          is_control: variant.is_control ?? false,
        });
      }
    });
    
    return result;
  }, [includeCurrentInCompare, currentSampleTexts, pendingSamples, selectedPendingForCompare, variants, selectedForCompare]);

  const hasCurrentSample = currentSampleTexts && Object.keys(currentSampleTexts).length > 0;

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Nội dung mẫu</h3>
          <Badge variant="secondary" className="text-xs">
            {variants.length + pendingSamples.length} mẫu
          </Badge>
          {pendingSamples.length > 0 && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
              {pendingSamples.length} chờ lưu
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {totalSelectedForCompare >= 2 && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowCompareDialog(true)}
              className="gap-1.5"
            >
              <ArrowLeftRight className="w-4 h-4" />
              So sánh ({totalSelectedForCompare})
            </Button>
          )}
          {totalSelectedForCompare > 0 && totalSelectedForCompare < 2 && (
            <span className="text-xs text-muted-foreground">
              Chọn thêm {2 - totalSelectedForCompare} mẫu để so sánh
            </span>
          )}
        </div>
      </div>

      {/* Current sample preview & actions */}
      <Card className={cn(
        "border-dashed transition-all",
        hasCurrentSample ? "border-primary/40 bg-primary/5" : "",
        includeCurrentInCompare && hasCurrentSample && "ring-2 ring-primary"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {hasCurrentSample && (
                  <Checkbox
                    checked={includeCurrentInCompare}
                    onCheckedChange={(checked) => setIncludeCurrentInCompare(!!checked)}
                    className="mr-1"
                  />
                )}
                <p className="text-sm font-medium">
                  {hasCurrentSample ? 'Mẫu hiện tại (chưa lưu)' : 'Tạo nội dung mẫu'}
                </p>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                {hasCurrentSample 
                  ? 'Tick để thêm vào so sánh, hoặc lưu để giữ lại' 
                  : 'Tạo nội dung mẫu dựa trên Brand Voice đã cấu hình'}
              </p>
              
              {/* Quick preview of current sample */}
              {hasCurrentSample && (
                <div className="mt-3 ml-6 flex flex-wrap gap-1.5">
                  {['facebook', 'linkedin', 'instagram', 'tiktok', 'email'].map(channel => (
                    <Badge 
                      key={channel} 
                      variant={currentSampleTexts[channel] ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {channel === 'facebook' && 'FB'}
                      {channel === 'linkedin' && 'LI'}
                      {channel === 'instagram' && 'IG'}
                      {channel === 'tiktok' && 'TT'}
                      {channel === 'email' && 'Email'}
                      {currentSampleTexts[channel] && <CheckCircle2 className="w-3 h-3 ml-1" />}
                    </Badge>
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
              
              {hasCurrentSample && !showNameInput && (
                <>
                  <Button
                    onClick={() => setPreviewCurrentSample(true)}
                    disabled={isGenerating}
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                  >
                    <Eye className="w-4 h-4" />
                    Xem mẫu
                  </Button>
                  <Button
                    onClick={() => setShowNameInput(true)}
                    disabled={isSaving || isGenerating}
                    size="sm"
                    className="gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    Lưu mẫu
                  </Button>
                </>
              )}
              
              {hasCurrentSample && showNameInput && (
                <div className="flex flex-col gap-2">
                  <Input
                    value={sampleName}
                    onChange={(e) => setSampleName(e.target.value)}
                    placeholder="Nhập tên mẫu..."
                    className="h-8 w-[160px] text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && sampleName.trim()) {
                        handleSave();
                      } else if (e.key === 'Escape') {
                        setShowNameInput(false);
                        setSampleName('');
                      }
                    }}
                  />
                  <div className="flex gap-1.5">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving || !sampleName.trim()}
                      size="sm"
                      className="gap-1.5 flex-1"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Lưu
                    </Button>
                    <Button
                      onClick={() => {
                        setShowNameInput(false);
                        setSampleName('');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Hủy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending samples (for new brand templates) */}
      {pendingSamples.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
            <Clock className="w-4 h-4" />
            Mẫu chờ lưu (sẽ lưu khi tạo Brand Template)
          </div>
          <div className="space-y-2">
            {pendingSamples.map((sample, index) => (
              <Card 
                key={`pending-${index}`} 
                className={cn(
                  "border-amber-300/50 bg-amber-50/30 dark:bg-amber-950/20 transition-all",
                  selectedPendingForCompare.has(index) && "ring-2 ring-primary"
                )}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Checkbox
                          checked={selectedPendingForCompare.has(index)}
                          onCheckedChange={() => togglePendingSelection(index)}
                        />
                        <span className="font-medium text-sm truncate">{sample.name}</span>
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
                          Chờ lưu
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground ml-6">
                        <span>Tone: {formatToneOfVoice(sample.tone_of_voice)}</span>
                        <span>Phong cách: {formatFormality(sample.formality_level)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPreviewPendingSample(sample)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {onDeletePendingSample && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => onDeletePendingSample(index)}
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
        </div>
      )}

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
                    "transition-all hover:border-primary/30",
                    selectedForCompare.has(variant.id) && "ring-2 ring-primary"
                  )}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Checkbox
                            checked={selectedForCompare.has(variant.id)}
                            onCheckedChange={() => toggleVariantSelection(variant.id)}
                          />
                          <span className="font-medium text-sm truncate">{variant.name}</span>
                          {variant.is_control && (
                            <Badge variant="secondary" className="text-xs">Control</Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground ml-6">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(variant.created_at), 'dd/MM HH:mm', { locale: vi })}
                          </span>
                          <span>Tone: {formatToneOfVoice(variant.tone_of_voice)}</span>
                          <span>Phong cách: {formatFormality(variant.formality_level)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
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
            Tick các mẫu để so sánh (tối thiểu 2 mẫu)
          </p>
        </div>
      )}

      {/* Empty state */}
      {variants.length === 0 && pendingSamples.length === 0 && !hasCurrentSample && (
        <div className="text-center py-8 text-muted-foreground">
          <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Chưa có mẫu nào được lưu</p>
          <p className="text-xs mt-1">Tạo nội dung mẫu và lưu để so sánh sau</p>
        </div>
      )}

      {/* Preview Dialogs */}
      {previewVariant && (
        <SamplePreviewDialog
          open={!!previewVariant}
          onOpenChange={(open) => !open && setPreviewVariant(null)}
          title={previewVariant.name}
          badge={previewVariant.is_control ? { text: 'Control', variant: 'secondary' } : undefined}
          sampleTexts={previewVariant.sample_texts || {}}
          brandName={brandName}
          voiceSettings={{
            tone_of_voice: previewVariant.tone_of_voice,
            formality_level: previewVariant.formality_level,
            allow_emoji: previewVariant.allow_emoji ?? true,
            created_at: previewVariant.created_at,
          }}
        />
      )}

      {previewPendingSample && (
        <SamplePreviewDialog
          open={!!previewPendingSample}
          onOpenChange={(open) => !open && setPreviewPendingSample(null)}
          title={previewPendingSample.name}
          badge={{ text: 'Chờ lưu', variant: 'outline' }}
          badgeClassName="text-amber-600 border-amber-400"
          sampleTexts={previewPendingSample.sample_texts}
          brandName={brandName}
          voiceSettings={{
            tone_of_voice: previewPendingSample.tone_of_voice,
            formality_level: previewPendingSample.formality_level,
            allow_emoji: previewPendingSample.allow_emoji,
          }}
        />
      )}

      {currentSampleTexts && (
        <SamplePreviewDialog
          open={previewCurrentSample}
          onOpenChange={setPreviewCurrentSample}
          title="Mẫu hiện tại"
          badge={{ text: 'Chưa lưu', variant: 'secondary' }}
          sampleTexts={currentSampleTexts}
          brandName={brandName}
        />
      )}

      {/* Compare Dialog */}
      <SampleComparisonDialog
        open={showCompareDialog}
        onOpenChange={setShowCompareDialog}
        brandName={brandName}
        samples={samplesToCompare}
      />

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
