// ============================================
// Prompt History Viewer Component
// ============================================

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  History,
  Search,
  Clock,
  FileText,
  GitBranch,
  ArrowRight,
  TrendingUp,
  Timer,
  GitCompare,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { PromptVersionDiff } from "./PromptVersionDiff";
import { PromptVariablePreview } from "./PromptVariablePreview";

interface PromptHistoryEntry {
  id: string;
  prompt_id: string | null;
  version: number;
  content: string;
  variables: Record<string, any> | null;
  change_type: string | null;
  change_reason: string | null;
  changed_by: string | null;
  usage_count: number | null;
  avg_quality_score: number | null;
  avg_generation_time_ms: number | null;
  created_at: string;
}

interface PromptInfo {
  id: string;
  name: string;
  prompt_key: string;
}

export function PromptHistoryViewer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<PromptHistoryEntry | null>(null);
  const [filterPromptId, setFilterPromptId] = useState<string>("all");
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<PromptHistoryEntry[]>([]);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [detailTab, setDetailTab] = useState<"content" | "diff" | "variables">("content");

  // Fetch prompts for filter dropdown
  const { data: prompts } = useQuery({
    queryKey: ["prompts-for-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_prompts")
        .select("id, name, prompt_key")
        .order("name");
      if (error) throw error;
      return data as PromptInfo[];
    },
  });

  // Fetch history
  const { data: history, isLoading } = useQuery({
    queryKey: ["prompt-history", searchQuery, filterPromptId],
    queryFn: async () => {
      let query = supabase
        .from("ai_prompt_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (searchQuery) {
        query = query.ilike("content", `%${searchQuery}%`);
      }

      if (filterPromptId && filterPromptId !== "all") {
        query = query.eq("prompt_id", filterPromptId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PromptHistoryEntry[];
    },
  });

  // Find previous version for diff
  const previousVersion = useMemo(() => {
    if (!selectedEntry || !history) return null;
    const samePromptHistory = history
      .filter(h => h.prompt_id === selectedEntry.prompt_id && h.version < selectedEntry.version)
      .sort((a, b) => b.version - a.version);
    return samePromptHistory[0] || null;
  }, [selectedEntry, history]);

  const getChangeTypeBadge = (type: string | null) => {
    switch (type) {
      case "created":
        return <Badge className="bg-green-500/10 text-green-600">Tạo mới</Badge>;
      case "content_update":
        return <Badge className="bg-blue-500/10 text-blue-600">Cập nhật</Badge>;
      case "metadata_update":
        return <Badge className="bg-purple-500/10 text-purple-600">Metadata</Badge>;
      case "status_change":
        return <Badge className="bg-yellow-500/10 text-yellow-600">Trạng thái</Badge>;
      case "rollback":
        return <Badge className="bg-orange-500/10 text-orange-600">Rollback</Badge>;
      default:
        return <Badge variant="outline">{type || "Unknown"}</Badge>;
    }
  };

  const toggleCompareSelection = (entry: PromptHistoryEntry) => {
    setSelectedForCompare(prev => {
      const exists = prev.find(e => e.id === entry.id);
      if (exists) {
        return prev.filter(e => e.id !== entry.id);
      }
      if (prev.length >= 2) {
        return [prev[1], entry];
      }
      return [...prev, entry];
    });
  };

  const canCompare = selectedForCompare.length === 2;

  const handleCompare = () => {
    if (canCompare) {
      setShowCompareDialog(true);
    }
  };

  const sortedCompareVersions = useMemo(() => {
    if (selectedForCompare.length !== 2) return { old: null, new: null };
    const sorted = [...selectedForCompare].sort((a, b) => a.version - b.version);
    return { old: sorted[0], new: sorted[1] };
  }, [selectedForCompare]);

  const getPromptName = (promptId: string | null) => {
    if (!promptId || !prompts) return "Unknown";
    const prompt = prompts.find(p => p.id === promptId);
    return prompt?.name || prompt?.prompt_key || "Unknown";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <History className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold">Lịch sử thay đổi</h3>
            <p className="text-sm text-muted-foreground">
              Theo dõi các thay đổi và hiệu suất theo phiên bản
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={compareMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setCompareMode(!compareMode);
              if (compareMode) setSelectedForCompare([]);
            }}
          >
            <GitCompare className="h-4 w-4 mr-2" />
            {compareMode ? "Thoát so sánh" : "So sánh"}
          </Button>
          {compareMode && canCompare && (
            <Button size="sm" onClick={handleCompare}>
              So sánh ({selectedForCompare.length})
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm trong lịch sử..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterPromptId} onValueChange={setFilterPromptId}>
          <SelectTrigger className="w-[250px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Lọc theo prompt" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả prompts</SelectItem>
            {prompts?.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {compareMode && (
        <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground flex items-center gap-2">
          <GitCompare className="h-4 w-4" />
          Chọn 2 phiên bản để so sánh ({selectedForCompare.length}/2)
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : history?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Chưa có lịch sử thay đổi</p>
            <p className="text-sm text-muted-foreground/70">
              Các thay đổi prompt sẽ được ghi lại ở đây
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-3 pr-4">
            {history?.map((entry) => {
              const isSelected = selectedForCompare.some(e => e.id === entry.id);
              return (
                <Card 
                  key={entry.id}
                  className={`hover:shadow-md transition-all cursor-pointer ${
                    isSelected ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => compareMode ? toggleCompareSelection(entry) : setSelectedEntry(entry)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {compareMode && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleCompareSelection(entry)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <GitBranch className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">v{entry.version}</span>
                          {getChangeTypeBadge(entry.change_type)}
                          <Badge variant="outline" className="text-xs">
                            {getPromptName(entry.prompt_id)}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {entry.content.substring(0, 150)}...
                        </p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}
                          </span>
                          {entry.usage_count !== null && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3.5 w-3.5" />
                              {entry.usage_count} uses
                            </span>
                          )}
                          {entry.avg_quality_score !== null && (
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                              {entry.avg_quality_score.toFixed(2)}
                            </span>
                          )}
                          {entry.avg_generation_time_ms !== null && (
                            <span className="flex items-center gap-1">
                              <Timer className="h-3.5 w-3.5" />
                              {entry.avg_generation_time_ms}ms
                            </span>
                          )}
                        </div>

                        {entry.change_reason && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            "{entry.change_reason}"
                          </p>
                        )}
                      </div>

                      {!compareMode && (
                        <Button variant="ghost" size="sm">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Detail Dialog with Tabs */}
      <Dialog open={!!selectedEntry} onOpenChange={() => {
        setSelectedEntry(null);
        setDetailTab("content");
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Version {selectedEntry?.version} - {getPromptName(selectedEntry?.prompt_id || null)}
            </DialogTitle>
            <DialogDescription>
              {selectedEntry?.created_at && format(
                new Date(selectedEntry.created_at), 
                "EEEE, dd MMMM yyyy 'lúc' HH:mm", 
                { locale: vi }
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {selectedEntry?.usage_count != null && (
              <Card className="bg-muted/30">
                <CardContent className="p-3">
                  <div className="text-lg font-bold">{selectedEntry.usage_count}</div>
                  <div className="text-xs text-muted-foreground">Số lần sử dụng</div>
                </CardContent>
              </Card>
            )}
            {selectedEntry?.avg_quality_score != null && (
              <Card className="bg-muted/30">
                <CardContent className="p-3">
                  <div className="text-lg font-bold text-green-500">
                    {selectedEntry.avg_quality_score.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">Điểm chất lượng TB</div>
                </CardContent>
              </Card>
            )}
            {selectedEntry?.avg_generation_time_ms != null && (
              <Card className="bg-muted/30">
                <CardContent className="p-3">
                  <div className="text-lg font-bold">
                    {selectedEntry.avg_generation_time_ms}ms
                  </div>
                  <div className="text-xs text-muted-foreground">Thời gian TB</div>
                </CardContent>
              </Card>
            )}
          </div>

          {selectedEntry?.change_reason && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium mb-1">Lý do thay đổi:</p>
              <p className="text-sm text-muted-foreground">{selectedEntry.change_reason}</p>
            </div>
          )}

          <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as typeof detailTab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="content">Nội dung</TabsTrigger>
              <TabsTrigger value="diff" disabled={!previousVersion}>
                <GitCompare className="h-4 w-4 mr-1" />
                Diff {previousVersion ? `(v${previousVersion.version})` : ""}
              </TabsTrigger>
              <TabsTrigger value="variables">Biến & Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-4">
              <ScrollArea className="h-[350px]">
                <pre className="p-4 bg-muted/30 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                  {selectedEntry?.content}
                </pre>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="diff" className="mt-4">
              {previousVersion && selectedEntry && (
                <PromptVersionDiff
                  oldContent={previousVersion.content}
                  newContent={selectedEntry.content}
                  oldVersion={previousVersion.version}
                  newVersion={selectedEntry.version}
                />
              )}
            </TabsContent>

            <TabsContent value="variables" className="mt-4">
              <ScrollArea className="h-[350px]">
                <PromptVariablePreview
                  content={selectedEntry?.content || ""}
                  variables={selectedEntry?.variables || {}}
                />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              So sánh phiên bản
            </DialogTitle>
            <DialogDescription>
              {sortedCompareVersions.old && sortedCompareVersions.new && (
                <>
                  So sánh v{sortedCompareVersions.old.version} với v{sortedCompareVersions.new.version}
                  {sortedCompareVersions.old.prompt_id !== sortedCompareVersions.new.prompt_id && (
                    <span className="text-yellow-600 ml-2">(khác prompt)</span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {sortedCompareVersions.old && sortedCompareVersions.new && (
            <PromptVersionDiff
              oldContent={sortedCompareVersions.old.content}
              newContent={sortedCompareVersions.new.content}
              oldVersion={sortedCompareVersions.old.version}
              newVersion={sortedCompareVersions.new.version}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
