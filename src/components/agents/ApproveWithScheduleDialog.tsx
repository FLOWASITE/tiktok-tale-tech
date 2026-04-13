import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Clock, Send, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AgentPipeline } from '@/types/agent';

interface ApproveWithScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  pipeline: AgentPipeline | null;
  onConfirm: (scheduledAt: string | null) => void;
  isLoading?: boolean;
}

export function ApproveWithScheduleDialog({ open, onClose, pipeline, onConfirm, isLoading }: ApproveWithScheduleDialogProps) {
  const existingDate = pipeline?.scheduled_publish_at ? new Date(pipeline.scheduled_publish_at) : null;
  const [date, setDate] = useState<Date | undefined>(existingDate ?? undefined);
  const [time, setTime] = useState(existingDate ? format(existingDate, 'HH:mm') : '09:00');

  const handleScheduleConfirm = () => {
    if (!date) return;
    const [h, m] = time.split(':').map(Number);
    const scheduled = new Date(date);
    scheduled.setHours(h, m, 0, 0);
    onConfirm(scheduled.toISOString());
  };

  const handlePublishNow = () => {
    onConfirm(null);
  };

  // Reset state when pipeline changes
  const pipelineId = pipeline?.id;
  const [lastPipelineId, setLastPipelineId] = useState<string | null>(null);
  if (pipelineId && pipelineId !== lastPipelineId) {
    setLastPipelineId(pipelineId);
    const d = pipeline?.scheduled_publish_at ? new Date(pipeline.scheduled_publish_at) : undefined;
    setDate(d);
    setTime(d ? format(d, 'HH:mm') : '09:00');
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary" />
            Duyệt & Lên lịch đăng
          </DialogTitle>
          <DialogDescription>
            {pipeline?.content_title || 'Nội dung pipeline'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {pipeline?.scheduled_publish_at && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              Lịch từ kế hoạch: {format(new Date(pipeline.scheduled_publish_at), 'dd/MM/yyyy HH:mm')}
            </div>
          )}

          <div className="space-y-2">
            <Label>Ngày đăng</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'dd/MM/yyyy') : 'Chọn ngày...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Giờ đăng</Label>
            <div className="relative">
              <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handlePublishNow} disabled={isLoading} className="gap-1.5">
            <Send className="w-3.5 h-3.5" />
            Duyệt & Đăng ngay
          </Button>
          <Button onClick={handleScheduleConfirm} disabled={!date || isLoading} className="gap-1.5">
            <CalendarCheck className="w-3.5 h-3.5" />
            Duyệt & Lên lịch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
