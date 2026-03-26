import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Plus, Pencil, Trash2, Calendar, Sparkles, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { type MilestoneFormData } from '@/types/campaign';
import { generateDefaultMilestones } from '@/types/campaign';

interface CampaignMilestoneEditorProps {
  milestones: MilestoneFormData[];
  onMilestonesChange: (milestones: MilestoneFormData[]) => void;
  startDate?: string;
  endDate?: string;
}

export function CampaignMilestoneEditor({
  milestones,
  onMilestonesChange,
  startDate,
  endDate,
}: CampaignMilestoneEditorProps) {
  const [editingMilestone, setEditingMilestone] = useState<MilestoneFormData | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const handleAutoGenerate = () => {
    if (!startDate || !endDate) return;
    const generated = generateDefaultMilestones(startDate, endDate);
    onMilestonesChange(generated);
  };

  const handleAddNew = () => {
    const defaultDate = startDate || new Date().toISOString().split('T')[0];
    setEditingMilestone({
      title: '',
      description: '',
      due_date: defaultDate,
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (index: number) => {
    setEditingMilestone({ ...milestones[index] });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingMilestone || !editingMilestone.title.trim()) return;

    const newMilestones = [...milestones];
    if (editingIndex !== null) {
      newMilestones[editingIndex] = editingMilestone;
    } else {
      newMilestones.push(editingMilestone);
    }

    // Sort by due_date
    newMilestones.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    onMilestonesChange(newMilestones);
    setIsDialogOpen(false);
    setEditingMilestone(null);
    setEditingIndex(null);
  };

  const handleDelete = () => {
    if (deleteIndex === null) return;
    const newMilestones = milestones.filter((_, i) => i !== deleteIndex);
    onMilestonesChange(newMilestones);
    setDeleteIndex(null);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: vi });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Auto-generate hint */}
      {startDate && endDate && milestones.length === 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-primary">Tạo tự động</p>
              <p className="text-sm text-muted-foreground mt-1">
                Chúng tôi có thể tự động tạo các milestones dựa trên thời gian chiến dịch của bạn.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={handleAutoGenerate}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Tạo milestones tự động
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Milestones List */}
      {milestones.length > 0 && (
        <div className="space-y-2">
          {milestones.map((milestone, index) => (
            <Card
              key={index}
              className={cn(
                'p-4 transition-all hover:shadow-md',
                'border-l-4 border-l-primary/50'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 text-muted-foreground/50 cursor-grab">
                  <GripVertical className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">{milestone.title}</h4>
                    <Badge variant="outline" className="shrink-0">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(milestone.due_date)}
                    </Badge>
                  </div>
                  {milestone.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {milestone.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(index)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteIndex(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add button */}
      <Button variant="outline" className="w-full" onClick={handleAddNew}>
        <Plus className="h-4 w-4 mr-2" />
        Thêm Milestone
      </Button>

      {/* Auto-regenerate if has milestones */}
      {startDate && endDate && milestones.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={handleAutoGenerate}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Tạo lại milestones tự động
        </Button>
      )}

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingIndex !== null ? 'Sửa Milestone' : 'Thêm Milestone'}
            </DialogTitle>
            <DialogDescription>
              {editingIndex !== null ? 'Chỉnh sửa thông tin milestone' : 'Thêm mốc thời gian mới cho chiến dịch'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="milestone-title">Tiêu đề *</Label>
              <Input
                id="milestone-title"
                placeholder="VD: Khởi động chiến dịch"
                value={editingMilestone?.title || ''}
                onChange={(e) =>
                  setEditingMilestone((prev) =>
                    prev ? { ...prev, title: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="milestone-date">Ngày deadline *</Label>
              <Input
                id="milestone-date"
                type="date"
                value={editingMilestone?.due_date || ''}
                onChange={(e) =>
                  setEditingMilestone((prev) =>
                    prev ? { ...prev, due_date: e.target.value } : null
                  )
                }
                min={startDate}
                max={endDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="milestone-desc">Mô tả (tùy chọn)</Label>
              <Textarea
                id="milestone-desc"
                placeholder="Mô tả chi tiết milestone..."
                value={editingMilestone?.description || ''}
                onChange={(e) =>
                  setEditingMilestone((prev) =>
                    prev ? { ...prev, description: e.target.value } : null
                  )
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={!editingMilestone?.title.trim()}>
              {editingIndex !== null ? 'Cập nhật' : 'Thêm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteIndex !== null} onOpenChange={() => setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa milestone?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa milestone "{deleteIndex !== null ? milestones[deleteIndex]?.title : ''}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
