import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CampaignGoal, getKPIMetricConfig } from '@/types/campaign';
import { useCampaignDetail } from '@/hooks/useCampaigns';

interface KPILogFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  goals: CampaignGoal[];
}

export function KPILogFormDialog({ 
  open, 
  onOpenChange, 
  campaignId,
  goals 
}: KPILogFormDialogProps) {
  const { addKPILog, updateKPIs } = useCampaignDetail(campaignId);
  
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [values, setValues] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleValueChange = (metric: string, value: number) => {
    setValues(prev => ({ ...prev, [metric]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSaving(true);
    try {
      // Log the KPI entry
      await addKPILog?.({
        logged_at: logDate,
        metrics: values,
        notes: notes || undefined,
      });

      // Update current values in campaign goals
      const updatedGoals = goals.map(goal => ({
        ...goal,
        current: values[goal.metric] !== undefined ? values[goal.metric] : goal.current,
      }));
      await updateKPIs(updatedGoals);

      // Reset form
      setValues({});
      setNotes('');
      setLogDate(new Date().toISOString().split('T')[0]);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log KPI Update</DialogTitle>
          <DialogDescription>
            Ghi nhận số liệu KPI mới nhất
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="log_date">Ngày ghi nhận</Label>
            <Input
              id="log_date"
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Chỉ số KPI</Label>
            {goals.map((goal) => {
              const config = getKPIMetricConfig(goal.metric);
              return (
                <div key={goal.metric} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <span className="text-lg">{config?.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{goal.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Hiện tại: {goal.current} / Mục tiêu: {goal.target}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      placeholder="Giá trị mới"
                      className="w-24 h-8"
                      value={values[goal.metric] ?? ''}
                      onChange={(e) => handleValueChange(goal.metric, Number(e.target.value))}
                    />
                    {goal.unit && (
                      <span className="text-xs text-muted-foreground">{goal.unit}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú (tùy chọn)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhận xét về tiến độ..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
