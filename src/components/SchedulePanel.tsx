import { useState } from 'react';
import { Calendar, Clock, CalendarClock, Check, X, Loader2, AlertCircle, CalendarPlus, ChevronLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MultiChannelContent, Channel, CONTENT_STATUSES } from '@/types/multichannel';
import { ContentSchedule, PUBLISH_STATUSES } from '@/types/publishing';
import { useContentSchedules } from '@/hooks/useContentSchedules';
import { DirectPublishButton } from '@/components/social/DirectPublishButton';
import { toast } from '@/hooks/use-toast';
import { format, parseISO, isBefore, addMinutes, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';

interface SchedulePanelProps {
  content: MultiChannelContent;
  onScheduleChange?: () => void;
  onBack?: () => void;
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

export function SchedulePanel({ content, onScheduleChange, onBack }: SchedulePanelProps) {
  const { schedules, upsertSchedule, cancelSchedule, markAsPublished, isLoading } = useContentSchedules(content.id);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Schedule All state
  const [showScheduleAll, setShowScheduleAll] = useState(false);
  const [allDate, setAllDate] = useState('');
  const [allTime, setAllTime] = useState('10:00');
  const [allNotes, setAllNotes] = useState('');
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Cancel confirmation state
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  const getChannelStatus = (channel: Channel) => {
    return content.channel_statuses?.[channel] || 'draft';
  };

  const getScheduleForChannel = (channel: Channel): ContentSchedule | undefined => {
    return schedules.find(s => s.channel === channel && s.publish_status !== 'cancelled');
  };

  const canSchedule = (channel: Channel) => {
    const channelStatus = getChannelStatus(channel);
    const masterStatus = content.status;
    return channelStatus === 'approved' || channelStatus === 'published'
      || masterStatus === 'approved' || masterStatus === 'published';
  };

  const schedulableChannels = (content?.selected_channels ?? []).filter(ch => canSchedule(ch));

  const handleStartEdit = (channel: Channel) => {
    const existingSchedule = getScheduleForChannel(channel);
    if (existingSchedule) {
      const dt = parseISO(existingSchedule.scheduled_at);
      setScheduleDate(format(dt, 'yyyy-MM-dd'));
      setScheduleTime(format(dt, 'HH:mm'));
      setScheduleNotes(existingSchedule.notes || '');
    } else {
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
      toast({
        title: 'Thời gian không hợp lệ',
        description: 'Vui lòng chọn thời gian trong tương lai',
        variant: 'destructive',
      });
      return;
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

  const handleConfirmCancel = async () => {
    if (!cancelConfirmId) return;
    await cancelSchedule(cancelConfirmId);
    setCancelConfirmId(null);
    onScheduleChange?.();
  };

  const handleMarkPublished = async (scheduleId: string) => {
    await markAsPublished(scheduleId);
    onScheduleChange?.();
  };

  // Schedule All handlers
  const handleOpenScheduleAll = () => {
    const tomorrow = addDays(new Date(), 1);
    setAllDate(format(tomorrow, 'yyyy-MM-dd'));
    setAllTime('10:00');
    setAllNotes('');
    setShowScheduleAll(true);
  };

  const handleSaveScheduleAll = async () => {
    if (!allDate || !allTime) return;

    const scheduledAt = new Date(`${allDate}T${allTime}:00`);
    if (isBefore(scheduledAt, new Date())) {
      toast({
        title: 'Thời gian không hợp lệ',
        description: 'Vui lòng chọn thời gian trong tương lai',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingAll(true);
    try {
      await Promise.all(
        schedulableChannels.map(channel =>
          upsertSchedule(content.id, {
            channel,
            scheduled_at: scheduledAt.toISOString(),
            notes: allNotes || undefined,
          })
        )
      );
      setShowScheduleAll(false);
      onScheduleChange?.();
      toast({
        title: 'Thành công',
        description: `Đã lên lịch ${schedulableChannels.length} kênh`,
      });
    } finally {
      setIsSavingAll(false);
    }
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          <CalendarClock className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Lên lịch đăng bài</h3>
        </div>
        {schedulableChannels.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenScheduleAll}
          >
            <CalendarPlus className="w-4 h-4 mr-1.5" />
            Lên lịch tất cả ({schedulableChannels.length})
          </Button>
        )}
      </div>

      {/* Schedule All Form */}
      {showScheduleAll && (
        <div className="p-4 rounded-lg border border-primary bg-primary/5 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Lên lịch tất cả kênh đã duyệt</Label>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowScheduleAll(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Ngày</Label>
              <Input
                type="date"
                value={allDate}
                onChange={(e) => setAllDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Giờ</Label>
              <Input
                type="time"
                value={allTime}
                onChange={(e) => setAllTime(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ghi chú (tùy chọn)</Label>
            <Textarea
              value={allNotes}
              onChange={(e) => setAllNotes(e.target.value)}
              placeholder="Ghi chú cho lịch đăng..."
              className="h-16 resize-none text-sm"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowScheduleAll(false)} disabled={isSavingAll}>
              Hủy
            </Button>
            <Button size="sm" onClick={handleSaveScheduleAll} disabled={isSavingAll || !allDate || !allTime}>
              {isSavingAll ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                `Lên lịch ${schedulableChannels.length} kênh`
              )}
            </Button>
          </div>
        </div>
      )}

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
                                  onClick={() => setCancelConfirmId(schedule.id)}
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
                      <DirectPublishButton
                        content={(content as any)[`${channel}_content`] || ''}
                        contentId={content.id}
                        channel={channel}
                        brandTemplateId={content.brand_template_id || undefined}
                        mediaUrls={(() => {
                          const imgUrl = (content as any).channel_images?.[channel]?.url;
                          return imgUrl ? [imgUrl] : undefined;
                        })()}
                        variant="default"
                        size="sm"
                      />
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

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelConfirmId} onOpenChange={(open) => !open && setCancelConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận hủy lịch</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn hủy lịch đăng bài này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Không, giữ lại</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel}>
              Xác nhận hủy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}