import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  HardDrive, Database, Trash2, RefreshCw, Search, Eye, ExternalLink,
  AlertTriangle, FileWarning, Clock, ArrowDown, ArrowUp, Image as ImageIcon, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

// --- helpers
function fmtBytes(b: number | null | undefined) {
  if (!b) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0; let v = b;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 ? 2 : 1)} ${units[i]}`;
}
function fmtTime(t: string | null | undefined) {
  if (!t) return "—";
  try { return formatDistanceToNow(new Date(t), { addSuffix: true, locale: vi }); }
  catch { return "—"; }
}
async function call(action: string, payload: any = {}) {
  const { data, error } = await supabase.functions.invoke("admin-storage-manager", {
    body: { action, ...payload },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

const TABLE_LABELS: Record<string, string> = {
  ai_response_cache: "AI Response Cache",
  web_search_cache: "Web Search Cache",
  knowledge_graph_cache: "Knowledge Graph Cache",
  telegram_example_cache: "Telegram Example Cache",
  edge_function_metrics: "Edge Function Metrics",
  agent_execution_logs: "Agent Execution Logs",
  agent_pipeline_logs: "Agent Pipeline Logs",
  cron_run_logs: "Cron Run Logs",
  admin_audit_logs: "Admin Audit Logs",
  campaign_kpi_logs: "Campaign KPI Logs",
  regulation_propagation_log: "Regulation Propagation",
  usage_logs: "Usage Logs",
  telegram_messages_log: "Telegram Messages",
  sales_chat_messages_log: "Sales Chat Messages",
  content_publishing_logs: "Content Publishing Logs",
  approval_logs: "Approval Logs",
  campaign_notification_logs: "Campaign Notifications",
  content_embeddings: "Content Embeddings",
  conversation_embeddings: "Conversation Embeddings",
  generation_tasks: "Generation Tasks",
  workflow_checkpoints: "Workflow Checkpoints",
  telegram_processed_updates: "Telegram Processed Updates",
  telegram_chat_state: "Telegram Chat State",
};
const SUPPORTS_EXPIRED = new Set([
  "ai_response_cache", "web_search_cache", "knowledge_graph_cache", "generation_tasks",
]);

type DbStat = {
  table_name: string;
  category: string;
  row_count: number;
  size_bytes: number;
  size_pretty: string;
  oldest_record: string | null;
  newest_record: string | null;
};
type BucketSummary = {
  id: string; name: string; public: boolean;
  file_count: number; total_size: number; created_at: string;
};

export default function AdminStorageMemory() {
  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">File &amp; Bộ nhớ Hệ thống</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý storage buckets, cache, log và embeddings — bổ sung cho cron tự động.
          </p>
        </div>
      </div>

      <Tabs defaultValue="storage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="storage"><HardDrive className="h-4 w-4 mr-2" />Storage Buckets</TabsTrigger>
          <TabsTrigger value="memory"><Database className="h-4 w-4 mr-2" />Bộ nhớ DB</TabsTrigger>
          <TabsTrigger value="audit"><Clock className="h-4 w-4 mr-2" />Lịch sử dọn dẹp</TabsTrigger>
        </TabsList>
        <TabsContent value="storage"><StorageTab /></TabsContent>
        <TabsContent value="memory"><MemoryTab /></TabsContent>
        <TabsContent value="audit"><AuditTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Storage Tab ---------------- */
function StorageTab() {
  const qc = useQueryClient();
  const overview = useQuery({
    queryKey: ["admin-storage-overview"],
    queryFn: () => call("get_overview"),
  });
  const buckets: BucketSummary[] = overview.data?.buckets || [];
  const [activeBucket, setActiveBucket] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {overview.isLoading && <Card><CardContent className="p-6 text-sm text-muted-foreground">Đang tải...</CardContent></Card>}
        {buckets.map((b) => (
          <Card key={b.id} className={`cursor-pointer transition ${activeBucket === b.id ? "ring-2 ring-ring" : "hover:bg-muted/30"}`}
            onClick={() => setActiveBucket(b.id)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />{b.name}
                </CardTitle>
                <Badge variant={b.public ? "default" : "secondary"}>{b.public ? "Public" : "Private"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Số file</span><span className="font-medium">{b.file_count}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Dung lượng</span><span className="font-medium">{fmtBytes(b.total_size)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tạo lúc</span><span>{fmtTime(b.created_at)}</span></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {activeBucket && (
        <BucketBrowser bucket={activeBucket} onClose={() => setActiveBucket(null)} onChanged={() => qc.invalidateQueries({ queryKey: ["admin-storage-overview"] })} />
      )}
      {!activeBucket && buckets.length > 0 && (
        <div className="text-sm text-muted-foreground text-center py-4">Chọn 1 bucket ở trên để xem chi tiết file.</div>
      )}
    </div>
  );
}

function BucketBrowser({ bucket, onClose, onChanged }: { bucket: string; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"created_at" | "name">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [orphanOpen, setOrphanOpen] = useState(false);

  const list = useQuery({
    queryKey: ["bucket-files", bucket, search, sortBy, sortDir, offset],
    queryFn: () => call("list_bucket_files", { bucket, search, sortBy, sortDir, limit: 50, offset }),
  });
  const files = list.data?.files || [];
  const total = list.data?.total || 0;

  const delMut = useMutation({
    mutationFn: (paths: string[]) => call("delete_bucket_files", { bucket, paths }),
    onSuccess: (d) => {
      toast.success(`Đã xóa ${d?.deleted ?? 0} file`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["bucket-files", bucket] });
      onChanged();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const allChecked = files.length > 0 && files.every((f: any) => selected.has(f.name));
  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(files.map((f: any) => f.name)));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-lg">Bucket: {bucket}</CardTitle>
            <CardDescription>Tổng {total} file (theo bộ lọc hiện tại)</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOrphanOpen(true)}>
              <FileWarning className="h-4 w-4 mr-1" />Tìm orphan
            </Button>
            <Button variant="outline" size="sm" onClick={() => list.refetch()}>
              <RefreshCw className={`h-4 w-4 mr-1 ${list.isFetching ? "animate-spin" : ""}`} />Làm mới
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>Đóng</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Tìm theo tên file..." className="pl-9" value={search}
              onChange={(e) => { setSearch(e.target.value); setOffset(0); }} />
          </div>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Ngày tạo</SelectItem>
              <SelectItem value="name">Tên</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}>
            {sortDir === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          </Button>
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4 mr-1" />Xóa {selected.size} file
            </Button>
          )}
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={allChecked} onCheckedChange={toggleAll} /></TableHead>
                <TableHead>Tên file</TableHead>
                <TableHead className="w-24">Size</TableHead>
                <TableHead className="w-40">Tạo lúc</TableHead>
                <TableHead className="w-32 text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Đang tải...</TableCell></TableRow>}
              {!list.isLoading && files.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Không có file</TableCell></TableRow>}
              {files.map((f: any) => (
                <TableRow key={f.name}>
                  <TableCell><Checkbox checked={selected.has(f.name)} onCheckedChange={(c) => {
                    const s = new Set(selected);
                    if (c) s.add(f.name); else s.delete(f.name);
                    setSelected(s);
                  }} /></TableCell>
                  <TableCell className="font-mono text-xs truncate max-w-[420px]" title={f.name}>
                    <div className="flex items-center gap-2">
                      {f.mimetype?.startsWith("image/") ? <ImageIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                      {f.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{fmtBytes(f.size)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtTime(f.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setPreviewUrl(f.public_url)} title="Xem">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" asChild title="Mở tab mới">
                      <a href={f.public_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => delMut.mutate([f.name])} title="Xóa">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {total > offset + 50 && (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => setOffset(offset + 50)}>Tải thêm 50</Button>
          </div>
        )}
      </CardContent>

      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Xem trước</DialogTitle></DialogHeader>
          {previewUrl && (
            <div className="flex justify-center bg-muted/30 rounded-md p-4 max-h-[70vh] overflow-auto">
              <img src={previewUrl} alt="preview" className="max-w-full h-auto" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa {selected.size} file?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. File sẽ bị xóa vĩnh viễn khỏi bucket <b>{bucket}</b>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => { delMut.mutate(Array.from(selected)); setConfirmDelete(false); }}>
              Xóa vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <OrphanDialog bucket={bucket} open={orphanOpen} onOpenChange={setOrphanOpen} onChanged={() => {
        qc.invalidateQueries({ queryKey: ["bucket-files", bucket] });
        onChanged();
      }} />
    </Card>
  );
}

function OrphanDialog({ bucket, open, onOpenChange, onChanged }: { bucket: string; open: boolean; onOpenChange: (o: boolean) => void; onChanged: () => void }) {
  const orphans = useQuery({
    queryKey: ["orphans", bucket],
    queryFn: () => call("find_orphan_files", { bucket }),
    enabled: open,
  });
  const list = orphans.data?.orphans || [];
  const totalSize = useMemo(() => list.reduce((s: number, o: any) => s + (o.size || 0), 0), [list]);
  const delMut = useMutation({
    mutationFn: (paths: string[]) => call("delete_bucket_files", { bucket, paths }),
    onSuccess: (d) => {
      toast.success(`Đã xóa ${d?.deleted ?? 0} orphan file (thu hồi ${fmtBytes(totalSize)})`);
      onOpenChange(false);
      onChanged();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>File orphan trong {bucket}</DialogTitle>
          <DialogDescription>
            File không được tham chiếu bởi <code>carousel_images</code>, <code>channel_image_history</code> hoặc <code>brand_templates</code>.
          </DialogDescription>
        </DialogHeader>
        {orphans.isLoading && <div className="text-sm text-muted-foreground py-6 text-center">Đang quét...</div>}
        {!orphans.isLoading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span><b>{list.length}</b> orphan • <b>{fmtBytes(totalSize)}</b> có thể thu hồi</span>
            </div>
            <div className="max-h-[300px] overflow-auto border rounded-md">
              <Table>
                <TableHeader><TableRow><TableHead>Tên</TableHead><TableHead className="w-24">Size</TableHead><TableHead className="w-32">Tạo</TableHead></TableRow></TableHeader>
                <TableBody>
                  {list.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Không có orphan</TableCell></TableRow>}
                  {list.map((o: any) => (
                    <TableRow key={o.name}>
                      <TableCell className="font-mono text-xs truncate max-w-[320px]">{o.name}</TableCell>
                      <TableCell className="text-xs">{fmtBytes(o.size)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtTime(o.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
          <Button variant="destructive" disabled={list.length === 0 || delMut.isPending}
            onClick={() => delMut.mutate(list.map((o: any) => o.name))}>
            <Trash2 className="h-4 w-4 mr-1" />Xóa toàn bộ orphan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Memory Tab ---------------- */
function MemoryTab() {
  const stats = useQuery({
    queryKey: ["db-memory-stats"],
    queryFn: () => call("get_overview"),
  });
  const dbStats: DbStat[] = stats.data?.db_stats || [];
  const grouped = useMemo(() => {
    const g: Record<string, DbStat[]> = {};
    for (const s of dbStats) {
      g[s.category] = g[s.category] || [];
      g[s.category].push(s);
    }
    return g;
  }, [dbStats]);

  const totalRows = dbStats.reduce((s, x) => s + Number(x.row_count || 0), 0);
  const totalSize = dbStats.reduce((s, x) => s + Number(x.size_bytes || 0), 0);

  const CATS: Array<{ key: string; label: string; desc: string }> = [
    { key: "cache", label: "Cache", desc: "AI response, web search, knowledge graph" },
    { key: "log", label: "Log", desc: "Edge metrics, agent execution, audit" },
    { key: "embedding", label: "Embedding", desc: "Vector embeddings (pgvector)" },
    { key: "task", label: "Task tạm", desc: "Generation tasks, workflow checkpoints" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Database} label="Tổng số bảng" value={dbStats.length} />
        <StatCard icon={FileText} label="Tổng số rows" value={totalRows.toLocaleString()} />
        <StatCard icon={HardDrive} label="Tổng dung lượng" value={fmtBytes(totalSize)} />
        <StatCard icon={RefreshCw} label="Cập nhật" value={stats.dataUpdatedAt ? fmtTime(new Date(stats.dataUpdatedAt).toISOString()) : "—"}
          action={<Button variant="ghost" size="sm" onClick={() => stats.refetch()}><RefreshCw className={`h-3.5 w-3.5 ${stats.isFetching ? "animate-spin" : ""}`} /></Button>} />
      </div>

      {CATS.map((cat) => (
        <Card key={cat.key}>
          <CardHeader>
            <CardTitle className="text-base">{cat.label}</CardTitle>
            <CardDescription>{cat.desc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(grouped[cat.key] || []).map((s) => (
                <TableCleanupCard key={s.table_name} stat={s} onChanged={() => stats.refetch()} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, action }: { icon: any; label: string; value: any; action?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold tracking-tight mt-1">{value}</div>
        </div>
        <div className="flex items-center gap-1">
          {action}
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

function TableCleanupCard({ stat, onChanged }: { stat: DbStat; onChanged: () => void }) {
  const [days, setDays] = useState<number>(30);
  const [confirm, setConfirm] = useState<null | { mode: "all" | "older_than"; days?: number }>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const cleanupMut = useMutation({
    mutationFn: (vars: { mode: string; days?: number }) =>
      call("cleanup_table", { table: stat.table_name, mode: vars.mode, days: vars.days }),
    onSuccess: (d) => {
      toast.success(`Đã xóa ${d?.rows_deleted ?? 0} dòng từ ${stat.table_name}`);
      onChanged();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const supportsExpired = SUPPORTS_EXPIRED.has(stat.table_name);

  return (
    <div className="border rounded-md p-3 space-y-3 bg-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{TABLE_LABELS[stat.table_name] || stat.table_name}</div>
          <div className="text-xs text-muted-foreground font-mono truncate">{stat.table_name}</div>
        </div>
        <Badge variant="outline" className="shrink-0">{stat.size_pretty}</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div><div className="text-muted-foreground">Rows</div><div className="font-semibold">{Number(stat.row_count).toLocaleString()}</div></div>
        <div><div className="text-muted-foreground">Cũ nhất</div><div className="font-medium">{fmtTime(stat.oldest_record)}</div></div>
        <div><div className="text-muted-foreground">Mới nhất</div><div className="font-medium">{fmtTime(stat.newest_record)}</div></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {supportsExpired && (
          <Button size="sm" variant="outline" disabled={cleanupMut.isPending}
            onClick={() => cleanupMut.mutate({ mode: "expired" })}>
            Xóa expired
          </Button>
        )}
        <div className="flex items-center gap-1">
          <Input type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-16 h-8" />
          <span className="text-xs text-muted-foreground">ngày</span>
          <Button size="sm" variant="outline" disabled={cleanupMut.isPending}
            onClick={() => setConfirm({ mode: "older_than", days })}>
            Xóa cũ hơn
          </Button>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setPreviewOpen(true)}>
          <Eye className="h-3.5 w-3.5 mr-1" />Xem
        </Button>
        <Button size="sm" variant="ghost" className="text-destructive ml-auto"
          onClick={() => setConfirm({ mode: "all" })} disabled={cleanupMut.isPending}>
          <Trash2 className="h-3.5 w-3.5 mr-1" />Xóa tất cả
        </Button>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Xác nhận xóa dữ liệu
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.mode === "all"
                ? <>Bạn sắp xóa <b>TOÀN BỘ {Number(stat.row_count).toLocaleString()} dòng</b> từ <code>{stat.table_name}</code>. Không thể hoàn tác.</>
                : <>Bạn sắp xóa các dòng cũ hơn <b>{confirm?.days} ngày</b> từ <code>{stat.table_name}</code>. Không thể hoàn tác.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirm) cleanupMut.mutate(confirm);
              setConfirm(null);
            }}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PreviewDialog table={stat.table_name} open={previewOpen} onOpenChange={setPreviewOpen} />
    </div>
  );
}

function PreviewDialog({ table, open, onOpenChange }: { table: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const q = useQuery({
    queryKey: ["preview", table],
    queryFn: () => call("preview_table", { table, limit: 10 }),
    enabled: open,
  });
  const rows = q.data?.rows || [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>10 dòng gần nhất • {table}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          <pre className="text-xs bg-muted/30 p-3 rounded-md">{JSON.stringify(rows, null, 2)}</pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Audit Tab ---------------- */
function AuditTab() {
  const q = useQuery({
    queryKey: ["audit-history"],
    queryFn: () => call("audit_history", { limit: 50 }),
  });
  const logs = q.data?.logs || [];
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Lịch sử dọn dẹp</CardTitle>
            <CardDescription>50 thao tác xóa gần nhất bởi admin</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => q.refetch()}>
            <RefreshCw className={`h-4 w-4 mr-1 ${q.isFetching ? "animate-spin" : ""}`} />Làm mới
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Thời gian</TableHead>
                <TableHead className="w-44">Hành động</TableHead>
                <TableHead>Đối tượng</TableHead>
                <TableHead className="w-24 text-right">Ảnh hưởng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Đang tải...</TableCell></TableRow>}
              {!q.isLoading && logs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Chưa có thao tác nào</TableCell></TableRow>}
              {logs.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs text-muted-foreground">{fmtTime(l.created_at)}</TableCell>
                  <TableCell><Badge variant="outline">{l.action}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">
                    {l.target_type}
                    {l.metadata?.mode && <span className="ml-2 text-muted-foreground">mode={l.metadata.mode}</span>}
                    {l.metadata?.days && <span className="ml-1 text-muted-foreground">({l.metadata.days}d)</span>}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {l.metadata?.rows_deleted ?? l.metadata?.count ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
