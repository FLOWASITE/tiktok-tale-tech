import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Link2, Copy, RefreshCw, Sparkles, Save, Check, Trash2, ArrowDownToLine } from "lucide-react";
import { toast } from "sonner";

interface Suggestion {
  id: string;
  title: string;
  topic: string;
  similarity: string;
  anchor_suggestion: string;
  url_hint: string;
}

interface SavedLink {
  id: string;
  target_content_id: string;
  anchor_text: string;
  url: string;
  similarity: number | null;
  status: string;
}

interface Props {
  contentId: string;
  autoScanOnMount?: boolean;
  /** Optional: insert a markdown link directly into the active editor/content. */
  onInsertLink?: (markdown: string) => void | Promise<void>;
  /** Label for the insert target, e.g. "Website" — shown on the button tooltip. */
  insertTargetLabel?: string;
}

export default function InternalLinksPanel({ contentId, autoScanOnMount, onInsertLink, insertTargetLabel }: Props) {
  const [insertingId, setInsertingId] = useState<string | null>(null);

  const insertMd = async (anchor: string, url: string, key: string) => {
    if (!onInsertLink) return;
    setInsertingId(key);
    try {
      await onInsertLink(`[${anchor}](${url})\n`);
      toast.success(insertTargetLabel ? `Đã chèn vào nội dung ${insertTargetLabel}` : "Đã chèn link vào nội dung");
    } catch (e: any) {
      toast.error(e?.message || "Chèn link thất bại");
    } finally {
      setInsertingId(null);
    }
  };

  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchors, setAnchors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<SavedLink[]>([]);
  const [savedLoaded, setSavedLoaded] = useState(false);
  const autoScanned = useRef(false);

  const loadSaved = async () => {
    if (!currentOrganization?.id) return;
    const { data } = await supabase
      .from("internal_links" as any)
      .select("id,target_content_id,anchor_text,url,similarity,status")
      .eq("source_content_id", contentId)
      .eq("organization_id", currentOrganization.id);
    setSaved(((data as any) || []) as SavedLink[]);
    setSavedLoaded(true);
  };

  useEffect(() => {
    loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, currentOrganization?.id]);

  // Auto-scan once when mounted with no saved links
  useEffect(() => {
    if (!autoScanOnMount || autoScanned.current || !savedLoaded) return;
    if (saved.length === 0 && !loading && suggestions === null) {
      autoScanned.current = true;
      scan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScanOnMount, savedLoaded, saved.length]);

  const scan = async () => {
    if (!currentOrganization?.id) return;
    setLoading(true);
    setSelected(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("suggest-internal-links", {
        body: {
          content_id: contentId,
          organization_id: currentOrganization.id,
          match_count: 8,
          threshold: 0.55,
        },
      });
      if (error) throw error;
      const list = ((data as any)?.suggestions || []) as Suggestion[];
      const savedTargets = new Set(saved.map((s) => s.target_content_id));
      const fresh = list.filter((s) => !savedTargets.has(s.id));
      setSuggestions(fresh);
      const initAnchors: Record<string, string> = {};
      fresh.forEach((s) => (initAnchors[s.id] = s.anchor_suggestion || s.title || ""));
      setAnchors(initAnchors);
      if (!fresh.length) toast.info("Không có gợi ý mới (đã lưu hoặc chưa có embed).");
    } catch (e: any) {
      toast.error(e?.message || "Quét gợi ý thất bại");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (!suggestions) return;
    setSelected(selected.size === suggestions.length ? new Set() : new Set(suggestions.map((s) => s.id)));
  };

  const copyMd = (anchor: string, url: string) => {
    navigator.clipboard.writeText(`[${anchor}](${url})`);
    toast.success("Đã copy markdown link");
  };

  const saveSelected = async () => {
    if (!currentOrganization?.id || !suggestions || selected.size === 0) return;
    setSaving(true);
    try {
      const rows = suggestions
        .filter((s) => selected.has(s.id))
        .map((s) => ({
          organization_id: currentOrganization.id,
          source_content_id: contentId,
          target_content_id: s.id,
          anchor_text: anchors[s.id] || s.anchor_suggestion || s.title || "link",
          url: s.url_hint,
          similarity: parseFloat(s.similarity) || null,
          status: "approved",
          created_by: user?.id || null,
        }));
      const { error } = await supabase.from("internal_links" as any).insert(rows);
      if (error) throw error;
      toast.success(`Đã lưu ${rows.length} liên kết`);
      const savedIds = new Set(rows.map((r) => r.target_content_id));
      setSelected(new Set());
      setSuggestions((prev) => (prev || []).filter((s) => !savedIds.has(s.id)));
      loadSaved();
    } catch (e: any) {
      toast.error(e?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const removeSaved = async (id: string) => {
    const { error } = await supabase.from("internal_links" as any).delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã xóa liên kết");
    loadSaved();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            Liên kết nội bộ
            {saved.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {saved.length} đã lưu
              </Badge>
            )}
          </span>
          <Button size="sm" variant="ghost" onClick={scan} disabled={loading} className="h-7 gap-1.5">
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : suggestions ? (
              <RefreshCw className="h-3.5 w-3.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {suggestions ? "Quét lại" : "Gợi ý liên kết nội bộ"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Saved links */}
        {saved.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Đã duyệt ({saved.length})
            </div>
            {saved.map((s) => (
              <div
                key={s.id}
                className="border border-primary/20 bg-primary/5 rounded p-2 flex items-start justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate flex items-center gap-1">
                    <Check className="h-3 w-3 text-primary shrink-0" />
                    {s.anchor_text}
                  </div>
                  <code className="text-[10px] text-muted-foreground truncate block">{s.url}</code>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyMd(s.anchor_text, s.url)}
                    className="h-6 w-6 p-0"
                    title="Copy markdown"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeSaved(s.id)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    title="Xóa"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!suggestions && !loading && saved.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Bấm "Gợi ý liên kết nội bộ" để tìm bài viết liên quan dựa trên độ tương đồng vector.
          </p>
        )}

        {/* Suggestions */}
        {suggestions && suggestions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Gợi ý mới ({suggestions.length})
              </div>
              <Button size="sm" variant="ghost" onClick={toggleAll} className="h-6 text-[10px]">
                {selected.size === suggestions.length ? "Bỏ chọn" : "Chọn tất cả"}
              </Button>
            </div>
            {suggestions.map((s) => (
              <div
                key={s.id}
                className="border rounded p-2.5 space-y-1.5 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={selected.has(s.id)}
                    onCheckedChange={() => toggle(s.id)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium leading-tight line-clamp-2 flex-1">
                        {s.title || s.topic || "Untitled"}
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {(parseFloat(s.similarity) * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    {selected.has(s.id) && (
                      <input
                        type="text"
                        value={anchors[s.id] || ""}
                        onChange={(e) => setAnchors({ ...anchors, [s.id]: e.target.value })}
                        placeholder="Anchor text..."
                        className="w-full text-xs border rounded px-2 py-1 bg-background"
                      />
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-[10px] text-muted-foreground truncate">{s.url_hint}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyMd(anchors[s.id] || s.anchor_suggestion, s.url_hint)}
                        className="h-6 px-2 gap-1 text-[10px]"
                      >
                        <Copy className="h-3 w-3" /> Copy MD
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Button
              onClick={saveSelected}
              disabled={selected.size === 0 || saving}
              className="w-full gap-1.5"
              size="sm"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {selected.size > 0 ? `Lưu ${selected.size} liên kết đã chọn` : "Chọn ít nhất 1 liên kết để lưu"}
            </Button>
          </div>
        )}

        {suggestions && suggestions.length === 0 && (
          <p className="text-xs text-muted-foreground">Không tìm thấy bài viết liên quan mới.</p>
        )}
      </CardContent>
    </Card>
  );
}
