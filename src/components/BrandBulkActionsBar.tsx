import { Trash2, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface BrandBulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkExport: () => void;
  isDeleting?: boolean;
}

export function BrandBulkActionsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  onBulkExport,
  isDeleting,
}: BrandBulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border border-border rounded-lg p-3 shadow-xl animate-fade-in">
      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="text-sm px-3 py-1">
          Đã chọn {selectedCount}/{totalCount}
        </Badge>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={selectedCount === totalCount ? onClearSelection : onSelectAll}
          className="text-xs"
        >
          {selectedCount === totalCount ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
        </Button>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-2">
          {/* Export Button */}
          <Button variant="outline" size="sm" onClick={onBulkExport}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>

          {/* Delete Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeleting}>
                <Trash2 className="w-4 h-4 mr-1" />
                Xóa ({selectedCount})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                <AlertDialogDescription>
                  Bạn có chắc muốn xóa {selectedCount} brand template đã chọn? Hành động này không thể hoàn tác.
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

          {/* Close Selection Mode */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearSelection}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
