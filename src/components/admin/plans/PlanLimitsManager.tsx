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
  Save, Loader2, Undo2, Package, FileText, Image, Layers,
  Palette, Bot, DollarSign, Plus, X, Users, TrendingUp, Infinity,
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

const PLAN_GRADIENTS: Record<string, string> = {
  free: "from-muted/50 to-muted/30",
  starter: "from-blue-500/10 to-blue-600/5",
  pro: "from-purple-500/10 to-purple-600/5",
  enterprise: "from-amber-500/10 to-amber-600/5",
};

const PLAN_BORDER: Record<string, string> = {
  free: "border-muted-foreground/20",
  starter: "border-blue-500/30",
  pro: "border-purple-500/30",
  enterprise: "border-amber-500/30",
};

const PLAN_BADGE_COLORS: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  starter: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  pro: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  enterprise: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
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
  monthly_multichannel: "Nội dung đa kênh",
  monthly_images: "Ảnh AI",
  monthly_ai_edits: "AI Edits",
  price_monthly: "Giá tháng (₫)",
  price_yearly: "Giá năm (₫)",
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

const formatVND = (v: number) => v.toLocaleString("vi-VN") + "₫";

export default function PlanLimitsManager() {
  const queryClient = useQueryClient();
  const [editData, setEditData] = useState<Record<string, Partial<PlanLimit>>>({});
  const [featureEdits, setFeatureEdits] = useState<Record<string, { added: string[]; removed: string[] }>>({});
  const [newFeatureInputs, setNewFeatureInputs] = useState<Record<string, string>>({});
  const [confirmPlan, setConfirmPlan] = useState<PlanLimit | null>(null);

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
      toast.success("Đã lưu thay đổi");
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

  const handleAddFeature = (planId: string) => {
    const val = (newFeatureInputs[planId] || "").trim();
    if (!val) return;
    setFeatureEdits((prev) => ({
      ...prev,
      [planId]: {
        added: [...(prev[planId]?.added || []), val],
        removed: prev[planId]?.removed || [],
      },
    }));
    setNewFeatureInputs((prev) => ({ ...prev, [planId]: "" }));
  };

  const handleRemoveFeature = (planId: string, feature: string, plan: PlanLimit) => {
    const isOriginal = (plan.features || []).includes(feature);
    if (isOriginal) {
      setFeatureEdits((prev) => ({
        ...prev,
        [planId]: {
          added: prev[planId]?.added || [],
          removed: [...(prev[planId]?.removed || []), feature],
        },
      }));
    } else {
      setFeatureEdits((prev) => ({
        ...prev,
        [planId]: {
          added: (prev[planId]?.added || []).filter((f) => f !== feature),
          removed: prev[planId]?.removed || [],
        },
      }));
    }
  };

  const handleUndo = (planId: string) => {
    setEditData((prev) => { const n = { ...prev }; delete n[planId]; return n; });
    setFeatureEdits((prev) => { const n = { ...prev }; delete n[planId]; return n; });
  };

  const handleConfirmSave = () => {
    if (!confirmPlan) return;
    const plan = confirmPlan;
    const updates: any = { ...(editData[plan.id] || {}) };
    if (hasFeaturesChanged(plan.id)) {
      updates.features = getEffectiveFeatures(plan);
    }
    saveMutation.mutate({ id: plan.id, updates });
    handleUndo(plan.id);
    setConfirmPlan(null);
  };

  const getDiffItems = (plan: PlanLimit) => {
    const diffs: { label: string; old: string; new: string }[] = [];
    const edits = editData[plan.id] || {};
    for (const [field, newVal] of Object.entries(edits)) {
      if (field === "features") continue;
      const oldVal = plan[field as keyof PlanLimit] as number;
      const label = FIELD_LABELS[field] || field;
      const fmt = priceFields.includes(field) ? formatVND : (v: number) => v === -1 ? "∞" : String(v);
      diffs.push({ label, old: fmt(oldVal), new: fmt(newVal as number) });
    }
    if (hasFeaturesChanged(plan.id)) {
      const fe = featureEdits[plan.id];
      if (fe.added.length) diffs.push({ label: "Features thêm", old: "—", new: fe.added.join(", ") });
      if (fe.removed.length) diffs.push({ label: "Features xóa", old: fe.removed.join(", "), new: "—" });
    }
    return diffs;
  };

  if (plansQuery.isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const plans = plansQuery.data || [];
  const subCounts = subCountsQuery.data || {};
  const totalWorkspaces = Object.values(subCounts).reduce((a, b) => a + b, 0);
  const totalMRR = plans.reduce((sum, p) => sum + (subCounts[p.plan_type] || 0) * p.price_monthly, 0);

  const renderField = (plan: PlanLimit, field: string) => {
    const val = getVal(plan, field as keyof PlanLimit) as number;
    const changed = isFieldChanged(plan, field);
    const isLimit = limitFields.includes(field);

    if (isLimit && val === -1 && !changed) {
      return (
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="gap-1 text-xs font-normal">
            <Infinity className="h-3 w-3" /> Không giới hạn
          </Badge>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleFieldChange(plan.id, field, "-1")}>
            <FileText className="h-3 w-3 opacity-40" />
          </Button>
        </div>
      );
    }

    return (
      <Input
        type="number"
        value={val}
        onChange={(e) => handleFieldChange(plan.id, field, e.target.value)}
        className={`h-8 text-sm ${changed ? "ring-2 ring-primary/50 border-primary/30" : ""}`}
      />
    );
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        {/* Summary row */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Tổng workspace</p>
              <p className="text-lg font-semibold">{totalWorkspaces}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">MRR ước tính</p>
              <p className="text-lg font-semibold">{formatVND(totalMRR)}</p>
            </div>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const wsCount = subCounts[plan.plan_type] || 0;
            const estRevenue = wsCount * plan.price_monthly;

            return (
              <Card key={plan.id} className={`relative border ${PLAN_BORDER[plan.plan_type] || ""}`}>
                <CardHeader className={`pb-3 rounded-t-lg bg-gradient-to-br ${PLAN_GRADIENTS[plan.plan_type] || ""}`}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg capitalize">{plan.plan_type}</CardTitle>
                    <Badge variant="secondary" className={PLAN_BADGE_COLORS[plan.plan_type] || ""}>
                      {wsCount} workspace
                    </Badge>
                  </div>
                  {plan.price_monthly > 0 && wsCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ~{formatVND(estRevenue)}/tháng
                    </p>
                  )}
                </CardHeader>

                <CardContent className="space-y-3 pt-4">
                  {/* Limits */}
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hạn mức</p>
                  {limitFields.map((field) => (
                    <div key={field} className="space-y-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <label className="text-xs text-muted-foreground flex items-center gap-1.5 cursor-help">
                            {FIELD_ICONS[field]}
                            {FIELD_LABELS[field]}
                          </label>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-48">
                          {FIELD_TOOLTIPS[field]}
                        </TooltipContent>
                      </Tooltip>
                      {renderField(plan, field)}
                    </div>
                  ))}

                  <Separator />

                  {/* Pricing */}
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Giá cước</p>
                  {priceFields.map((field) => (
                    <div key={field} className="space-y-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <label className="text-xs text-muted-foreground flex items-center gap-1.5 cursor-help">
                            {FIELD_ICONS[field]}
                            {FIELD_LABELS[field]}
                          </label>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-48">
                          {FIELD_TOOLTIPS[field]}
                        </TooltipContent>
                      </Tooltip>
                      <Input
                        type="number"
                        value={getVal(plan, field as keyof PlanLimit) as number}
                        onChange={(e) => handleFieldChange(plan.id, field, e.target.value)}
                        className={`h-8 text-sm ${isFieldChanged(plan, field) ? "ring-2 ring-primary/50 border-primary/30" : ""}`}
                      />
                    </div>
                  ))}

                  <Separator />

                  {/* Features */}
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Features</p>
                  <div className="flex flex-wrap gap-1">
                    {getEffectiveFeatures(plan).map((f, i) => (
                      <Badge key={i} variant="outline" className="text-xs gap-1 pr-1">
                        {f}
                        <button
                          onClick={() => handleRemoveFeature(plan.id, f, plan)}
                          className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
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

                  {/* Actions */}
                  {hasChanges(plan.id) && (
                    <div className="flex gap-2 mt-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleUndo(plan.id)}>
                        <Undo2 className="h-4 w-4 mr-1" /> Hoàn tác
                      </Button>
                      <Button size="sm" className="flex-1" onClick={() => setConfirmPlan(plan)} disabled={saveMutation.isPending}>
                        <Save className="h-4 w-4 mr-1" /> Lưu
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Confirm dialog */}
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
      </div>
    </TooltipProvider>
  );
}
