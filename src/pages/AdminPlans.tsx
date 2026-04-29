import { useAdmin } from "@/hooks/useAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Users, TrendingUp, Receipt, Building2, Ticket, DollarSign, Flame, AlertTriangle } from "lucide-react";
import PlanLimitsManager from "@/components/admin/plans/PlanLimitsManager";
import SubscriptionManager from "@/components/admin/plans/SubscriptionManager";
import RevenueStats from "@/components/admin/plans/RevenueStats";
import PaymentHistoryManager from "@/components/admin/plans/PaymentHistoryManager";
import { AdminWorkspacesTab } from "@/components/admin/AdminWorkspacesTab";
import AdminVouchers from "@/pages/AdminVouchers";
import { useAdminPlanStats } from "@/hooks/admin/useAdminPlanStats";
import { formatVND, formatCompactVND } from "@/lib/plan-format";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function HeaderKpiStrip() {
  const { data, isLoading } = useAdminPlanStats();

  const cards = [
    {
      label: "Workspace active",
      value: data?.totalWorkspaces ?? 0,
      sub: data ? `${data.paidWorkspaces} trả phí` : "—",
      icon: Users,
      tone: "text-primary bg-primary/10",
    },
    {
      label: "MRR ước tính",
      value: data ? formatCompactVND(data.mrr) : "—",
      sub: data ? `ARPU ${formatVND(Math.round(data.arpu))}` : "—",
      icon: DollarSign,
      tone: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
    },
    {
      label: "Burn rate quota TB",
      value: data ? `${data.avgBurnRate}%` : "—",
      sub: "Trung bình units đã dùng",
      icon: Flame,
      tone: data && data.avgBurnRate >= 80
        ? "text-destructive bg-destructive/10"
        : data && data.avgBurnRate >= 50
        ? "text-amber-600 bg-amber-500/10 dark:text-amber-400"
        : "text-primary bg-primary/10",
    },
    {
      label: "Cần upgrade",
      value: data?.needsUpgradeCount ?? 0,
      sub: "Workspace có ≥1 unit ≥80%",
      icon: AlertTriangle,
      tone: data && data.needsUpgradeCount > 0
        ? "text-amber-600 bg-amber-500/10 dark:text-amber-400"
        : "text-muted-foreground bg-muted",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", c.tone)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground truncate">{c.label}</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-20 mt-0.5" />
                ) : (
                  <p className="text-xl font-bold leading-tight truncate">{c.value}</p>
                )}
                <p className="text-[11px] text-muted-foreground/80 truncate">{c.sub}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function AdminPlans() {
  const { isAdmin, isCheckingAdmin } = useAdmin();

  if (isCheckingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Đang kiểm tra quyền...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">Bạn không có quyền truy cập trang này.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quản lý gói cước</h1>
        <p className="text-muted-foreground">Cấu hình gói, quản lý subscriptions và theo dõi doanh thu</p>
      </div>

      <HeaderKpiStrip />

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="plans" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Cấu hình gói
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-2">
            <Users className="h-4 w-4" />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="revenue" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Thống kê doanh thu
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <Receipt className="h-4 w-4" />
            Lịch sử thanh toán
          </TabsTrigger>
          <TabsTrigger value="workspaces" className="gap-2">
            <Building2 className="h-4 w-4" />
            Workspaces
          </TabsTrigger>
          <TabsTrigger value="vouchers" className="gap-2">
            <Ticket className="h-4 w-4" />
            Voucher
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <PlanLimitsManager />
        </TabsContent>
        <TabsContent value="subscriptions">
          <SubscriptionManager />
        </TabsContent>
        <TabsContent value="revenue">
          <RevenueStats />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentHistoryManager />
        </TabsContent>
        <TabsContent value="workspaces">
          <AdminWorkspacesTab />
        </TabsContent>
        <TabsContent value="vouchers">
          <AdminVouchers />
        </TabsContent>
      </Tabs>
    </div>
  );
}
