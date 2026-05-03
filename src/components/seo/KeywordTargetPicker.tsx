import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, X, Plus, Search, Sparkles, RotateCcw, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface KeywordRow {
  id: string;
  keyword: string;
  search_volume: number | null;
  difficulty: number | null;
  intent: string | null;
  is_pillar?: boolean | null;
  priority_score?: number | null;
}

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  /** Khi truyền vào, picker chuyển sang inline checklist scope theo cluster */
  clusterId?: string | null;
}

const intentColors: Record<string, string> = {
  informational: "bg-blue-50 text-blue-700 border-blue-200",
  commercial: "bg-amber-50 text-amber-700 border-amber-200",
  transactional: "bg-emerald-50 text-emerald-700 border-emerald-200",
  navigational: "bg-violet-50 text-violet-700 border-violet-200",
};

function shortIntent(s: string | null): string {
  if (!s) return "";
  const k = s.toLowerCase();
  if (k.startsWith("info")) return "Info";
  if (k.startsWith("comm")) return "Comm";
  if (k.startsWith("trans")) return "Trans";
  if (k.startsWith("nav")) return "Nav";
  return s;
}

export default function KeywordTargetPicker({
  selectedIds,
  onChange,
  max = 5,
  clusterId,
}: Props) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  if (clusterId) {
    return (
      <ClusterScopedPicker
        clusterId={clusterId}
        selectedIds={selectedIds}
        onChange={onChange}
        max={max}
        orgId={orgId}
      />
    );
  }

  return (
    <OrgWidePopoverPicker
      selectedIds={selectedIds}
      onChange={onChange}
      max={max}
      orgId={orgId}
    />
  );
}

/* ============================================================
 * Inline cluster-scoped checklist (primary UX after pillar pick)
 * ============================================================ */
