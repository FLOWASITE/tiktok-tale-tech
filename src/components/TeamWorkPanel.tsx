import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContentAssignments } from '@/hooks/useContentAssignments';
import { ASSIGNMENT_STATUSES, ASSIGNMENT_PRIORITIES, AssignmentStatus } from '@/types/assignment';
import { CHANNELS } from '@/types/multichannel';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { User, Clock, Trash2, CheckCircle } from 'lucide-react';

interface TeamWorkPanelProps {
  contentId: string;
}

export const TeamWorkPanel = ({ contentId }: TeamWorkPanelProps) => {
  const { assignments, isLoading, updateAssignmentStatus, deleteAssignment } = useContentAssignments(contentId);

  const getChannel = (channelValue: string) => {
    return CHANNELS.find(c => c.value === channelValue);
  };

  const getStatusConfig = (status: AssignmentStatus) => {
    return ASSIGNMENT_STATUSES.find(s => s.value === status) || ASSIGNMENT_STATUSES[0];
  };

  const getPriorityConfig = (priority: string) => {
    return ASSIGNMENT_PRIORITIES.find(p => p.value === priority) || ASSIGNMENT_PRIORITIES[1];
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Chưa có phân công nào cho nội dung này
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Phân công ({assignments.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {assignments.map((assignment) => {
          const channel = getChannel(assignment.channel);
          const statusConfig = getStatusConfig(assignment.status);
          const priorityConfig = getPriorityConfig(assignment.priority);

          return (
            <div
              key={assignment.id}
              className="p-3 border rounded-lg space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{channel?.label}</span>
                </div>
                <Badge className={priorityConfig.color}>
                  {priorityConfig.label}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={assignment.assignee?.avatar_url || ''} />
                  <AvatarFallback>
                    <User className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">
                  {assignment.assignee?.full_name || assignment.assignee?.email}
                </span>
              </div>

              {assignment.due_date && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Hạn: {format(new Date(assignment.due_date), 'dd/MM/yyyy HH:mm', { locale: vi })}
                </div>
              )}

              {assignment.notes && (
                <p className="text-xs text-muted-foreground">{assignment.notes}</p>
              )}

              <div className="flex items-center justify-between pt-2 border-t">
                <Select
                  value={assignment.status}
                  onValueChange={(value) => updateAssignmentStatus(assignment.id, value as AssignmentStatus)}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNMENT_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        <span className={`px-2 py-0.5 rounded ${status.color}`}>
                          {status.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-1">
                  {assignment.status !== 'completed' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateAssignmentStatus(assignment.id, 'completed')}
                    >
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => deleteAssignment(assignment.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
