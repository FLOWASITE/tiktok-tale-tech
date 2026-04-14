import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, TrendingUp, Users, ArrowRightLeft } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const PIE_COLORS = ["#94a3b8", "#3b82f6", "#8b5cf6", "#f59e0b"];

export default function RevenueStats() {
  const statsQuery = useQuery({
    queryKey: ["admin_revenue_stats"],
    queryFn: async () => {
      const [subsRes, plansRes, paymentsRes] = await Promise.all([
        supabase.from("subscriptions").select("plan_type, status, organization_id, cancelled_at"),
        supabase.from("plan_limits").select("plan_type, price_monthly"),
        supabase.from("payment_orders").select("organization_id, amount, status, plan_type, created_at").eq("status", "success").order("amount", { ascending: false }),
      ]);

      const subs = subsRes.data || [];
      const plans = plansRes.data || [];
      const payments = paymentsRes.data || [];

      const priceMap: Record<string, number> = {};
      plans.forEach((p: any) => { priceMap[p.plan_type] = Number(p.price_monthly); });

      // MRR
      const activeSubs = subs.filter((s: any) => s.status === "active");
      const mrr = activeSubs.reduce((sum: number, s: any) => sum + (priceMap[s.plan_type] || 0), 0);

      // Plan distribution
      const planDist: Record<string, number> = { free: 0, starter: 0, pro: 0, enterprise: 0 };
      activeSubs.forEach((s: any) => { planDist[s.plan_type] = (planDist[s.plan_type] || 0) + 1; });
      const pieData = Object.entries(planDist).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

      // Conversion rate
      const totalWorkspaces = activeSubs.length;
      const paidWorkspaces = activeSubs.filter((s: any) => s.plan_type !== "free").length;
      const conversionRate = totalWorkspaces > 0 ? ((paidWorkspaces / totalWorkspaces) * 100).toFixed(1) : "0";

      // Churn rate
      const cancelledCount = subs.filter((s: any) => s.status === "cancelled").length;
      const churnRate = subs.length > 0 ? ((cancelledCount / subs.length) * 100).toFixed(1) : "0";

      // Top workspaces by spend
      const spendByOrg: Record<string, { total: number; org_id: string }> = {};
      payments.forEach((p: any) => {
        if (!spendByOrg[p.organization_id]) spendByOrg[p.organization_id] = { total: 0, org_id: p.organization_id };
        spendByOrg[p.organization_id].total += Number(p.amount);
      });
      const topOrgIds = Object.values(spendByOrg).sort((a, b) => b.total - a.total).slice(0, 10);

      let topWorkspaces: { name: string; total: number }[] = [];
      if (topOrgIds.length > 0) {
        const { data: orgs } = await supabase.from("organizations").select("id, name").in("id", topOrgIds.map((o) => o.org_id));
        const orgNameMap: Record<string, string> = {};
        orgs?.forEach((o: any) => { orgNameMap[o.id] = o.name; });
        topWorkspaces = topOrgIds.map((o) => ({ name: orgNameMap[o.org_id] || "N/A", total: o.total }));
      }

      return { mrr, pieData, conversionRate, churnRate, totalWorkspaces, paidWorkspaces, cancelledCount, topWorkspaces };
    },
  });

  if (statsQuery.isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const stats = statsQuery.data;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-green-100 dark:bg-green-900"><DollarSign className="h-5 w-5 text-green-600 dark:text-green-300" /></div>
              <div>
                <p className="text-sm text-muted-foreground">MRR</p>
                <p className="text-2xl font-bold">{stats.mrr.toLocaleString()}₫</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900"><Users className="h-5 w-5 text-blue-600 dark:text-blue-300" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Paid Workspaces</p>
                <p className="text-2xl font-bold">{stats.paidWorkspaces} <span className="text-sm font-normal text-muted-foreground">/ {stats.totalWorkspaces}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-purple-100 dark:bg-purple-900"><TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-300" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{stats.conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-red-100 dark:bg-red-900"><ArrowRightLeft className="h-5 w-5 text-red-600 dark:text-red-300" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Churn Rate</p>
                <p className="text-2xl font-bold">{stats.churnRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Phân bổ gói</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={stats.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                  {stats.pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Workspaces */}
        <Card>
          <CardHeader><CardTitle className="text-base">Top Workspaces theo chi tiêu</CardTitle></CardHeader>
          <CardContent>
            {stats.topWorkspaces.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Workspace</TableHead>
                    <TableHead className="text-right">Tổng chi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topWorkspaces.map((w, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{i + 1}</TableCell>
                      <TableCell>{w.name}</TableCell>
                      <TableCell className="text-right">{w.total.toLocaleString()}₫</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu thanh toán</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
