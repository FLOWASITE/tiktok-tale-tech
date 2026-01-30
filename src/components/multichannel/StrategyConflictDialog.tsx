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
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { ContentRole } from '@/types/multichannel';
import { CONTENT_ROLES } from '@/types/coreContent';
import { StrategyConflict } from '@/hooks/useStrategyValidation';

interface StrategyConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: StrategyConflict[];
  suggestedRole: ContentRole | null;
  onConfirm: () => void;
  onChangeRole: (role: ContentRole) => void;
}

export function StrategyConflictDialog({
  open,
  onOpenChange,
  conflicts,
  suggestedRole,
  onConfirm,
  onChangeRole,
}: StrategyConflictDialogProps) {
  const hasErrors = conflicts.some(c => c.severity === 'error');
  const suggestedRoleLabel = suggestedRole 
    ? CONTENT_ROLES.find(r => r.value === suggestedRole)?.label || suggestedRole
    : null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            Chiến lược có thể không tối ưu
          </AlertDialogTitle>
          <AlertDialogDescription>
            Phát hiện {conflicts.length} vấn đề trong chiến lược content:
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <ScrollArea className="max-h-[200px] -mx-6 px-6">
          <div className="space-y-2">
            {conflicts.map((conflict, i) => (
              <div 
                key={i} 
                className={`p-3 rounded-lg ${
                  conflict.severity === 'error' 
                    ? 'bg-destructive/10 border border-destructive/30' 
                    : 'bg-amber-500/10 border border-amber-500/30'
                }`}
              >
                <p className={`text-sm font-medium ${
                  conflict.severity === 'error' 
                    ? 'text-destructive' 
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {conflict.message}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  → {conflict.recommendation}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>

        {suggestedRole && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30">
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm flex-1">
              Gợi ý: Đổi sang role <strong>{suggestedRoleLabel}</strong>
            </span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                onChangeRole(suggestedRole);
                onOpenChange(false);
              }}
              className="shrink-0"
            >
              Áp dụng
            </Button>
          </div>
        )}
        
        <AlertDialogFooter>
          <AlertDialogCancel>Quay lại sửa</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className={hasErrors 
              ? "bg-destructive hover:bg-destructive/90" 
              : "bg-amber-500 hover:bg-amber-600"
            }
          >
            {hasErrors ? 'Vẫn tiếp tục (không khuyến nghị)' : 'Vẫn tiếp tục'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
