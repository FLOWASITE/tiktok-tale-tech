import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Flag, 
  Calendar, 
  Edit2, 
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { CampaignMilestone, getMilestoneStatusConfig, MilestoneStatus } from '@/types/campaign';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useCampaignDetail } from '@/hooks/useCampaigns';
import { MilestoneFormDialog } from '@/components/campaign/milestone/MilestoneFormDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CampaignDetailMilestonesProps {
  campaignId: string;
  milestones: CampaignMilestone[];
}

export function CampaignDetailMilestones({ campaignId, milestones }: CampaignDetailMilestonesProps) {
  const { addMilestone, updateMilestone, deleteMilestone } = useCampaignDetail(campaignId);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<CampaignMilestone | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingMilestone(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (milestone: CampaignMilestone) => {
    setEditingMilestone(milestone);
    setIsDialogOpen(true);
  };

  const handleSave = async (data: { title: string; description?: string; due_date: string }) => {
    if (editingMilestone) {
      await updateMilestone?.({ id: editingMilestone.id, ...data });
    } else {
      await addMilestone(data);
    }
    setIsDialogOpen(false);
    setEditingMilestone(null);
  };

  const handleStatusChange = async (id: string, status: MilestoneStatus) => {
    await updateMilestone?.({ 
      id, 
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null
    });
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMilestone?.(deleteId);
      setDeleteId(null);
    }
  };

  const getStatusIcon = (status: MilestoneStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in_progress': return <Clock className="h-5 w-5 text-blue-500" />;
      case 'missed': return <AlertCircle className="h-5 w-5 text-destructive" />;
      default: return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const sortedMilestones = [...milestones].sort((a, b) => 
    new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-primary" />
            Mốc thời gian ({milestones.length})
          </CardTitle>
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Thêm mốc
          </Button>
        </CardHeader>
        <CardContent>
          {sortedMilestones.length === 0 ? (
            <div className="text-center py-8">
              <Flag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium mb-2">Chưa có mốc thời gian nào</p>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                💡 <strong>Mẹo:</strong> Thêm các mốc quan trọng như ngày ra mắt, đánh giá giữa kỳ, 
                hoặc deadline nộp nội dung để theo dõi tiến độ.
              </p>
              <Button variant="outline" onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm mốc đầu tiên
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedMilestones.map((milestone, index) => {
                const statusConfig = getMilestoneStatusConfig(milestone.status);
                const isOverdue = new Date(milestone.due_date) < new Date() && 
                  milestone.status !== 'completed' && 
                  milestone.status !== 'missed';
                
                return (
                  <div 
                    key={milestone.id}
                    className={cn(
                      "relative flex items-start gap-4 p-4 rounded-lg border transition-colors",
                      milestone.status === 'completed' && "bg-green-500/5 border-green-500/30",
                      isOverdue && "bg-destructive/5 border-destructive/30"
                    )}
                  >
                    {/* Timeline Line */}
                    {index < sortedMilestones.length - 1 && (
                      <div className="absolute left-[30px] top-[52px] bottom-[-16px] w-0.5 bg-border" />
                    )}
                    
                    {/* Status Icon */}
                    <div className="relative z-10 bg-background">
                      {getStatusIcon(milestone.status)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className={cn(
                            "font-medium",
                            milestone.status === 'completed' && "line-through text-muted-foreground"
                          )}>
                            {milestone.title}
                          </h4>
                          {milestone.description && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {milestone.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <Select
                            value={milestone.status}
                            onValueChange={(value) => handleStatusChange(milestone.id, value as MilestoneStatus)}
                          >
                            <SelectTrigger className="w-[140px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Chờ thực hiện</SelectItem>
                              <SelectItem value="in_progress">Đang thực hiện</SelectItem>
                              <SelectItem value="completed">Hoàn thành</SelectItem>
                              <SelectItem value="missed">Trễ hạn</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(milestone)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(milestone.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-2 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(milestone.due_date), 'dd/MM/yyyy', { locale: vi })}
                        </div>
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs">
                            Quá hạn
                          </Badge>
                        )}
                        {milestone.completed_at && (
                          <span className="text-xs text-green-600">
                            Hoàn thành: {format(new Date(milestone.completed_at), 'dd/MM/yyyy', { locale: vi })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <MilestoneFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        milestone={editingMilestone}
        onSave={handleSave}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa milestone?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
