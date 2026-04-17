import { useState, useMemo, useCallback } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Building2,
  CreditCard,
  TrendingUp,
  Activity,
  Search,
  Crown,
  UserCheck,
  Calendar,
  UserPlus,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Upload,
  ClipboardList,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { UserDetailSheet } from "@/components/admin/UserDetailSheet";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { UserBulkActionsBar } from "@/components/admin/UserBulkActionsBar";
import { AuditLogPanel } from "@/components/admin/AuditLogPanel";
import AdminOrganizations from "@/pages/AdminOrganizations";

import { ImportUsersDialog } from "@/components/admin/ImportUsersDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { AdminUser } from "@/hooks/useAdmin";

const PAGE_SIZE = 20;

type SortField = "name" | "role" | "plan" | "date";
type SortDir = "asc" | "desc";

export default function AdminUsers() {
  const {
    users,
    stats,
    isLoading,
    updateRole,
    updateSubscription,
    isUpdating,
    refetch,
  } = useAdmin();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filteredAndSortedUsers = useMemo(() => {
    const filtered = users.filter((user) => {
      const matchesSearch =
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesPlan =
        planFilter === "all" || user.subscription?.plan_type === planFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "banned" && user.is_banned) ||
        (statusFilter === "active" && !user.is_banned);
      return matchesSearch && matchesRole && matchesPlan && matchesStatus;
    });

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = (a.full_name || a.email).localeCompare(b.full_name || b.email);
          break;
        case "role":
          cmp = a.role.localeCompare(b.role);
          break;
        case "plan":
          cmp = (a.subscription?.plan_type || "free").localeCompare(b.subscription?.plan_type || "free");
          break;
        case "date":
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return filtered;
  }, [users, searchQuery, roleFilter, planFilter, statusFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedUsers.length / PAGE_SIZE));
  const paginatedUsers = filteredAndSortedUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Bulk selection
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredAndSortedUsers.map((u) => u.id)));
  }, [filteredAndSortedUsers]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  async function bulkAction(actionFn: (id: string) => Promise<boolean>, label: string) {
    const ids = Array.from(selectedIds);
    setBulkProcessing(true);
    let success = 0;
    for (const id of ids) {
      try {
        if (await actionFn(id)) success++;
      } catch {}
    }
    toast.success(`${label}: ${success}/${ids.length}`);
    clearSelection();
    refetch();
    setBulkProcessing(false);
  }

  async function bulkBan() {
    await bulkAction(async (id) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "ban_user", user_id: id, ban: true },
      });
      return !error && !data?.error;
    }, "Đã ban");
  }

  async function bulkUnban() {
    await bulkAction(async (id) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "ban_user", user_id: id, ban: false },
      });
      return !error && !data?.error;
    }, "Đã unban");
  }

  async function bulkDelete() {
    await bulkAction(async (id) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "delete_user", user_id: id },
      });
      return !error && !data?.error;
    }, "Đã xóa");
  }

  async function bulkChangePlan(plan: string) {
    const ids = Array.from(selectedIds);
    setBulkProcessing(true);
    let success = 0;
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);
    for (const id of ids) {
      try {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan_type: plan as "free" | "starter" | "pro" | "enterprise",
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
          })
          .eq("user_id", id);
        if (!error) success++;
      } catch {}
    }
    toast.success(`Đã đổi plan: ${success}/${ids.length}`);
    clearSelection();
    refetch();
    setBulkProcessing(false);
  }

  function exportCSV(subset?: AdminUser[]) {
    const data = subset || filteredAndSortedUsers;
    const headers = ["Email", "Name", "Role", "Plan", "Status", "Banned", "Created At"];
    const rows = data.map((u) => [
      u.email,
      u.full_name || "",
      u.role,
      u.subscription?.plan_type || "free",
      u.subscription?.status || "",
      u.is_banned ? "Yes" : "No",
      u.created_at,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-export-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã export ${data.length} users`);
  }

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Users className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground text-sm">Quản lý users, roles và subscriptions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCSV()}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1" />
            Import CSV
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1" />
            Thêm User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Subs Active</CardTitle>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(stats?.usersByPlan || {}).map(([plan, count]) => (
              <div key={plan} className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{count as number}</div>
                <div className="text-sm text-muted-foreground capitalize">{plan}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Users + Audit Log */}
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5">
            <UserCheck className="h-4 w-4" />
            Quản lý Users
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
          <TabsTrigger value="organizations" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            Organizations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
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
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setCurrentPage(1); }}>
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
                <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setCurrentPage(1); }}>
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
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
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
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={paginatedUsers.length > 0 && paginatedUsers.every((u) => selectedIds.has(u.id))}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  paginatedUsers.forEach((u) => next.add(u.id));
                                  return next;
                                });
                              } else {
                                setSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  paginatedUsers.forEach((u) => next.delete(u.id));
                                  return next;
                                });
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>
                          <button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleSort("name")}>
                            User <SortIcon field="name" />
                          </button>
                        </TableHead>
                        <TableHead>
                          <button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleSort("role")}>
                            Role <SortIcon field="role" />
                          </button>
                        </TableHead>
                        <TableHead>
                          <button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleSort("plan")}>
                            Plan <SortIcon field="plan" />
                          </button>
                        </TableHead>
                        <TableHead>Workspace</TableHead>
                        <TableHead>
                          <button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleSort("date")}>
                            Ngày tham gia <SortIcon field="date" />
                          </button>
                        </TableHead>
                        <TableHead className="text-right">Info</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Không tìm thấy user nào
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedUsers.map((user) => (
                          <TableRow
                            key={user.id}
                            className="cursor-pointer hover:bg-muted/50"
                            data-state={selectedIds.has(user.id) ? "selected" : undefined}
                            onClick={() => { setSelectedUser(user); setDetailOpen(true); }}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedIds.has(user.id)}
                                onCheckedChange={() => toggleSelect(user.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={user.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-medium truncate">{user.full_name || "—"}</p>
                                    {user.is_banned && (
                                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                                        Banned
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
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
                                <SelectTrigger className="w-[100px]">
                                  <Badge className={roleColors[user.role]}>{user.role}</Badge>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="pro">Pro</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
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
                                <SelectTrigger className="w-[110px]">
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
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {user.organizations.length > 0 ? (
                                  <>
                                    {user.organizations.slice(0, 2).map((org) => (
                                      <Badge key={org.id} variant="outline" className="text-[10px] px-1.5 py-0 h-5 truncate max-w-[150px]" title={`${org.name} (${org.role})`}>
                                        <Building2 className="h-2.5 w-2.5 mr-0.5 shrink-0" />
                                        {org.name}
                                      </Badge>
                                    ))}
                                    {user.organizations.length > 2 && (
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                        +{user.organizations.length - 2}
                                      </Badge>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(user.created_at), "dd/MM/yyyy", { locale: vi })}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {user.subscription?.current_period_end && (
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
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

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Hiển thị {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredAndSortedUsers.length)}–{Math.min(currentPage * PAGE_SIZE, filteredAndSortedUsers.length)} / {filteredAndSortedUsers.length} users
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Audit Log
              </CardTitle>
              <CardDescription>
                Lịch sử hành động quản trị
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuditLogPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizations">
          <AdminOrganizations />
        </TabsContent>
      </Tabs>

      {/* Bulk Actions Bar */}
      <UserBulkActionsBar
        selectedCount={selectedIds.size}
        totalCount={filteredAndSortedUsers.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onBulkBan={bulkBan}
        onBulkUnban={bulkUnban}
        onBulkDelete={bulkDelete}
        onBulkChangePlan={bulkChangePlan}
        onBulkExport={() => {
          const selected = filteredAndSortedUsers.filter((u) => selectedIds.has(u.id));
          exportCSV(selected);
        }}
        isProcessing={bulkProcessing}
      />

      {/* Dialogs */}
      <UserDetailSheet
        user={selectedUser}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onAction={refetch}
      />
      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refetch}
      />
      <ImportUsersDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={refetch}
      />
    </div>
  );
}
