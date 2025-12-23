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
import { AlertTriangle, Lock, ShieldCheck, Ban } from 'lucide-react';
import { IndustryMemory } from '@/hooks/useIndustryMemory';

interface UnlinkIndustryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  industryMemory: IndustryMemory | null;
}

/**
 * Confirmation dialog when user wants to unlink Industry Memory from Brand
 */
export function UnlinkIndustryDialog({
  open,
  onOpenChange,
  onConfirm,
  industryMemory,
}: UnlinkIndustryDialogProps) {
  const forbiddenCount = industryMemory?.forbidden_terms?.length || 0;
  const complianceCount = industryMemory?.compliance_rules?.length || 0;
  const claimCount = industryMemory?.claim_restrictions?.length || 0;

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <AlertDialogTitle>Xác nhận bỏ liên kết Industry Memory?</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Brand này sẽ <span className="font-medium text-foreground">KHÔNG</span> còn được bảo vệ bởi:
              </p>
              
              <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
                {forbiddenCount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Lock className="h-4 w-4 text-destructive shrink-0" />
                    <span><span className="font-medium">{forbiddenCount}</span> từ cấm ngành</span>
                  </div>
                )}
                {complianceCount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span><span className="font-medium">{complianceCount}</span> compliance rules</span>
                  </div>
                )}
                {claimCount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Ban className="h-4 w-4 text-amber-500 shrink-0" />
                    <span><span className="font-medium">{claimCount}</span> claim restrictions</span>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
                  Nội dung tạo ra có thể vi phạm quy định ngành.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Xác nhận bỏ liên kết
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
