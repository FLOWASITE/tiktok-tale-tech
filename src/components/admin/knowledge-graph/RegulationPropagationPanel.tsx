// ============================================
// Regulation Propagation Panel
// Manage and review regulatory change propagation
// ============================================

import { useState } from "react";
import {
  useRegulationPropagation,
  usePropagationStats,
} from "@/hooks/useRegulationPropagation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Brain,
  Play,
  Eye,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  FileText,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import type {
  RegulationPropagation,
  PropagationStatus,
  PropagationPriority,
  AffectedRule,
} from "@/types/knowledgeGraph";

// ============================================
// Constants
// ============================================

const STATUS_CONFIG: Record<PropagationStatus, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  label: string;
}> = {
  pending: { icon: Clock, color: "text-yellow-600", bgColor: "bg-yellow-100", label: "Chờ xử lý" },
  analyzing: { icon: Brain, color: "text-blue-600", bgColor: "bg-blue-100", label: "Đang phân tích" },
  ready: { icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-100", label: "Sẵn sàng" },
  applied: { icon: CheckCircle2, color: "text-green-700", bgColor: "bg-green-200", label: "Đã áp dụng" },
  reviewed: { icon: Eye, color: "text-gray-600", bgColor: "bg-gray-100", label: "Đã xem xét" },
  rejected: { icon: XCircle, color: "text-red-600", bgColor: "bg-red-100", label: "Từ chối" },
};

const PRIORITY_CONFIG: Record<PropagationPriority, {
  color: string;
  label: string;
}> = {
  low: { color: "bg-gray-100 text-gray-700", label: "Thấp" },
  medium: { color: "bg-blue-100 text-blue-700", label: "Trung bình" },
  high: { color: "bg-orange-100 text-orange-700", label: "Cao" },
  critical: { color: "bg-red-100 text-red-700", label: "Khẩn cấp" },
};

// ============================================
// Stats Cards
// ============================================

function PropagationStatsCards() {
  const { data: stats, isLoading } = usePropagationStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: "Tổng", value: stats.total, icon: FileText, color: "text-primary" },
    { label: "Chờ xử lý", value: stats.pending + stats.analyzing, icon: Clock, color: "text-yellow-600" },
    { label: "Sẵn sàng", value: stats.ready, icon: CheckCircle2, color: "text-green-600" },
    { label: "Đã áp dụng", value: stats.applied, icon: TrendingUp, color: "text-blue-600" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================
// Propagation Item
// ============================================

interface PropagationItemProps {
  propagation: RegulationPropagation;
  onView: (p: RegulationPropagation) => void;
  onAnalyze: (id: string) => Promise<void>;
  onApply: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  isAnalyzing: boolean;
  isApplying: boolean;
}

function PropagationItem({
  propagation,
  onView,
  onAnalyze,
  onApply,
  onReject,
  isAnalyzing,
  isApplying,
}: PropagationItemProps) {
  const statusConfig = STATUS_CONFIG[propagation.propagation_status];
  const priorityConfig = PRIORITY_CONFIG[propagation.priority];
  const StatusIcon = statusConfig.icon;

  const canAnalyze = propagation.propagation_status === "pending";
  const canApply = propagation.propagation_status === "ready";
  const canReject = ["pending", "analyzing", "ready"].includes(propagation.propagation_status);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Status Icon */}
          <div className={`p-2 rounded-lg ${statusConfig.bgColor}`}>
            <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-medium text-sm">
                  {propagation.change_summary || `${propagation.change_type} change`}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pack: {propagation.affected_pack_id.slice(0, 8)}...
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={priorityConfig.color} variant="secondary">
                  {priorityConfig.label}
                </Badge>
                <Badge className={`${statusConfig.bgColor} ${statusConfig.color}`} variant="secondary">
                  {statusConfig.label}
                </Badge>
              </div>
            </div>

            {/* Impact Analysis Preview */}
            {propagation.impact_analysis?.summary && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                {propagation.impact_analysis.summary}
              </p>
            )}

            {/* Affected Rules Count */}
            {propagation.affected_rules?.length > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <AlertCircle className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {propagation.affected_rules.length} quy tắc bị ảnh hưởng
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <Button variant="ghost" size="sm" onClick={() => onView(propagation)}>
                <Eye className="h-4 w-4 mr-1" />
                Chi tiết
              </Button>
              {canAnalyze && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAnalyze(propagation.id)}
                  disabled={isAnalyzing}
                >
                  <Brain className="h-4 w-4 mr-1" />
                  Phân tích
                </Button>
              )}
              {canApply && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onApply(propagation.id)}
                  disabled={isApplying}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Áp dụng
                </Button>
              )}
            </div>
          </div>

          {/* Timestamp */}
          <div className="text-xs text-muted-foreground shrink-0">
            {new Date(propagation.created_at).toLocaleDateString("vi-VN")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Detail Dialog
// ============================================

interface PropagationDetailDialogProps {
  propagation: RegulationPropagation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  isApplying: boolean;
  isRejecting: boolean;
}

function PropagationDetailDialog({
  propagation,
  open,
  onOpenChange,
  onApply,
  onReject,
  isApplying,
  isRejecting,
}: PropagationDetailDialogProps) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (!propagation) return null;

  const statusConfig = STATUS_CONFIG[propagation.propagation_status];
  const StatusIcon = statusConfig.icon;
  const canApply = propagation.propagation_status === "ready";
  const canReject = ["pending", "analyzing", "ready"].includes(propagation.propagation_status);

  const handleReject = async () => {
    await onReject(propagation.id, rejectReason);
    setRejectReason("");
    setShowRejectForm(false);
    onOpenChange(false);
  };

  const handleApply = async () => {
    await onApply(propagation.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${statusConfig.bgColor}`}>
              <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
            </div>
            <div>
              <DialogTitle>{propagation.change_summary || "Chi tiết thay đổi"}</DialogTitle>
              <DialogDescription>
                {propagation.change_type} • {new Date(propagation.created_at).toLocaleString("vi-VN")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Impact Analysis */}
            {propagation.impact_analysis && (
              <div>
                <h4 className="font-medium text-sm mb-2">Phân tích tác động</h4>
                <Card>
                  <CardContent className="p-3 space-y-2">
                    {propagation.impact_analysis.severity && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Mức độ:</span>
                        <Badge variant={
                          propagation.impact_analysis.severity === "critical" ? "destructive" :
                          propagation.impact_analysis.severity === "high" ? "default" : "secondary"
                        }>
                          {propagation.impact_analysis.severity}
                        </Badge>
                      </div>
                    )}
                    {propagation.impact_analysis.summary && (
                      <p className="text-sm">{propagation.impact_analysis.summary}</p>
                    )}
                    {propagation.impact_analysis.recommended_actions?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Đề xuất:</p>
                        <ul className="text-sm list-disc list-inside space-y-1">
                          {propagation.impact_analysis.recommended_actions.map((action, i) => (
                            <li key={i}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Affected Rules */}
            {propagation.affected_rules?.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">
                  Quy tắc bị ảnh hưởng ({propagation.affected_rules.length})
                </h4>
                <div className="space-y-2">
                  {propagation.affected_rules.map((rule, i) => (
                    <AffectedRuleCard key={i} rule={rule} />
                  ))}
                </div>
              </div>
            )}

            {/* Review Notes */}
            {propagation.review_notes && (
              <div>
                <h4 className="font-medium text-sm mb-2">Ghi chú</h4>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  {propagation.review_notes}
                </p>
              </div>
            )}

            {/* Reject Form */}
            {showRejectForm && (
              <div>
                <h4 className="font-medium text-sm mb-2">Lý do từ chối</h4>
                <Textarea
                  placeholder="Nhập lý do từ chối..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          {showRejectForm ? (
            <>
              <Button variant="ghost" onClick={() => setShowRejectForm(false)}>
                Hủy
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isRejecting}
              >
                {isRejecting ? "Đang xử lý..." : "Xác nhận từ chối"}
              </Button>
            </>
          ) : (
            <>
              {canReject && (
                <Button variant="outline" onClick={() => setShowRejectForm(true)}>
                  <XCircle className="h-4 w-4 mr-1" />
                  Từ chối
                </Button>
              )}
              {canApply && (
                <Button onClick={handleApply} disabled={isApplying}>
                  <Play className="h-4 w-4 mr-1" />
                  {isApplying ? "Đang áp dụng..." : "Áp dụng thay đổi"}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AffectedRuleCard({ rule }: { rule: AffectedRule }) {
  const impactColors = {
    add: "border-green-200 bg-green-50",
    modify: "border-yellow-200 bg-yellow-50",
    remove: "border-red-200 bg-red-50",
  };

  return (
    <Card className={`border ${impactColors[rule.impact_type]}`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <Badge variant="outline" className="shrink-0">
            {rule.impact_type === "add" ? "Thêm" : rule.impact_type === "modify" ? "Sửa" : "Xóa"}
          </Badge>
          <div className="flex-1 min-w-0">
            <p className="text-sm">{rule.rule_text}</p>
            {rule.suggested_change && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <ArrowRight className="h-3 w-3" />
                <span>{rule.suggested_change}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Main Component
// ============================================

interface RegulationPropagationPanelProps {
  globalPackId?: string;
}

export function RegulationPropagationPanel({ globalPackId }: RegulationPropagationPanelProps) {
  const [selectedPropagation, setSelectedPropagation] = useState<RegulationPropagation | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const {
    propagations,
    isLoading,
    apply,
    reject,
    analyze,
    isApplying,
    isRejecting,
    isAnalyzing,
    refetch,
  } = useRegulationPropagation(globalPackId);

  const handleView = (p: RegulationPropagation) => {
    setSelectedPropagation(p);
    setDetailOpen(true);
  };

  const handleAnalyze = async (id: string) => {
    try {
      await analyze(id);
      toast.success("Đã hoàn thành phân tích");
    } catch (error) {
      toast.error("Lỗi khi phân tích");
    }
  };

  const handleApply = async (id: string) => {
    try {
      await apply(id);
      toast.success("Đã áp dụng thay đổi");
    } catch (error) {
      toast.error("Lỗi khi áp dụng thay đổi");
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      await reject({ propagationId: id, reason });
      toast.success("Đã từ chối thay đổi");
    } catch (error) {
      toast.error("Lỗi khi từ chối");
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <PropagationStatsCards />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Hàng đợi Propagation</h3>
          <p className="text-sm text-muted-foreground">
            Xem xét và áp dụng các thay đổi quy định
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Làm mới
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : propagations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Không có thay đổi nào cần xử lý</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {propagations.map((p) => (
            <PropagationItem
              key={p.id}
              propagation={p}
              onView={handleView}
              onAnalyze={handleAnalyze}
              onApply={handleApply}
              onReject={handleReject}
              isAnalyzing={isAnalyzing}
              isApplying={isApplying}
            />
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <PropagationDetailDialog
        propagation={selectedPropagation}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onApply={handleApply}
        onReject={handleReject}
        isApplying={isApplying}
        isRejecting={isRejecting}
      />
    </div>
  );
}
