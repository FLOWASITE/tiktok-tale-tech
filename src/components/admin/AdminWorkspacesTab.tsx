import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Building2, Search, Users, CreditCard, TrendingUp, Crown,
  Trash2, ChevronLeft, ChevronRight, Download, Sparkles, Loader2,
  ChevronDown, FileText, Image, Layers, Palette, Wand2, ScrollText, Images, Calendar, RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useAdminWorkspaces, type AdminWorkspace, type QuotaStatus } from "@/hooks/useAdminWorkspaces";
import { useAdminWorkspaceDetail, type PeriodFilter } from "@/hooks/useAdminWorkspaceDetail";
import { MemberAvatar } from "@/components/MemberAvatar";
import { ORG_ROLE_LABELS, ORG_ROLE_COLORS, type OrgRole } from "@/types/organization";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const planColors: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  starter: "bg-blue-500/10 text-blue-500",
  pro: "bg-primary/10 text-primary",
  business: "bg-purple-500/10 text-purple-500",
  enterprise: "bg-amber-500/10 text-amber-500",
};

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-500",
  cancelled: "bg-red-500/10 text-red-500",
  expired: "bg-muted text-muted-foreground",
  pending: "bg-yellow-500/10 text-yellow-500",
  trial: "bg-blue-500/10 text-blue-500",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function WorkspaceDetailPanel({ orgId }: { orgId: string }) {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("current");
  const { members, brands, contentStats, contributions, periodInfo, isLoading } = useAdminWorkspaceDetail(orgId, periodFilter);

  const periodLabel = useMemo(() => {
    if (!periodInfo?.start || !periodInfo?.end) return null;
    const now = new Date();
    const periodEnd = new Date(periodInfo.end);
    if (periodEnd < now) {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return `${format(s, "dd/MM")} – ${format(e, "dd/MM/yyyy")}`;
    }
    return `${format(new Date(periodInfo.start), "dd/MM")} – ${format(new Date(periodInfo.end), "dd/MM/yyyy")}`;
  }, [periodInfo]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-muted/30 border-t space-y-4">
      {/* Period Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <ToggleGroup
          type="single"
          value={periodFilter}
          onValueChange={(v) => v && setPeriodFilter(v as PeriodFilter)}
          size="sm"
          className="bg-background border rounded-lg p-0.5"
        >
          <ToggleGroupItem value="current" className="text-xs px-3 h-7 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            Kỳ này
          </ToggleGroupItem>
          <ToggleGroupItem value="previous" className="text-xs px-3 h-7 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            Kỳ trước
          </ToggleGroupItem>
        </ToggleGroup>
        {periodLabel && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {periodFilter === "current" ? "Kỳ hiện tại" : "Trước"}: {periodLabel}
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { icon: FileText, label: "Bài viết", value: contentStats.multiChannelCount },
          { icon: Layers, label: "Bài Social", value: contentStats.socialPostCount },
          { icon: ScrollText, label: "Scripts", value: contentStats.scriptCount },
          { icon: Images, label: "Carousel", value: contentStats.carouselCount },
          { icon: Image, label: "Ảnh Carousel", value: contentStats.carouselImageCount },
          { icon: Wand2, label: "Ảnh AI", value: contentStats.imageCount },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-lg bg-background border p-2.5 text-center">
            <Icon className="h-3.5 w-3.5 mx-auto mb-1 text-primary" />
            <div className="text-lg font-bold leading-tight">{value}</div>
            <div className="text-[10px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Members, Brands, Contributions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Members */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Thành viên ({members.length})
          </h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {members.length === 0 ? (
              <p className="text-xs text-muted-foreground">Không có thành viên</p>
            ) : (
              members.map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-sm">
                  <MemberAvatar
                    avatarUrl={m.profile?.avatar_url}
                    name={m.profile?.full_name}
                    email={m.profile?.email}
                    size="sm"
                    showStatus={false}
                    showTooltip={false}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">
                      {m.profile?.full_name || m.profile?.email || "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">{m.profile?.email}</div>
                  </div>
                  <Badge className={cn("text-[10px] px-1.5 py-0 h-4 border-0", ORG_ROLE_COLORS[m.role as OrgRole] || "bg-muted text-muted-foreground")}>
                    {ORG_ROLE_LABELS[m.role as OrgRole] || m.role}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Brands */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5" /> Brands ({brands.length})
          </h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {brands.length === 0 ? (
              <p className="text-xs text-muted-foreground">Chưa có brand</p>
            ) : (
              brands.map((b) => (
                <div key={b.id} className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={b.logo_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {b.brand_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{b.brand_name}</div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {b.industry && <span>{b.industry}</span>}
                      {b.created_at && (
                        <span>{format(new Date(b.created_at), "dd/MM/yyyy")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5" title="Bài viết">
                      <FileText className="h-2.5 w-2.5" />
                      <span className="font-semibold text-foreground">{b.content_count}</span>
                    </span>
                    <span className="flex items-center gap-0.5" title="Ảnh AI">
                      <Wand2 className="h-2.5 w-2.5" />
                      <span className="font-semibold text-foreground">{b.image_count}</span>
                    </span>
                    <span className="font-bold text-primary text-[10px]" title="Tổng">
                      {b.content_count + b.image_count}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          {brands.length > 1 && (() => {
            const totalContent = brands.reduce((s, b) => s + b.content_count, 0);
            const totalImages = brands.reduce((s, b) => s + b.image_count, 0);
            return (
              <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-border/50 text-[10px] text-muted-foreground">
                <span className="font-medium">Tổng:</span>
                <span className="flex items-center gap-0.5">
                  <FileText className="h-2.5 w-2.5" />
                  <span className="font-bold text-foreground">{totalContent}</span>
                </span>
                <span className="flex items-center gap-0.5">
                  <Wand2 className="h-2.5 w-2.5" />
                  <span className="font-bold text-foreground">{totalImages}</span>
                </span>
                <span className="font-bold text-primary">{totalContent + totalImages}</span>
              </div>
            );
          })()}
        </div>

        {/* Contributions */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Đóng góp
          </h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {contributions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Chưa có dữ liệu</p>
            ) : (
              contributions.map((c) => {
                const name = c.profile?.full_name || c.profile?.email?.split("@")[0] || "—";
                return (
                  <div key={c.userId} className="flex items-center gap-2">
                    <MemberAvatar
                      avatarUrl={c.profile?.avatar_url}
                      name={c.profile?.full_name}
                      email={c.profile?.email}
                      size="sm"
                      showStatus={false}
                      showTooltip={false}
                    />
                    <span className="text-xs font-medium truncate flex-1 min-w-0" title={name}>{name}</span>
                    <div className="flex items-center gap-2.5 shrink-0 text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5" title="Bài viết">
                        <FileText className="h-3 w-3" />
                        <span className="font-semibold text-foreground">{c.contentCount}</span>
                      </span>
                      <span className="flex items-center gap-0.5" title="Ảnh AI">
                        <Wand2 className="h-3 w-3" />
                        <span className="font-semibold text-foreground">{c.imageCount}</span>
                      </span>
                      <span className="flex items-center gap-0.5" title="Carousel">
                        <Images className="h-3 w-3" />
                        <span className="font-semibold text-foreground">{c.carouselCount}</span>
                      </span>
                      <span className="flex items-center gap-0.5" title="Script">
                        <ScrollText className="h-3 w-3" />
                        <span className="font-semibold text-foreground">{c.scriptCount}</span>
                      </span>
                      <span className="font-bold text-primary text-xs" title="Tổng">
                        {c.contentCount + c.imageCount + c.carouselCount + c.scriptCount}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {contributions.length > 1 && (() => {
            const tContent = contributions.reduce((s, c) => s + c.contentCount, 0);
            const tImages = contributions.reduce((s, c) => s + c.imageCount, 0);
            const tCarousel = contributions.reduce((s, c) => s + c.carouselCount, 0);
            const tScript = contributions.reduce((s, c) => s + c.scriptCount, 0);
            return (
              <div className="flex items-center justify-end gap-2.5 pt-1.5 border-t border-border/50 text-xs text-muted-foreground">
                <span className="font-medium">Tổng:</span>
                <span className="flex items-center gap-0.5">
                  <FileText className="h-3 w-3" />
                  <span className="font-bold text-foreground">{tContent}</span>
                </span>
                <span className="flex items-center gap-0.5">
                  <Wand2 className="h-3 w-3" />
                  <span className="font-bold text-foreground">{tImages}</span>
                </span>
                <span className="flex items-center gap-0.5">
                  <Images className="h-3 w-3" />
                  <span className="font-bold text-foreground">{tCarousel}</span>
                </span>
                <span className="flex items-center gap-0.5">
                  <ScrollText className="h-3 w-3" />
                  <span className="font-bold text-foreground">{tScript}</span>
                </span>
                <span className="font-bold text-primary">{tContent + tImages + tCarousel + tScript}</span>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export function AdminWorkspacesTab() {
  const { workspaces, stats, isLoading, updateWorkspacePlan, deleteWorkspace, cleanupOrphans, isCleaningUp, isUpdating, refetch } = useAdminWorkspaces();
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isAutoCreated = (slug: string) => UUID_REGEX.test(slug);

  async function handleCleanup() {
    // First dry run to show count
    const result = await cleanupOrphans(true);
    if (result.orphan_count === 0) {
      toast.info("Không có workspace thừa nào cần dọn dẹp");
      return;
    }
    if (confirm(`Tìm thấy ${result.orphan_count} workspace tự động thừa. Xóa tất cả?`)) {
      await cleanupOrphans(false);
    }
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

  const filtered = useMemo(() => {
    return workspaces.filter((ws) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        ws.name.toLowerCase().includes(q) ||
        (ws.owner?.email || "").toLowerCase().includes(q) ||
        (ws.owner?.full_name || "").toLowerCase().includes(q);
      const plan = ws.subscription?.plan_type || "free";
      const matchesPlan = planFilter === "all" || plan === planFilter;
      return matchesSearch && matchesPlan;
    });
  }, [workspaces, searchQuery, planFilter]);

  const filteredTotals = useMemo(() => {
    return filtered.reduce(
      (acc, ws) => ({
        members: acc.members + ws.member_count,
        brands: acc.brands + ws.brand_count,
        contents: acc.contents + ws.content_count,
        images: acc.images + ws.image_count,
        total: acc.total + ws.content_count + ws.image_count + ws.carousel_count + ws.script_count,
      }),
      { members: 0, brands: 0, contents: 0, images: 0, total: 0 }
    );
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function exportCSV() {
    const headers = ["Workspace", "Owner Email", "Members", "Plan", "Status", "Created"];
    const rows = filtered.map((ws) => [
      ws.name,
      ws.owner?.email || "",
      ws.member_count,
      ws.subscription?.plan_type || "free",
      ws.subscription?.status || "N/A",
      ws.created_at,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workspaces-export-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã export ${filtered.length} workspaces`);
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng Workspaces</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalWorkspaces || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trả phí</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.paidWorkspaces || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats?.mrr || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">TB Thành viên</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgMembers || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-4 w-4" />
            Phân bổ Plans theo Workspace
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(stats?.byPlan || {}).map(([plan, count]) => (
              <div key={plan} className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-xl font-bold">{count as number}</div>
                <div className="text-xs text-muted-foreground capitalize">{plan}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Danh sách Workspaces
              </CardTitle>
              <CardDescription>Quản lý workspace và plan tính phí</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleCleanup} disabled={isCleaningUp}>
                {isCleaningUp ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Dọn dẹp WS thừa
              </Button>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm workspace hoặc owner..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-center">Thành viên</TableHead>
                    <TableHead className="text-center text-muted-foreground">Brands</TableHead>
                    <TableHead className="text-center border-l border-border/50">Nội dung</TableHead>
                    <TableHead className="text-center">Ảnh</TableHead>
                    <TableHead className="text-center font-bold">Tổng</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        Không tìm thấy workspace
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((ws) => {
                      const plan = ws.subscription?.plan_type || "free";
                      const status = ws.subscription?.status || "N/A";
                      const isExpanded = expandedId === ws.id;
                      return (
                        <> 
                          <TableRow
                            key={ws.id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setExpandedId(isExpanded ? null : ws.id)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isExpanded && "rotate-180")} />
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={ws.logo_url || undefined} />
                                  <AvatarFallback className="text-xs" style={{ backgroundColor: ws.primary_color + "20", color: ws.primary_color }}>
                                    {ws.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium text-sm">{ws.name}</div>
                                  {!isAutoCreated(ws.slug) && <div className="text-xs text-muted-foreground">{ws.slug}</div>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {ws.owner ? (
                                <div>
                                  <div className="text-sm">{ws.owner.full_name || ws.owner.email}</div>
                                  <div className="text-xs text-muted-foreground">{ws.owner.email}</div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="font-mono">
                                {ws.member_count}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm text-muted-foreground">{ws.brand_count}</span>
                            </TableCell>
                            <TableCell className="text-center border-l border-border/50">
                              <span className="text-sm font-medium">{ws.content_count}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm font-medium">{ws.image_count}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm font-bold text-primary">{ws.content_count + ws.image_count + ws.carousel_count + ws.script_count}</span>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Select
                                value={plan}
                                onValueChange={(v) => updateWorkspacePlan({ organizationId: ws.id, planType: v })}
                                disabled={isUpdating}
                              >
                                <SelectTrigger className="w-[120px] h-7 text-xs">
                                  <Badge className={`${planColors[plan] || planColors.free} border-0 text-xs`}>
                                    {plan.charAt(0).toUpperCase() + plan.slice(1)}
                                  </Badge>
                                </SelectTrigger>
                                <SelectContent>
                                  {["free", "starter", "pro", "business", "enterprise"].map((p) => (
                                    <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${statusColors[status] || statusColors.expired} border-0 text-xs`}>
                                {status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(ws.created_at), "dd/MM/yyyy", { locale: vi })}
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Xóa workspace "{ws.name}"?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Hành động này sẽ xóa workspace và toàn bộ dữ liệu liên quan. Không thể hoàn tác.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteWorkspace(ws.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Xóa
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={ws.id + "-detail"}>
                              <TableCell colSpan={11} className="p-0">
                                <WorkspaceDetailPanel orgId={ws.id} />
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })
                  )}
                </TableBody>
                {filtered.length > 0 && (
                  <tfoot>
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={2} className="text-sm font-semibold">
                        Tổng ({filtered.length} workspaces)
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono">{filteredTotals.members}</Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">{filteredTotals.brands}</TableCell>
                      <TableCell className="text-center font-semibold text-sm border-l border-border/50">{filteredTotals.contents}</TableCell>
                      <TableCell className="text-center font-semibold text-sm">{filteredTotals.images}</TableCell>
                      <TableCell className="text-center font-bold text-sm text-primary">{filteredTotals.total}</TableCell>
                      <TableCell colSpan={4} />
                    </TableRow>
                  </tfoot>
                )}
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {filtered.length} workspaces · Trang {currentPage}/{totalPages}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
