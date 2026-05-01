import { useState, useMemo } from 'react';
import { CalendarClock, Clock, Check, Loader2, AlertCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { MultiChannelContent, Channel, CONTENT_STATUSES } from '@/types/multichannel';
import { useContentSchedules } from '@/hooks/useContentSchedules';

interface QuickScheduleDialogProps {
  content: MultiChannelContent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduleComplete?: () => void;
}

const channelLabels: Record<Channel, string> = {
  website: 'Website/Blog',
  blogger: 'Website/Blog',
  wordpress: 'Website/Blog',
  facebook: 'Facebook',
  instagram: 'Instagram',
  pinterest: 'Instagram',
  twitter: 'X (Twitter)',
  google_maps: 'Google Maps',
  linkedin: 'LinkedIn',
  email: 'Email',
  youtube: 'YouTube',
  zalo_oa: 'Zalo OA',
  telegram: 'Telegram',
  tiktok: 'TikTok',
  threads: 'Threads',
  bluesky: 'Bluesky',
};

const channelColors: Record<Channel, string> = {
  website: 'bg-blue-500/10 text-blue-600 border-blue-200',
  blogger: 'bg-blue-500/10 text-blue-600 border-blue-200',
  wordpress: 'bg-blue-500/10 text-blue-600 border-blue-200',
  facebook: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
  instagram: 'bg-pink-500/10 text-pink-600 border-pink-200',
  pinterest: 'bg-[#E60023]/10 text-[#E60023] border-[#E60023]/30',
  twitter: 'bg-slate-500/10 text-slate-600 border-slate-200',
  google_maps: 'bg-green-500/10 text-green-600 border-green-200',
  linkedin: 'bg-sky-500/10 text-sky-600 border-sky-200',
  email: 'bg-amber-500/10 text-amber-600 border-amber-200',
  youtube: 'bg-red-500/10 text-red-600 border-red-200',
  zalo_oa: 'bg-blue-500/10 text-blue-600 border-blue-200',
  telegram: 'bg-sky-500/10 text-sky-600 border-sky-200',
  tiktok: 'bg-pink-500/10 text-pink-600 border-pink-200',
  threads: 'bg-slate-500/10 text-slate-600 border-slate-200',
  bluesky: 'Bluesky',
};

export function QuickScheduleDialog({ 
  content, 
  open, 
  onOpenChange,
  onScheduleComplete 
}: QuickScheduleDialogProps) {
  const { schedules, upsertSchedule } = useContentSchedules(content.id);
  
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter channels that can be scheduled (approved or published)
  const schedulableChannels = useMemo(() => {
    const masterApproved = content.status === 'approved' || content.status === 'published';
    return content.selected_channels.filter(channel => {
      if (masterApproved) return true;
      const status = content.channel_statuses?.[channel] || 'draft';
      return status === 'approved' || status === 'published';
    });
  }, [content.selected_channels, content.channel_statuses, content.status]);

  // Channels that need approval first
  const pendingChannels = useMemo(() => {
    const masterApproved = content.status === 'approved' || content.status === 'published';
    if (masterApproved) return [];
    return content.selected_channels.filter(channel => {
      const status = content.channel_statuses?.[channel] || 'draft';
      return status !== 'approved' && status !== 'published';
    });
  }, [content.selected_channels, content.channel_statuses, content.status]);

  // Get existing schedule for a channel
  const getExistingSchedule = (channel: Channel) => {
    return schedules.find(s => s.channel === channel && s.publish_status !== 'cancelled');
  };

  const handleToggleChannel = (channel: Channel) => {
    setSelectedChannels(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const handleSelectAll = () => {
    if (selectedChannels.length === schedulableChannels.length) {
      setSelectedChannels([]);
    } else {
      setSelectedChannels([...schedulableChannels]);
    }
  };

  const handleSave = async () => {
    if (selectedChannels.length === 0 || !scheduleDate || !scheduleTime) return;

    setIsSaving(true);
    try {
      const scheduledAt = new Date(
        `${format(scheduleDate, 'yyyy-MM-dd')}T${scheduleTime}:00`
      );

      // Schedule all selected channels
      await Promise.all(
        selectedChannels.map(channel => 
          upsertSchedule(content.id, {
            channel,
            scheduled_at: scheduledAt.toISOString(),
            notes: scheduleNotes || undefined,
          })
        )
      );

      onScheduleComplete?.();
      onOpenChange(false);
      
      // Reset state
      setSelectedChannels([]);
      setScheduleNotes('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedChannels([]);
      setScheduleNotes('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Lên lịch nhanh
          </DialogTitle>
          <DialogDescription>
            {content.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Channel Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Chọn kênh đăng</Label>
              {schedulableChannels.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleSelectAll}
                >
                  {selectedChannels.length === schedulableChannels.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </Button>
              )}
            </div>

            <ScrollArea className="h-[180px] pr-2">
              <div className="space-y-2">
                {schedulableChannels.map(channel => {
                  const status = content.channel_statuses?.[channel] || 'draft';
                  const statusConfig = CONTENT_STATUSES.find(s => s.value === status);
                  const existingSchedule = getExistingSchedule(channel);
                  const isSelected = selectedChannels.includes(channel);

                  return (
                    <div 
                      key={channel}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer",
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      )}
                      onClick={() => handleToggleChannel(channel)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={() => handleToggleChannel(channel)}
                        />
                        <div>
                          <span className="font-medium text-sm">{channelLabels[channel]}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge 
                              variant="outline" 
                              className={cn("text-[10px] px-1.5 py-0", channelColors[channel])}
                            >
                              {statusConfig?.label || 'Bản nháp'}
                            </Badge>
                            {existingSchedule && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Đã lên lịch
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  );
                })}

                {/* Pending channels */}
                {pendingChannels.length > 0 && (
                  <div className="pt-2 border-t border-border mt-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <AlertCircle className="w-3 h-3" />
                      <span>Cần duyệt trước khi lên lịch</span>
                    </div>
                    <div className="space-y-1">
                      {pendingChannels.map(channel => {
                        const status = content.channel_statuses?.[channel] || 'draft';
                        const statusConfig = CONTENT_STATUSES.find(s => s.value === status);
                        
                        return (
                          <div 
                            key={channel}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50 opacity-60"
                          >
                            <span className="text-sm">{channelLabels[channel]}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {statusConfig?.label || 'Bản nháp'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {schedulableChannels.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Không có kênh nào sẵn sàng để lên lịch.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Hãy duyệt nội dung trước khi lên lịch đăng.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Date & Time Picker */}
          {schedulableChannels.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Ngày đăng</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !scheduleDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarClock className="mr-2 h-4 w-4" />
                        {scheduleDate ? format(scheduleDate, 'dd/MM/yyyy', { locale: vi }) : 'Chọn ngày'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduleDate}
                        onSelect={setScheduleDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Giờ đăng</Label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-sm">Ghi chú (tùy chọn)</Label>
                <Textarea
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  placeholder="Ghi chú cho lịch đăng..."
                  className="h-16 resize-none text-sm"
                />
              </div>

              {/* Preview */}
              {selectedChannels.length > 0 && scheduleDate && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm">
                    <span className="font-medium">{selectedChannels.length} kênh</span> sẽ được lên lịch đăng vào{' '}
                    <span className="font-medium">
                      {format(scheduleDate, "dd/MM/yyyy 'lúc'", { locale: vi })} {scheduleTime}
                    </span>
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || selectedChannels.length === 0 || !scheduleDate || !scheduleTime}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <CalendarClock className="w-4 h-4 mr-2" />
                Lên lịch {selectedChannels.length > 0 && `(${selectedChannels.length})`}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
