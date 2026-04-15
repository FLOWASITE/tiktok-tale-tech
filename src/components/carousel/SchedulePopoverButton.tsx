import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { useContentSchedules } from '@/hooks/useContentSchedules';
import { Channel } from '@/types/multichannel';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CalendarClock, CalendarIcon, Clock, Loader2, Facebook, Instagram, Linkedin, Check } from 'lucide-react';
import { XIcon } from '@/components/icons/SocialIcons';
import { cn } from '@/lib/utils';

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  twitter: XIcon,
  tiktok: TikTokIcon,
};

const CHANNEL_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  twitter: 'X / Twitter',
  tiktok: 'TikTok',
};

interface SchedulePopoverButtonProps {
  contentId: string;
  availableChannels: string[];
  connectedChannels: Set<string>;
}

export function SchedulePopoverButton({ contentId, availableChannels, connectedChannels }: SchedulePopoverButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const { upsertSchedule, schedules } = useContentSchedules(contentId);

  const resetForm = () => {
    setSelectedChannel(null);
    setScheduleDate(undefined);
    setScheduleTime('09:00');
    setScheduleNotes('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  };

  const handleSubmit = async () => {
    if (!scheduleDate || !selectedChannel) return;
    setIsScheduling(true);
    try {
      const [hours, minutes] = scheduleTime.split(':').map(Number);
      const scheduledAt = new Date(scheduleDate);
      scheduledAt.setHours(hours, minutes, 0, 0);

      await upsertSchedule(contentId, {
        channel: selectedChannel as Channel,
        scheduled_at: scheduledAt.toISOString(),
        timezone: 'Asia/Ho_Chi_Minh',
        notes: scheduleNotes || undefined,
      });

      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Schedule error:', error);
    } finally {
      setIsScheduling(false);
    }
  };

  const existingSchedule = selectedChannel
    ? schedules.find(s => s.channel === selectedChannel && s.publish_status === 'scheduled')
    : null;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] xs:text-xs px-2 shrink-0 gap-1"
        >
          <CalendarClock className="w-3 h-3" />
          <span className="hidden xs:inline">Lên lịch</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end" side="bottom">
        <div className="p-3 border-b border-border">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <CalendarClock className="w-4 h-4 text-primary" />
            Lên lịch đăng bài
          </h4>
        </div>

        <div className="p-3 space-y-3">
          {/* Step 1: Channel picker */}
          <div className="space-y-1.5">
            <Label className="text-xs">Chọn kênh</Label>
            <div className="flex items-center gap-1.5">
              {availableChannels.map(ch => {
                const Icon = CHANNEL_ICONS[ch] || CalendarClock;
                const isConnected = connectedChannels.has(ch);
                const isSelected = selectedChannel === ch;
                const existingSch = schedules.find(s => s.channel === ch && s.publish_status === 'scheduled');

                return (
                  <button
                    key={ch}
                    onClick={() => isConnected && setSelectedChannel(ch)}
                    disabled={!isConnected}
                    title={`${CHANNEL_LABELS[ch] || ch}${!isConnected ? ' — Chưa kết nối' : ''}${existingSch ? ` — Đã lên lịch ${format(new Date(existingSch.scheduled_at), 'dd/MM HH:mm')}` : ''}`}
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center transition-all relative',
                      isSelected && 'bg-primary/15 border-2 border-primary ring-2 ring-primary/20',
                      !isSelected && isConnected && 'border-2 border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5',
                      !isConnected && 'border border-dashed border-muted-foreground/20 opacity-40 cursor-not-allowed',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {existingSch && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center">
                        <Clock className="h-2 w-2 text-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Date/time (shown after channel selection) */}
          {selectedChannel && (
            <>
              {existingSchedule && (
                <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-2 text-xs text-amber-700 dark:text-amber-400">
                  Đã có lịch: {format(new Date(existingSchedule.scheduled_at), 'dd/MM/yyyy HH:mm')} — sẽ được cập nhật.
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Ngày đăng</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn('w-full justify-start text-left text-xs h-8', !scheduleDate && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-1.5 h-3 w-3" />
                      {scheduleDate ? format(scheduleDate, 'dd/MM/yyyy (EEEE)', { locale: vi }) : 'Chọn ngày'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[300]" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduleDate}
                      onSelect={setScheduleDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Giờ đăng</Label>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">GMT+7 (Asia/Ho_Chi_Minh)</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Ghi chú</Label>
                <Textarea
                  placeholder="VD: Đăng sau khi review..."
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  rows={2}
                  className="resize-none text-xs min-h-[48px]"
                />
              </div>

              {scheduleDate && (
                <div className="rounded-md bg-primary/5 border border-primary/10 p-2 flex items-start gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <p className="font-medium">
                      {format(scheduleDate, 'dd/MM/yyyy', { locale: vi })} lúc {scheduleTime}
                    </p>
                    <p className="text-muted-foreground">
                      → {CHANNEL_LABELS[selectedChannel] || selectedChannel}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => resetForm()}>
                  Hủy
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs gap-1"
                  onClick={handleSubmit}
                  disabled={!scheduleDate || isScheduling}
                >
                  {isScheduling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  {isScheduling ? 'Đang lưu...' : 'Lên lịch'}
                </Button>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
