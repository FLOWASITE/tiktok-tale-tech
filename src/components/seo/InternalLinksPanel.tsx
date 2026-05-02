import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2, Copy, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Suggestion {
  id: string;
  title: string;
  topic: string;
  similarity: string;
  anchor_suggestion: string;
  url_hint: string;
}

interface Props {
  contentId: string;
}

export default function InternalLinksPanel({ contentId }: Props) {
  const { currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);

  const scan = async () => {
    if (!currentOrganization?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-internal-links", {
        body: {
          content_id: contentId,
          organization_id: currentOrganization.id,
          match_count: 5,
          threshold: 0.55,
        },
      });
      if (error) throw error;
      setSuggestions((data as any)?.suggestions || []);
      if (!(data as any)?.suggestions?.length) {
        toast.info("Chưa có gợi ý — thử embed thêm content khác trước.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Quét gợi ý thất bại");
    } finally {
      setLoading(false);
    }
  };

  const copyMd = (s: Suggestion) => {
    navigator.clipboard.writeText(`[${s.anchor_suggestion}](${s.url_hint})`);
    toast.success("Đã copy markdown link");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            Gợi ý liên kết nội bộ
          </span>
          <Button size="sm" variant="ghost" onClick={scan} disabled={loading} className="h-7 gap-1.5">
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : suggestions ? (
              <RefreshCw className="h-3.5 w-3.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {suggestions ? "Quét lại" : "Quét gợi ý"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!suggestions && !loading && (
          <p className="text-xs text-muted-foreground">
            Tìm 5 bài viết liên quan dựa trên độ tương đồng vector. Giúp tăng silo SEO & dwell time.
          </p>
        )}
        {suggestions && suggestions.length === 0 && (
          <p className="text-xs text-muted-foreground">Không tìm thấy bài viết liên quan.</p>
        )}
        {suggestions?.map((s) => (
          <div
            key={s.id}
            className="border rounded p-2.5 hover:bg-muted/30 transition-colors space-y-1.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-medium leading-tight line-clamp-2 flex-1">
                {s.title || s.topic || "Untitled"}
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {(parseFloat(s.similarity) * 100).toFixed(0)}%
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <code className="text-[10px] text-muted-foreground truncate">{s.url_hint}</code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyMd(s)}
                className="h-6 px-2 gap-1 text-[10px]"
              >
                <Copy className="h-3 w-3" /> Copy MD
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
