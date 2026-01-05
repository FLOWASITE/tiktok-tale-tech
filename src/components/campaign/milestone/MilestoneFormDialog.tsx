import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CampaignMilestone } from '@/types/campaign';

interface MilestoneFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone?: CampaignMilestone | null;
  onSave: (data: { title: string; description?: string; due_date: string }) => Promise<void>;
}

export function MilestoneFormDialog({ 
  open, 
  onOpenChange, 
  milestone, 
  onSave 
}: MilestoneFormDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (milestone) {
        setTitle(milestone.title);
        setDescription(milestone.description || '');
        setDueDate(milestone.due_date);
      } else {
        setTitle('');
        setDescription('');
        setDueDate('');
      }
    }
  }, [open, milestone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate) return;

    setIsSaving(true);
    try {
      await onSave({
        title,
        description: description || undefined,
        due_date: dueDate,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {milestone ? 'Chỉnh sửa milestone' : 'Thêm milestone mới'}
          </DialogTitle>
          <DialogDescription>
            {milestone 
              ? 'Cập nhật thông tin milestone' 
              : 'Thêm mốc quan trọng mới cho chiến dịch'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tiêu đề *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Ra mắt chiến dịch"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Ngày deadline *</Label>
            <Input
              id="due_date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết về milestone..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={!title || !dueDate || isSaving}>
              {isSaving ? 'Đang lưu...' : milestone ? 'Cập nhật' : 'Thêm'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
