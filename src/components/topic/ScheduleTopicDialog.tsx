import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CalendarIcon, Clock, Sparkles, FileText, Layers, ImageIcon, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ContentGoal } from '@/types/multichannel';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';

export type ContentFormat = 'multichannel' | 'script' | 'carousel';

interface ScheduleTopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: string;
  contentGoal?: ContentGoal;
  onSchedule: (data: ScheduleTopicData) => void;
  isLoading?: boolean;
}

export interface ScheduleTopicData {
  topic: string;
  contentGoal: ContentGoal;
  scheduledDate: Date;
  scheduledTime: string;
  contentFormat: ContentFormat;
  brandTemplateId?: string;
  notes?: string;
}

const CONTENT_GOALS: { value: ContentGoal; label: string }[] = [
  { value: 'engagement', label: 'Tăng tương tác' },
  { value: 'awareness', label: 'Nâng cao nhận diện' },
  { value: 'conversion', label: 'Chuyển đổi' },
  { value: 'education', label: 'Giáo dục' },
];

const CONTENT_FORMATS: { value: ContentFormat; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: 'multichannel', 
    label: 'Multi-channel', 
    icon: <Layers className="w-4 h-4" />,
    description: 'Tạo nội dung cho nhiều kênh'
  },
  { 
    value: 'script', 
    label: 'Video Studio', 
    icon: <Video className="w-4 h-4" />,
    description: 'Kịch bản cho video ngắn'
  },
  { 
    value: 'carousel', 
    label: 'Carousel', 
    icon: <ImageIcon className="w-4 h-4" />,
    description: 'Bài đăng carousel/slides'
  },
];

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00',
];

export function ScheduleTopicDialog({
  open,
  onOpenChange,
  topic,
  contentGoal: initialGoal,
  onSchedule,
  isLoading = false,
}: ScheduleTopicDialogProps) {
  const { templates: brands } = useBrandTemplates();
  
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date());
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [contentGoal, setContentGoal] = useState<ContentGoal>(initialGoal || 'engagement');
  const [contentFormat, setContentFormat] = useState<ContentFormat>('multichannel');
  const [brandTemplateId, setBrandTemplateId] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setScheduledDate(new Date());
      setScheduledTime('09:00');
      setContentGoal(initialGoal || 'engagement');
      setContentFormat('multichannel');
      setNotes('');
    }
  }, [open, initialGoal]);

  // Set default brand when loaded
  useEffect(() => {
    if (brands.length > 0 && !brandTemplateId) {
      const defaultBrand = brands.find(b => b.is_default) || brands[0];
      if (defaultBrand) {
        setBrandTemplateId(defaultBrand.id);
      }
    }
  }, [brands, brandTemplateId]);

  const handleSubmit = () => {
    if (!scheduledDate) return;
    
    onSchedule({
      topic,
      contentGoal,
      scheduledDate,
      scheduledTime,
      contentFormat,
      brandTemplateId: brandTemplateId || undefined,
      notes: notes || undefined,
    });
  };

  const selectedBrand = brands.find(b => b.id === brandTemplateId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Lên lịch ý tưởng
          </DialogTitle>
          <DialogDescription>
            Lên lịch để tạo nội dung từ ý tưởng này vào thời điểm phù hợp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Topic Preview */}
          <Card className="bg-muted/50">
            <CardContent className="py-3 px-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{topic}</p>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {CONTENT_GOALS.find(g => g.value === contentGoal)?.label}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Ngày đăng</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? (
                      format(scheduledDate, "dd/MM/yyyy", { locale: vi })
                    ) : (
                      <span>Chọn ngày</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Giờ đăng</Label>
              <Select value={scheduledTime} onValueChange={setScheduledTime}>
                <SelectTrigger>
                  <Clock className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content Format */}
          <div className="space-y-2">
            <Label>Định dạng nội dung</Label>
            <div className="grid grid-cols-3 gap-2">
              {CONTENT_FORMATS.map((format) => (
                <button
                  key={format.value}
                  type="button"
                  onClick={() => setContentFormat(format.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all text-center",
                    contentFormat === format.value
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-full",
                    contentFormat === format.value ? "bg-primary/20" : "bg-muted"
                  )}>
                    {format.icon}
                  </div>
                  <span className="text-xs font-medium">{format.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Brand Template */}
          <div className="space-y-2">
            <Label>Brand Template</Label>
            <Select value={brandTemplateId} onValueChange={setBrandTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    <div className="flex items-center gap-2">
                      {brand.primary_color && (
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: brand.primary_color }}
                        />
                      )}
                      {brand.brand_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content Goal */}
          <div className="space-y-2">
            <Label>Mục tiêu nội dung</Label>
            <Select value={contentGoal} onValueChange={(v) => setContentGoal(v as ContentGoal)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_GOALS.map((goal) => (
                  <SelectItem key={goal.value} value={goal.value}>
                    {goal.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Ghi chú (tùy chọn)</Label>
            <Textarea
              placeholder="Thêm ghi chú cho lịch..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={!scheduledDate || isLoading}>
            {isLoading ? (
              <>Đang lưu...</>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Lên lịch
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
