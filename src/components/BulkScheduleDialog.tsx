import { useState, useMemo } from 'react';
import { format, addMinutes } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CalendarClock, Clock, Timer, Info, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Channel, CHANNELS, MultiChannelContent, ContentStatus } from '@/types/multichannel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

interface BulkScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contents: MultiChannelContent[];
  onScheduleComplete?: () => void;
}


// Stagger intervals in minutes
const STAGGER_OPTIONS = [
  { value: 0, label: 'Không cách nhau' },
  { value: 5, label: '5 phút' },
  { value: 10, label: '10 phút' },
  { value: 15, label: '15 phút' },
  { value: 30, label: '30 phút' },
  { value: 60, label: '1 giờ' },
  { value: 120, label: '2 giờ' },
  { value: 1440, label: '1 ngày' },
];

export function BulkScheduleDialog({
  open,
  onOpenChange,
  contents,
  onScheduleComplete,
}: BulkScheduleDialogProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [selectedChannels, setSelectedChannels] = useState<Set<Channel>>(new Set());
  const [staggerMinutes, setStaggerMinutes] = useState(15);
  const [isScheduling, setIsScheduling] = useState(false);
  const [notes, setNotes] = useState('');

  // Get all available channels from selected contents (only approved/published status)
  const availableChannels = useMemo(() => {
    const channelSet = new Set<Channel>();
    contents.forEach((content) => {
      const contentChannels = Array.isArray(content.selected_channels) ? content.selected_channels : [];
      contentChannels.forEach((channel) => {
        const statuses = (content.channel_statuses as Record<string, ContentStatus>) || {};
        const status = statuses[channel];
        // Only allow scheduling for approved or published channels
        if (status === 'approved' || status === 'published') {
          channelSet.add(channel as Channel);
        }
      });
    });
    return Array.from(channelSet);
  }, [contents]);

  // Calculate preview of scheduled times
  const schedulePreview = useMemo(() => {
    if (!selectedDate || selectedChannels.size === 0) return [];

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const baseDate = new Date(selectedDate);
    baseDate.setHours(hours, minutes, 0, 0);

    const preview: { content: MultiChannelContent; channel: Channel; scheduledAt: Date }[] = [];
    let currentTime = baseDate;

    contents.forEach((content) => {
      const contentChannels = Array.isArray(content.selected_channels) ? content.selected_channels : [];
      selectedChannels.forEach((channel) => {
        // Check if this content has this channel approved
        const statuses = (content.channel_statuses as Record<string, ContentStatus>) || {};
        const status = statuses[channel];
        if (contentChannels.includes(channel) && (status === 'approved' || status === 'published')) {
          preview.push({
            content,
            channel,
            scheduledAt: new Date(currentTime),
          });
          currentTime = addMinutes(currentTime, staggerMinutes);
        }
      });
    });

    return preview;
  }, [contents, selectedDate, selectedTime, selectedChannels, staggerMinutes]);

  const toggleChannel = (channel: Channel) => {
    const newSelected = new Set(selectedChannels);
    if (newSelected.has(channel)) {
      newSelected.delete(channel);
    } else {
      newSelected.add(channel);
    }
    setSelectedChannels(newSelected);
  };

  const selectAllChannels = () => {
    setSelectedChannels(new Set(availableChannels));
  };

  const handleSchedule = async () => {
    if (!user || !selectedDate || selectedChannels.size === 0) return;

    setIsScheduling(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const item of schedulePreview) {
        try {
          const { error } = await supabase
            .from('content_schedules')
            .insert({
              content_id: item.content.id,
              channel: item.channel,
              organization_id: currentOrganization?.id || null,
              scheduled_at: item.scheduledAt.toISOString(),
              timezone: 'Asia/Ho_Chi_Minh',
              notes: notes || null,
              created_by: user.id,
              publish_status: 'scheduled',
            });

          if (error) throw error;

          // Log the scheduling action
          await supabase.from('content_publishing_logs').insert({
            content_id: item.content.id,
            channel: item.channel,
            organization_id: currentOrganization?.id || null,
            action: 'bulk_scheduled',
            performed_by: user.id,
            performed_at: new Date().toISOString(),
            details: { 
              scheduled_at: item.scheduledAt.toISOString(),
              bulk_count: schedulePreview.length,
            },
          });

          successCount++;
        } catch (error) {
          console.error('Error scheduling item:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Đã lên lịch hàng loạt',
          description: `Thành công: ${successCount}/${schedulePreview.length} lịch đăng${errorCount > 0 ? `. Lỗi: ${errorCount}` : ''}`,
        });
        onScheduleComplete?.();
        onOpenChange(false);
        
        // Reset form
        setSelectedChannels(new Set());
        setNotes('');
      } else {
        toast({
          title: 'Lỗi',
          description: 'Không thể lên lịch bất kỳ nội dung nào',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Bulk scheduling error:', error);
      toast({
        title: 'Lỗi',
        description: 'Có lỗi xảy ra khi lên lịch hàng loạt',
        variant: 'destructive',
      });
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Lên lịch hàng loạt
          </DialogTitle>
          <DialogDescription>
            Lên lịch đăng bài cho {contents.length} nội dung đã chọn
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 py-4">
          {/* Selected Contents Preview */}
          <div>
            <Label className="text-sm font-medium">Nội dung đã chọn ({contents.length})</Label>
            <ScrollArea className="h-20 mt-2 rounded-md border p-2">
              <div className="space-y-1">
                {contents.map(content => (
                  <div key={content.id} className="text-xs flex items-center gap-2">
                    <Check className="w-3 h-3 text-green-500" />
                    <span className="truncate">{content.title}</span>
                    <div className="flex gap-0.5 ml-auto">
                      {content.selected_channels.slice(0, 3).map(ch => (
                        <ChannelIcon key={ch} channel={ch as Channel} size={12} className={channelIconColors[ch as Channel]} />
                      ))}
                      {content.selected_channels.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{content.selected_channels.length - 3}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Channel Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Chọn kênh đăng</Label>
              {availableChannels.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={selectAllChannels}
                  className="h-6 text-xs"
                >
                  Chọn tất cả
                </Button>
              )}
            </div>
            {availableChannels.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                <AlertCircle className="w-4 h-4" />
                Không có kênh nào được duyệt trong các nội dung đã chọn
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableChannels.map(channel => {
                  const channelInfo = CHANNELS.find(c => c.value === channel);
                  return (
                    <div
                      key={channel}
                      onClick={() => toggleChannel(channel)}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors',
                        selectedChannels.has(channel)
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-muted/50'
                      )}
                    >
                      <Checkbox checked={selectedChannels.has(channel)} />
                      <span className="text-sm">{channelEmojis[channel]}</span>
                      <span className="text-xs truncate">{channelInfo?.label || channel}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Date & Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Ngày bắt đầu</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarClock className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: vi }) : 'Chọn ngày'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={vi}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Giờ bắt đầu</Label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Stagger Interval */}
          <div>
            <Label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Timer className="w-4 h-4" />
              Khoảng cách giữa các bài
            </Label>
            <Select 
              value={staggerMinutes.toString()} 
              onValueChange={(v) => setStaggerMinutes(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGGER_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Ghi chú (tùy chọn)</Label>
            <Input
              placeholder="Ghi chú cho lịch đăng..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Separator />

          {/* Schedule Preview */}
          {schedulePreview.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Xem trước lịch đăng ({schedulePreview.length} bài)
              </Label>
              <ScrollArea className="h-40 rounded-md border p-2">
                <div className="space-y-2">
                  {schedulePreview.map((item, idx) => (
                    <div 
                      key={`${item.content.id}-${item.channel}-${idx}`}
                      className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50"
                    >
                      <Badge variant="outline" className="shrink-0 text-[10px] px-1.5">
                        #{idx + 1}
                      </Badge>
                      <span>{channelEmojis[item.channel]}</span>
                      <span className="truncate flex-1">{item.content.title}</span>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {format(item.scheduledAt, 'dd/MM HH:mm', { locale: vi })}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={isScheduling || selectedChannels.size === 0 || !selectedDate || schedulePreview.length === 0}
            className="gap-2"
          >
            {isScheduling ? (
              <>Đang lên lịch...</>
            ) : (
              <>
                <CalendarClock className="w-4 h-4" />
                Lên lịch {schedulePreview.length} bài
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
