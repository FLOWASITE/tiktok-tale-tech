import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Zap,
  Database,
  Clock,
  Download,
  AlertTriangle,
  Users,
  Building2,
} from "lucide-react";
import { useCostAnalytics } from "@/hooks/useCostAnalytics";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

// Budget alert thresholds (configurable)
const BUDGET_THRESHOLDS = {
  dailyWarn: 0.50,   // $0.50/day
  dailyCrit: 1.00,   // $1.00/day
  weeklyWarn: 3.00,  // $3.00/week
  weeklyCrit: 5.00,  // $5.00/week
};

function formatCurrency(value: number): string {
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(4)}`;
}

function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${format(new Date(), "yyyyMMdd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CostDashboard() {
  const [days, setDays] = useState(30);
  const { summary, dailyCosts, costByModel, costByFunction, costByUser, costByOrg, recentEntries, isLoading, refetch } =
    useCostAnalytics(days);

  const chartConfig = {
    cost: { label: "Chi phí", color: "hsl(var(--chart-1))" },
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-20" /></CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
          <CardContent><Skeleton className="h-64 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  // Budget alerts
  const budgetAlerts: { level: "warn" | "crit"; message: string }[] = [];
  if (summary) {
    if (summary.totalCostToday >= BUDGET_THRESHOLDS.dailyCrit) {
      budgetAlerts.push({ level: "crit", message: `Chi phí hôm nay (${formatCurrency(summary.totalCostToday)}) vượt ngưỡng ${formatCurrency(BUDGET_THRESHOLDS.dailyCrit)}/ngày` });
    } else if (summary.totalCostToday >= BUDGET_THRESHOLDS.dailyWarn) {
      budgetAlerts.push({ level: "warn", message: `Chi phí hôm nay (${formatCurrency(summary.totalCostToday)}) gần ngưỡng ${formatCurrency(BUDGET_THRESHOLDS.dailyCrit)}/ngày` });
    }
    if (summary.totalCostWeek >= BUDGET_THRESHOLDS.weeklyCrit) {
      budgetAlerts.push({ level: "crit", message: `Chi phí tuần (${formatCurrency(summary.totalCostWeek)}) vượt ngưỡng ${formatCurrency(BUDGET_THRESHOLDS.weeklyCrit)}/tuần` });
    } else if (summary.totalCostWeek >= BUDGET_THRESHOLDS.weeklyWarn) {
      budgetAlerts.push({ level: "warn", message: `Chi phí tuần (${formatCurrency(summary.totalCostWeek)}) gần ngưỡng ${formatCurrency(BUDGET_THRESHOLDS.weeklyCrit)}/tuần` });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-500" />
            Chi phí AI
          </h2>
          <p className="text-muted-foreground">Theo dõi và phân tích chi phí sử dụng AI</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToCSV(recentEntries || [], "ai_cost_report")}
            disabled={!recentEntries?.length}
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
          <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 ngày</SelectItem>
              <SelectItem value="14">14 ngày</SelectItem>
              <SelectItem value="30">30 ngày</SelectItem>
              <SelectItem value="90">90 ngày</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Budget Alerts */}
      {budgetAlerts.length > 0 && (
        <div className="space-y-2">
          {budgetAlerts.map((alert, i) => (
            <Card key={i} className={alert.level === "crit" ? "border-destructive bg-destructive/5" : "border-yellow-500 bg-yellow-500/5"}>
              <CardContent className="flex items-center gap-3 py-3">
                <AlertTriangle className={`h-5 w-5 ${alert.level === "crit" ? "text-destructive" : "text-yellow-500"}`} />
                <span className={`text-sm font-medium ${alert.level === "crit" ? "text-destructive" : "text-yellow-600"}`}>
                  {alert.message}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng chi phí</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalCostUsd || 0)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {summary?.costTrend !== undefined && summary.costTrend !== 0 && (
                <>
                  {summary.costTrend > 0 ? (
                    <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
                  )}
                  <span className={summary.costTrend > 0 ? "text-red-500" : "text-green-500"}>
                    {Math.abs(summary.costTrend).toFixed(1)}%
                  </span>
                  <span className="ml-1">so với tuần trước</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hôm nay</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalCostToday || 0)}</div>
            <p className="text-xs text-muted-foreground">Chi phí trong ngày</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tuần này</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalCostWeek || 0)}</div>
            <p className="text-xs text-muted-foreground">Chi phí tuần hiện tại</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Trung bình/Request</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.avgCostPerRequest || 0)}</div>
            <p className="text-xs text-muted-foreground">{formatNumber(summary?.totalRequests || 0)} requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Over Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Chi phí theo thời gian</CardTitle>
          <CardDescription>Biểu đồ chi phí AI trong {days} ngày qua</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart data={dailyCosts || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tickFormatter={(value) => format(new Date(value), "dd/MM")} className="text-xs" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} className="text-xs" />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [formatCurrency(value as number), "Chi phí"]}
                    labelFormatter={(label) => format(new Date(label), "dd MMMM yyyy", { locale: vi })}
                  />
                }
              />
              <Area type="monotone" dataKey="cost" stroke="hsl(var(--chart-1))" fillOpacity={1} fill="url(#colorCost)" strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Cost by User */}
      {costByUser && costByUser.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Chi phí theo User
                </CardTitle>
                <CardDescription>User nào sử dụng AI nhiều nhất</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => exportToCSV(costByUser, "cost_by_user")}>
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Tổng chi phí</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">TB/Request</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costByUser.slice(0, 10).map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{user.fullName || "Unknown"}</span>
                        {user.email && (
                          <span className="block text-xs text-muted-foreground">{user.email}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(user.totalCost)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatNumber(user.requestCount)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(user.avgCostPerRequest)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Cost by Organization */}
      {costByOrg && costByOrg.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Chi phí theo Organization
            </CardTitle>
            <CardDescription>Tổng chi phí theo tổ chức</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead className="text-right">Tổng chi phí</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">TB/Request</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costByOrg.slice(0, 10).map((org) => (
                  <TableRow key={org.organizationId}>
                    <TableCell className="font-medium">{org.organizationName || org.organizationId.substring(0, 8)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(org.totalCost)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatNumber(org.requestCount)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(org.avgCostPerRequest)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by Model */}
        <Card>
          <CardHeader>
            <CardTitle>Chi phí theo Model</CardTitle>
            <CardDescription>Phân bố chi phí giữa các AI model</CardDescription>
          </CardHeader>
          <CardContent>
            {costByModel && costByModel.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="h-[200px] w-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={costByModel} dataKey="cost" nameKey="model" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} isAnimationActive={false}>
                        {costByModel.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {costByModel.slice(0, 5).map((item, index) => (
                    <div key={item.model} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                        <span className="truncate max-w-[120px]">{item.model}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{formatCurrency(item.cost)}</span>
                        <span className="text-muted-foreground ml-2">({item.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">Chưa có dữ liệu</div>
            )}
          </CardContent>
        </Card>

        {/* Cost by Function */}
        <Card>
          <CardHeader>
            <CardTitle>Chi phí theo Function</CardTitle>
            <CardDescription>So sánh chi phí giữa các edge function</CardDescription>
          </CardHeader>
          <CardContent>
            {costByFunction && costByFunction.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <BarChart data={costByFunction.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                  <YAxis type="category" dataKey="functionName" width={140} tickFormatter={(value) => value.length > 18 ? value.slice(0, 18) + "..." : value} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => [formatCurrency(value as number), "Chi phí"]} />} />
                  <Bar dataKey="cost" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">Chưa có dữ liệu</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết chi phí gần đây</CardTitle>
          <CardDescription>20 request gần nhất có chi phí</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Function</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Chi phí</TableHead>
                <TableHead>Cache</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentEntries && recentEntries.length > 0 ? (
                recentEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-muted-foreground">{format(new Date(entry.createdAt), "dd/MM HH:mm")}</TableCell>
                    <TableCell className="font-medium max-w-[180px] truncate">{entry.functionName}</TableCell>
                    <TableCell><Badge variant="outline">{entry.model}</Badge></TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatNumber(entry.inputTokens + entry.outputTokens)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(entry.estimatedCostUsd)}</TableCell>
                    <TableCell>
                      {entry.cacheHit ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600">Hit</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Miss</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Chưa có dữ liệu chi phí</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
