import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Eye, 
  Calendar, 
  Users, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Circle,
  PlayCircle,
  SendHorizontal,
  Layers
} from 'lucide-react';
import { formatDistanceToNow, format, isPast } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { MultiChannelContent, CHANNELS, Channel, CONTENT_STATUSES } from '@/types/multichannel';
import { ContentAssignment, ASSIGNMENT_STATUSES, AssignmentStatus, ASSIGNMENT_PRIORITIES } from '@/types/assignment';
import { ContentSchedule, PUBLISH_STATUSES } from '@/types/publishing';

interface ContentTaskCardProps {
  content: MultiChannelContent;
  assignments: ContentAssignment[];
  schedules: ContentSchedule[];
  currentUserId?: string;
  onAssignmentStatusChange: (assignmentId: string, newStatus: AssignmentStatus) => Promise<void>;
  onRefresh: () => void;
}

export function ContentTaskCard({
  content,
  assignments,
  schedules,
  currentUserId,
  onAssignmentStatusChange,
  onRefresh,
}: ContentTaskCardProps) {
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusConfig = (status: string) => {
    return CONTENT_STATUSES.find(s => s.value === status) || CONTENT_STATUSES[0];
  };

  const getChannelInfo = (channel: string) => {
    return CHANNELS.find(c => c.value === channel);
  };

  const myAssignment = assignments.find(a => a.assigned_to === currentUserId);
  
  const handleStatusChange = async (newStatus: AssignmentStatus) => {
    if (!myAssignment) return;
    setIsUpdating(true);
    try {
      await onAssignmentStatusChange(myAssignment.id, newStatus);
      onRefresh();
    } finally {
      setIsUpdating(false);
    }
  };

  const statusConfig = getStatusConfig(content.status || 'draft');
  
  const activeSchedules = schedules.filter(s => s.publish_status === 'scheduled');
  const nextSchedule = activeSchedules.sort((a, b) => 
    new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  )[0];

  const timeAgo = formatDistanceToNow(new Date(content.created_at), {
    addSuffix: true,
    locale: vi,
  });

  // Get unique assignees
  const uniqueAssignees = assignments.reduce((acc, a) => {
    if (a.assignee && !acc.find(x => x.id === a.assignee?.id)) {
      acc.push(a.assignee);
    }
    return acc;
  }, [] as NonNullable<ContentAssignment['assignee']>[]);

  const getNextActionButton = () => {
    if (!myAssignment) return null;

    const status = myAssignment.status as AssignmentStatus;
    
    switch (status) {
      case 'pending':
        return (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => handleStatusChange('in_progress')}
            disabled={isUpdating}
            className="gap-1.5"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            Bắt đầu
          </Button>
        );
      case 'in_progress':
        return (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => handleStatusChange('review')}
            disabled={isUpdating}
            className="gap-1.5"
          >
            <SendHorizontal className="w-3.5 h-3.5" />
            Gửi duyệt
          </Button>
        );
      case 'review':
        return (
          <Button 
            size="sm" 
            variant="default" 
            onClick={() => handleStatusChange('completed')}
            disabled={isUpdating}
            className="gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Hoàn thành
          </Button>
        );
      default:
        return null;
    }
  };

  const myAssignmentStatus = myAssignment ? 
    ASSIGNMENT_STATUSES.find(s => s.value === myAssignment.status) : null;

  const isOverdue = myAssignment?.due_date && isPast(new Date(myAssignment.due_date)) && 
    myAssignment.status !== 'completed' && myAssignment.status !== 'cancelled';

  return (
    <Card className="relative gradient-card border-border/50 hover:border-primary/40 transition-all duration-300 group overflow-hidden hover:shadow-xl hover:shadow-primary/5">
      {/* Glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold line-clamp-1 group-hover:text-primary transition-colors">
              {content.title}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {content.topic}
            </p>
          </div>
          <Badge 
            variant="secondary" 
            className={`text-xs shrink-0 ${statusConfig.color}`}
          >
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Channels */}
        <div className="flex flex-wrap gap-1">
          {content.selected_channels.slice(0, 4).map(channel => {
            const info = getChannelInfo(channel);
            return info ? (
              <Tooltip key={channel}>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                    {info.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{info.description}</TooltipContent>
              </Tooltip>
            ) : null;
          })}
          {content.selected_channels.length > 4 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
              +{content.selected_channels.length - 4}
            </Badge>
          )}
        </div>

        {/* Assignees */}
        {uniqueAssignees.length > 0 && (
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <div className="flex -space-x-1.5">
              {uniqueAssignees.slice(0, 4).map(assignee => (
                <Tooltip key={assignee.id}>
                  <TooltipTrigger>
                    <Avatar className="w-6 h-6 border-2 border-background">
                      <AvatarImage src={assignee.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {assignee.full_name?.charAt(0) || assignee.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    {assignee.full_name || assignee.email}
                  </TooltipContent>
                </Tooltip>
              ))}
              {uniqueAssignees.length > 4 && (
                <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] text-muted-foreground">
                  +{uniqueAssignees.length - 4}
                </div>
              )}
            </div>
          </div>
        )}

        {/* My Assignment Status */}
        {myAssignment && myAssignmentStatus && (
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Badge className={`text-xs ${myAssignmentStatus.color}`}>
                {myAssignmentStatus.label}
              </Badge>
              {isOverdue && (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="w-3 h-3" />
                  Quá hạn
                </span>
              )}
            </div>
            {myAssignment.due_date && !isOverdue && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(myAssignment.due_date), 'dd/MM')}
              </span>
            )}
          </div>
        )}

        {/* Next Schedule */}
        {nextSchedule && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              Đăng lúc {format(new Date(nextSchedule.scheduled_at), "HH:mm 'ngày' dd/MM", { locale: vi })}
            </span>
            {CHANNELS.find(c => c.value === nextSchedule.channel) && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {CHANNELS.find(c => c.value === nextSchedule.channel)?.label}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
          <div className="flex items-center gap-2">
            {getNextActionButton()}
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => navigate('/multichannel')}
              className="gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              Xem
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
