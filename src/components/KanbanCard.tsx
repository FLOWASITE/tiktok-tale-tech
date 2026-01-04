import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, GripVertical, Calendar, User, Clock, AlertCircle, CheckCircle2, Sparkles, Edit3, Send, Trash2, XCircle } from 'lucide-react';
import { ContentStatus, CONTENT_STATUSES, MultiChannelContent } from '@/types/multichannel';
import { format, isPast, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ContentTask } from './TasksKanbanBoard';
import { CHANNELS } from '@/types/multichannel';
import { ASSIGNMENT_STATUSES, ASSIGNMENT_PRIORITIES, AssignmentStatus } from '@/types/assignment';
import { useConfetti } from '@/hooks/useConfetti';
import { getChannelColorClasses } from '@/utils/channelColors';
import { OrgRole, canApproveContent, canSubmitForReview } from '@/types/organization';
import { ApprovalDialog } from './ApprovalDialog';
import { useCreatorProfiles } from '@/hooks/useCreatorProfiles';

interface KanbanCardProps {
  task: ContentTask;
  currentUserId?: string;
  currentRole?: OrgRole | null;
  onAssignmentStatusChange: (assignmentId: string, status: AssignmentStatus) => Promise<void>;
  onRefresh: () => void;
  onStatusChange?: (contentId: string, status: ContentStatus) => Promise<any>;
  onDelete?: (contentId: string) => Promise<void>;
  onSubmitForReview?: (contentId: string, notes?: string) => Promise<any>;
  onApprove?: (contentId: string, notes?: string) => Promise<any>;
  onReject?: (contentId: string, reason: string) => Promise<any>;
  isDragging?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export function KanbanCard({
  task,
  currentUserId,
  currentRole,
  onAssignmentStatusChange,
  onRefresh,
  onStatusChange,
  onDelete,
  onSubmitForReview,
  onApprove,
  onReject,
  isDragging,
  isSelected,
  onToggleSelect,
}: KanbanCardProps) {
  const { content, assignments, schedules } = task;
  const { fireConfetti } = useConfetti();
  
  // Get creator profile
  const creatorIds = content.user_id ? [content.user_id] : [];
  const { profiles: creatorProfiles } = useCreatorProfiles(creatorIds);
  const creator = content.user_id ? creatorProfiles[content.user_id] : null;
  
  // Approval dialog state
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'submit'>('submit');
  const [isApproving, setIsApproving] = useState(false);

  // Check permissions
  const canApprove = currentRole ? canApproveContent(currentRole) : false;
  const canSubmit = currentRole ? canSubmitForReview(currentRole) : false;

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

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect?.();
  };

  // Priority class
  const priorityClass = myAssignments.length > 0 
    ? myAssignments[0].priority === 'urgent' ? 'priority-urgent'
    : myAssignments[0].priority === 'high' ? 'priority-high'
    : myAssignments[0].priority === 'low' ? 'priority-low'
    : 'priority-normal'
    : '';

  // Quick action handlers
  const handleQuickStatusChange = async (e: React.MouseEvent, status: ContentStatus) => {
    e.preventDefault();
    e.stopPropagation();
    if (onStatusChange) {
      await onStatusChange(content.id, status);
      onRefresh();
      // Fire confetti when publishing
      if (status === 'published') {
        fireConfetti();
      }
    }
  };

