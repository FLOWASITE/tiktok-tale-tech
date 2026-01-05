import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Flag, AlertTriangle, Clock } from 'lucide-react';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { CampaignMilestone } from '@/hooks/useCampaignIntegration';

interface CalendarMilestoneItemProps {
  milestone: CampaignMilestone;
  compact?: boolean;
}

export function CalendarMilestoneItem({ milestone, compact = false }: CalendarMilestoneItemProps) {
  const isOverdue = isPast(parseISO(milestone.due_date)) && 
    !isToday(parseISO(milestone.due_date)) && 
    milestone.status !== 'completed';
  const isTodayMilestone = isToday(parseISO(milestone.due_date));
  const isCompleted = milestone.status === 'completed';

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link 
              to={`/campaigns/${milestone.campaign_id}#milestones`}
              onClick={(e) => e.stopPropagation()}
              className={`
                flex items-center gap-1.5 text-xs p-1.5 rounded cursor-pointer
                border-l-[3px] shadow-sm hover:shadow-md transition-all
                ${isCompleted 
                  ? 'border-l-green-500 bg-green-500/10 text-green-700 dark:text-green-400' 
                  : isOverdue 
                  ? 'border-l-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
                  : isTodayMilestone
                  ? 'border-l-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                  : 'border-l-primary bg-primary/10 text-primary'
                }
              `}
            >
              {isOverdue ? (
                <AlertTriangle className="w-3 h-3 shrink-0" />
              ) : isCompleted ? (
                <Flag className="w-3 h-3 shrink-0 text-green-500" />
              ) : (
                <Flag className="w-3 h-3 shrink-0" />
              )}
              <span className="truncate font-medium">{milestone.title}</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">{milestone.title}</p>
              {milestone.campaign_name && (
                <p className="text-xs text-muted-foreground">{milestone.campaign_name}</p>
              )}
              {milestone.description && (
                <p className="text-xs">{milestone.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {format(parseISO(milestone.due_date), 'dd/MM/yyyy', { locale: vi })}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Link 
      to={`/campaigns/${milestone.campaign_id}#milestones`}
      className={`
        block p-3 rounded-lg transition-colors
        ${isCompleted 
          ? 'bg-green-500/10 border border-green-500/20' 
          : isOverdue 
          ? 'bg-red-500/10 border border-red-500/20'
          : isTodayMilestone
          ? 'bg-amber-500/10 border border-amber-500/20'
          : 'bg-primary/5 border border-primary/20 hover:bg-primary/10'
        }
      `}
    >
      <div className="flex items-start gap-2">
        {isOverdue ? (
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
        ) : isCompleted ? (
          <Flag className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
        ) : isTodayMilestone ? (
          <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        ) : (
          <Flag className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{milestone.title}</p>
          {milestone.campaign_name && (
            <p className="text-xs text-muted-foreground truncate">{milestone.campaign_name}</p>
          )}
          {milestone.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{milestone.description}</p>
          )}
        </div>
        <Badge 
          variant="outline" 
          className={`shrink-0 text-[10px] ${
            isCompleted 
              ? 'border-green-500/30 text-green-600 bg-green-500/10' 
              : isOverdue 
              ? 'border-red-500/30 text-red-600 bg-red-500/10'
              : isTodayMilestone
              ? 'border-amber-500/30 text-amber-600 bg-amber-500/10'
              : 'text-muted-foreground'
          }`}
        >
          {format(parseISO(milestone.due_date), 'HH:mm')}
        </Badge>
      </div>
    </Link>
  );
}
