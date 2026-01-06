import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Layers, ArrowRight } from 'lucide-react';
import { useAdSequences } from '@/hooks/useAdSequences';
import { FUNNEL_STAGE_CONFIGS } from '@/types/adSequence';
import { toast } from 'sonner';
import type { AdCopy } from '@/types/adCopy';

interface AddToSequenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adCopy: AdCopy | null;
}

export function AddToSequenceDialog({ open, onOpenChange, adCopy }: AddToSequenceDialogProps) {
  const { sequences, addAdCopyToStage } = useAdSequences();
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>('');
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);

  const selectedSequence = sequences.find(s => s.id === selectedSequenceId);
  const stages = selectedSequence?.stages || [];

  const handleAdd = async () => {
    if (!adCopy || !selectedStageId) return;

    setIsAdding(true);
    try {
      await addAdCopyToStage.mutateAsync({
        stageId: selectedStageId,
        adCopyId: adCopy.id,
      });
      toast.success('Đã thêm ad copy vào sequence!');
      onOpenChange(false);
      setSelectedSequenceId('');
      setSelectedStageId('');
    } catch (error) {
      toast.error('Không thể thêm ad copy');
    } finally {
      setIsAdding(false);
    }
  };

  const handleSequenceChange = (value: string) => {
    setSelectedSequenceId(value);
    setSelectedStageId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Thêm vào Sequence
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Ad Copy Preview */}
          {adCopy && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium truncate">{adCopy.title}</p>
              <p className="text-xs text-muted-foreground truncate">{adCopy.topic}</p>
            </div>
          )}

          {/* Sequence Selection */}
          <div className="space-y-2">
            <Label>Chọn Sequence</Label>
            <Select value={selectedSequenceId} onValueChange={handleSequenceChange}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn sequence..." />
              </SelectTrigger>
              <SelectContent>
                {sequences.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Chưa có sequence nào
                  </div>
                ) : (
                  sequences.map((sequence) => (
                    <SelectItem key={sequence.id} value={sequence.id}>
                      <div className="flex items-center gap-2">
                        <span>{sequence.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {sequence.stages.length} stages
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Stage Selection */}
          {selectedSequence && (
            <div className="space-y-2">
              <Label>Chọn Stage</Label>
              <Select value={selectedStageId} onValueChange={setSelectedStageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn stage..." />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => {
                    const stageConfig = FUNNEL_STAGE_CONFIGS[stage.stage_name];
                    return (
                      <SelectItem key={stage.id} value={stage.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: stageConfig?.color || '#888' }}
                          />
                          <span>{stageConfig?.label || stage.stage_name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {stage.ad_copies?.length || 0} ads
                          </Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Visual Flow */}
          {selectedSequence && selectedStageId && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Badge variant="secondary">{adCopy?.title}</Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="default">
                {FUNNEL_STAGE_CONFIGS[stages.find(s => s.id === selectedStageId)?.stage_name || '']?.label || 'Stage'}
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedSequenceId || !selectedStageId || isAdding}
          >
            {isAdding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang thêm...
              </>
            ) : (
              <>
                <Layers className="h-4 w-4 mr-2" />
                Thêm vào Sequence
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
