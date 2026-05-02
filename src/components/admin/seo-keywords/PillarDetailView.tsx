import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, X, FileText, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import KeywordTargetPicker from "@/components/seo/KeywordTargetPicker";
import SuggestTopicsDialog from "./SuggestTopicsDialog";

interface Props {
  clusterId: string;
  onBack: () => void;
}

export default function PillarDetailView({ clusterId, onBack }: Props) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const { data: cluster } = useQuery({
    queryKey: ["seo-cluster", clusterId],
    enabled: !!clusterId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_clusters")
        .select("id,name,description,status,color,pillar_keyword_id,pillar_content_id")
        .eq("id", clusterId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: keywords = [] } = useQuery({
    queryKey: ["seo-cluster-keywords", clusterId],
    enabled: !!clusterId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_keywords")
        .select("id,keyword,search_volume,difficulty,intent,assigned_landing_page_id")
        .eq("cluster_id", clusterId)
        .order("priority_score", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: pillarKw } = useQuery({
    queryKey: ["seo-pillar-kw", cluster?.pillar_keyword_id],
    enabled: !!cluster?.pillar_keyword_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_keywords")
        .select("id,keyword,search_volume")
        .eq("id", cluster!.pillar_keyword_id!)
        .maybeSingle();
      return data;
    },
  });

  const addKeywords = async (ids: string[]) => {
    if (!ids.length) return;
    const { error } = await supabase
      .from("seo_keywords")
      .update({ cluster_id: clusterId })
      .in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Đã thêm ${ids.length} keyword vào pillar`);
    setPickedIds([]);
    setAdding(false);
    qc.invalidateQueries({ queryKey: ["seo-cluster-keywords", clusterId] });
    qc.invalidateQueries({ queryKey: ["seo-cluster-coverage"] });
  };

  const removeKeyword = async (id: string) => {
    const { error } = await supabase
      .from("seo_keywords")
      .update({ cluster_id: null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["seo-cluster-keywords", clusterId] });
    qc.invalidateQueries({ queryKey: ["seo-cluster-coverage"] });
  };

  const setPillar = async (kwId: string) => {
    const { error } = await supabase
      .from("seo_clusters")
      .update({ pillar_keyword_id: kwId })
      .eq("id", clusterId);
    if (error) return toast.error(error.message);
    toast.success("Đã đặt pillar keyword");
    qc.invalidateQueries({ queryKey: ["seo-cluster", clusterId] });
  };

  if (!cluster) return <div className="text-sm text-muted-foreground">Đang tải...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Button>
        <span className="text-muted-foreground">/</span>
        <h2 className="text-lg font-semibold">{cluster.name}</h2>
        <Badge variant="outline" className="capitalize">{cluster.status}</Badge>
        <Button size="sm" variant="outline" className="ml-auto gap-1" onClick={() => setSuggestOpen(true)}>
          <Sparkles className="h-3.5 w-3.5" /> Gợi ý topic AI
        </Button>
      </div>

      <SuggestTopicsDialog open={suggestOpen} onOpenChange={setSuggestOpen} clusterId={clusterId} />

      {/* Pillar card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Pillar Keyword (head term)</div>
              {pillarKw ? (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{pillarKw.keyword}</span>
                  {pillarKw.search_volume != null && (
                    <Badge variant="secondary" className="text-[10px]">
                      Vol {pillarKw.search_volume.toLocaleString()}
                    </Badge>
                  )}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Chưa đặt — click "Đặt làm pillar" trên 1 keyword bên dưới</span>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground mb-1">Pillar Content</div>
              {cluster.pillar_content_id ? (
                <Link
                  to={`/multichannel/${cluster.pillar_content_id}`}
                  className="text-sm font-medium inline-flex items-center gap-1 hover:underline"
                >
                  Xem bài <ExternalLink className="h-3 w-3" />
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">Chưa có</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keywords list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Cluster Keywords ({keywords.length})</h3>
          <Button size="sm" variant="outline" onClick={() => setAdding(!adding)} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Thêm keyword
          </Button>
        </div>

        {adding && (
          <Card className="mb-3">
            <CardContent className="p-3 space-y-2">
              <KeywordTargetPicker
                selectedIds={pickedIds}
                onChange={setPickedIds}
                max={20}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => addKeywords(pickedIds)} disabled={!pickedIds.length}>
                  Thêm {pickedIds.length} keyword
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setPickedIds([]); }}>
                  Hủy
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {keywords.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Chưa có keyword. Click "Thêm keyword" để gắn vào pillar này.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {keywords.map((k) => (
              <div
                key={k.id}
                className="flex items-center gap-2 p-2.5 border rounded-md hover:bg-muted/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{k.keyword}</span>
                    {cluster.pillar_keyword_id === k.id && (
                      <Badge variant="default" className="text-[10px] h-4 px-1.5">PILLAR</Badge>
                    )}
                    {k.assigned_landing_page_id && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-0.5">
                        <FileText className="h-2.5 w-2.5" /> Có content
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    {k.intent && <span>{k.intent}</span>}
                    {k.search_volume != null && <span>Vol: {k.search_volume.toLocaleString()}</span>}
                    {k.difficulty != null && <span>KD: {k.difficulty}</span>}
                  </div>
                </div>
                {cluster.pillar_keyword_id !== k.id && (
                  <Button size="sm" variant="ghost" onClick={() => setPillar(k.id)} className="text-xs">
                    Đặt làm pillar
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => removeKeyword(k.id)}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
