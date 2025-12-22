import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, GripVertical, Calendar, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
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

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-90 shadow-xl rotate-2' : 'hover:shadow-md'
      } transition-all duration-200`}
    >
      <CardContent className="p-3 space-y-2">
        {/* Drag Handle & Title */}
        <div className="flex items-start gap-2">
          <div
            {...attributes}
            {...listeners}
            className="mt-1 p-1 rounded hover:bg-muted cursor-grab"
          >
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm line-clamp-2">{content.title}</h4>
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
              <Badge key={ch} variant="outline" className="text-[10px] py-0 px-1">
                {channel.label}
              </Badge>
            ) : null;
          })}
          {content.selected_channels.length > 3 && (
            <Badge variant="outline" className="text-[10px] py-0 px-1">
              +{content.selected_channels.length - 3}
            </Badge>
          )}
        </div>

        {/* Assignees */}
        {uniqueAssignees.length > 0 && (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3 text-muted-foreground" />
            <div className="flex -space-x-1">
              <TooltipProvider>
                {uniqueAssignees.slice(0, 3).map(assignee => (
                  <Tooltip key={assignee?.id}>
                    <TooltipTrigger asChild>
                      <Avatar className="w-5 h-5 border border-background">
                        <AvatarImage src={assignee?.avatar_url || ''} />
                        <AvatarFallback className="text-[8px]">
                          {(assignee?.full_name || assignee?.email || '?')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      {assignee?.full_name || assignee?.email}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
              {uniqueAssignees.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px] border border-background">
                  +{uniqueAssignees.length - 3}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Schedule */}
        {nextSchedule && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {format(new Date(nextSchedule.scheduled_at), 'dd/MM HH:mm', { locale: vi })}
          </div>
        )}

        {/* My assignment status */}
        {myAssignments.length > 0 && (
          <div className="pt-1 border-t">
            <div className="flex items-center gap-1.5 flex-wrap">
              {myAssignments.map(assignment => {
                const statusConfig = ASSIGNMENT_STATUSES.find(s => s.value === assignment.status);
                const priorityConfig = ASSIGNMENT_PRIORITIES.find(p => p.value === assignment.priority);
                const channel = CHANNELS.find(c => c.value === assignment.channel);
                
                return (
                  <TooltipProvider key={assignment.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 cursor-pointer ${statusConfig?.color}`}
                        >
                          {channel?.label}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs space-y-1">
                          <p className="font-medium">{statusConfig?.label}</p>
                          <p className="text-muted-foreground">
                            Ưu tiên: {priorityConfig?.label}
                          </p>
                          {assignment.due_date && (
                            <p className="text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(assignment.due_date), 'dd/MM/yyyy HH:mm', { locale: vi })}
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

        {/* View button */}
        <Button variant="ghost" size="sm" className="w-full h-7 text-xs" asChild>
          <Link to={`/multichannel?view=${content.id}`}>
            <Eye className="w-3 h-3 mr-1" />
            Xem chi tiết
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
