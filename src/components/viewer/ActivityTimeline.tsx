import { useState, useEffect } from 'react';
import { 
  History, 
  FileEdit, 
  CheckCircle, 
  Send, 
  CalendarClock,
  User,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ActivityEvent {
  id: string;
  type: 'created' | 'edited' | 'approved' | 'rejected' | 'scheduled' | 'published' | 'image_added';
  description: string;
  performedBy: string | null;
  performedByName?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface ActivityTimelineProps {
  contentId: string;
  createdAt: string;
  updatedAt: string;
  className?: string;
}

const eventIcons: Record<ActivityEvent['type'], React.ReactNode> = {
  created: <FileText className="w-4 h-4" />,
  edited: <FileEdit className="w-4 h-4" />,
  approved: <CheckCircle className="w-4 h-4 text-green-500" />,
  rejected: <CheckCircle className="w-4 h-4 text-red-500" />,
  scheduled: <CalendarClock className="w-4 h-4 text-blue-500" />,
  published: <Send className="w-4 h-4 text-primary" />,
  image_added: <Image className="w-4 h-4 text-purple-500" />,
};

const eventColors: Record<ActivityEvent['type'], string> = {
  created: 'border-muted-foreground',
  edited: 'border-yellow-500',
  approved: 'border-green-500',
  rejected: 'border-red-500',
  scheduled: 'border-blue-500',
  published: 'border-primary',
  image_added: 'border-purple-500',
};

export function ActivityTimeline({
  contentId,
  createdAt,
  updatedAt,
  className,
}: ActivityTimelineProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && events.length === 0) {
      fetchActivityEvents();
    }
  }, [isOpen, contentId]);

  const fetchActivityEvents = async () => {
    setIsLoading(true);
    try {
      // Fetch approval logs
      const { data: approvalLogs } = await supabase
        .from('approval_logs')
        .select('*')
        .eq('content_id', contentId)
        .order('created_at', { ascending: false });

      // Fetch schedules
      const { data: schedules } = await supabase
        .from('content_schedules')
        .select('*')
        .eq('content_id', contentId)
        .order('created_at', { ascending: false });

      // Fetch publishing logs
      const { data: publishingLogs } = await supabase
        .from('content_publishing_logs')
        .select('*')
        .eq('content_id', contentId)
        .order('created_at', { ascending: false });

      // Build events list
      const allEvents: ActivityEvent[] = [];

      // Add created event
      allEvents.push({
        id: 'created',
        type: 'created',
        description: 'Nội dung được tạo',
        performedBy: null,
        timestamp: createdAt,
      });

      // Add edited event if updated_at differs
      if (updatedAt !== createdAt) {
        allEvents.push({
          id: 'edited',
          type: 'edited',
          description: 'Nội dung được chỉnh sửa',
          performedBy: null,
          timestamp: updatedAt,
        });
      }

      // Add approval events
      approvalLogs?.forEach(log => {
        allEvents.push({
          id: `approval-${log.id}`,
          type: log.action === 'approved' ? 'approved' : log.action === 'rejected' ? 'rejected' : 'edited',
          description: log.action === 'approved' 
            ? 'Nội dung được duyệt' 
            : log.action === 'rejected' 
            ? 'Nội dung bị từ chối' 
            : log.notes || 'Hoạt động phê duyệt',
          performedBy: log.performed_by,
          timestamp: log.created_at,
          metadata: log.industry_memory_snapshot as Record<string, unknown> | undefined,
        });
      });

      // Add schedule events
      schedules?.forEach(schedule => {
        allEvents.push({
          id: `schedule-${schedule.id}`,
          type: 'scheduled',
          description: `Lên lịch đăng ${schedule.channel}`,
          performedBy: schedule.created_by,
          timestamp: schedule.created_at || createdAt,
          metadata: { scheduled_at: schedule.scheduled_at, channel: schedule.channel },
        });
      });

      // Add publishing events
      publishingLogs?.forEach(log => {
        if (log.action === 'published') {
          allEvents.push({
            id: `publish-${log.id}`,
            type: 'published',
            description: `Đã đăng lên ${log.channel}`,
            performedBy: log.performed_by,
            timestamp: log.performed_at || log.created_at || createdAt,
            metadata: log.details as Record<string, unknown> | undefined,
          });
        }
      });

      // Sort by timestamp desc
      allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching activity events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between px-3 py-2 h-auto"
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Lịch sử hoạt động</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {events.length > 0 ? `${events.length} sự kiện` : 'Xem'}
            </Badge>
            {isOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="p-4 border-t border-border/50">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Chưa có hoạt động nào
            </p>
          ) : (
            <ScrollArea className="h-64">
              <div className="relative pl-6">
                {/* Timeline line */}
                <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                
                {/* Events */}
                <div className="space-y-4">
                  {events.map((event, index) => (
                    <div key={event.id} className="relative">
                      {/* Timeline dot */}
                      <div 
                        className={cn(
                          'absolute -left-4 w-4 h-4 rounded-full border-2 bg-background flex items-center justify-center',
                          eventColors[event.type]
                        )}
                      >
                        <div className="scale-75">
                          {eventIcons[event.type]}
                        </div>
                      </div>
                      
                      {/* Event content */}
                      <div className="ml-4">
                        <p className="text-sm font-medium">{event.description}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>
                            {formatDistanceToNow(new Date(event.timestamp), { 
                              addSuffix: true, 
                              locale: vi 
                            })}
                          </span>
                          {event.performedBy && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {event.performedByName || event.performedBy.slice(0, 8)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
