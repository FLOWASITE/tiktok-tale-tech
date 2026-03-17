import { useState } from "react";
import { Ban, ShieldCheck, Trash2, Download, CreditCard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/alert-dialog";

interface UserBulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkBan: () => void;
  onBulkUnban: () => void;
  onBulkDelete: () => void;
  onBulkChangePlan: (plan: string) => void;
  onBulkExport: () => void;
  isProcessing?: boolean;
}

export function UserBulkActionsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkBan,
  onBulkUnban,
  onBulkDelete,
  onBulkChangePlan,
  onBulkExport,
  isProcessing,
}: UserBulkActionsBarProps) {
  const [planChangeOpen, setPlanChangeOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("pro");

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border border-border rounded-xl p-3 shadow-xl animate-fade-in">
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="secondary" className="text-sm px-3 py-1">
          Đã chọn {selectedCount}/{totalCount}
        </Badge>

        <Button
          variant="ghost"
          size="sm"
          onClick={selectedCount === totalCount ? onClearSelection : onSelectAll}
          className="text-xs"
        >
          {selectedCount === totalCount ? "Bỏ chọn" : "Chọn tất cả"}
        </Button>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onBulkExport} disabled={isProcessing}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-amber-600 border-amber-600/30 hover:bg-amber-600/10"
            onClick={onBulkBan}
            disabled={isProcessing}
          >
            <Ban className="w-4 h-4 mr-1" />
            Ban
          </Button>

          <Button variant="outline" size="sm" onClick={onBulkUnban} disabled={isProcessing}>
            <ShieldCheck className="w-4 h-4 mr-1" />
            Unban
          </Button>

          {/* Change Plan */}
          <AlertDialog open={planChangeOpen} onOpenChange={setPlanChangeOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isProcessing}>
                <CreditCard className="w-4 h-4 mr-1" />
                Đổi Plan
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Đổi Plan hàng loạt</AlertDialogTitle>
                <AlertDialogDescription>
                  Chuyển {selectedCount} users sang plan mới. Subscription sẽ được gia hạn 30 ngày.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction onClick={() => onBulkChangePlan(selectedPlan)}>
                  Áp dụng
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Delete */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isProcessing}>
                <Trash2 className="w-4 h-4 mr-1" />
                Xóa ({selectedCount})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xác nhận xóa {selectedCount} users?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tất cả {selectedCount} users đã chọn sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onBulkDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Xóa vĩnh viễn
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="ghost" size="icon" onClick={onClearSelection} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