function ClusterScopedPicker({
  clusterId,
  selectedIds,
  onChange,
  max,
  orgId,
}: {
  clusterId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  max: number;
  orgId: string | undefined;
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);

  const { data: keywords = [], isLoading } = useQuery({
    queryKey: ["seo-keywords-cluster", orgId, clusterId],
    enabled: !!orgId && !!clusterId,
    staleTime: 60_000,
    queryFn: async (): Promise<KeywordRow[]> => {
      const { data } = await supabase
        .from("seo_keywords")
        .select("id,keyword,search_volume,difficulty,intent,is_pillar,priority_score")
        .eq("organization_id", orgId!)
        .eq("cluster_id", clusterId)
        .order("is_pillar", { ascending: false })
        .order("priority_score", { ascending: false, nullsFirst: false })
        .limit(50);
      return (data as KeywordRow[]) || [];
    },
  });

  // Re-fetch any selected keyword that's not in the cluster list (safety for old data)
  const missingIds = useMemo(
    () => selectedIds.filter((id) => !keywords.some((k) => k.id === id)),
    [selectedIds, keywords]
  );
  const { data: extraSelected = [] } = useQuery({
    queryKey: ["seo-keywords-extra", orgId, missingIds],
    enabled: !!orgId && missingIds.length > 0,
    queryFn: async (): Promise<KeywordRow[]> => {
      const { data } = await supabase
        .from("seo_keywords")
        .select("id,keyword,search_volume,difficulty,intent,is_pillar,priority_score")
        .in("id", missingIds);
      return (data as KeywordRow[]) || [];
    },
  });

  const allRows: KeywordRow[] = useMemo(
    () => [...extraSelected, ...keywords],
    [keywords, extraSelected]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((k) => k.keyword.toLowerCase().includes(q));
  }, [allRows, search]);

  const visible = expanded ? filtered : filtered.slice(0, 8);
  const hiddenCount = Math.max(0, filtered.length - visible.length);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      if (selectedIds.length >= max) {
        toast.warning(`Đã đạt giới hạn ${max} keyword. Bỏ chọn 1 keyword khác trước.`);
        return;
      }
      onChange([...selectedIds, id]);
    }
  };

  const pickTopN = () => {
    const top = keywords.slice(0, max).map((k) => k.id);
    onChange(top);
  };

  const clearAll = () => onChange([]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground border rounded-lg bg-muted/30">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải keyword của pillar...
      </div>
    );
  }

  if (allRows.length === 0) {
    return (
      <div className="p-3 text-xs text-muted-foreground border rounded-lg bg-muted/30 flex items-center justify-between gap-2">
        <span>Pillar này chưa có keyword nào.</span>
        <Link
          to="/seo?tab=plan"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          <LinkIcon className="h-3 w-3" />
          Thêm keyword
        </Link>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/20">
        <div className="text-[11px] text-muted-foreground">
          <span className={selectedIds.length >= max ? "text-foreground font-medium" : ""}>
            {selectedIds.length}/{max} đã chọn
          </span>
          {keywords.length > 0 && (
            <span> · {keywords.length} keyword trong pillar</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] gap-1"
            onClick={pickTopN}
            title={`Chọn nhanh ${max} keyword ưu tiên cao nhất`}
          >
            <Sparkles className="h-3 w-3" />
            Top {max}
          </Button>
          {selectedIds.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] gap-1 text-muted-foreground"
              onClick={clearAll}
            >
              <RotateCcw className="h-3 w-3" />
              Bỏ chọn
            </Button>
          )}
        </div>
      </div>

      {/* Search (only when many keywords) */}
      {allRows.length > 10 && (
        <div className="border-b px-2 py-1.5 flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            placeholder="Lọc keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 border-0 focus-visible:ring-0 px-0 text-xs"
          />
        </div>
      )}

      {/* List */}
      <div className="max-h-[280px] overflow-y-auto">
        {visible.length === 0 ? (
          <div className="p-3 text-xs text-muted-foreground text-center">
            Không có keyword khớp "{search}"
          </div>
        ) : (
          visible.map((k) => {
            const checked = selectedIds.includes(k.id);
            const intent = shortIntent(k.intent);
            const intentClass =
              k.intent && intentColors[k.intent.toLowerCase()]
                ? intentColors[k.intent.toLowerCase()]
                : "bg-muted text-muted-foreground border-border";
            return (
              <label
                key={k.id}
                className={`flex items-center gap-2.5 px-3 py-2 border-b last:border-0 cursor-pointer transition-colors ${
                  checked ? "bg-primary/5" : "hover:bg-muted/40"
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(k.id)}
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm truncate">{k.keyword}</span>
                    {k.is_pillar && (
                      <Badge
                        variant="outline"
                        className="text-[9px] h-4 px-1 border-primary/40 text-primary bg-primary/5"
                      >
                        PILLAR
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {intent && (
                      <span
                        className={`text-[10px] h-4 px-1 rounded border inline-flex items-center ${intentClass}`}
                      >
                        {intent}
                      </span>
                    )}
                    {k.search_volume != null && (
                      <span className="text-[10px] text-muted-foreground">
                        Vol {k.search_volume.toLocaleString()}
                      </span>
                    )}
                    {k.difficulty != null && (
                      <span className="text-[10px] text-muted-foreground">
                        KD {k.difficulty}
                      </span>
                    )}
                  </div>
                </div>
              </label>
            );
          })
        )}
      </div>

      {/* Show more */}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full text-center py-1.5 text-[11px] text-primary hover:bg-muted/30 border-t"
        >
          Xem thêm {hiddenCount} keyword
        </button>
      )}
    </div>
  );
}

/* ============================================================
 * Org-wide popover (legacy, used when clusterId is null)
 * ============================================================ */
function OrgWidePopoverPicker({
  selectedIds,
  onChange,
  max,
  orgId,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  max: number;
  orgId: string | undefined;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data: selected = [] } = useQuery({
    queryKey: ["seo-keywords-selected", orgId, selectedIds],
    enabled: !!orgId && selectedIds.length > 0,
    queryFn: async (): Promise<KeywordRow[]> => {
      const { data } = await supabase
        .from("seo_keywords")
        .select("id,keyword,search_volume,difficulty,intent")
        .in("id", selectedIds)
        .eq("organization_id", orgId!);
      return (data as KeywordRow[]) || [];
    },
  });

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["seo-keywords-picker", orgId, search],
    enabled: !!orgId && open,
    queryFn: async (): Promise<KeywordRow[]> => {
      let q = supabase
        .from("seo_keywords")
        .select("id,keyword,search_volume,difficulty,intent")
        .eq("organization_id", orgId!)
        .order("priority_score", { ascending: false })
        .limit(50);
      if (search.trim()) q = q.ilike("keyword", `%${search.trim()}%`);
      const { data } = await q;
      return (data as KeywordRow[]) || [];
    },
  });

  const filteredResults = useMemo(
    () => results.filter((r) => !selectedIds.includes(r.id)),
    [results, selectedIds]
  );

  const add = (id: string) => {
    if (selectedIds.length >= max) return;
    onChange([...selectedIds, id]);
  };
  const remove = (id: string) => onChange(selectedIds.filter((x) => x !== id));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {selected.map((k) => (
          <Badge key={k.id} variant="secondary" className="gap-1 pr-1">
            <span className="max-w-[180px] truncate">{k.keyword}</span>
            {k.search_volume ? (
              <span className="text-[10px] text-muted-foreground">
                {k.search_volume.toLocaleString()}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => remove(k.id)}
              className="ml-0.5 rounded-sm hover:bg-muted p-0.5"
              aria-label="Remove"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {selected.length === 0 && (
          <span className="text-xs text-muted-foreground">Chưa chọn keyword nào</span>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={selectedIds.length >= max}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm keyword ({selectedIds.length}/{max})
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[420px] p-0" align="start">
          <div className="border-b p-2 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Tìm keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 border-0 focus-visible:ring-0 px-0"
            />
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                Không có keyword phù hợp
              </div>
            ) : (
              filteredResults.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => {
                    add(k.id);
                    setSearch("");
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b last:border-0 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{k.keyword}</div>
                    <div className="flex gap-1.5 mt-0.5">
                      {k.intent && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                          {k.intent}
                        </Badge>
                      )}
                      {k.search_volume != null && (
                        <span className="text-[10px] text-muted-foreground">
                          Vol: {k.search_volume.toLocaleString()}
                        </span>
                      )}
                      {k.difficulty != null && (
                        <span className="text-[10px] text-muted-foreground">
                          KD: {k.difficulty}
                        </span>
                      )}
                    </div>
                  </div>
                  <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
