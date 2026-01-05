import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flag, CheckCircle2, Clock, AlertTriangle, Circle } from 'lucide-react';
import { CampaignMilestone } from '@/types/campaign';
import { cn } from '@/lib/utils';

interface MilestoneProgressCardProps {
  milestones: CampaignMilestone[];
}

export function MilestoneProgressCard({ milestones }: MilestoneProgressCardProps) {
  const stats = useMemo(() => {
    const completed = milestones.filter(m => m.status === 'completed').length;
    const inProgress = milestones.filter(m => m.status === 'in_progress').length;
    const pending = milestones.filter(m => m.status === 'pending').length;
    const missed = milestones.filter(m => m.status === 'missed').length;
    const total = milestones.length;
    
    // Check for overdue (pending/in_progress past due date)
    const overdue = milestones.filter(m => 
      (m.status === 'pending' || m.status === 'in_progress') && 
      new Date(m.due_date) < new Date()
    ).length;
    
    return { completed, inProgress, pending, missed, overdue, total };
  }, [milestones]);

  if (milestones.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flag className="h-4 w-4" />
            Tiến độ Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">
            Chưa có milestones
          </div>
        </CardContent>
      </Card>
    );
  }

  const statItems = [
    { 
      label: 'Hoàn thành', 
      value: stats.completed, 
      icon: CheckCircle2, 
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    { 
      label: 'Đang thực hiện', 
      value: stats.inProgress, 
      icon: Clock, 
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    { 
      label: 'Chờ xử lý', 
      value: stats.pending, 
      icon: Circle, 
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/50'
    },
    { 
      label: 'Bỏ lỡ', 
      value: stats.missed, 
      icon: AlertTriangle, 
      color: 'text-red-500',
      bgColor: 'bg-red-500/10'
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Flag className="h-4 w-4" />
          Tiến độ Milestones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress Bar */}
        <div className="flex h-3 rounded-full overflow-hidden bg-muted">
          {stats.completed > 0 && (
            <div 
              className="bg-green-500 transition-all" 
              style={{ width: `${(stats.completed / stats.total) * 100}%` }} 
            />
          )}
          {stats.inProgress > 0 && (
            <div 
              className="bg-blue-500 transition-all" 
              style={{ width: `${(stats.inProgress / stats.total) * 100}%` }} 
            />
          )}
          {stats.missed > 0 && (
            <div 
              className="bg-red-500 transition-all" 
              style={{ width: `${(stats.missed / stats.total) * 100}%` }} 
            />
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          {statItems.map((item) => (
            <div 
              key={item.label} 
              className={cn("flex items-center gap-2 p-2 rounded-lg", item.bgColor)}
            >
              <item.icon className={cn("h-4 w-4", item.color)} />
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="font-semibold">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Overdue Warning */}
        {stats.overdue > 0 && (
          <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-500/10 p-2 rounded-lg">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{stats.overdue} milestone quá hạn</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
