import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send, AlertCircle } from 'lucide-react';
import { useScriptApproval } from '@/hooks/useScriptApproval';
import { Script } from '@/types/script';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ApprovalRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  script: Script;
  onSuccess?: () => void;
}

export function ApprovalRequestDialog({
  open,
  onOpenChange,
  script,
  onSuccess,
}: ApprovalRequestDialogProps) {
  const { requestApproval, submitting } = useScriptApproval(script.id);
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    const success = await requestApproval(script, notes);
    if (success) {
      setNotes('');
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Gửi yêu cầu phê duyệt
          </DialogTitle>
          <DialogDescription>
            Gửi kịch bản này để team review và phê duyệt
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Kịch bản sẽ được gửi đến admin/editor trong tổ chức để phê duyệt.
              Bạn không thể chỉnh sửa trong khi chờ phê duyệt.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú (tùy chọn)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Thêm ghi chú cho người phê duyệt..."
              rows={3}
            />
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="font-medium mb-1">{script.title || script.topic}</p>
            <p className="text-muted-foreground">
              {script.duration} giây • {script.video_type}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Gửi yêu cầu
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
