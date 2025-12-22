import { useState } from 'react';
import { Trash2, CheckCircle, X, CalendarClock, ThumbsUp, ThumbsDown, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ContentStatus, CONTENT_STATUSES } from '@/types/multichannel';
import { OrgRole, canApproveContent } from '@/types/organization';

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkStatusChange: (status: ContentStatus) => void;
  onBulkSchedule?: () => void;
  onBulkApprove?: (notes?: string) => Promise<void>;
  onBulkReject?: (reason: string) => Promise<void>;
  onBulkSubmitForReview?: (notes?: string) => Promise<void>;
  isDeleting?: boolean;
  isUpdating?: boolean;
  isApproving?: boolean;
  currentRole?: OrgRole | null;
  hasReviewableContent?: boolean;
  hasDraftContent?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  onBulkStatusChange,
  onBulkSchedule,
  onBulkApprove,
  onBulkReject,
  onBulkSubmitForReview,
  isDeleting,
  isUpdating,
  isApproving,
  currentRole,
  hasReviewableContent,
  hasDraftContent,
}: BulkActionsBarProps) {
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  if (selectedCount === 0) return null;

  const canApprove = canApproveContent(currentRole);

  const handleBulkApprove = async () => {
    if (onBulkApprove) {
      await onBulkApprove(notes || undefined);
      setApproveDialogOpen(false);
      setNotes('');
    }
  };

  const handleBulkReject = async () => {
    if (onBulkReject && rejectReason.trim()) {
      await onBulkReject(rejectReason);
      setRejectDialogOpen(false);
      setRejectReason('');
    }
  };

  const handleBulkSubmit = async () => {
    if (onBulkSubmitForReview) {
      await onBulkSubmitForReview(notes || undefined);
      setSubmitDialogOpen(false);
      setNotes('');
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 p-1.5 bg-primary/10 border border-primary/20 rounded-md text-xs">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
          {selectedCount}/{totalCount}
        </Badge>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={selectedCount === totalCount ? onClearSelection : onSelectAll}
          className="h-6 text-[10px] px-2"
        >
          {selectedCount === totalCount ? 'Bỏ chọn' : 'Chọn tất cả'}
        </Button>

        <div className="h-4 w-px bg-border" />

        {/* Bulk Submit for Review - for members with draft content */}
        {onBulkSubmitForReview && hasDraftContent && !canApprove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSubmitDialogOpen(true)}
            disabled={isApproving}
            className="h-6 text-[10px] px-2 text-blue-600 hover:text-blue-700"
          >
            <Send className="w-3 h-3 mr-1" />
            Gửi duyệt
          </Button>
        )}

        {/* Bulk Approve - only for admin/owner with reviewable content */}
        {canApprove && hasReviewableContent && onBulkApprove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setApproveDialogOpen(true)}
            disabled={isApproving}
            className="h-6 text-[10px] px-2 text-green-600 hover:text-green-700"
          >
            <ThumbsUp className="w-3 h-3 mr-1" />
            Duyệt
          </Button>
        )}

        {/* Bulk Reject - only for admin/owner with reviewable content */}
        {canApprove && hasReviewableContent && onBulkReject && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRejectDialogOpen(true)}
            disabled={isApproving}
            className="h-6 text-[10px] px-2 text-orange-600 hover:text-orange-700"
          >
            <ThumbsDown className="w-3 h-3 mr-1" />
            Từ chối
          </Button>
        )}

        {/* Bulk Schedule Button */}
        {onBulkSchedule && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBulkSchedule}
            className="h-6 text-[10px] px-2 text-primary hover:text-primary"
          >
            <CalendarClock className="w-3 h-3 mr-1" />
            Lên lịch
          </Button>
        )}

        {/* Change Status Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={isUpdating} className="h-6 text-[10px] px-2">
              <CheckCircle className="w-3 h-3 mr-1" />
              Trạng thái
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {CONTENT_STATUSES.map((status) => (
              <DropdownMenuItem
                key={status.value}
                onClick={() => onBulkStatusChange(status.value)}
              >
                {status.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Delete Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={isDeleting} className="h-6 text-[10px] px-2 text-destructive hover:text-destructive">
              <Trash2 className="w-3 h-3 mr-1" />
              Xóa
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc muốn xóa {selectedCount} nội dung đã chọn?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction
                onClick={onBulkDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClearSelection}
          className="h-5 w-5 ml-auto"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Bulk Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ThumbsUp className="w-5 h-5 text-green-500" />
              Duyệt hàng loạt
            </DialogTitle>
            <DialogDescription>
              Bạn sắp duyệt {selectedCount} nội dung đã chọn
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Ghi chú (tùy chọn)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleBulkApprove} 
              disabled={isApproving}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isApproving ? 'Đang duyệt...' : `Duyệt ${selectedCount} nội dung`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ThumbsDown className="w-5 h-5 text-orange-500" />
              Từ chối hàng loạt
            </DialogTitle>
            <DialogDescription>
              Bạn sắp từ chối {selectedCount} nội dung đã chọn
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Lý do từ chối (bắt buộc)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[100px]"
              required
            />
            {!rejectReason.trim() && (
              <p className="text-xs text-destructive">Vui lòng nhập lý do từ chối</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleBulkReject} 
              disabled={isApproving || !rejectReason.trim()}
              variant="destructive"
            >
              {isApproving ? 'Đang xử lý...' : `Từ chối ${selectedCount} nội dung`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Submit for Review Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-500" />
              Gửi duyệt hàng loạt
            </DialogTitle>
            <DialogDescription>
              Bạn sắp gửi {selectedCount} nội dung để duyệt
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Ghi chú cho người duyệt (tùy chọn)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleBulkSubmit} 
              disabled={isApproving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isApproving ? 'Đang gửi...' : `Gửi duyệt ${selectedCount} nội dung`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
