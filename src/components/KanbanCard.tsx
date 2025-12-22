import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, GripVertical, Calendar, User, Clock, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { format, isPast, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ContentTask } from './TasksKanbanBoard';
import { CHANNELS } from '@/types/multichannel';
import { ASSIGNMENT_STATUSES, ASSIGNMENT_PRIORITIES, AssignmentStatus } from '@/types/assignment';

interface KanbanCardProps {
  task: ContentTask;
  currentUserId?: string;
  onAssignmentStatusChange: (assignmentId: string, status: AssignmentStatus) => Promise<void>;
  onRefresh: () => void;
  isDragging?: boolean;
}

export function KanbanCard({
  task,
  currentUserId,
  onAssignmentStatusChange,
  onRefresh,
  isDragging,
}: KanbanCardProps) {
  const { content, assignments, schedules } = task;

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: content.id,
  });

  const style = transform
    ? {
        transform: CSS.Transform.toString(transform),
        zIndex: 1000,
      }
    : undefined;

  // Get unique assignees
  const assignees = assignments.map(a => a.assignee).filter(Boolean);
  const uniqueAssignees = assignees.filter(
    (a, i, arr) => arr.findIndex(x => x?.id === a?.id) === i
  );

  // Get next scheduled date
  const activeSchedules = schedules.filter(s => s.publish_status === 'scheduled');
  const nextSchedule = activeSchedules.sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  )[0];

  // My assignments
  const myAssignments = assignments.filter(a => a.assigned_to === currentUserId);
  
  // Check if any assignment is overdue
  const hasOverdue = myAssignments.some(a => 
    a.due_date && isPast(new Date(a.due_date)) && 
    a.status !== 'completed' && a.status !== 'cancelled'
  );

  // Time ago
  const timeAgo = formatDistanceToNow(new Date(content.created_at), {
    addSuffix: true,
    locale: vi,
  });

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-grab active:cursor-grabbing group relative overflow-hidden ${
        isDragging 
          ? 'opacity-95 shadow-2xl shadow-primary/20 rotate-2 scale-105' 
          : 'hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30'
      } ${hasOverdue ? 'border-red-500/30 bg-red-500/5' : 'border-border/50'} transition-all duration-200`}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        {/* Drag Handle & Title */}
        <div className="flex items-start gap-2">
          <div
            {...attributes}
            {...listeners}
            className="mt-0.5 p-1.5 rounded-md hover:bg-muted cursor-grab active:cursor-grabbing transition-colors"
          >
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
              {content.title}
            </h4>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {content.topic}
            </p>
          </div>
        </div>

        {/* Channels */}
        <div className="flex flex-wrap gap-1">
          {content.selected_channels.slice(0, 3).map(ch => {
            const channel = CHANNELS.find(c => c.value === ch);
            return channel ? (
              <Badge 
                key={ch} 
                variant="outline" 
                className="text-[10px] py-0 px-1.5 bg-background/50"
              >
                {channel.label}
              </Badge>
            ) : null;
          })}
          {content.selected_channels.length > 3 && (
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
              +{content.selected_channels.length - 3}
            </Badge>
          )}
        </div>

        {/* Assignees */}
        {uniqueAssignees.length > 0 && (
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            <div className="flex -space-x-1.5">
              <TooltipProvider>
                {uniqueAssignees.slice(0, 4).map(assignee => (
                  <Tooltip key={assignee?.id}>
                    <TooltipTrigger asChild>
                      <Avatar className="w-6 h-6 border-2 border-background ring-1 ring-border/50">
                        <AvatarImage src={assignee?.avatar_url || ''} />
                        <AvatarFallback className="text-[9px] font-medium bg-primary/10 text-primary">
                          {(assignee?.full_name || assignee?.email || '?')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">{assignee?.full_name || assignee?.email}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
              {uniqueAssignees.length > 4 && (
                <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-medium">
                  +{uniqueAssignees.length - 4}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Schedule */}
        {nextSchedule && (
          <div className="flex items-center gap-1.5 text-xs">
            <div className="flex items-center gap-1 text-blue-500">
              <Calendar className="w-3.5 h-3.5" />
              <span className="font-medium">
                {format(new Date(nextSchedule.scheduled_at), 'dd/MM HH:mm', { locale: vi })}
              </span>
            </div>
            {CHANNELS.find(c => c.value === nextSchedule.channel) && (
              <Badge variant="outline" className="text-[9px] py-0 px-1 bg-blue-500/10 border-blue-500/30 text-blue-500">
                {CHANNELS.find(c => c.value === nextSchedule.channel)?.label}
              </Badge>
            )}
          </div>
        )}

        {/* My assignment status */}
        {myAssignments.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5 flex-wrap">
              {myAssignments.map(assignment => {
                const statusConfig = ASSIGNMENT_STATUSES.find(s => s.value === assignment.status);
                const priorityConfig = ASSIGNMENT_PRIORITIES.find(p => p.value === assignment.priority);
                const channel = CHANNELS.find(c => c.value === assignment.channel);
                const isOverdue = assignment.due_date && isPast(new Date(assignment.due_date)) && 
                  assignment.status !== 'completed' && assignment.status !== 'cancelled';
                
                return (
                  <TooltipProvider key={assignment.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0.5 px-1.5 cursor-default flex items-center gap-1 ${statusConfig?.color} ${isOverdue ? 'border-red-500/50' : ''}`}
                        >
                          {isOverdue && <AlertCircle className="w-2.5 h-2.5 text-red-500" />}
                          {assignment.status === 'completed' && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {channel?.label}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        <div className="text-xs space-y-1.5 p-1">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-primary" />
                            <span className="font-medium">{statusConfig?.label}</span>
                          </div>
                          <p className="text-muted-foreground">
                            Ưu tiên: {priorityConfig?.label}
                          </p>
                          {assignment.due_date && (
                            <p className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                              <Clock className="w-3 h-3" />
                              {isOverdue ? 'Quá hạn: ' : 'Hạn: '}
                              {format(new Date(assignment.due_date), 'dd/MM/yyyy HH:mm', { locale: vi })}
                            </p>
                          )}
                          {assignment.notes && (
                            <p className="text-muted-foreground border-t pt-1.5 mt-1.5">
                              {assignment.notes}
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs gap-1 hover:bg-primary/10 hover:text-primary" 
            asChild
          >
            <Link to={`/multichannel?view=${content.id}`}>
              <Eye className="w-3 h-3" />
              <span className="hidden xs:inline">Xem</span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
