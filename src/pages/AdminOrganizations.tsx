import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Building2, Search, Users, ChevronLeft, ChevronRight,
  ArrowUpDown, ArrowUp, ArrowDown, Plus, Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OrgDetailSheet } from "@/components/admin/OrgDetailSheet";

const PAGE_SIZE = 20;

type SortField = "name" | "members" | "date";
type SortDir = "asc" | "desc";

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  owner_id: string;
  created_at: string;
  member_count: number;
  owner_name: string | null;
  owner_email: string | null;
}

export default function AdminOrganizations() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedOrg, setSelectedOrg] = useState<OrgRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (orgsError) throw orgsError;

      // Fetch member counts
      const { data: membersData, error: membersError } = await supabase
        .from("organization_members")
        .select("organization_id");

      if (membersError) throw membersError;

      // Count members per org
      const memberCounts: Record<string, number> = {};
      membersData?.forEach((m: any) => {
        memberCounts[m.organization_id] = (memberCounts[m.organization_id] || 0) + 1;
      });

      // Fetch owner profiles
      const ownerIds = [...new Set(orgsData?.map((o: any) => o.owner_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ownerIds);

      const profileMap: Record<string, { full_name: string | null; email: string }> = {};
      profiles?.forEach((p: any) => {
        profileMap[p.id] = { full_name: p.full_name, email: p.email };
      });

      const rows: OrgRow[] = (orgsData || []).map((o: any) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        logo_url: o.logo_url,
        primary_color: o.primary_color,
        owner_id: o.owner_id,
        created_at: o.created_at,
        member_count: memberCounts[o.id] || 0,
        owner_name: profileMap[o.owner_id]?.full_name || null,
        owner_email: profileMap[o.owner_id]?.email || null,
      }));

      setOrgs(rows);
    } catch (err: any) {
      toast.error("Lỗi tải danh sách tổ chức: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

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

  const filteredAndSorted = useMemo(() => {
    let filtered = orgs;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.slug.toLowerCase().includes(q) ||
          (o.owner_email && o.owner_email.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "members":
          cmp = a.member_count - b.member_count;
          break;
        case "date":
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return filtered;
  }, [orgs, searchQuery, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE));
  const pageData = filteredAndSorted.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const stats = useMemo(() => ({
    total: orgs.length,
    totalMembers: orgs.reduce((s, o) => s + o.member_count, 0),
  }), [orgs]);

  if (loading) {
    return (
      <div className="container py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Quản lý Tổ chức</h1>
            <p className="text-sm text-muted-foreground">
              Xem và quản lý tất cả tổ chức trong hệ thống
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng tổ chức</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng thành viên</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">TB thành viên/org</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total > 0 ? (stats.totalMembers / stats.total).toFixed(1) : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, slug, email owner..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary">{filteredAndSorted.length} kết quả</Badge>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center">Tên tổ chức <SortIcon field="name" /></div>
                </TableHead>
                <TableHead>Owner</TableHead>
                <TableHead
                  className="cursor-pointer select-none text-center"
                  onClick={() => handleSort("members")}
                >
                  <div className="flex items-center justify-center">Thành viên <SortIcon field="members" /></div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("date")}
                >
                  <div className="flex items-center">Ngày tạo <SortIcon field="date" /></div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Không tìm thấy tổ chức nào
                  </TableCell>
                </TableRow>
              ) : (
                pageData.map((org) => (
                  <TableRow
                    key={org.id}
                    className="cursor-pointer"
                    onClick={() => { setSelectedOrg(org); setDetailOpen(true); }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-primary-foreground"
                          style={{ backgroundColor: org.primary_color || 'hsl(var(--primary))' }}
                        >
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{org.name}</div>
                          <div className="text-xs text-muted-foreground">{org.slug}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{org.owner_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{org.owner_email}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{org.member_count}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(org.created_at), "dd/MM/yyyy", { locale: vi })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Trang {currentPage}/{totalPages} · {filteredAndSorted.length} tổ chức
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <OrgDetailSheet
        org={selectedOrg}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onRefresh={fetchOrgs}
      />
    </div>
  );
}
