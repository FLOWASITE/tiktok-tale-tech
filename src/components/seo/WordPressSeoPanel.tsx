import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Search, Save, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WordPressSeoMeta {
  metaTitle?: string;
  metaDescription?: string;
  slug?: string;
  focusKeyword?: string;
  lsiKeywords?: string[];
  tags?: string[];
  categories?: string[];
  excerpt?: string;
}

interface WordPressSeoPanelProps {
  contentId: string;
  channel: "wordpress" | "blogger";
  bodyContent: string;
  initialMeta: WordPressSeoMeta | null;
  onSaved?: (meta: WordPressSeoMeta) => void;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

function computeScore(meta: WordPressSeoMeta, body: string): {
  score: number;
  checks: Array<{ label: string; pass: boolean; hint?: string }>;
} {
  const wc = body ? body.trim().split(/\s+/).filter(Boolean).length : 0;
  const h2Count = (body.match(/^##\s+/gm) || []).length;
  const focus = (meta.focusKeyword || "").toLowerCase().trim();
  const bodyLower = body.toLowerCase();
  const firstH1 = (body.match(/^#\s+(.+)$/m)?.[1] || "").toLowerCase();

  const checks = [
    {
      label: "Meta title 30-60 ký tự",
      pass: !!meta.metaTitle && meta.metaTitle.length >= 30 && meta.metaTitle.length <= 60,
      hint: meta.metaTitle ? `Hiện ${meta.metaTitle.length}` : "Chưa có",
    },
    {
      label: "Meta description 140-160 ký tự",
      pass: !!meta.metaDescription && meta.metaDescription.length >= 140 && meta.metaDescription.length <= 160,
      hint: meta.metaDescription ? `Hiện ${meta.metaDescription.length}` : "Chưa có",
    },
    {
      label: "Focus keyword xuất hiện trong H1",
      pass: !!focus && firstH1.includes(focus),
    },
    { label: "≥ 3 H2 trong bài", pass: h2Count >= 3, hint: `Hiện ${h2Count}` },
    { label: "≥ 1500 từ", pass: wc >= 1500, hint: `Hiện ${wc} từ` },
    { label: "Slug SEO-friendly", pass: !!meta.slug && /^[a-z0-9-]+$/.test(meta.slug) && meta.slug.length <= 60 },
  ];
  const passed = checks.filter((c) => c.pass).length;
  return { score: Math.round((passed / checks.length) * 100), checks };
}

export function WordPressSeoPanel({
  contentId,
  channel,
  bodyContent,
  initialMeta,
  onSaved,
}: WordPressSeoPanelProps) {
  const [open, setOpen] = useState(true);
  const [meta, setMeta] = useState<WordPressSeoMeta>(initialMeta || {});
  const [saving, setSaving] = useState(false);
  const [tagsInput, setTagsInput] = useState((initialMeta?.tags || []).join(", "));
  const [categoriesInput, setCategoriesInput] = useState((initialMeta?.categories || []).join(", "));

  useEffect(() => {
    setMeta(initialMeta || {});
    setTagsInput((initialMeta?.tags || []).join(", "));
    setCategoriesInput((initialMeta?.categories || []).join(", "));
  }, [initialMeta, contentId, channel]);

  const { score, checks } = useMemo(() => computeScore(meta, bodyContent || ""), [meta, bodyContent]);

  const update = (patch: Partial<WordPressSeoMeta>) => setMeta((m) => ({ ...m, ...patch }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10);
      const categories = categoriesInput.split(",").map((c) => c.trim()).filter(Boolean).slice(0, 4);
      const cleaned: WordPressSeoMeta = {
        ...meta,
        slug: meta.slug ? slugify(meta.slug) : undefined,
        tags,
        categories,
      };
      const col = channel === "wordpress" ? "wordpress_seo_data" : "blogger_seo_data";
      const { error } = await supabase
        .from("multi_channel_contents")
        .update({ [col]: cleaned })
        .eq("id", contentId);
      if (error) throw error;
      toast.success("Đã lưu meta SEO");
      onSaved?.(cleaned);
    } catch (e: any) {
      toast.error("Không lưu được: " + (e?.message || "lỗi không xác định"));
    } finally {
      setSaving(false);
    }
  };

  const autoSlug = () => {
    const src = meta.metaTitle || meta.focusKeyword || "";
    if (src) update({ slug: slugify(src) });
  };

  const scoreColor =
    score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-rose-600";
  const scoreBarBg =
    score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-rose-500";

  const channelLabel = channel === "wordpress" ? "WordPress" : "Blogger";

  return (
    <Card className="mx-3 my-2 border-border/50 bg-muted/20">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors rounded-t-lg">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">SEO {channelLabel}</span>
            <Badge variant="secondary" className={cn("text-xs", scoreColor)}>
              {score}/100
            </Badge>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 space-y-4 border-t border-border/40">
            {/* Score bar */}
            <div className="space-y-1.5">
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full transition-all", scoreBarBg)} style={{ width: `${score}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {checks.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-muted-foreground">
                    {c.pass ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                    )}
                    <span className={cn(c.pass && "text-foreground")}>
                      {c.label}
                      {c.hint && <span className="text-muted-foreground/70"> · {c.hint}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs flex items-center justify-between">
                  Meta title
                  <span className={cn("text-xs", (meta.metaTitle?.length || 0) > 60 && "text-rose-600")}>
                    {meta.metaTitle?.length || 0}/60
                  </span>
                </Label>
                <Input
                  value={meta.metaTitle || ""}
                  onChange={(e) => update({ metaTitle: e.target.value })}
                  placeholder="Tiêu đề SEO ≤60 ký tự, có focus keyword đầu"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Focus keyword</Label>
                <Input
                  value={meta.focusKeyword || ""}
                  onChange={(e) => update({ focusKeyword: e.target.value })}
                  placeholder="từ khoá chính"
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs flex items-center justify-between">
                Meta description
                <span className={cn("text-xs", (meta.metaDescription?.length || 0) > 160 && "text-rose-600")}>
                  {meta.metaDescription?.length || 0}/160
                </span>
              </Label>
              <Textarea
                value={meta.metaDescription || ""}
                onChange={(e) => update({ metaDescription: e.target.value })}
                placeholder="140-160 ký tự, có focus keyword + CTA"
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs flex items-center justify-between">
                  Slug
                  <button
                    type="button"
                    onClick={autoSlug}
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Tự sinh
                  </button>
                </Label>
                <Input
                  value={meta.slug || ""}
                  onChange={(e) => update({ slug: e.target.value })}
                  placeholder="khong-dau-gach-ngang"
                  className="h-9 font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Excerpt (tóm tắt)</Label>
                <Input
                  value={meta.excerpt || ""}
                  onChange={(e) => update({ excerpt: e.target.value })}
                  placeholder="2-3 câu hấp dẫn"
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tags (cách nhau bằng dấu phẩy)</Label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="seo, marketing, content"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Categories (cách nhau bằng dấu phẩy)</Label>
                <Input
                  value={categoriesInput}
                  onChange={(e) => setCategoriesInput(e.target.value)}
                  placeholder="Marketing, SEO"
                  className="h-9"
                />
              </div>
            </div>

            {Array.isArray(meta.lsiKeywords) && meta.lsiKeywords.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">LSI keywords (AI gợi ý)</Label>
                <div className="flex flex-wrap gap-1">
                  {meta.lsiKeywords.map((k, i) => (
                    <Badge key={i} variant="outline" className="text-xs font-normal">
                      {k}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="w-4 h-4" />
                {saving ? "Đang lưu…" : "Lưu meta SEO"}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
