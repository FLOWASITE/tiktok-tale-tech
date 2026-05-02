import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";

const PAGE_TYPES = [
  { value: "industry", label: "Ngành nghề (industry)", prefix: "/giai-phap/" },
  { value: "comparison", label: "So sánh (comparison)", prefix: "/so-sanh/" },
  { value: "use_case", label: "Use case", prefix: "/use-case/" },
  { value: "feature", label: "Tính năng (feature)", prefix: "/tinh-nang/" },
  { value: "tool", label: "Công cụ (tool)", prefix: "/cong-cu/" },
] as const;

type PageType = typeof PAGE_TYPES[number]["value"];

export default function AdminSeoPages() {
  const qc = useQueryClient();
  const [pageType, setPageType] = useState<PageType>("industry");
  const [topic, setTopic] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [publish, setPublish] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { data: pages, isLoading } = useQuery({
    queryKey: ["admin-seo-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_landing_pages")
        .select("id,slug,page_type,title,is_published,published_at,updated_at,competitor_name")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Vui lòng nhập chủ đề");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-seo-landing", {
        body: {
          page_type: pageType,
          topic: topic.trim(),
          competitor_name: pageType === "comparison" ? competitor.trim() || topic.trim() : undefined,
          publish,
        },
      });
      if (error) throw error;
      toast.success(`✓ Đã tạo: ${data?.page?.slug}`);
      setTopic("");
      setCompetitor("");
      qc.invalidateQueries({ queryKey: ["admin-seo-pages"] });
    } catch (err: any) {
      toast.error(`Lỗi: ${err?.message || err}`);
    } finally {
      setGenerating(false);
    }
  };

  const togglePublish = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("seo_landing_pages")
      .update({
        is_published: !current,
        published_at: !current ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(current ? "Đã ẩn" : "Đã xuất bản");
    qc.invalidateQueries({ queryKey: ["admin-seo-pages"] });
  };

  const prefixFor = (t: string) => PAGE_TYPES.find(p => p.value === t)?.prefix || "/lp/";

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-bold">SEO Landing Pages</h1>
        <p className="mt-1 text-muted-foreground">
          Programmatic SEO — tạo landing pages bằng AI cho industry / comparison / use-case / feature / tool.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Generate landing page mới
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Loại trang</Label>
              <Select value={pageType} onValueChange={(v) => setPageType(v as PageType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Chủ đề / Topic</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={pageType === "industry" ? "spa thẩm mỹ" : pageType === "comparison" ? "Jasper AI" : "viết quảng cáo Facebook"}
              />
            </div>
          </div>
          {pageType === "comparison" && (
            <div>
              <Label>Tên đối thủ (optional)</Label>
              <Input
                value={competitor}
                onChange={(e) => setCompetitor(e.target.value)}
                placeholder="Để trống = dùng topic"
              />
            </div>
          )}
          <div className="flex items-center gap-3">
            <input
              id="publish"
              type="checkbox"
              checked={publish}
              onChange={(e) => setPublish(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="publish" className="cursor-pointer">Xuất bản ngay (mặc định: lưu draft)</Label>
          </div>
          <Button onClick={handleGenerate} disabled={generating} size="lg">
            {generating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tạo...</> : "Generate"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách trang ({pages?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Đang tải...</div>
          ) : !pages?.length ? (
            <div className="py-8 text-center text-muted-foreground">Chưa có trang nào. Generate trang đầu tiên ở trên.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-4">Slug</th>
                    <th className="py-2 pr-4">Loại</th>
                    <th className="py-2 pr-4">Title</th>
                    <th className="py-2 pr-4">Trạng thái</th>
                    <th className="py-2 pr-4">Cập nhật</th>
                    <th className="py-2">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{p.slug}</td>
                      <td className="py-2 pr-4"><Badge variant="outline">{p.page_type}</Badge></td>
                      <td className="py-2 pr-4 max-w-xs truncate">{p.title}</td>
                      <td className="py-2 pr-4">
                        {p.is_published ? <Badge>Published</Badge> : <Badge variant="secondary">Draft</Badge>}
                      </td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
                        {new Date(p.updated_at).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => togglePublish(p.id, p.is_published)}>
                            {p.is_published ? "Unpublish" : "Publish"}
                          </Button>
                          {p.is_published && (
                            <a
                              href={`${prefixFor(p.page_type)}${p.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                            >
                              <ExternalLink className="h-3 w-3" /> View
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
