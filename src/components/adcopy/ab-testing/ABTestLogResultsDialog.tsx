import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { useAdCopyABTests } from '@/hooks/useAdCopyABTests';
import type { AdCopyVariation } from '@/types/adCopy';

interface ABTestLogResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
  variationIds: string[];
  variations: AdCopyVariation[];
  onSuccess?: () => void;
}

interface VariationData {
  impressions: string;
  clicks: string;
  conversions: string;
  spend: string;
}

export function ABTestLogResultsDialog({ 
  open, 
  onOpenChange, 
  testId, 
  variationIds, 
  variations,
  onSuccess 
}: ABTestLogResultsDialogProps) {
  const { logResult } = useAdCopyABTests();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<Record<string, VariationData>>(() => {
    const initial: Record<string, VariationData> = {};
    variationIds.forEach(id => {
      initial[id] = { impressions: '', clicks: '', conversions: '', spend: '' };
    });
    return initial;
  });
  const [isSaving, setIsSaving] = useState(false);

  const updateData = (variationId: string, field: keyof VariationData, value: string) => {
    setData(prev => ({
      ...prev,
      [variationId]: { ...prev[variationId], [field]: value }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      for (const variationId of variationIds) {
        const d = data[variationId];
        if (d.impressions || d.clicks || d.conversions || d.spend) {
          await logResult.mutateAsync({
            abTestId: testId,
            variationId,
            impressions: parseInt(d.impressions) || 0,
            clicks: parseInt(d.clicks) || 0,
            conversions: parseInt(d.conversions) || 0,
            spend: parseFloat(d.spend) || 0,
            loggedAt: date,
          });
        }
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to log results:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nhập kết quả A/B Test</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Ngày ghi nhận</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Variation Data */}
          <div className="space-y-4">
            {variationIds.map((variationId, index) => {
              const variation = variations.find(v => v.id === variationId);
              return (
                <div key={variationId} className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-medium">Variation {variation?.variation_label || index + 1}</span>
                    {index === 0 && (
                      <span className="text-xs text-muted-foreground">(Control)</span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">Impressions</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={data[variationId]?.impressions || ''}
                        onChange={(e) => updateData(variationId, 'impressions', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Clicks</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={data[variationId]?.clicks || ''}
                        onChange={(e) => updateData(variationId, 'clicks', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Conversions</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={data[variationId]?.conversions || ''}
                        onChange={(e) => updateData(variationId, 'conversions', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Spend ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={data[variationId]?.spend || ''}
                        onChange={(e) => updateData(variationId, 'spend', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Lưu kết quả
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
