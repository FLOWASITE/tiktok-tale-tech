import { useState } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  CreditCard,
  TrendingUp,
  Activity,
  Search,
  Shield,
  Crown,
  UserCheck,
  Calendar,
  ShieldAlert,
  Database,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import CacheAnalytics from "@/components/admin/CacheAnalytics";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("users");
  const {
    users,
    stats,
    isLoading,
    updateRole,
    updateSubscription,
    isUpdating,
  } = useAdmin();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesPlan =
      planFilter === "all" || user.subscription?.plan_type === planFilter;
    return matchesSearch && matchesRole && matchesPlan;
  });

  const planColors: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    starter: "bg-blue-500/10 text-blue-500",
    pro: "bg-primary/10 text-primary",
    enterprise: "bg-amber-500/10 text-amber-500",
  };

  const roleColors: Record<string, string> = {
    user: "bg-muted text-muted-foreground",
    pro: "bg-blue-500/10 text-blue-500",
    admin: "bg-red-500/10 text-red-500",
  };

  const statusColors: Record<string, string> = {
    active: "bg-green-500/10 text-green-500",
    cancelled: "bg-red-500/10 text-red-500",
    expired: "bg-muted text-muted-foreground",
    pending: "bg-yellow-500/10 text-yellow-500",
    trial: "bg-blue-500/10 text-blue-500",
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-red-500/10">
          <Shield className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Quản lý users, subscriptions và analytics</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="cache" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            AI Cache
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6 mt-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.recentSignups || 0} trong 7 ngày
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Subscriptions Active</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeSubscriptions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.usersByPlan?.pro || 0} Pro, {stats?.usersByPlan?.enterprise || 0} Enterprise
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Doanh thu/tháng</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats?.totalRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">Ước tính từ active subs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Usage Hôm nay</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.usageToday || 0}</div>
            <p className="text-xs text-muted-foreground">Số lượng generate</p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Phân bổ Plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(stats?.usersByPlan || {}).map(([plan, count]) => (
              <div key={plan} className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{count as number}</div>
                <div className="text-sm text-muted-foreground capitalize">{plan}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Quản lý Users
          </CardTitle>
          <CardDescription>
            Xem và quản lý tất cả users, roles và subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm email hoặc tên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả roles</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ngày tham gia</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Không tìm thấy user nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback>
                                {user.email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.full_name || "—"}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value) =>
                              updateRole({
                                userId: user.id,
                                role: value as "user" | "admin" | "pro",
                              })
                            }
                            disabled={isUpdating}
                          >
                            <SelectTrigger className="w-[120px]">
                              <Badge className={roleColors[user.role]}>{user.role}</Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.subscription?.plan_type || "free"}
                            onValueChange={(value) =>
                              updateSubscription({
                                userId: user.id,
                                planType: value as "free" | "starter" | "pro" | "enterprise",
                              })
                            }
                            disabled={isUpdating}
                          >
                            <SelectTrigger className="w-[120px]">
                              <Badge className={planColors[user.subscription?.plan_type || "free"]}>
                                {user.subscription?.plan_type || "free"}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="starter">Starter</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                              <SelectItem value="enterprise">Enterprise</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {user.subscription && (
                            <Badge className={statusColors[user.subscription.status]}>
                              {user.subscription.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(user.created_at), "dd/MM/yyyy", { locale: vi })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {user.subscription?.current_period_end && (
                            <span className="text-xs text-muted-foreground">
                              Hết hạn: {format(new Date(user.subscription.current_period_end), "dd/MM/yyyy")}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            Hiển thị {filteredUsers.length} / {users.length} users
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="cache" className="mt-6">
          <CacheAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
