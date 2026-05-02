import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Suggestion {
  title: string;
  angle: string;
  keyword_ids: string[];
  intent: "TOFU" | "MOFU" | "BOFU";
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clusterId: string;
}

export default function SuggestTopicsDialog({ open, onOpenChange, clusterId }: Props) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [titles, setTitles] = useState<Record<number, string>>({});

  const fetchSuggestions = async () => {
    setLoading(true);
    setSuggestions([]);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-cluster-topics", {
        body: { clusterId },
      });
      if (error) throw error;
      const list: Suggestion[] = data?.suggestions || [];
      setSuggestions(list);
      const sel: Record<number, boolean> = {};
      const tts: Record<number, string> = {};
      list.forEach((s, i) => {
        sel[i] = true;
        tts[i] = s.title;
      });
      setSelected(sel);
      setTitles(tts);
      if (list.length === 0) toast.info(data?.message || "Không có gợi ý nào");
    } catch (e: any) {
      toast.error(e.message || "Lỗi gợi ý");
    } finally {
      setLoading(false);
    }
  };

  const createSelected = async () => {
    if (!orgId) return;
    const picks = suggestions
      .map((s, i) => ({ ...s, title: titles[i] || s.title, _i: i }))
      .filter((s) => selected[s._i] && s.title.trim());

    if (picks.length === 0) return toast.info("Chưa chọn topic nào");

    try {
      const rows = picks.map((s) => ({
        organization_id: orgId,
        topic: s.title,
        cluster_id: clusterId,
        target_keyword_ids: s.keyword_ids,
        notes: s.angle,
        status: "draft" as const,
      }));
      const { error } = await supabase.from("topic_history").insert(rows as any);
      if (error) throw error;
      toast.success(`Đã tạo ${rows.length} topic vào lịch sử`);
      qc.invalidateQueries({ queryKey: ["topic-history"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Không tạo được");
    }
  };

  const goCreateContent = (s: Suggestion, i: number) => {
    const title = titles[i] || s.title;
    const params = new URLSearchParams({
      topic: title,
      clusterId,
      keywordIds: s.keyword_ids.join(","),
    });
    navigate(`/multi-channel/create?${params.toString()}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" /> Gợi ý topic AI từ keyword chưa phủ
          </DialogTitle>
        </DialogHeader>

        {suggestions.length === 0 && !loading && (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-3">
              AI sẽ phân tích các keyword chưa có content trong pillar và đề xuất 5-8 topic.
            </p>
            <Button onClick={fetchSuggestions}>
              <Sparkles className="h-4 w-4 mr-1.5" /> Bắt đầu gợi ý
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> AI đang nghĩ...
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <div
                key={i}
                className="flex gap-3 p-3 border rounded-md hover:bg-muted/30"
              >
                <Checkbox
                  checked={selected[i] || false}
                  onCheckedChange={(v) => setSelected((p) => ({ ...p, [i]: !!v }))}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <Input
                    value={titles[i] ?? s.title}
                    onChange={(e) => setTitles((p) => ({ ...p, [i]: e.target.value }))}
                    className="h-8 text-sm font-medium"
                  />
                  <p className="text-xs text-muted-foreground line-clamp-2">{s.angle}</p>
                  <div className="flex gap-1.5 flex-wrap items-center">
                    <Badge variant="secondary" className="text-[10px] h-4">{s.intent}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {s.keyword_ids.length} keyword
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 ml-auto text-xs"
                      onClick={() => goCreateContent(s, i)}
                    >
                      Tạo content <ArrowRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-between gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={fetchSuggestions} disabled={loading}>
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Gợi ý lại
              </Button>
              <Button size="sm" onClick={createSelected}>
                Lưu {Object.values(selected).filter(Boolean).length} topic vào nháp
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
