import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  Clock, 
  CheckCircle2, 
  Circle,
  Sparkles,
  ArrowRight,
  Flag
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CampaignMilestone } from '@/hooks/useCampaignIntegration';

interface FocusTask {
  id: string;
  title: string;
  type: 'schedule' | 'review' | 'create' | 'milestone';
  completed: boolean;
  time?: string;
  link?: string;
}

interface TodayFocusProps {
  scheduledCount?: number;
  pendingReviewCount?: number;
  todayMilestones?: CampaignMilestone[];
  className?: string;
}

export function TodayFocus({ 
  scheduledCount = 0, 
  pendingReviewCount = 0,
  todayMilestones = [],
  className 
}: TodayFocusProps) {
  const { t } = useTranslation();
  
  const focusTasks: FocusTask[] = [];
  
  todayMilestones.forEach((milestone) => {
    focusTasks.push({
      id: `milestone-${milestone.id}`,
      title: milestone.title,
      type: 'milestone',
      completed: milestone.status === 'completed',
      time: milestone.campaign_name,
      link: `/campaigns/${milestone.campaign_id}#milestones`,
    });
  });
  
  if (scheduledCount > 0) {
    focusTasks.push({
      id: 'scheduled',
      title: t('app.dashboard.scheduledToday', { count: scheduledCount }),
      type: 'schedule',
      completed: false,
      time: t('app.dashboard.viewAll'),
    });
  }

  if (pendingReviewCount > 0) {
    focusTasks.push({
      id: 'review',
      title: t('app.dashboard.pendingReview', { count: pendingReviewCount }),
      type: 'review',
      completed: false,
    });
  }

  if (focusTasks.length < 3) {
    focusTasks.push({
      id: 'create',
      title: t('app.dashboard.createContent'),
      type: 'create',
      completed: false,
    });
  }

  const completedCount = focusTasks.filter(t => t.completed).length;
  const progress = focusTasks.length > 0 ? (completedCount / focusTasks.length) * 100 : 0;

  const getBestTimeMessage = () => {
    const hour = new Date().getHours();
    if (hour >= 8 && hour < 12) {
      return { time: '12:00 - 13:00', icon: '🍽️', label: t('app.dashboard.lunchBreak') };
    } else if (hour >= 12 && hour < 17) {
      return { time: '18:00 - 20:00', icon: '🌆', label: t('app.dashboard.goldenHour') };
    } else if (hour >= 17 && hour < 21) {
      return { time: '20:00 - 22:00', icon: '🌙', label: t('app.dashboard.evening') };
    }
    return { time: '08:00 - 09:00', icon: '☀️', label: t('app.dashboard.morning') };
  };

  const bestTime = getBestTimeMessage();

  return (
    <Card className={`gradient-card border-border/50 overflow-hidden ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
        <CardHeader className="relative pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              {t('app.dashboard.todayFocus')}
            </CardTitle>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{completedCount}</span>
              <span>/</span>
              <span>{focusTasks.length}</span>
            </div>
          </div>
          <Progress value={progress} className="h-1.5 mt-2" />
        </CardHeader>
      </div>

      <CardContent className="pt-0">
        <div className="space-y-2 mb-4">
          {focusTasks.slice(0, 4).map((task, index) => {
            const TaskWrapper = task.link ? Link : 'div';
            const wrapperProps = task.link ? { to: task.link } : {};
            
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <TaskWrapper 
                  {...wrapperProps as any}
                  className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                    task.completed 
                      ? 'bg-emerald-500/5' 
                      : task.link ? 'hover:bg-muted/50 cursor-pointer' : 'hover:bg-muted/50'
                  }`}
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  ) : task.type === 'milestone' ? (
                    <Flag className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${task.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {task.title}
                    </p>
                  </div>
                  {task.time && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                      {task.type === 'milestone' ? (
                        <Target className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      <span className="truncate max-w-[80px]">{task.time}</span>
                    </span>
                  )}
                </TaskWrapper>
              </motion.div>
            );
          })}
        </div>

        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{bestTime.icon}</span>
            <span className="text-xs font-medium text-foreground">
              {bestTime.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('app.dashboard.bestTimeToPost')}: <span className="font-medium text-foreground">{bestTime.time}</span>
          </p>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-3 h-9 gap-2"
          asChild
        >
          <Link to="/multichannel">
            <Sparkles className="w-4 h-4" />
            {t('app.dashboard.createContent')}
            <ArrowRight className="w-3 h-3 ml-auto" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
