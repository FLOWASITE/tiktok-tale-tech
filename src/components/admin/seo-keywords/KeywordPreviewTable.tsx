import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader2, Save, CheckSquare, Square, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface PreviewKeyword {
  keyword: string;
  search_volume: number;
  difficulty: number;
  cpc_vnd?: number;
  intent: string;
  funnel_stage: string;
  cluster_name: string;
  rationale?: string;
  source_seed?: string;
  is_gap?: boolean;
}

interface Props {
  jobId: string;
  keywords: PreviewKeyword[];
  isStreaming: boolean;
  onSaved?: (inserted: number, enrichJobId: string | null) => void;
}

const INTENT_COLORS: Record<string, string> = {
  informational: "bg-blue-50 text-blue-700 border-blue-200",
  commercial: "bg-amber-50 text-amber-700 border-amber-200",
  transactional: "bg-emerald-50 text-emerald-700 border-emerald-200",
  navigational: "bg-purple-50 text-purple-700 border-purple-200",
};

export default function KeywordPreviewTable({ jobId, keywords, isStreaming, onSaved }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [intentFilter, setIntentFilter] = useState<string | null>(null);
  const [funnelFilter, setFunnelFilter] = useState<string | null>(null);
  const [gapOnly, setGapOnly] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    return keywords.filter(k => {
      if (filter && !k.keyword.toLowerCase().includes(filter.toLowerCase())) return false;
      if (intentFilter && k.intent !== intentFilter) return false;
      if (funnelFilter && k.funnel_stage !== funnelFilter) return false;
      if (gapOnly && !k.is_gap) return false;
      return true;
    });
  }, [keywords, filter, intentFilter, funnelFilter, gapOnly]);

  const toggle = (kw: string) => {
    const next = new Set(selected);
    next.has(kw) ? next.delete(kw) : next.add(kw);
    setSelected(next);
  };
  const selectAll = () => setSelected(new Set(filtered.map(k => k.keyword)));
  const selectGaps = () => setSelected(new Set(filtered.filter(k => k.is_gap).map(k => k.keyword)));
  const clear = () => setSelected(new Set());

  const handleSave = async () => {
    if (!selected.size) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("keyword-research-save", {
        body: { jobId, selectedKeywords: [...selected], autoEnrich: true, locale: "vi" },
      });
      if (error) throw error;
      toast.success(`Đã lưu ${data.inserted} keyword${data.enrichJobId ? " + đang enrich top 10" : ""}`);
      setSelected(new Set());
      onSaved?.(data.inserted, data.enrichJobId);
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi lưu");
    } finally {
      setSaving(false);
    }
  };

  const gapCount = keywords.filter(k => k.is_gap).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Preview {keywords.length > 0 && `(${keywords.length})`}
            {isStreaming && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            {gapCount > 0 && <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">{gapCount} gap mới</Badge>}
          </CardTitle>
          <Button size="sm" onClick={handleSave} disabled={saving || !selected.size}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Lưu {selected.size} keyword
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <Input placeholder="Lọc..." value={filter} onChange={e => setFilter(e.target.value)} className="h-8 w-44" />
          <select value={intentFilter || ""} onChange={e => setIntentFilter(e.target.value || null)}
            className="h-8 px-2 rounded border text-xs bg-background">
            <option value="">Mọi intent</option>
            <option value="informational">Info</option>
            <option value="commercial">Commercial</option>
            <option value="transactional">Transactional</option>
            <option value="navigational">Navigational</option>
          </select>
          <select value={funnelFilter || ""} onChange={e => setFunnelFilter(e.target.value || null)}
            className="h-8 px-2 rounded border text-xs bg-background">
            <option value="">Mọi funnel</option>
            <option value="TOFU">TOFU</option>
            <option value="MOFU">MOFU</option>
            <option value="BOFU">BOFU</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox checked={gapOnly} onCheckedChange={v => setGapOnly(!!v)} /> Chỉ gap
          </label>
          <div className="ml-auto flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectAll}><CheckSquare className="h-3 w-3 mr-1" />Tất cả ({filtered.length})</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectGaps}>Chọn gap</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clear}><Square className="h-3 w-3 mr-1" />Xoá</Button>
          </div>
        </div>

        <div className="border rounded max-h-[480px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0 text-xs">
              <tr>
                <th className="p-2 w-8"></th>
                <th className="p-2 text-left">Keyword</th>
                <th className="p-2 text-right">Vol</th>
                <th className="p-2 text-right">KD</th>
                <th className="p-2 text-left">Intent</th>
                <th className="p-2 text-left">Funnel</th>
                <th className="p-2 text-left">Cluster</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((k, i) => {
                const isSel = selected.has(k.keyword);
                return (
                  <tr key={i} className={`border-t hover:bg-muted/30 cursor-pointer ${isSel ? "bg-primary/5" : ""}`} onClick={() => toggle(k.keyword)}>
                    <td className="p-2"><Checkbox checked={isSel} onCheckedChange={() => toggle(k.keyword)} /></td>
                    <td className="p-2 font-medium">{k.keyword}</td>
                    <td className="p-2 text-right tabular-nums">{k.search_volume?.toLocaleString() || 0}</td>
                    <td className="p-2 text-right tabular-nums">{k.difficulty || 0}</td>
                    <td className="p-2"><span className={`text-[10px] px-1.5 py-0.5 rounded border ${INTENT_COLORS[k.intent] || ""}`}>{k.intent}</span></td>
                    <td className="p-2 text-xs">{k.funnel_stage}</td>
                    <td className="p-2 text-xs text-muted-foreground truncate max-w-[140px]">{k.cluster_name}</td>
                    <td className="p-2">{k.is_gap && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Mới</Badge>}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && !isStreaming && (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground text-xs">Không có keyword khớp filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
