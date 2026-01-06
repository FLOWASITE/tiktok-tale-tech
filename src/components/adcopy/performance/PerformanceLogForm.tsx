import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PerformanceFormData, calculateMetrics, formatPercent, formatCurrency } from '@/types/adCopyPerformance';
import { AdCopyVariation } from '@/types/adCopy';
import { cn } from '@/lib/utils';

interface PerformanceLogFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PerformanceFormData) => void;
  variations?: AdCopyVariation[];
  isLoading?: boolean;
}

export function PerformanceLogForm({
  open,
  onOpenChange,
  onSubmit,
  variations = [],
  isLoading = false,
}: PerformanceLogFormProps) {
  const [date, setDate] = useState<Date>(new Date());
  
  const { register, handleSubmit, watch, reset, setValue } = useForm<PerformanceFormData>({
    defaultValues: {
      logged_at: format(new Date(), 'yyyy-MM-dd'),
      impressions: 0,
      reach: 0,
      clicks: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      leads: 0,
      conversions: 0,
      conversion_value: 0,
      spend: 0,
    },
  });

  const watchedValues = watch();
  
  const calculatedMetrics = useMemo(() => 
    calculateMetrics(watchedValues), 
    [watchedValues]
  );

  const handleFormSubmit = (data: PerformanceFormData) => {
    onSubmit({
      ...data,
      logged_at: format(date, 'yyyy-MM-dd'),
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nhập dữ liệu Performance</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Date & Variation */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ngày</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {variations.length > 0 && (
              <div className="space-y-2">
                <Label>Variation (tùy chọn)</Label>
                <Select onValueChange={(v) => setValue('variation_id', v === 'all' ? undefined : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tất cả variations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả variations</SelectItem>
                    {variations.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.variation_label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Traffic Metrics */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Traffic</Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Impressions</Label>
                <Input type="number" {...register('impressions', { valueAsNumber: true })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Reach</Label>
                <Input type="number" {...register('reach', { valueAsNumber: true })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Clicks</Label>
                <Input type="number" {...register('clicks', { valueAsNumber: true })} />
              </div>
            </div>
          </div>

          {/* Engagement Metrics */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Engagement</Label>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Likes</Label>
                <Input type="number" {...register('likes', { valueAsNumber: true })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Comments</Label>
                <Input type="number" {...register('comments', { valueAsNumber: true })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Shares</Label>
                <Input type="number" {...register('shares', { valueAsNumber: true })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Saves</Label>
                <Input type="number" {...register('saves', { valueAsNumber: true })} />
              </div>
            </div>
          </div>

          {/* Conversion Metrics */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Conversion</Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Leads</Label>
                <Input type="number" {...register('leads', { valueAsNumber: true })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Conversions</Label>
                <Input type="number" {...register('conversions', { valueAsNumber: true })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Giá trị (VNĐ)</Label>
                <Input type="number" {...register('conversion_value', { valueAsNumber: true })} />
              </div>
            </div>
          </div>

          {/* Cost */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Chi phí</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Spend (VNĐ)</Label>
                <Input type="number" {...register('spend', { valueAsNumber: true })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Ghi chú</Label>
                <Textarea {...register('notes')} className="h-10 resize-none" />
              </div>
            </div>
          </div>

          {/* Calculated Metrics Preview */}
          <div className="bg-muted/50 rounded-lg p-4">
            <Label className="text-sm font-medium mb-3 block">Metrics tự động tính</Label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">CTR</span>
                <span className="font-medium">{formatPercent(calculatedMetrics.ctr)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">CPC</span>
                <span className="font-medium">{formatCurrency(calculatedMetrics.cpc)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">CPM</span>
                <span className="font-medium">{formatCurrency(calculatedMetrics.cpm)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Conv. Rate</span>
                <span className="font-medium">{formatPercent(calculatedMetrics.conversion_rate)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">ROAS</span>
                <span className="font-medium">{calculatedMetrics.roas.toFixed(2)}x</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Eng. Rate</span>
                <span className="font-medium">{formatPercent(calculatedMetrics.engagement_rate)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Đang lưu...' : 'Lưu dữ liệu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