  const handleQuickDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete && window.confirm('Bạn có chắc chắn muốn xóa nội dung này?')) {
      await onDelete(content.id);
      onRefresh();
    }
  };

  // Approval action handlers
  const handleOpenApprovalDialog = (e: React.MouseEvent, action: 'approve' | 'reject' | 'submit') => {
    e.preventDefault();
    e.stopPropagation();
    setApprovalAction(action);
    setApprovalDialogOpen(true);
  };

  const handleApprovalConfirm = async (contentId: string, action: 'approve' | 'reject' | 'submit', reason?: string) => {
    setIsApproving(true);
    try {
      if (action === 'submit' && onSubmitForReview) {
        await onSubmitForReview(contentId, reason);
      } else if (action === 'approve' && onApprove) {
        await onApprove(contentId, reason);
      } else if (action === 'reject' && onReject && reason) {
        await onReject(contentId, reason);
      }
      onRefresh();
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-grab active:cursor-grabbing group relative overflow-hidden task-card-hover ${priorityClass} ${
        isDragging 
          ? 'opacity-95 shadow-2xl shadow-primary/25 rotate-2 scale-105 drag-overlay' 
          : ''
      } ${hasOverdue ? 'border-red-500/40 bg-gradient-to-br from-red-500/5 to-transparent deadline-urgent' : 'border-border/40'} ${
        isSelected ? 'ring-2 ring-primary border-primary bg-primary/5' : ''
      } rounded-xl`}
    >
      {/* Selection checkbox */}
      <div 
        className={`absolute top-2.5 left-2.5 z-10 transition-all duration-200 ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'}`}
        onClick={handleCheckboxClick}
      >
        <Checkbox 
          checked={isSelected} 
          className="h-4 w-4 bg-background/90 backdrop-blur-sm border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-sm"
        />
      </div>

      {/* Quick action buttons on hover */}
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200">
        <TooltipProvider delayDuration={200}>
          {/* Submit for review - only for draft and if user can submit */}
          {content.status === 'draft' && canSubmit && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7 bg-background/90 backdrop-blur-sm shadow-sm hover:bg-amber-500/20 hover:text-amber-600"
                  onClick={(e) => handleOpenApprovalDialog(e, 'submit')}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Gửi duyệt</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Approve - only for review status and if user can approve */}
          {content.status === 'review' && canApprove && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7 bg-background/90 backdrop-blur-sm shadow-sm hover:bg-green-500/20 hover:text-green-600"
                    onClick={(e) => handleOpenApprovalDialog(e, 'approve')}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Phê duyệt</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7 bg-background/90 backdrop-blur-sm shadow-sm hover:bg-red-500/20 hover:text-red-600"
                    onClick={(e) => handleOpenApprovalDialog(e, 'reject')}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Từ chối</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 bg-background/90 backdrop-blur-sm shadow-sm hover:bg-primary/20 hover:text-primary"
                asChild
              >
                <Link to={`/multichannel?edit=${content.id}`} onClick={(e) => e.stopPropagation()}>
                  <Edit3 className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Chỉnh sửa</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 bg-background/90 backdrop-blur-sm shadow-sm hover:bg-red-500/20 hover:text-red-600"
                onClick={handleQuickDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Xóa</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        {/* Drag Handle & Title */}
        <div className="flex items-start gap-2">
          <div
            {...attributes}
            {...listeners}
            className={`mt-0.5 p-1.5 rounded-md hover:bg-muted cursor-grab active:cursor-grabbing transition-colors ${isSelected ? 'ml-5' : ''}`}
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
                className={`text-[10px] py-0 px-1.5 font-medium ${getChannelColorClasses(ch)}`}
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
            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-1 flex-wrap">
              <TooltipProvider>
                {uniqueAssignees.slice(0, 2).map(assignee => (
                  <Tooltip key={assignee?.id}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 bg-muted/50 rounded-full pl-0.5 pr-2 py-0.5 border border-border/50 hover:bg-muted transition-colors">
                        <Avatar className="w-5 h-5 border border-background">
                          <AvatarImage src={assignee?.avatar_url || ''} />
                          <AvatarFallback className="text-[8px] font-medium bg-primary/10 text-primary">
                            {(assignee?.full_name || assignee?.email || '?')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[50px]">
                          {assignee?.full_name?.split(' ').pop() || assignee?.email?.split('@')[0]}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs font-medium">{assignee?.full_name || assignee?.email}</p>
                      <p className="text-[10px] text-muted-foreground">Người được giao</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
              {uniqueAssignees.length > 2 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="h-5 px-1.5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground border border-border/50">
                        +{uniqueAssignees.length - 2}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <div className="space-y-1">
                        {uniqueAssignees.slice(2).map(assignee => (
                          <p key={assignee?.id} className="text-xs">{assignee?.full_name || assignee?.email}</p>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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

        {/* Footer with Creator */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            {creator && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="w-5 h-5 border border-border/50">
                      <AvatarImage src={creator.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px] font-medium bg-muted">
                        {creator.full_name?.charAt(0) || (creator.email ? creator.email.charAt(0).toUpperCase() : 'U')}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Người tạo: {creator.full_name || creator.email}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
          </div>
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

      {/* Approval Dialog */}
      <ApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        content={content}
        action={approvalAction}
        onConfirm={handleApprovalConfirm}
        isLoading={isApproving}
      />
    </Card>
  );
}
