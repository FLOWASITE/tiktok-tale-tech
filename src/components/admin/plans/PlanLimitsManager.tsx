import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Save, Loader2, Undo2, Package, FileText, Image, Layers,
  Palette, Bot, DollarSign, Plus, X, Users, TrendingUp, Infinity,
  Pencil, Eye, Crown, Check, SaveAll, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface PlanLimit {
  id: string;
  plan_type: string;
  monthly_scripts: number;
  monthly_carousels: number;
  monthly_multichannel: number;
  monthly_images: number;
  monthly_ai_edits: number;
  monthly_brands: number;
  price_monthly: number;
  price_yearly: number;
  features: string[];
}

const PLAN_ORDER = ["free", "starter", "pro", "enterprise"];

const PLAN_COLORS: Record<string, { badge: string; header: string; border: string; dot: string }> = {
  free: {
    badge: "bg-muted text-muted-foreground",
    header: "from-muted/50 to-muted/30",
    border: "border-muted-foreground/20",
    dot: "bg-muted-foreground",
  },
  starter: {
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    header: "from-blue-500/10 to-blue-600/5",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
  },
  pro: {
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    header: "from-purple-500/10 to-purple-600/5",
    border: "border-purple-500/30",
    dot: "bg-purple-500",
  },
  enterprise: {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    header: "from-amber-500/10 to-amber-600/5",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
  },
};

const FIELD_ICONS: Record<string, React.ReactNode> = {
  monthly_brands: <Package className="h-3.5 w-3.5" />,
  monthly_scripts: <FileText className="h-3.5 w-3.5" />,
  monthly_carousels: <Layers className="h-3.5 w-3.5" />,
  monthly_multichannel: <Palette className="h-3.5 w-3.5" />,
  monthly_images: <Image className="h-3.5 w-3.5" />,
  monthly_ai_edits: <Bot className="h-3.5 w-3.5" />,
  price_monthly: <DollarSign className="h-3.5 w-3.5" />,
  price_yearly: <DollarSign className="h-3.5 w-3.5" />,
};

const FIELD_LABELS: Record<string, string> = {
  monthly_brands: "Brands",
  monthly_scripts: "Scripts",
  monthly_carousels: "Carousels",
  monthly_multichannel: "Đa kênh",
  monthly_images: "Ảnh AI",
  monthly_ai_edits: "AI Edits",
  price_monthly: "Giá tháng",
  price_yearly: "Giá năm",
};

const FIELD_TOOLTIPS: Record<string, string> = {
  monthly_brands: "Số brand tối đa. -1 = không giới hạn",
  monthly_scripts: "Số script/tháng. -1 = không giới hạn",
  monthly_carousels: "Số carousel/tháng. -1 = không giới hạn",
  monthly_multichannel: "Số nội dung đa kênh/tháng. -1 = không giới hạn",
  monthly_images: "Số ảnh AI/tháng. -1 = không giới hạn",
  monthly_ai_edits: "Số AI edits/tháng. -1 = không giới hạn",
  price_monthly: "Giá gói tháng (VNĐ)",
  price_yearly: "Giá gói năm (VNĐ)",
};

const limitFields = ["monthly_brands", "monthly_scripts", "monthly_carousels", "monthly_multichannel", "monthly_images", "monthly_ai_edits"];
const priceFields = ["price_monthly", "price_yearly"];

const formatVND = (v: number) => v === 0 ? "Miễn phí" : v.toLocaleString("vi-VN") + "₫";
const formatLimit = (v: number) => v === -1 ? "∞" : String(v);

