import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Play, Pause, Trash2, X, Loader2 } from 'lucide-react';

interface Props {
  selectedCount: number;
  hasRunning: boolean;
  hasPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
  onClear: () => void;
  isProcessing?: boolean;
}

export function CampaignBulkActionsBar({
  selectedCount,
  hasRunning,
  hasPaused,
  onPause,
  onResume,
  onDelete,
  onClear,
  isProcessing,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-2xl bg-foreground text-background shadow-2xl ring-1 ring-foreground/10 backdrop-blur animate-fade-in">
        <span className="text-xs font-medium pl-1.5">Đã chọn {selectedCount}</span>
        <span className="w-px h-5 bg-background/20" />

        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 text-xs hover:bg-background/10 hover:text-background disabled:opacity-40"
          onClick={onResume}
          disabled={!hasPaused || isProcessing}
        >
          <Play className="w-3.5 h-3.5" /> Chạy tiếp
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 text-xs hover:bg-background/10 hover:text-background disabled:opacity-40"
          onClick={onPause}
          disabled={!hasRunning || isProcessing}
        >
          <Pause className="w-3.5 h-3.5" /> Tạm dừng
        </Button>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 text-xs text-red-300 hover:bg-red-500/15 hover:text-red-200"
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Xoá
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xoá {selectedCount} campaign?</AlertDialogTitle>
              <AlertDialogDescription>
                Hành động này không thể hoàn tác. Pipeline liên quan sẽ được gỡ liên kết, không bị xoá.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Huỷ</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  setConfirmOpen(false);
                  onDelete();
                }}
              >
                Xoá vĩnh viễn
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 hover:bg-background/10 hover:text-background"
          onClick={onClear}
          title="Bỏ chọn"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
