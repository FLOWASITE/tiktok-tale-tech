// ============================================
// Regulation Propagation Panel
// Manage and review regulatory change propagation
// Living System: Admin Review for Document-Parsed Regulations
// ============================================

import { useState } from "react";
import {
  useRegulationPropagation,
  usePropagationStats,
  usePendingReviewPropagations,
} from "@/hooks/useRegulationPropagation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  FileSearch,
  ChevronDown,
  ExternalLink,
  Sparkles,
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
                  Pack: {propagation.affected_pack_id ? `${propagation.affected_pack_id.slice(0, 8)}...` : 'N/A'}
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

      <Tabs defaultValue="all" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <FileText className="h-4 w-4" />
              Tất cả
            </TabsTrigger>
            <TabsTrigger value="pending-review" className="gap-2">
              <FileSearch className="h-4 w-4" />
              Chờ duyệt
              <PendingReviewCount />
            </TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Làm mới
          </Button>
        </div>

        <TabsContent value="all">
          {/* Original List */}
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
        </TabsContent>

        <TabsContent value="pending-review">
          <PendingReviewList
            onView={handleView}
            onApply={handleApply}
            onReject={handleReject}
            isApplying={isApplying}
          />
        </TabsContent>
      </Tabs>

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

// ============================================
// Pending Review Components (Living System)
// ============================================

function PendingReviewCount() {
  const { data: items = [] } = usePendingReviewPropagations();
  if (items.length === 0) return null;
  return (
    <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
      {items.length}
    </Badge>
  );
}

interface PendingReviewListProps {
  onView: (p: RegulationPropagation) => void;
  onApply: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  isApplying: boolean;
}

function PendingReviewList({ onView, onApply, onReject, isApplying }: PendingReviewListProps) {
  const { data: items = [], isLoading, refetch } = usePendingReviewPropagations();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <p className="font-medium">Không có văn bản nào chờ duyệt</p>
          <p className="text-sm text-muted-foreground mt-1">
            Tất cả văn bản đã được xem xét
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-yellow-500" />
        <span>
          Các văn bản đã được AI parse và extract - cần admin xác nhận trước khi áp dụng
        </span>
      </div>

      {items.map((item) => (
        <PendingReviewCard
          key={item.id}
          item={item}
          isExpanded={expandedId === item.id}
          onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
          onView={onView}
          onApply={onApply}
          onReject={onReject}
          isApplying={isApplying}
        />
      ))}
    </div>
  );
}

interface PendingReviewCardProps {
  item: RegulationPropagation;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onView: (p: RegulationPropagation) => void;
  onApply: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  isApplying: boolean;
}

function PendingReviewCard({
  item,
  isExpanded,
  onToggleExpand,
  onView,
  onApply,
  onReject,
  isApplying,
}: PendingReviewCardProps) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const impactAnalysis = (item.impact_analysis || {}) as Record<string, unknown>;
  const extractedData = (impactAnalysis.extracted_data || {}) as Record<string, unknown>;
  const hasFullText = impactAnalysis.has_full_text as boolean | undefined;
  const aiConfidence = (item as { ai_confidence_score?: number | null }).ai_confidence_score;

  const handleApprove = async () => {
    await onApply(item.id);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    setIsRejecting(true);
    try {
      await onReject(item.id, rejectReason);
      setShowRejectInput(false);
      setRejectReason("");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-yellow-500">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium">{item.change_summary || "Văn bản mới"}</h4>
              {hasFullText && (
                <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                  <FileText className="h-3 w-3 mr-1" />
                  Đã parse
                </Badge>
              )}
              {aiConfidence != null && (
                <Badge 
                  variant="secondary" 
                  className={aiConfidence >= 0.8 ? "bg-green-100" : aiConfidence >= 0.6 ? "bg-yellow-100" : "bg-red-100"}
                >
                  AI: {Math.round(aiConfidence * 100)}%
                </Badge>
              )}
            </div>

            {extractedData.document_number && (
              <p className="text-sm text-muted-foreground mt-1">
                Số hiệu: {String(extractedData.document_number)}
                {extractedData.effective_date && ` • Hiệu lực: ${String(extractedData.effective_date)}`}
              </p>
            )}

            {extractedData.summary && (
              <p className="text-sm mt-2 line-clamp-2">{String(extractedData.summary)}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => onView(item)}>
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Expandable Details */}
        <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="mt-2 w-full justify-between">
              <span className="text-xs">
                {isExpanded ? "Ẩn chi tiết" : "Xem chi tiết AI Extract"}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            {/* Key Changes */}
            {Array.isArray(extractedData.key_changes) && extractedData.key_changes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Thay đổi chính:</p>
                <ul className="text-sm space-y-1">
                  {(extractedData.key_changes as string[]).slice(0, 5).map((change: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <ArrowRight className="h-3 w-3 mt-1 text-blue-500 shrink-0" />
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Claim Restrictions */}
            {Array.isArray(extractedData.claim_restrictions) && extractedData.claim_restrictions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  <AlertTriangle className="h-3 w-3 inline mr-1 text-orange-500" />
                  Claims bị hạn chế/cấm:
                </p>
                <ul className="text-sm space-y-1">
                  {(extractedData.claim_restrictions as string[]).map((claim: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-orange-700 bg-orange-50 p-2 rounded">
                      <XCircle className="h-3 w-3 mt-1 shrink-0" />
                      <span>{claim}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Affected Industries */}
            {Array.isArray(extractedData.affected_industries) && extractedData.affected_industries.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Ngành ảnh hưởng:</span>
                {(extractedData.affected_industries as string[]).map((ind: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {ind}
                  </Badge>
                ))}
              </div>
            )}

            {/* Document Link */}
            {impactAnalysis.document_url && (
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-xs"
                onClick={() => window.open(impactAnalysis.document_url as string, "_blank")}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Xem văn bản gốc
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
          {showRejectInput ? (
            <div className="flex-1 flex items-center gap-2">
              <Textarea
                placeholder="Lý do từ chối..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="h-10 min-h-0 text-sm"
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={handleReject}
                disabled={isRejecting}
              >
                {isRejecting ? "..." : "Xác nhận"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRejectInput(false)}
              >
                Hủy
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={handleApprove}
                disabled={isApplying}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Duyệt & Áp dụng
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRejectInput(true)}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Từ chối
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