export default function PlanLimitsManager() {
  const queryClient = useQueryClient();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState<Record<string, Partial<PlanLimit>>>({});
  const [featureEdits, setFeatureEdits] = useState<Record<string, { added: string[]; removed: string[] }>>({});
  const [newFeatureInputs, setNewFeatureInputs] = useState<Record<string, string>>({});
  const [confirmPlan, setConfirmPlan] = useState<PlanLimit | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);

  const plansQuery = useQuery({
    queryKey: ["admin_plan_limits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plan_limits").select("*").order("price_monthly", { ascending: true });
      if (error) throw error;
      return (data as PlanLimit[]).sort((a, b) => PLAN_ORDER.indexOf(a.plan_type) - PLAN_ORDER.indexOf(b.plan_type));
    },
  });

  const subCountsQuery = useQuery({
    queryKey: ["admin_sub_counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subscriptions").select("plan_type, status");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((s: any) => {
        if (s.status === "active") counts[s.plan_type] = (counts[s.plan_type] || 0) + 1;
      });
      return counts;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PlanLimit> }) => {
      const { plan_type, ...safeUpdates } = updates as any;
      const { error } = await supabase.from("plan_limits").update(safeUpdates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_plan_limits"] });
    },
    onError: (err) => toast.error("Lỗi: " + err.message),
  });

  const handleFieldChange = (planId: string, field: string, value: string) => {
    const numVal = Number(value);
    if (isNaN(numVal)) return;
    setEditData((prev) => ({ ...prev, [planId]: { ...prev[planId], [field]: numVal } }));
  };

  const getVal = (plan: PlanLimit, field: keyof PlanLimit) => editData[plan.id]?.[field] ?? plan[field];

  const isFieldChanged = (plan: PlanLimit, field: string) => {
    const edited = editData[plan.id]?.[field as keyof PlanLimit];
    return edited !== undefined && edited !== plan[field as keyof PlanLimit];
  };

  const getEffectiveFeatures = (plan: PlanLimit): string[] => {
    const edits = featureEdits[plan.id];
    if (!edits) return plan.features || [];
    const base = (plan.features || []).filter((f) => !edits.removed.includes(f));
    return [...base, ...edits.added];
  };

  const hasFeaturesChanged = (planId: string) => {
    const e = featureEdits[planId];
    return e && (e.added.length > 0 || e.removed.length > 0);
  };

  const hasChanges = (planId: string) =>
    (editData[planId] && Object.keys(editData[planId]).length > 0) || hasFeaturesChanged(planId);

  const plans = plansQuery.data || [];

  const hasAnyChanges = () => plans.some((p) => hasChanges(p.id));

  const isDuplicateFeature = (feature: string, planId?: string) => {
    if (planId) {
      return getEffectiveFeatures(plans.find((p) => p.id === planId)!).includes(feature);
    }
    return plans.every((p) => getEffectiveFeatures(p).includes(feature));
  };

  const handleAddFeature = (planId: string) => {
    const val = (newFeatureInputs[planId] || "").trim();
    if (!val) return;
    const plan = plans.find((p) => p.id === planId);
    if (plan && getEffectiveFeatures(plan).includes(val)) {
      toast.warning(`Feature "${val}" đã tồn tại trong gói này`);
      return;
    }
    setFeatureEdits((prev) => ({
      ...prev,
      [planId]: { added: [...(prev[planId]?.added || []), val], removed: prev[planId]?.removed || [] },
    }));
    setNewFeatureInputs((prev) => ({ ...prev, [planId]: "" }));
  };

  const handleAddGlobalFeature = (val: string) => {
    if (!val.trim()) return;
    const trimmed = val.trim();
    if (plans.every((p) => getEffectiveFeatures(p).includes(trimmed))) {
      toast.warning(`Feature "${trimmed}" đã tồn tại trong tất cả các gói`);
      return;
    }
    plans.forEach((p) => {
      if (!getEffectiveFeatures(p).includes(trimmed)) {
        setFeatureEdits((prev) => ({
          ...prev,
          [p.id]: { added: [...(prev[p.id]?.added || []), trimmed], removed: prev[p.id]?.removed || [] },
        }));
      }
    });
    setNewFeatureInputs((prev) => ({ ...prev, _global: "" }));
  };

  const handleRemoveFeature = (planId: string, feature: string, plan: PlanLimit) => {
    const isOriginal = (plan.features || []).includes(feature);
    if (isOriginal) {
      setFeatureEdits((prev) => ({
        ...prev,
        [planId]: { added: prev[planId]?.added || [], removed: [...(prev[planId]?.removed || []), feature] },
      }));
    } else {
      setFeatureEdits((prev) => ({
        ...prev,
        [planId]: { added: (prev[planId]?.added || []).filter((f) => f !== feature), removed: prev[planId]?.removed || [] },
      }));
    }
  };

  const handleUndoAll = () => {
    setEditData({});
    setFeatureEdits({});
    setNewFeatureInputs({});
  };

  const handleExitEditMode = () => {
    if (hasAnyChanges()) {
      setShowExitConfirm(true);
    } else {
      setIsEditMode(false);
    }
  };

  const handleSaveAll = async () => {
    const plansWithChanges = plans.filter((p) => hasChanges(p.id));
    if (plansWithChanges.length === 0) return;

    setIsSavingAll(true);
    let successCount = 0;
    let errorCount = 0;

    for (const plan of plansWithChanges) {
      try {
        const updates: any = { ...(editData[plan.id] || {}) };
        if (hasFeaturesChanged(plan.id)) updates.features = getEffectiveFeatures(plan);
        await saveMutation.mutateAsync({ id: plan.id, updates });
        // Clear saved plan's edits
        setEditData((prev) => { const n = { ...prev }; delete n[plan.id]; return n; });
        setFeatureEdits((prev) => { const n = { ...prev }; delete n[plan.id]; return n; });
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setIsSavingAll(false);
    if (errorCount === 0) {
      toast.success(`Đã lưu ${successCount} gói thành công`);
    } else {
      toast.error(`Lưu xong: ${successCount} thành công, ${errorCount} lỗi`);
    }
  };

  const handleConfirmSave = () => {
    if (!confirmPlan) return;
    const plan = confirmPlan;
    const updates: any = { ...(editData[plan.id] || {}) };
    if (hasFeaturesChanged(plan.id)) updates.features = getEffectiveFeatures(plan);
    saveMutation.mutate({ id: plan.id, updates }, {
      onSuccess: () => toast.success("Đã lưu thay đổi"),
    });
    setEditData((prev) => { const n = { ...prev }; delete n[plan.id]; return n; });
    setFeatureEdits((prev) => { const n = { ...prev }; delete n[plan.id]; return n; });
    setConfirmPlan(null);
  };

  const getDiffItems = (plan: PlanLimit) => {
    const diffs: { label: string; old: string; new: string }[] = [];
    const edits = editData[plan.id] || {};
    for (const [field, newVal] of Object.entries(edits)) {
      if (field === "features") continue;
      const oldVal = plan[field as keyof PlanLimit] as number;
      const label = FIELD_LABELS[field] || field;
      const fmt = priceFields.includes(field) ? formatVND : formatLimit;
      diffs.push({ label, old: fmt(oldVal), new: fmt(newVal as number) });
    }
    if (hasFeaturesChanged(plan.id)) {
      const fe = featureEdits[plan.id];
      if (fe.added.length) diffs.push({ label: "Features thêm", old: "—", new: fe.added.join(", ") });
      if (fe.removed.length) diffs.push({ label: "Features xóa", old: fe.removed.join(", "), new: "—" });
    }
    return diffs;
  };

  const getSavingsPercent = (plan: PlanLimit) => {
    const monthly = (getVal(plan, "price_monthly") as number) * 12;
    const yearly = getVal(plan, "price_yearly") as number;
    if (monthly <= 0 || yearly <= 0) return 0;
    return Math.round(((monthly - yearly) / monthly) * 100);
  };

  if (plansQuery.isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (plans.length === 0) {
    return (
      <Card className="border border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Chưa có gói nào</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Tạo gói đầu tiên trong bảng plan_limits để bắt đầu cấu hình.</p>
        </CardContent>
      </Card>
    );
  }

  const subCounts = subCountsQuery.data || {};
  const totalWorkspaces = Object.values(subCounts).reduce((a, b) => a + b, 0);
  const totalMRR = plans.reduce((sum, p) => sum + (subCounts[p.plan_type] || 0) * p.price_monthly, 0);

  const mostPopularPlan = plans.reduce((best, p) =>
    (subCounts[p.plan_type] || 0) > (subCounts[best.plan_type] || 0) ? p : best, plans[0]);
  const arpu = totalWorkspaces > 0 ? totalMRR / totalWorkspaces : 0;

  const allFeatures = [...new Set(plans.flatMap((p) => getEffectiveFeatures(p)))];
  const changedPlanCount = plans.filter((p) => hasChanges(p.id)).length;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-primary/10 p-2"><Users className="h-4 w-4 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Tổng workspace</p>
                <p className="text-lg font-bold">{totalWorkspaces}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-primary/10 p-2"><TrendingUp className="h-4 w-4 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">MRR ước tính</p>
                <p className="text-lg font-bold">{formatVND(totalMRR)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-primary/10 p-2"><Crown className="h-4 w-4 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Gói phổ biến</p>
                <p className="text-lg font-bold capitalize">{mostPopularPlan?.plan_type || "—"}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-primary/10 p-2"><DollarSign className="h-4 w-4 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">ARPU</p>
                <p className="text-lg font-bold">{formatVND(Math.round(arpu))}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            So sánh các gói
            {isEditMode && changedPlanCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px]">{changedPlanCount} gói đã sửa</Badge>
            )}
          </h3>
          <div className="flex items-center gap-2">
            {isEditMode && hasAnyChanges() && (
              <>
                <Button variant="ghost" size="sm" onClick={handleUndoAll}>
                  <Undo2 className="h-4 w-4 mr-1" /> Hoàn tác
                </Button>
                <Button size="sm" onClick={handleSaveAll} disabled={isSavingAll || saveMutation.isPending} className="gap-1">
                  {isSavingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <SaveAll className="h-4 w-4" />}
                  Lưu tất cả ({changedPlanCount})
                </Button>
              </>
            )}
            <Button
              variant={isEditMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (isEditMode) {
                  handleExitEditMode();
                } else {
                  setIsEditMode(true);
                }
              }}
            >
              {isEditMode ? <><Eye className="h-4 w-4 mr-1" /> Xong</> : <><Pencil className="h-4 w-4 mr-1" /> Chỉnh sửa</>}
            </Button>
          </div>
        </div>

        {/* Desktop: Comparison Table */}
        <div className="hidden md:block">
          <Card className="border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[160px] bg-muted/30 font-semibold">Trường</TableHead>
                  {plans.map((plan) => {
                    const wsCount = subCounts[plan.plan_type] || 0;
                    const colors = PLAN_COLORS[plan.plan_type] || PLAN_COLORS.free;
                    const changed = hasChanges(plan.id);
                    return (
                      <TableHead key={plan.id} className={`text-center bg-gradient-to-b ${colors.header}`}>
                        <div className="flex flex-col items-center gap-1 relative">
                          <div className="flex items-center gap-1.5">
                            <Badge className={`${colors.badge} capitalize font-semibold`}>{plan.plan_type}</Badge>
                            {changed && (
                              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" title="Có thay đổi chưa lưu" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{wsCount} ws</span>
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Limit fields */}
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={plans.length + 1} className="bg-muted/20 py-1.5 px-4">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hạn mức</span>
                  </TableCell>
                </TableRow>
                {limitFields.map((field) => (
                  <TableRow key={field}>
                    <TableCell className="font-medium">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-2 text-sm cursor-help">
                            {FIELD_ICONS[field]} {FIELD_LABELS[field]}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs max-w-48">{FIELD_TOOLTIPS[field]}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    {plans.map((plan) => {
                      const val = getVal(plan, field as keyof PlanLimit) as number;
                      const changed = isFieldChanged(plan, field);
                      return (
                        <TableCell key={plan.id} className="text-center">
                          {isEditMode ? (
                            <Input
                              type="number"
                              value={val}
                              onChange={(e) => handleFieldChange(plan.id, field, e.target.value)}
                              className={`h-8 text-sm text-center w-20 mx-auto ${changed ? "ring-2 ring-primary/50 border-primary/30" : ""}`}
                            />
                          ) : val === -1 ? (
                            <Badge variant="secondary" className="gap-1 text-xs"><Infinity className="h-3 w-3" /> ∞</Badge>
                          ) : (
                            <span className={`text-sm font-medium ${changed ? "text-primary" : ""}`}>{val}</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}

                {/* Price fields */}
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={plans.length + 1} className="bg-muted/20 py-1.5 px-4">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Giá cước</span>
                  </TableCell>
                </TableRow>
                {priceFields.map((field) => (
                  <TableRow key={field}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2 text-sm">
                        {FIELD_ICONS[field]} {FIELD_LABELS[field]}
                      </span>
                    </TableCell>
                    {plans.map((plan) => {
                      const val = getVal(plan, field as keyof PlanLimit) as number;
                      const changed = isFieldChanged(plan, field);
                      const savings = field === "price_yearly" ? getSavingsPercent(plan) : 0;
                      return (
                        <TableCell key={plan.id} className="text-center">
                          {isEditMode ? (
                            <Input
                              type="number"
                              value={val}
                              onChange={(e) => handleFieldChange(plan.id, field, e.target.value)}
                              className={`h-8 text-sm text-center w-28 mx-auto ${changed ? "ring-2 ring-primary/50 border-primary/30" : ""}`}
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`text-sm font-semibold ${changed ? "text-primary" : ""}`}>{formatVND(val)}</span>
                              {field === "price_yearly" && savings > 0 && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Tiết kiệm {savings}%</Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}

                {/* Features checklist */}
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={plans.length + 1} className="bg-muted/20 py-1.5 px-4">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tính năng</span>
                  </TableCell>
                </TableRow>
                {allFeatures.map((feature) => (
                  <TableRow key={feature}>
                    <TableCell className="text-sm">{feature}</TableCell>
                    {plans.map((plan) => {
                      const has = getEffectiveFeatures(plan).includes(feature);
                      return (
                        <TableCell key={plan.id} className="text-center">
                          {isEditMode ? (
                            <button
                              onClick={() => {
                                if (has) handleRemoveFeature(plan.id, feature, plan);
                                else {
                                  setFeatureEdits((prev) => ({
                                    ...prev,
                                    [plan.id]: {
                                      added: [...(prev[plan.id]?.added || []), feature],
                                      removed: (prev[plan.id]?.removed || []).filter((f) => f !== feature),
                                    },
                                  }));
                                }
                              }}
                              className={`mx-auto flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${has ? "bg-primary/10 border-primary/30 text-primary" : "border-muted-foreground/20 text-muted-foreground/40 hover:border-primary/30"}`}
                            >
                              {has && <Check className="h-3.5 w-3.5" />}
                            </button>
                          ) : (
                            has ? <Check className="h-4 w-4 text-primary mx-auto" /> : <span className="text-muted-foreground/30">—</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                {isEditMode && (
                  <TableRow>
                    <TableCell>
                      <div className="flex gap-1">
                        <Input
                          placeholder="Feature mới..."
                          value={newFeatureInputs["_global"] || ""}
                          onChange={(e) => setNewFeatureInputs((p) => ({ ...p, _global: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddGlobalFeature(newFeatureInputs["_global"] || "");
                          }}
                          className="h-7 text-xs"
                        />
                        <Button
                          variant="outline" size="icon" className="h-7 w-7 shrink-0"
                          onClick={() => handleAddGlobalFeature(newFeatureInputs["_global"] || "")}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell colSpan={plans.length} className="text-xs text-muted-foreground text-center">
                      Thêm cho tất cả gói. Bật/tắt từng gói ở cột tương ứng.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Save buttons per plan - dynamic grid */}
          {isEditMode && (
            <div className="grid gap-0 mt-2" style={{ gridTemplateColumns: `160px repeat(${plans.length}, 1fr)` }}>
              <div />
              {plans.map((plan) => (
                <div key={plan.id} className="flex justify-center">
                  {hasChanges(plan.id) && (
                    <Button size="sm" onClick={() => setConfirmPlan(plan)} disabled={saveMutation.isPending || isSavingAll} className="gap-1">
                      <Save className="h-3.5 w-3.5" /> Lưu {plan.plan_type}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile: Card layout */}
        <div className="md:hidden space-y-4">
          {plans.map((plan) => {
            const wsCount = subCounts[plan.plan_type] || 0;
            const colors = PLAN_COLORS[plan.plan_type] || PLAN_COLORS.free;
            const savings = getSavingsPercent(plan);
            const changed = hasChanges(plan.id);

            return (
              <Card key={plan.id} className={`border ${colors.border}`}>
                <CardHeader className={`pb-3 rounded-t-lg bg-gradient-to-br ${colors.header}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg capitalize">{plan.plan_type}</CardTitle>
                      {changed && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                    </div>
                    <Badge className={colors.badge}>{wsCount} ws</Badge>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-bold">{formatVND(plan.price_monthly)}</span>
                    <span className="text-xs text-muted-foreground">/tháng</span>
                  </div>
                  {savings > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Năm: {formatVND(plan.price_yearly)} <Badge variant="secondary" className="text-[10px] ml-1 px-1 py-0">-{savings}%</Badge>
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hạn mức</p>
                  {limitFields.map((field) => {
                    const val = getVal(plan, field as keyof PlanLimit) as number;
                    const fieldChanged = isFieldChanged(plan, field);
                    return (
                      <div key={field} className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-1.5">{FIELD_ICONS[field]} {FIELD_LABELS[field]}</span>
                        {isEditMode ? (
                          <Input
                            type="number" value={val}
                            onChange={(e) => handleFieldChange(plan.id, field, e.target.value)}
                            className={`h-7 w-20 text-sm text-right ${fieldChanged ? "ring-2 ring-primary/50" : ""}`}
                          />
                        ) : val === -1 ? (
                          <Badge variant="secondary" className="text-xs gap-1"><Infinity className="h-3 w-3" /> ∞</Badge>
                        ) : (
                          <span className="text-sm font-medium">{val}</span>
                        )}
                      </div>
                    );
                  })}

                  <Separator />
                  {isEditMode && (
                    <>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Giá cước</p>
                      {priceFields.map((field) => {
                        const val = getVal(plan, field as keyof PlanLimit) as number;
                        const fieldChanged = isFieldChanged(plan, field);
                        return (
                          <div key={field} className="flex items-center justify-between">
                            <span className="text-sm flex items-center gap-1.5">{FIELD_ICONS[field]} {FIELD_LABELS[field]}</span>
                            <Input
                              type="number" value={val}
                              onChange={(e) => handleFieldChange(plan.id, field, e.target.value)}
                              className={`h-7 w-28 text-sm text-right ${fieldChanged ? "ring-2 ring-primary/50" : ""}`}
                            />
                          </div>
                        );
                      })}
                      <Separator />
                    </>
                  )}

                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tính năng</p>
                  <div className="space-y-1">
                    {getEffectiveFeatures(plan).map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="flex-1">{f}</span>
                        {isEditMode && (
                          <button onClick={() => handleRemoveFeature(plan.id, f, plan)} className="p-0.5 rounded hover:bg-destructive/20">
                            <X className="h-3 w-3 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {isEditMode && (
                    <>
                      <div className="flex gap-1">
                        <Input
                          placeholder="Thêm feature..."
                          value={newFeatureInputs[plan.id] || ""}
                          onChange={(e) => setNewFeatureInputs((p) => ({ ...p, [plan.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && handleAddFeature(plan.id)}
                          className="h-7 text-xs"
                        />
                        <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleAddFeature(plan.id)}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {hasChanges(plan.id) && (
                        <Button size="sm" className="w-full mt-2" onClick={() => setConfirmPlan(plan)} disabled={saveMutation.isPending || isSavingAll}>
                          <Save className="h-4 w-4 mr-1" /> Lưu thay đổi
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Mobile: Sticky bottom bar */}
        {isEditMode && hasAnyChanges() && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-2 shadow-lg">
            <Button variant="ghost" size="sm" onClick={handleUndoAll} className="gap-1">
              <Undo2 className="h-4 w-4" /> Hoàn tác
            </Button>
            <Button size="sm" onClick={handleSaveAll} disabled={isSavingAll || saveMutation.isPending} className="gap-1">
              {isSavingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <SaveAll className="h-4 w-4" />}
              Lưu tất cả ({changedPlanCount})
            </Button>
          </div>
        )}

        {/* Confirm save single plan dialog */}
        <AlertDialog open={!!confirmPlan} onOpenChange={(open) => !open && setConfirmPlan(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận thay đổi gói "{confirmPlan?.plan_type}"</AlertDialogTitle>
              <AlertDialogDescription>Kiểm tra lại các thay đổi trước khi lưu:</AlertDialogDescription>
            </AlertDialogHeader>
            {confirmPlan && (
              <div className="space-y-2 my-2">
                {getDiffItems(confirmPlan).map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm rounded-md bg-muted/50 px-3 py-2">
                    <span className="font-medium">{d.label}</span>
                    <span>
                      <span className="text-destructive line-through mr-2">{d.old}</span>
                      <span className="text-primary font-semibold">{d.new}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Xác nhận lưu
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Exit edit mode confirmation */}
        <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Có thay đổi chưa lưu
              </AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có {changedPlanCount} gói đang có thay đổi chưa lưu. Bạn muốn làm gì?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel onClick={() => setShowExitConfirm(false)}>Quay lại chỉnh sửa</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={() => {
                  handleUndoAll();
                  setIsEditMode(false);
                  setShowExitConfirm(false);
                }}
              >
                Hủy thay đổi
              </Button>
              <Button
                onClick={async () => {
                  await handleSaveAll();
                  setIsEditMode(false);
                  setShowExitConfirm(false);
                }}
                disabled={isSavingAll}
              >
                {isSavingAll ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <SaveAll className="h-4 w-4 mr-1" />}
                Lưu tất cả & thoát
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
