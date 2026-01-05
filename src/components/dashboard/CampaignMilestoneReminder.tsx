import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Flag, 
  AlertTriangle, 
  Clock, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, parseISO, isToday, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CampaignMilestone } from '@/hooks/useCampaignIntegration';

interface CampaignMilestoneReminderProps {
  milestones: CampaignMilestone[];
  overdueMilestones?: CampaignMilestone[];
  isLoading?: boolean;
  className?: string;
}

export function CampaignMilestoneReminder({ 
  milestones, 
  overdueMilestones = [],
  isLoading = false,
  className 
}: CampaignMilestoneReminderProps) {
  // Combine overdue with upcoming, showing overdue first
  const allMilestones = [...overdueMilestones, ...milestones].slice(0, 5);
  const hasOverdue = overdueMilestones.length > 0;

  const getDaysLabel = (dueDate: string) => {
    const days = differenceInDays(parseISO(dueDate), new Date());
    if (days < 0) return { label: `Quá hạn ${Math.abs(days)}d`, isOverdue: true };
    if (days === 0) return { label: 'Hôm nay', isToday: true };
    if (days === 1) return { label: 'Ngày mai', isToday: false };
    return { label: `Trong ${days}d`, isToday: false };
  };

  if (isLoading) {
    return (
      <Card className={`gradient-card border-border/50 ${className}`}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (allMilestones.length === 0) {
    return null; // Don't show widget if no milestones
  }

  return (
    <Card className={`gradient-card border-border/50 overflow-hidden ${className}`}>
      {/* Header with warning accent if overdue */}
      <div className="relative">
        <div className={`absolute inset-0 ${hasOverdue ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent' : 'bg-gradient-to-r from-primary/10 via-primary/5 to-transparent'}`} />
        <CardHeader className="relative pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Flag className={`w-4 h-4 ${hasOverdue ? 'text-amber-500' : 'text-primary'}`} />
              Milestones sắp đến
            </CardTitle>
            <Badge 
              variant={hasOverdue ? 'destructive' : 'secondary'} 
              className="text-xs"
            >
              {allMilestones.length}
            </Badge>
          </div>
        </CardHeader>
      </div>

      <CardContent className="pt-0 space-y-2">
        {allMilestones.map((milestone, index) => {
          const daysInfo = getDaysLabel(milestone.due_date);
          const isOverdue = 'isOverdue' in daysInfo && daysInfo.isOverdue;
          const isTodayMilestone = 'isToday' in daysInfo && daysInfo.isToday;
          
          return (
            <motion.div
              key={milestone.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={`/campaigns/${milestone.campaign_id}#milestones`}>
                <div className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors group ${
                  isOverdue 
                    ? 'bg-red-500/10 hover:bg-red-500/15 border border-red-500/20' 
                    : isTodayMilestone
                    ? 'bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20'
                    : 'hover:bg-muted/50'
                }`}>
                  {/* Status icon */}
                  {isOverdue ? (
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  ) : isTodayMilestone ? (
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                  )}
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {milestone.title}
                    </p>
                    {milestone.campaign_name && (
                      <p className="text-xs text-muted-foreground truncate">
                        {milestone.campaign_name}
                      </p>
                    )}
                  </div>
                  
                  {/* Due date badge */}
                  <Badge 
                    variant="outline" 
                    className={`shrink-0 text-[10px] ${
                      isOverdue 
                        ? 'border-red-500/30 text-red-600 bg-red-500/10' 
                        : isTodayMilestone
                        ? 'border-amber-500/30 text-amber-600 bg-amber-500/10'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {daysInfo.label}
                  </Badge>
                </div>
              </Link>
            </motion.div>
          );
        })}
        
        <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground hover:text-foreground mt-2" asChild>
          <Link to="/campaigns">
            Xem tất cả chiến dịch
            <ArrowRight className="w-3 h-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
