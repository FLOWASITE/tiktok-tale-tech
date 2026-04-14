import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2 } from "lucide-react";
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
const PLAN_COLORS: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  starter: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  pro: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  enterprise: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
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

export default function PlanLimitsManager() {
  const queryClient = useQueryClient();
  const [editData, setEditData] = useState<Record<string, Partial<PlanLimit>>>({});

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
      const { error } = await supabase.from("plan_limits").update(updates).eq("id", id);
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
    setEditData((prev) => ({
      ...prev,
      [planId]: { ...prev[planId], [field]: numVal },
    }));
  };

  const handleSave = (plan: PlanLimit) => {
    const updates = editData[plan.id];
    if (!updates || Object.keys(updates).length === 0) return;
    saveMutation.mutate({ id: plan.id, updates });
    setEditData((prev) => {
      const next = { ...prev };
      delete next[plan.id];
      return next;
    });
  };

  const getVal = (plan: PlanLimit, field: keyof PlanLimit) => {
    return editData[plan.id]?.[field] ?? plan[field];
  };

  const hasChanges = (planId: string) => editData[planId] && Object.keys(editData[planId]).length > 0;

  if (plansQuery.isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const plans = plansQuery.data || [];
  const subCounts = subCountsQuery.data || {};
  const numericFields = ["monthly_brands", "monthly_scripts", "monthly_carousels", "monthly_multichannel", "monthly_images", "monthly_ai_edits", "price_monthly", "price_yearly"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {plans.map((plan) => (
        <Card key={plan.id} className="relative">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg capitalize">{plan.plan_type}</CardTitle>
              <Badge variant="secondary" className={PLAN_COLORS[plan.plan_type] || ""}>
                {subCounts[plan.plan_type] || 0} workspace
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {numericFields.map((field) => (
              <div key={field} className="space-y-1">
                <label className="text-xs text-muted-foreground">{FIELD_LABELS[field]}</label>
                <Input
                  type="number"
                  value={getVal(plan, field as keyof PlanLimit) as number}
                  onChange={(e) => handleFieldChange(plan.id, field, e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            ))}

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Features</label>
              <div className="flex flex-wrap gap-1">
                {(plan.features || []).map((f: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
                ))}
              </div>
            </div>

            {hasChanges(plan.id) && (
              <Button
                size="sm"
                className="w-full mt-2"
                onClick={() => handleSave(plan)}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Lưu thay đổi
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
