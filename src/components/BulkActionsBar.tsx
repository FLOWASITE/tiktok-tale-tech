import { Trash2, CheckCircle, X, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { ContentStatus, CONTENT_STATUSES } from '@/types/multichannel';

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkStatusChange: (status: ContentStatus) => void;
  isDeleting?: boolean;
  isUpdating?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  onBulkStatusChange,
  isDeleting,
  isUpdating,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
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
  );
}
