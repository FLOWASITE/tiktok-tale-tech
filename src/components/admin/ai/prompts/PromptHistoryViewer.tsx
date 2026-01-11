// ============================================
// Prompt History Viewer Component
// ============================================

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  History,
  Search,
  Clock,
  User,
  FileText,
  GitBranch,
  ArrowRight,
  TrendingUp,
  Timer,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

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

export function PromptHistoryViewer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<PromptHistoryEntry | null>(null);

  const { data: history, isLoading } = useQuery({
    queryKey: ["prompt-history", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("ai_prompt_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (searchQuery) {
        query = query.ilike("content", `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PromptHistoryEntry[];
    },
  });

  const getChangeTypeBadge = (type: string | null) => {
    switch (type) {
      case "create":
        return <Badge className="bg-green-500/10 text-green-600">Tạo mới</Badge>;
      case "update":
        return <Badge className="bg-blue-500/10 text-blue-600">Cập nhật</Badge>;
      case "rollback":
        return <Badge className="bg-yellow-500/10 text-yellow-600">Rollback</Badge>;
      default:
        return <Badge variant="outline">{type || "Unknown"}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm trong lịch sử..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

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
            {history?.map((entry, index) => (
              <Card 
                key={entry.id}
                className="hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedEntry(entry)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <GitBranch className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">
                          Version {entry.version}
                        </span>
                        {getChangeTypeBadge(entry.change_type)}
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {entry.content.substring(0, 150)}...
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                            {entry.avg_quality_score.toFixed(2)} score
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

                    <Button variant="ghost" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Version {selectedEntry?.version}
            </DialogTitle>
            <DialogDescription>
              {selectedEntry?.created_at && format(
                new Date(selectedEntry.created_at), 
                "EEEE, dd MMMM yyyy 'lúc' HH:mm", 
                { locale: vi }
              )}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[500px] mt-4">
            <div className="space-y-4 pr-4">
              {/* Metadata */}
              <div className="grid grid-cols-3 gap-4">
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

              {/* Change reason */}
              {selectedEntry?.change_reason && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium mb-1">Lý do thay đổi:</p>
                  <p className="text-sm text-muted-foreground">{selectedEntry.change_reason}</p>
                </div>
              )}

              {/* Content */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Nội dung prompt:</p>
                <pre className="p-4 bg-muted/30 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                  {selectedEntry?.content}
                </pre>
              </div>

              {/* Variables */}
              {selectedEntry?.variables && Object.keys(selectedEntry.variables).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Biến:</p>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <pre className="text-sm font-mono">
                      {JSON.stringify(selectedEntry.variables, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
