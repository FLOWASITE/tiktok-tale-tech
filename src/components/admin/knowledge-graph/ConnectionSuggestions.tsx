// ============================================
// Connection Suggestions Panel
// AI-powered relationship suggestions
// ============================================

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Lightbulb,
  Link2,
  Check,
  X,
  Loader2,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Building2,
  Scale,
  FileText,
  Users,
  Globe,
} from "lucide-react";
import { useFindSimilarNodes } from "@/hooks/useSemanticSearch";
import { supabase } from "@/integrations/supabase/client";
import type { KnowledgeNodeType, KnowledgeEdgeType, SemanticSearchResult } from "@/types/knowledgeGraph";
import { useToast } from "@/hooks/use-toast";

// ============================================
// Constants
// ============================================

const NODE_TYPE_CONFIG: Record<KnowledgeNodeType, { 
  icon: React.ElementType; 
  color: string;
}> = {
  industry: { icon: Building2, color: "bg-blue-500" },
  regulation: { icon: Scale, color: "bg-red-500" },
  term: { icon: FileText, color: "bg-green-500" },
  concept: { icon: Lightbulb, color: "bg-purple-500" },
  persona: { icon: Users, color: "bg-amber-500" },
  jurisdiction: { icon: Globe, color: "bg-indigo-500" },
};

const EDGE_TYPE_OPTIONS: { value: KnowledgeEdgeType; label: string }[] = [
  { value: "related_to", label: "Liên quan đến" },
  { value: "parent_of", label: "Là cha của" },
  { value: "regulated_by", label: "Được điều chỉnh bởi" },
  { value: "uses_term", label: "Sử dụng thuật ngữ" },
  { value: "shares_audience", label: "Cùng đối tượng" },
  { value: "competes_with", label: "Cạnh tranh với" },
  { value: "requires_compliance", label: "Yêu cầu tuân thủ" },
  { value: "derived_from", label: "Kế thừa từ" },
  { value: "applies_to", label: "Áp dụng cho" },
];

// ============================================
// Suggestion Card
// ============================================

interface SuggestionCardProps {
  suggestion: SemanticSearchResult;
  sourceNodeId: string;
  onApprove: (targetId: string, edgeType: KnowledgeEdgeType) => void;
  onReject: (targetId: string) => void;
  isApplying: boolean;
}

function SuggestionCard({
  suggestion,
  sourceNodeId,
  onApprove,
  onReject,
  isApplying,
}: SuggestionCardProps) {
  const [selectedEdgeType, setSelectedEdgeType] = useState<KnowledgeEdgeType>("related_to");
  const config = NODE_TYPE_CONFIG[suggestion.node_type];
  const Icon = config.icon;
  const displayName = suggestion.display_name?.vi || suggestion.display_name?.en || suggestion.node_key;
  const similarity = (suggestion.similarity * 100).toFixed(1);

  // Suggest edge type based on node types
  const getSuggestedEdgeType = (): KnowledgeEdgeType => {
    if (suggestion.node_type === "regulation") return "regulated_by";
    if (suggestion.node_type === "term") return "uses_term";
    if (suggestion.node_type === "industry") return "related_to";
    return "related_to";
  };

  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${config.color} text-white shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{displayName}</p>
            <Badge variant="outline" className="shrink-0 tabular-nums">
              {similarity}% match
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">{suggestion.node_key}</p>
          
          {/* Edge Type Selector */}
          <div className="mt-3 flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select
              value={selectedEdgeType}
              onValueChange={(v) => setSelectedEdgeType(v as KnowledgeEdgeType)}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EDGE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => onApprove(suggestion.node_id, selectedEdgeType)}
              disabled={isApplying}
              className="flex-1"
            >
              {isApplying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Tạo kết nối
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject(suggestion.node_id)}
              disabled={isApplying}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

interface ConnectionSuggestionsProps {
  nodeId: string | null;
  nodeName?: string;
  onConnectionCreated?: () => void;
}

export function ConnectionSuggestions({
  nodeId,
  nodeName,
  onConnectionCreated,
}: ConnectionSuggestionsProps) {
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: similarNodes, isLoading, refetch } = useFindSimilarNodes(nodeId, 10);

  // Filter out rejected suggestions
  const suggestions = similarNodes?.filter((node) => !rejectedIds.has(node.node_id)) || [];

  const handleApprove = async (targetId: string, edgeType: KnowledgeEdgeType) => {
    if (!nodeId) return;

    setApplyingId(targetId);
    try {
      const { error } = await supabase
        .from("industry_knowledge_edges")
        .insert({
          source_node_id: nodeId,
          target_node_id: targetId,
          edge_type: edgeType,
          weight: 0.8,
        });

      if (error) throw error;

      toast({
        title: "Đã tạo kết nối",
        description: `Đã thêm quan hệ "${edgeType}" thành công`,
      });

      // Remove from suggestions
      setRejectedIds((prev) => new Set(prev).add(targetId));
      onConnectionCreated?.();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tạo kết nối. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setApplyingId(null);
    }
  };

  const handleReject = (targetId: string) => {
    setRejectedIds((prev) => new Set(prev).add(targetId));
  };

  const handleRefresh = () => {
    setRejectedIds(new Set());
    refetch();
  };

  if (!nodeId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Connection Suggestions
          </CardTitle>
          <CardDescription>
            Chọn một node để xem gợi ý kết nối
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Sparkles className="h-8 w-8 mr-2 opacity-50" />
            <span>Chọn node từ Graph Explorer</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Connection Suggestions
            </CardTitle>
            <CardDescription>
              Gợi ý kết nối cho: <span className="font-medium text-foreground">{nodeName}</span>
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Làm mới
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : suggestions.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3 pr-3">
              {suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.node_id}
                  suggestion={suggestion}
                  sourceNodeId={nodeId}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isApplying={applyingId === suggestion.node_id}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Link2 className="h-8 w-8 mb-2 opacity-50" />
            <p>Không có gợi ý kết nối</p>
            <p className="text-xs mt-1">Node này có thể đã có đủ kết nối hoặc chưa có embedding</p>
            <Button variant="link" size="sm" onClick={handleRefresh} className="mt-2">
              <RefreshCw className="h-3 w-3 mr-1" />
              Thử lại
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
