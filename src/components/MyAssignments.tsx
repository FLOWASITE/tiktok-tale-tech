import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useContentAssignments } from '@/hooks/useContentAssignments';
import { ASSIGNMENT_STATUSES, ASSIGNMENT_PRIORITIES, AssignmentStatus } from '@/types/assignment';
import { CHANNELS } from '@/types/multichannel';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Clock, CheckCircle, Play, AlertCircle } from 'lucide-react';

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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          Nhiệm vụ của tôi
          {myAssignments.length > 0 && (
            <Badge variant="secondary">{myAssignments.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {myAssignments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Không có nhiệm vụ nào đang chờ xử lý
          </div>
        ) : (
          <div className="space-y-3">
            {myAssignments.map((assignment) => {
              const channel = getChannel(assignment.channel);
              const priorityConfig = getPriorityConfig(assignment.priority);
              const overdue = isOverdue(assignment.due_date);

              return (
                <div
                  key={assignment.id}
                  className={`p-3 border rounded-lg ${overdue ? 'border-destructive/50 bg-destructive/5' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{channel?.label}</span>
                    </div>
                    <Badge className={priorityConfig.color}>
                      {priorityConfig.label}
                    </Badge>
                  </div>

                  {assignment.due_date && (
                    <div className={`flex items-center gap-1 text-xs mb-2 ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {overdue ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      Hạn: {format(new Date(assignment.due_date), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      {overdue && ' (Quá hạn)'}
                    </div>
                  )}

                  {assignment.notes && (
                    <p className="text-xs text-muted-foreground mb-2">{assignment.notes}</p>
                  )}

                  <div className="flex gap-2">
                    {assignment.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => updateAssignmentStatus(assignment.id, 'in_progress')}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Bắt đầu
                      </Button>
                    )}
                    {assignment.status === 'in_progress' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => updateAssignmentStatus(assignment.id, 'review')}
                      >
                        Gửi duyệt
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-xs"
                      onClick={() => updateAssignmentStatus(assignment.id, 'completed')}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Hoàn thành
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
