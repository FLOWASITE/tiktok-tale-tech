import { useState } from 'react';
import { Calendar, Clock, CalendarClock, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MultiChannelContent, Channel, CONTENT_STATUSES } from '@/types/multichannel';
import { ContentSchedule, PUBLISH_STATUSES } from '@/types/publishing';
import { useContentSchedules } from '@/hooks/useContentSchedules';
import { format, parseISO, isBefore, addMinutes } from 'date-fns';
import { vi } from 'date-fns/locale';

interface SchedulePanelProps {
  content: MultiChannelContent;
  onScheduleChange?: () => void;
}

const channelLabels: Record<Channel, string> = {
  website: 'Website/Blog',
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'X (Twitter)',
  google_maps: 'Google Maps',
  linkedin: 'LinkedIn',
  email: 'Email',
  youtube: 'YouTube',
  zalo_oa: 'Zalo OA',
  telegram: 'Telegram',
  tiktok: 'TikTok',
  threads: 'Threads',
};

export function SchedulePanel({ content, onScheduleChange }: SchedulePanelProps) {
  const { schedules, upsertSchedule, cancelSchedule, markAsPublished, isLoading } = useContentSchedules(content.id);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const getChannelStatus = (channel: Channel) => {
    return content.channel_statuses?.[channel] || 'draft';
  };

  const getScheduleForChannel = (channel: Channel): ContentSchedule | undefined => {
    return schedules.find(s => s.channel === channel && s.publish_status !== 'cancelled');
  };

  const canSchedule = (channel: Channel) => {
    const status = getChannelStatus(channel);
    return status === 'approved' || status === 'published';
  };

  const handleStartEdit = (channel: Channel) => {
    const existingSchedule = getScheduleForChannel(channel);
    if (existingSchedule) {
      const dt = parseISO(existingSchedule.scheduled_at);
      setScheduleDate(format(dt, 'yyyy-MM-dd'));
      setScheduleTime(format(dt, 'HH:mm'));
      setScheduleNotes(existingSchedule.notes || '');
    } else {
      // Default to tomorrow 10:00
      const tomorrow = addMinutes(new Date(), 24 * 60);
      setScheduleDate(format(tomorrow, 'yyyy-MM-dd'));
      setScheduleTime('10:00');
      setScheduleNotes('');
    }
    setEditingChannel(channel);
  };

  const handleCancelEdit = () => {
    setEditingChannel(null);
    setScheduleDate('');
    setScheduleTime('');
    setScheduleNotes('');
  };

  const handleSaveSchedule = async () => {
    if (!editingChannel || !scheduleDate || !scheduleTime) return;

    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`);
    
    if (isBefore(scheduledAt, new Date())) {
      return; // Don't allow past dates
    }

    setIsSaving(true);
    try {
      await upsertSchedule(content.id, {
        channel: editingChannel,
        scheduled_at: scheduledAt.toISOString(),
        notes: scheduleNotes || undefined,
      });
      handleCancelEdit();
      onScheduleChange?.();
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSchedule = async (scheduleId: string) => {
    await cancelSchedule(scheduleId);
    onScheduleChange?.();
  };

  const handleMarkPublished = async (scheduleId: string) => {
    await markAsPublished(scheduleId);
    onScheduleChange?.();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Lên lịch đăng bài</h3>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {(content?.selected_channels ?? []).map((channel) => {
            const status = getChannelStatus(channel);
            const schedule = getScheduleForChannel(channel);
            const isEditing = editingChannel === channel;
            const canEdit = canSchedule(channel);
            const statusConfig = CONTENT_STATUSES.find(s => s.value === status);
            const scheduleStatusConfig = schedule 
              ? PUBLISH_STATUSES.find(s => s.value === schedule.publish_status)
              : null;

            return (
              <div 
                key={channel} 
                className={`rounded-lg border p-4 transition-colors ${
                  isEditing ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{channelLabels[channel]}</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        status === 'approved' ? 'bg-blue-500/10 text-blue-600 border-blue-200' :
                        status === 'published' ? 'bg-green-500/10 text-green-600 border-green-200' :
                        status === 'review' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-200' :
                        'bg-muted text-muted-foreground'
                      }`}
                    >
                      {statusConfig?.label || 'Bản nháp'}
                    </Badge>
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-2">
                      {schedule && schedule.publish_status === 'scheduled' && (
                        <>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleMarkPublished(schedule.id)}
                                >
                                  <Check className="w-4 h-4 text-green-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Đánh dấu đã đăng</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleCancelSchedule(schedule.id)}
                                >
                                  <X className="w-4 h-4 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Hủy lịch</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canEdit}
                        onClick={() => handleStartEdit(channel)}
                      >
                        <Calendar className="w-4 h-4 mr-1.5" />
                        {schedule ? 'Đổi lịch' : 'Lên lịch'}
                      </Button>
                    </div>
                  )}
                </div>

                {!canEdit && !schedule && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="w-4 h-4" />
                    <span>Cần duyệt nội dung trước khi lên lịch</span>
                  </div>
                )}

                {schedule && !isEditing && (
                  <div className="mt-2 p-3 bg-muted/50 rounded-md">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {format(parseISO(schedule.scheduled_at), "dd/MM/yyyy 'lúc' HH:mm", { locale: vi })}
                      </span>
                      <Badge 
                        variant="outline"
                        className={`ml-2 text-xs ${
                          schedule.publish_status === 'published' ? 'bg-green-500/10 text-green-600 border-green-200' :
                          schedule.publish_status === 'scheduled' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-200' :
                          schedule.publish_status === 'failed' ? 'bg-red-500/10 text-red-600 border-red-200' :
                          'bg-muted text-muted-foreground'
                        }`}
                      >
                        {scheduleStatusConfig?.label || schedule.publish_status}
                      </Badge>
                    </div>
                    {schedule.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{schedule.notes}</p>
                    )}
                    {schedule.publish_error && (
                      <p className="text-xs text-destructive mt-1">{schedule.publish_error}</p>
                    )}
                  </div>
                )}

                {isEditing && (
                  <div className="mt-3 space-y-3 p-3 bg-muted/30 rounded-md">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Ngày</Label>
                        <Input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          min={format(new Date(), 'yyyy-MM-dd')}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Giờ</Label>
                        <Input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Ghi chú (tùy chọn)</Label>
                      <Textarea
                        value={scheduleNotes}
                        onChange={(e) => setScheduleNotes(e.target.value)}
                        placeholder="Ghi chú cho lịch đăng..."
                        className="h-16 resize-none text-sm"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                      >
                        Hủy
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveSchedule}
                        disabled={isSaving || !scheduleDate || !scheduleTime}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                            Đang lưu...
                          </>
                        ) : (
                          'Lưu lịch'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
