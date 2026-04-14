import { useAdmin } from "@/hooks/useAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Users, TrendingUp, Receipt, Building2 } from "lucide-react";
import PlanLimitsManager from "@/components/admin/plans/PlanLimitsManager";
import SubscriptionManager from "@/components/admin/plans/SubscriptionManager";
import RevenueStats from "@/components/admin/plans/RevenueStats";
import PaymentHistoryManager from "@/components/admin/plans/PaymentHistoryManager";
import { AdminWorkspacesTab } from "@/components/admin/AdminWorkspacesTab";

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

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
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
      </Tabs>
    </div>
  );
}
