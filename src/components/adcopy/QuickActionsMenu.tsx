import { useState, memo } from 'react';
import { 
  MoreHorizontal, 
  Eye, 
  Copy, 
  Trash2, 
  ExternalLink, 
  RefreshCw,
  FileEdit,
  Send,
  CheckCircle,
  Clock,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type AdStatus = 'draft' | 'review' | 'approved' | 'published';

interface QuickActionsMenuProps {
  currentStatus: AdStatus | string | null;
  onView: () => void;
  onQuickPreview: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onStatusChange?: (status: AdStatus) => void;
  onAddToSequence?: () => void;
}

const STATUS_OPTIONS: { value: AdStatus; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'draft', label: 'Nháp', icon: FileEdit, color: 'text-muted-foreground' },
  { value: 'review', label: 'Đang duyệt', icon: Clock, color: 'text-yellow-500' },
  { value: 'approved', label: 'Đã duyệt', icon: CheckCircle, color: 'text-blue-500' },
  { value: 'published', label: 'Đã xuất bản', icon: Send, color: 'text-green-500' },
];

export const QuickActionsMenu = memo(function QuickActionsMenu({
  currentStatus,
  onView,
  onQuickPreview,
  onDuplicate,
  onDelete,
  onStatusChange,
  onAddToSequence,
}: QuickActionsMenuProps) {
  const [open, setOpen] = useState(false);

  const handleStatusChange = (status: AdStatus) => {
    onStatusChange?.(status);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 hover:bg-muted"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-48 bg-popover border border-border shadow-lg z-50"
      >
        {/* View Actions */}
        <DropdownMenuItem onClick={onQuickPreview} className="gap-2 cursor-pointer">
          <ExternalLink className="h-4 w-4" />
          Xem nhanh
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onView} className="gap-2 cursor-pointer">
          <Eye className="h-4 w-4" />
          Xem chi tiết
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Status Change */}
        {onStatusChange && (
          <>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Đổi trạng thái
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-popover border border-border shadow-lg">
                {STATUS_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isCurrent = currentStatus === option.value;
                  
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => handleStatusChange(option.value)}
                      disabled={isCurrent}
                      className={cn(
                        "gap-2 cursor-pointer",
                        isCurrent && "opacity-50"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", option.color)} />
                      {option.label}
                      {isCurrent && " ✓"}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Other Actions */}
        <DropdownMenuItem onClick={onDuplicate} className="gap-2 cursor-pointer">
          <Copy className="h-4 w-4" />
          Nhân bản
        </DropdownMenuItem>

        {onAddToSequence && (
          <DropdownMenuItem onClick={onAddToSequence} className="gap-2 cursor-pointer">
            <Layers className="h-4 w-4" />
            Thêm vào Sequence
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem 
          onClick={onDelete} 
          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Xóa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
