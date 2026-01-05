import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useContentAssignments } from '@/hooks/useContentAssignments';
import { ASSIGNMENT_PRIORITIES } from '@/types/assignment';
import { CHANNELS } from '@/types/multichannel';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Clock, CheckCircle, Play, AlertCircle, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { SkeletonCard } from '@/components/dashboard/SkeletonCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { PulseIndicator } from '@/components/dashboard/PulseIndicator';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

export const MyAssignments = () => {
  const { myAssignments, isLoading, updateAssignmentStatus } = useContentAssignments();

  const getChannel = (channelValue: string) => {
    return CHANNELS.find(c => c.value === channelValue);
  };

  const getPriorityConfig = (priority: string) => {
    return ASSIGNMENT_PRIORITIES.find(p => p.value === priority) || ASSIGNMENT_PRIORITIES[1];
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const overdueCount = myAssignments.filter(a => isOverdue(a.due_date)).length;

  const handleComplete = async (id: string) => {
    try {
      await updateAssignmentStatus(id, 'completed');
      
      // Success confetti
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#22c55e', '#10b981', '#34d399'],
      });
      
      toast.success('Hoàn thành nhiệm vụ!', {
        icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
      });
    } catch {
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  const handleStatusUpdate = async (id: string, status: 'in_progress' | 'review') => {
    try {
      await updateAssignmentStatus(id, status);
      toast.success(status === 'in_progress' ? 'Đã bắt đầu nhiệm vụ' : 'Đã gửi duyệt');
    } catch {
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  if (isLoading) {
    return (
      <Card className="gradient-card border-border/50 overflow-hidden">
        <CardContent className="p-6">
          <SkeletonCard lines={3} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gradient-card border-border/50 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="relative p-1.5 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
            <ClipboardList className="h-4 w-4 text-emerald-600" />
            <PulseIndicator count={overdueCount} variant="danger" />
          </div>
          Nhiệm vụ của tôi
          {myAssignments.length > 0 && (
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
              {myAssignments.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {myAssignments.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Không có nhiệm vụ"
            description="Không có nhiệm vụ nào đang chờ xử lý"
          />
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            {myAssignments.map((assignment, index) => {
              const channel = getChannel(assignment.channel);
              const priorityConfig = getPriorityConfig(assignment.priority);
              const overdue = isOverdue(assignment.due_date);

              return (
                <motion.div
                  key={assignment.id}
                  variants={itemVariants}
                  className={`p-3 rounded-xl border transition-all duration-300 hover:shadow-md group
                    ${overdue 
                      ? 'border-destructive/50 bg-destructive/5 hover:border-destructive/70' 
                      : 'bg-muted/30 border-border/50 hover:bg-muted/50 hover:border-primary/20'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium group-hover:text-primary transition-colors">
                        {channel?.label}
                      </span>
                    </div>
                    <Badge className={priorityConfig.color}>
                      {priorityConfig.label}
                    </Badge>
                  </div>

                  {assignment.due_date && (
                    <div className={`flex items-center gap-1 text-xs mb-2 ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {overdue ? (
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <AlertCircle className="h-3 w-3" />
                        </motion.div>
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      Hạn: {format(new Date(assignment.due_date), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      {overdue && ' (Quá hạn)'}
                    </div>
                  )}

                  {assignment.notes && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{assignment.notes}</p>
                  )}

                  <div className="flex gap-2">
                    {assignment.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                        onClick={() => handleStatusUpdate(assignment.id, 'in_progress')}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Bắt đầu
                      </Button>
                    )}
                    {assignment.status === 'in_progress' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/50"
                        onClick={() => handleStatusUpdate(assignment.id, 'review')}
                      >
                        Gửi duyệt
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                      onClick={() => handleComplete(assignment.id)}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Hoàn thành
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
