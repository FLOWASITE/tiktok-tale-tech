import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { 
  Eye, 
  Calendar, 
  Users, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  SendHorizontal,
  Sparkles,
  ArrowRight,
  Target,
  Edit3,
  Trash2,
  Send,
  XCircle,
  User
} from 'lucide-react';
import { formatDistanceToNow, format, isPast } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { MultiChannelContent, CHANNELS, Channel, CONTENT_STATUSES, ContentStatus } from '@/types/multichannel';
import { ContentAssignment, ASSIGNMENT_STATUSES, AssignmentStatus, ASSIGNMENT_PRIORITIES } from '@/types/assignment';
import { ContentSchedule, PUBLISH_STATUSES } from '@/types/publishing';
import { Link } from 'react-router-dom';
import { useConfetti } from '@/hooks/useConfetti';
import { getChannelColorClasses } from '@/utils/channelColors';
import { OrgRole, canApproveContent, canSubmitForReview } from '@/types/organization';
import { ApprovalDialog } from './ApprovalDialog';
import { CreatorProfile } from '@/hooks/useCreatorProfiles';

interface ContentTaskCardProps {
  content: MultiChannelContent;
  assignments: ContentAssignment[];
  schedules: ContentSchedule[];
  currentUserId?: string;
  currentRole?: OrgRole | null;
  creatorProfiles?: Record<string, CreatorProfile>;
  onAssignmentStatusChange: (assignmentId: string, newStatus: AssignmentStatus) => Promise<void>;
  onRefresh: () => void;
  onStatusChange?: (contentId: string, status: ContentStatus) => Promise<any>;
  onDelete?: (contentId: string) => Promise<void>;
  onSubmitForReview?: (contentId: string, notes?: string) => Promise<any>;
  onApprove?: (contentId: string, notes?: string) => Promise<any>;
  onReject?: (contentId: string, reason: string) => Promise<any>;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export function ContentTaskCard({
  content,
  assignments,
  schedules,
  currentUserId,
  currentRole,
  creatorProfiles = {},
  onAssignmentStatusChange,
  onRefresh,
  onStatusChange,
  onDelete,
  onSubmitForReview,
  onApprove,
  onReject,
  isSelected,
  onToggleSelect,
}: ContentTaskCardProps) {
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const { fireConfetti } = useConfetti();
  
  // Get creator profile from props instead of hook
  const creator = content.user_id ? creatorProfiles[content.user_id] : null;

  // Approval dialog state
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'submit'>('submit');
  const [isApproving, setIsApproving] = useState(false);

  // Check permissions
  const canApprove = currentRole ? canApproveContent(currentRole) : false;
  const canSubmit = currentRole ? canSubmitForReview(currentRole) : false;

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

  // Calculate completion progress
  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter(a => a.status === 'completed').length;
  const completionProgress = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

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
            className="gap-1.5 h-8 text-xs hover:bg-primary/10 hover:text-primary hover:border-primary/30"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Bắt đầu</span>
          </Button>
        );
      case 'in_progress':
        return (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => handleStatusChange('review')}
            disabled={isUpdating}
            className="gap-1.5 h-8 text-xs hover:bg-yellow-500/10 hover:text-yellow-600 hover:border-yellow-500/30"
          >
            <SendHorizontal className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Gửi duyệt</span>
          </Button>
        );
      case 'review':
        return (
          <Button 
            size="sm" 
            variant="default" 
            onClick={() => handleStatusChange('completed')}
            disabled={isUpdating}
            className="gap-1.5 h-8 text-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Hoàn thành</span>
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

  const priorityConfig = myAssignment ? 
    ASSIGNMENT_PRIORITIES.find(p => p.value === myAssignment.priority) : null;

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect?.();
  };

  // Priority class
  const priorityClass = myAssignment 
    ? myAssignment.priority === 'urgent' ? 'priority-urgent'
    : myAssignment.priority === 'high' ? 'priority-high'
    : myAssignment.priority === 'low' ? 'priority-low'
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
    <Card className={`relative group overflow-hidden task-card-hover rounded-2xl ${priorityClass} ${
      isOverdue ? 'border-red-500/40 bg-gradient-to-br from-red-500/5 to-transparent deadline-urgent' : 'border-border/40'
    } ${isSelected ? 'ring-2 ring-primary border-primary bg-primary/5' : ''}`}>
      {/* Selection checkbox */}
      <div 
        className={`absolute top-4 left-4 z-10 transition-all duration-200 ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'}`}
        onClick={handleCheckboxClick}
      >
        <Checkbox 
          checked={isSelected} 
          className="h-4 w-4 bg-background/90 backdrop-blur-sm border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-sm"
        />
      </div>

      {/* Quick action buttons on hover */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200">
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
          
          {/* Approve/Reject - only for review status and if user can approve */}
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

      {/* Gradient overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      
      {/* Priority indicator */}
      {priorityConfig && myAssignment?.priority !== 'normal' && (
        <div className={`absolute top-0 right-0 w-16 h-16 overflow-hidden`}>
          <div className={`absolute top-2 right-[-20px] w-[80px] text-center text-[9px] font-bold py-0.5 rotate-45 ${
            myAssignment?.priority === 'urgent' ? 'bg-red-500 text-white' :
            myAssignment?.priority === 'high' ? 'bg-orange-500 text-white' :
            'bg-muted text-muted-foreground'
          }`}>
            {priorityConfig.label}
          </div>
        </div>
      )}
      
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className={`flex-1 min-w-0 ${isSelected ? 'ml-6' : ''}`}>
            <div className="flex items-center gap-2 mb-1">
              <Badge 
                variant="outline" 
                className={`text-[10px] sm:text-xs shrink-0 font-medium ${statusConfig.bgClass} ${statusConfig.textClass} ${statusConfig.borderClass}`}
              >
                {statusConfig.label}
              </Badge>
              {completedAssignments === totalAssignments && totalAssignments > 0 && (
                <Badge variant="secondary" className="text-[10px] bg-green-500/20 text-green-600 gap-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Done
                </Badge>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-semibold line-clamp-2 group-hover:text-primary transition-colors">
              {content.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 flex items-center gap-1">
              <Target className="w-3 h-3 shrink-0" />
              {content.topic}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Channels */}
        <div className="flex flex-wrap gap-1">
          {content.selected_channels.slice(0, 4).map(channel => {
            const info = getChannelInfo(channel);
            return info ? (
              <TooltipProvider key={channel}>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] px-1.5 py-0.5 font-medium ${getChannelColorClasses(channel)}`}
                    >
                      {info.label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>{info.description}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null;
          })}
          {content.selected_channels.length > 4 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
              +{content.selected_channels.length - 4}
            </Badge>
          )}
        </div>

        {/* Progress bar for assignments */}
        {totalAssignments > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Tiến độ
              </span>
              <span className="font-medium">{completedAssignments}/{totalAssignments}</span>
            </div>
            <Progress value={completionProgress} className="h-1.5" />
          </div>
        )}

        {/* Assignees */}
        {uniqueAssignees.length > 0 && (
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-1.5 flex-wrap">
              <TooltipProvider>
                {uniqueAssignees.slice(0, 3).map(assignee => (
                  <Tooltip key={assignee.id}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 bg-muted/50 rounded-full pl-0.5 pr-2 py-0.5 border border-border/50 hover:bg-muted transition-colors">
                        <Avatar className="w-5 h-5 border border-background">
                          <AvatarImage src={assignee.avatar_url || undefined} />
                          <AvatarFallback className="text-[8px] font-medium bg-primary/10 text-primary">
                            {(assignee.full_name || assignee.email || '?')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[60px]">
                          {assignee.full_name?.split(' ').pop() || assignee.email?.split('@')[0]}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs font-medium">{assignee.full_name || assignee.email}</p>
                      <p className="text-[10px] text-muted-foreground">Người được giao</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
              {uniqueAssignees.length > 3 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="h-5 px-1.5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground border border-border/50">
                        +{uniqueAssignees.length - 3}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <div className="space-y-1">
                        {uniqueAssignees.slice(3).map(assignee => (
                          <p key={assignee.id} className="text-xs">{assignee.full_name || assignee.email}</p>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        )}

        {/* My Assignment Status */}
        {myAssignment && myAssignmentStatus && (
          <div className={`flex items-center justify-between gap-2 p-2.5 rounded-lg ${
            isOverdue ? 'bg-red-500/10 border border-red-500/30' : 'bg-muted/50'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <Badge className={`text-[10px] shrink-0 ${myAssignmentStatus.color}`}>
                {myAssignmentStatus.label}
              </Badge>
              {isOverdue && (
                <span className="flex items-center gap-1 text-[10px] text-red-500 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span className="hidden xs:inline">Quá hạn</span>
                </span>
              )}
            </div>
            {myAssignment.due_date && (
              <span className={`text-[10px] flex items-center gap-1 shrink-0 ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                <Clock className="w-3 h-3" />
                {format(new Date(myAssignment.due_date), 'dd/MM HH:mm')}
              </span>
            )}
          </div>
        )}

        {/* Next Schedule */}
        {nextSchedule && (
          <div className="flex items-center gap-2 text-xs p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="text-blue-600 font-medium truncate">
              {format(new Date(nextSchedule.scheduled_at), "HH:mm 'ngày' dd/MM", { locale: vi })}
            </span>
            {CHANNELS.find(c => c.value === nextSchedule.channel) && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 border-blue-500/30 text-blue-500 bg-blue-500/10 shrink-0">
                {CHANNELS.find(c => c.value === nextSchedule.channel)?.label}
              </Badge>
            )}
          </div>
        )}

        {/* Creator info */}
        {creator && (
          <div className="flex items-center gap-2 pt-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <Avatar className="w-5 h-5 border border-border/50">
                      <AvatarImage src={creator.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px] font-medium bg-muted">
                        {creator.full_name?.charAt(0) || (creator.email ? creator.email.charAt(0).toUpperCase() : 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                      {creator.full_name || (creator.email ? creator.email.split('@')[0] : 'Người dùng')}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Người tạo: {creator.full_name || creator.email || 'Không xác định'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
          <div className="flex items-center gap-1.5">
            {getNextActionButton()}
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => navigate(`/multichannel?view=${content.id}`)}
              className="gap-1 h-8 text-xs hover:bg-primary/10 hover:text-primary"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Xem</span>
              <ArrowRight className="w-3 h-3 hidden xs:inline" />
            </Button>
          </div>
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
