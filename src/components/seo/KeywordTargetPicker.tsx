import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, X, Plus, Search } from "lucide-react";

interface KeywordRow {
  id: string;
  keyword: string;
  search_volume: number | null;
  difficulty: number | null;
  intent: string | null;
}

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  max?: number;
}

export default function KeywordTargetPicker({ selectedIds, onChange, max = 5 }: Props) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
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
