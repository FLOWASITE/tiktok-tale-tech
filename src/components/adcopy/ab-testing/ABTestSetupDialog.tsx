import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdCopyABTests } from '@/hooks/useAdCopyABTests';
import { 
  TEST_VARIABLES, 
  AB_TEST_METRICS,
  type ABTestVariable, 
  type ABTestMetric 
} from '@/types/adCopyABTest';
import type { AdCopyVariation } from '@/types/adCopy';

interface ABTestSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adCopyId: string;
  variations: AdCopyVariation[];
}

export function ABTestSetupDialog({ open, onOpenChange, adCopyId, variations }: ABTestSetupDialogProps) {
  const { createTest } = useAdCopyABTests(adCopyId);
  const [name, setName] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [testVariable, setTestVariable] = useState<ABTestVariable>('full_copy');
  const [selectedVariations, setSelectedVariations] = useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<ABTestMetric[]>(['ctr', 'conversions']);

  const handleVariationToggle = (variationId: string) => {
    setSelectedVariations(prev => 
      prev.includes(variationId)
        ? prev.filter(id => id !== variationId)
        : [...prev, variationId]
    );
  };

  const handleMetricToggle = (metric: ABTestMetric) => {
    setSelectedMetrics(prev => 
      prev.includes(metric)
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedVariations.length < 2) return;

    await createTest.mutateAsync({
      adCopyId,
      name: name.trim(),
      hypothesis: hypothesis.trim() || undefined,
      testVariable,
      variationIds: selectedVariations,
      metricsToTrack: selectedMetrics,
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setHypothesis('');
    setTestVariable('full_copy');
    setSelectedVariations([]);
    setSelectedMetrics(['ctr', 'conversions']);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Tạo A/B Test mới
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Test Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Tên test *</Label>
            <Input
              id="name"
              placeholder="VD: Test headline Q1 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Hypothesis */}
          <div className="space-y-2">
            <Label htmlFor="hypothesis">Giả thuyết (tùy chọn)</Label>
            <Textarea
              id="hypothesis"
              placeholder="VD: Headline với số liệu cụ thể sẽ có CTR cao hơn 20%"
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              rows={2}
            />
          </div>

          {/* Test Variable */}
          <div className="space-y-3">
            <Label>Biến số test *</Label>
            <div className="grid grid-cols-2 gap-2">
              {TEST_VARIABLES.map((variable) => (
                <button
                  key={variable.value}
                  type="button"
                  onClick={() => setTestVariable(variable.value as ABTestVariable)}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all",
                    testVariable === variable.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="font-medium text-sm">{variable.label}</div>
                  <div className="text-xs text-muted-foreground">{variable.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Select Variations */}
          <div className="space-y-3">
            <Label>Chọn variations để test * (tối thiểu 2)</Label>
            <div className="grid gap-2">
              {variations.map((v) => (
                <label
                  key={v.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    selectedVariations.includes(v.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <Checkbox
                    checked={selectedVariations.includes(v.id)}
                    onCheckedChange={() => handleVariationToggle(v.id)}
                  />
                  <div className="flex-1">
                    <span className="font-medium">Variation {v.variation_label}</span>
                    {selectedVariations[0] === v.id && (
                      <Badge variant="outline" className="ml-2 text-xs">Control</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {v.headline || v.primary_text?.substring(0, 30) || '...'}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Variation đầu tiên được chọn sẽ là Control group
            </p>
          </div>

          {/* Metrics to Track */}
          <div className="space-y-3">
            <Label>Metrics theo dõi *</Label>
            <div className="flex flex-wrap gap-2">
              {AB_TEST_METRICS.map((metric) => (
                <label
                  key={metric.value}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all",
                    selectedMetrics.includes(metric.value as ABTestMetric)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <Checkbox
                    checked={selectedMetrics.includes(metric.value as ABTestMetric)}
                    onCheckedChange={() => handleMetricToggle(metric.value as ABTestMetric)}
                  />
                  <span className="text-sm">{metric.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button 
              type="submit" 
              disabled={createTest.isPending || !name.trim() || selectedVariations.length < 2 || selectedMetrics.length === 0}
            >
              {createTest.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Tạo A/B Test
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
