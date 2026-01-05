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
  // Generate focus tasks based on actual data
  const focusTasks: FocusTask[] = [];
  
  // Add today's milestones first (most important)
  todayMilestones.forEach((milestone, index) => {
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
      title: `${scheduledCount} bài đã lên lịch hôm nay`,
      type: 'schedule',
      completed: false,
      time: 'Xem lịch',
    });
  }

  if (pendingReviewCount > 0) {
    focusTasks.push({
      id: 'review',
      title: `${pendingReviewCount} nội dung chờ duyệt`,
      type: 'review',
      completed: false,
    });
  }

  // Always show a suggestion to create content if not many tasks
  if (focusTasks.length < 3) {
    focusTasks.push({
      id: 'create',
      title: 'Tạo nội dung mới',
      type: 'create',
      completed: false,
    });
  }

  const completedCount = focusTasks.filter(t => t.completed).length;
  const progress = focusTasks.length > 0 ? (completedCount / focusTasks.length) * 100 : 0;

  // Best time suggestion based on current hour
  const getBestTimeMessage = () => {
    const hour = new Date().getHours();
    if (hour >= 8 && hour < 12) {
      return { time: '12:00 - 13:00', icon: '🍽️', label: 'Giờ nghỉ trưa' };
    } else if (hour >= 12 && hour < 17) {
      return { time: '18:00 - 20:00', icon: '🌆', label: 'Giờ vàng' };
    } else if (hour >= 17 && hour < 21) {
      return { time: '20:00 - 22:00', icon: '🌙', label: 'Buổi tối' };
    }
    return { time: '08:00 - 09:00', icon: '☀️', label: 'Buổi sáng' };
  };

  const bestTime = getBestTimeMessage();

  return (
    <Card className={`gradient-card border-border/50 overflow-hidden ${className}`}>
      {/* Header with gradient accent */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
        <CardHeader className="relative pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Trọng tâm hôm nay
            </CardTitle>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{completedCount}</span>
              <span>/</span>
              <span>{focusTasks.length}</span>
            </div>
          </div>
          {/* Progress bar */}
          <Progress value={progress} className="h-1.5 mt-2" />
        </CardHeader>
      </div>

      <CardContent className="pt-0">
        {/* Focus tasks */}
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

        {/* Best time suggestion */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{bestTime.icon}</span>
            <span className="text-xs font-medium text-foreground">
              {bestTime.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Thời điểm tốt để đăng: <span className="font-medium text-foreground">{bestTime.time}</span>
          </p>
        </div>

        {/* Quick action */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-3 h-9 gap-2"
          asChild
        >
          <Link to="/multichannel">
            <Sparkles className="w-4 h-4" />
            Tạo nội dung mới
            <ArrowRight className="w-3 h-3 ml-auto" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
