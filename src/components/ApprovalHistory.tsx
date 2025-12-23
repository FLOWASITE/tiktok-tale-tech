import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  Send, 
  ThumbsUp, 
  ThumbsDown, 
  Clock, 
  MessageSquare, 
  History,
  ShieldCheck,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { useApprovalLogs, ApprovalLog, ApprovalAction } from '@/hooks/useApprovalLogs';
import { cn } from '@/lib/utils';

interface ApprovalHistoryProps {
  contentId: string;
  className?: string;
  maxHeight?: string;
}

const ACTION_CONFIG: Record<ApprovalAction, {
  icon: typeof Send;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  submitted: {
    icon: Send,
    label: 'Gửi duyệt',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  approved: {
    icon: ThumbsUp,
    label: 'Đã duyệt',
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  rejected: {
    icon: ThumbsDown,
    label: 'Từ chối',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
};

function IndustryComplianceBadge({ snapshot }: { snapshot: ApprovalLog['industry_memory_snapshot'] }) {
  if (!snapshot) return null;

  const passedCount = snapshot.checklist.filter(i => i.passed).length;
  const totalCount = snapshot.checklist.length;
  const allPassed = snapshot.compliance_passed;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'flex items-center gap-1.5 mt-2 p-1.5 rounded text-xs',
            allPassed 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          )}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="font-medium">{snapshot.industry_name}</span>
            <Badge 
              variant="outline" 
              className={cn(
                'text-[10px] px-1 py-0',
                allPassed ? 'border-emerald-500/30' : 'border-amber-500/30'
              )}
            >
              v{snapshot.version}
            </Badge>
            <span className="text-[10px] ml-auto">
              {allPassed ? (
                <span className="flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  {passedCount}/{totalCount} passed
                </span>
              ) : (
                <span className="flex items-center gap-0.5">
                  <XCircle className="w-3 h-3" />
                  {totalCount - passedCount} failed
                </span>
              )}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="text-xs space-y-1">
            <p className="font-medium">Industry Compliance Review</p>
            <p className="text-muted-foreground">
              {snapshot.reviewer_confirmed 
                ? '✓ Reviewer đã xác nhận tuân thủ' 
                : '○ Chưa xác nhận tuân thủ'}
            </p>
            {snapshot.rejected_rules.length > 0 && (
              <div className="pt-1">
                <p className="text-destructive font-medium">Quy tắc bị từ chối:</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  {snapshot.rejected_rules.slice(0, 3).map((rule, i) => (
                    <li key={i} className="truncate">{rule}</li>
                  ))}
                  {snapshot.rejected_rules.length > 3 && (
                    <li>+{snapshot.rejected_rules.length - 3} quy tắc khác</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ApprovalLogItem({ log }: { log: ApprovalLog }) {
  const config = ACTION_CONFIG[log.action];
  const Icon = config.icon;
  const displayName = log.performer?.full_name || log.performer?.email?.split('@')[0] || 'Unknown';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className={cn(
      'relative flex gap-3 p-3 rounded-lg border transition-all hover:shadow-sm',
      config.bgColor,
      config.borderColor
    )}>
      {/* Timeline dot */}
      <div className={cn(
        'absolute -left-[21px] top-4 w-3 h-3 rounded-full border-2 border-background',
        log.action === 'approved' ? 'bg-green-500' :
        log.action === 'rejected' ? 'bg-orange-500' : 'bg-blue-500'
      )} />

      {/* Avatar */}
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={log.performer?.avatar_url || undefined} />
        <AvatarFallback className="text-xs bg-muted">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{displayName}</span>
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', config.color)}>
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>
        
        {log.notes && (
          <div className="mt-1.5 flex items-start gap-1.5 text-sm text-muted-foreground">
            <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p className="break-words">{log.notes}</p>
          </div>
        )}

        {/* Industry Compliance Badge */}
        <IndustryComplianceBadge snapshot={log.industry_memory_snapshot} />

        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <time>
            {format(new Date(log.created_at), "HH:mm - dd/MM/yyyy", { locale: vi })}
          </time>
        </div>
      </div>
    </div>
  );
}

export function ApprovalHistory({ contentId, className, maxHeight = '300px' }: ApprovalHistoryProps) {
  const { logs, loading } = useApprovalLogs(contentId);

  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <History className="w-4 h-4" />
          Lịch sử phê duyệt
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3 p-3 rounded-lg border">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className={cn('', className)}>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
          <History className="w-4 h-4" />
          Lịch sử phê duyệt
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center border rounded-lg bg-muted/30">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
            <History className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">Chưa có lịch sử phê duyệt</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Lịch sử sẽ được ghi lại khi nội dung được gửi duyệt
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
        <History className="w-4 h-4" />
        Lịch sử phê duyệt
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {logs.length}
        </Badge>
      </div>
      
      <ScrollArea style={{ maxHeight }} className="pr-2">
        <div className="relative pl-5 border-l-2 border-muted space-y-3">
          {logs.map((log) => (
            <ApprovalLogItem key={log.id} log={log} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
