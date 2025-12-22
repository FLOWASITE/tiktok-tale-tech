import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useContentAssignments } from '@/hooks/useContentAssignments';
import { Channel, CHANNELS } from '@/types/multichannel';
import { AssignmentPriority, ASSIGNMENT_PRIORITIES } from '@/types/assignment';
import { User } from 'lucide-react';

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  contentTitle: string;
  selectedChannels: Channel[];
  preselectedChannel?: Channel | null;
}

export const AssignmentDialog = ({
  open,
  onOpenChange,
  contentId,
  contentTitle,
  selectedChannels,
  preselectedChannel,
}: AssignmentDialogProps) => {
  const { currentOrganization } = useOrganizationContext();
  const { members } = useOrganizationMembers(currentOrganization?.id);
  const { createAssignment } = useContentAssignments();

  const [selectedChannel, setSelectedChannel] = useState<Channel | ''>(preselectedChannel || '');
  const [selectedMember, setSelectedMember] = useState('');
  const [priority, setPriority] = useState<AssignmentPriority>('normal');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update channel when preselectedChannel changes
  useEffect(() => {
    if (preselectedChannel) {
      setSelectedChannel(preselectedChannel);
    }
  }, [preselectedChannel]);

  const handleSubmit = async () => {
    if (!selectedChannel || !selectedMember) return;

    setIsSubmitting(true);
    try {
      await createAssignment(
        contentId,
        selectedChannel,
        selectedMember,
        priority,
        dueDate || undefined,
        notes || undefined
      );
      onOpenChange(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedChannel('');
    setSelectedMember('');
    setPriority('normal');
    setDueDate('');
    setNotes('');
  };

  const availableChannels = CHANNELS.filter(c => selectedChannels.includes(c.value as Channel));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Phân công nhiệm vụ</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            Nội dung: <span className="font-medium text-foreground">{contentTitle}</span>
          </div>

          <div className="space-y-2">
            <Label>Kênh</Label>
            <Select value={selectedChannel} onValueChange={(v) => setSelectedChannel(v as Channel)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn kênh" />
              </SelectTrigger>
              <SelectContent>
                {availableChannels.map((channel) => (
                  <SelectItem key={channel.value} value={channel.value}>
                    {channel.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Phân công cho</Label>
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn thành viên" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.user_id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={member.profile?.avatar_url || ''} />
                        <AvatarFallback>
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <span>{member.profile?.full_name || member.profile?.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Độ ưu tiên</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as AssignmentPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <span className={`px-2 py-0.5 rounded text-xs ${p.color}`}>
                      {p.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Hạn hoàn thành</Label>
            <Input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Ghi chú</Label>
            <Textarea
              placeholder="Thêm ghi chú cho nhiệm vụ..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedChannel || !selectedMember || isSubmitting}
          >
            {isSubmitting ? 'Đang xử lý...' : 'Phân công'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
