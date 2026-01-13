// ============================================
// Semantic Search Panel
// AI-powered vector similarity search with navigation
// ============================================

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Sparkles,
  Building2,
  Scale,
  FileText,
  Lightbulb,
  Users,
  Globe,
  ArrowRight,
  Loader2,
  Filter,
  X,
  AlertCircle,
  Zap,
  Eye,
  ExternalLink,
} from "lucide-react";
import { useSemanticSearch } from "@/hooks/useSemanticSearch";
import type { KnowledgeNodeType, SemanticSearchResult } from "@/types/knowledgeGraph";

// ============================================
// Constants
// ============================================

const NODE_TYPE_CONFIG: Record<KnowledgeNodeType, { 
  icon: React.ElementType; 
  color: string;
  bgColor: string;
  label: string;
}> = {
  industry: { icon: Building2, color: "text-blue-600", bgColor: "bg-blue-100", label: "Ngành" },
  regulation: { icon: Scale, color: "text-red-600", bgColor: "bg-red-100", label: "Quy định" },
  term: { icon: FileText, color: "text-green-600", bgColor: "bg-green-100", label: "Thuật ngữ" },
  concept: { icon: Lightbulb, color: "text-purple-600", bgColor: "bg-purple-100", label: "Khái niệm" },
  persona: { icon: Users, color: "text-amber-600", bgColor: "bg-amber-100", label: "Persona" },
  jurisdiction: { icon: Globe, color: "text-indigo-600", bgColor: "bg-indigo-100", label: "Khu vực" },
};

// ============================================
// Search Result Item
// ============================================

interface SearchResultItemProps {
  result: SemanticSearchResult;
  onViewInGraph: () => void;
  onSelect: () => void;
}

function SearchResultItem({ result, onViewInGraph, onSelect }: SearchResultItemProps) {
  const config = NODE_TYPE_CONFIG[result.node_type];
  const Icon = config.icon;
  const displayName = result.display_name?.vi || result.display_name?.en || result.node_key;
  const similarity = (result.similarity * 100).toFixed(1);

  return (
    <div className="w-full text-left p-4 rounded-lg border border-border bg-card hover:bg-muted/50 hover:border-primary/50 transition-all group">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${config.bgColor} ${config.color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium truncate">{displayName}</p>
            <Badge variant="outline" className="shrink-0 tabular-nums">
              {similarity}%
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {result.node_key}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {config.label}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewInGraph();
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Xem trong đồ thị</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                  }}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Chọn node</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

interface SemanticSearchPanelProps {
  onNodeSelect?: (nodeId: string) => void;
  onNavigateToVisualization?: () => void;
  className?: string;
}

export function SemanticSearchPanel({ 
  onNodeSelect, 
  onNavigateToVisualization,
  className 
}: SemanticSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [threshold, setThreshold] = useState(0.5);
  const [limit, setLimit] = useState(20);
  const [selectedTypes, setSelectedTypes] = useState<KnowledgeNodeType[]>([]);

  const { results, isSearching, error, search, clear } = useSemanticSearch();

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;

    search({
      query: query.trim(),
      nodeTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
      threshold,
      limit,
    });
  }, [query, selectedTypes, threshold, limit, search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const toggleTypeFilter = (type: KnowledgeNodeType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleClear = () => {
    setQuery("");
    clear();
  };

  const handleViewInGraph = (nodeId: string) => {
    onNodeSelect?.(nodeId);
    onNavigateToVisualization?.();
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Semantic Search
        </CardTitle>
        <CardDescription>
          Tìm kiếm nodes theo nghĩa sử dụng AI embeddings. Click <Eye className="h-3 w-3 inline" /> để xem trong đồ thị.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nhập từ khóa tìm kiếm..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9 pr-9"
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Tìm
              </>
            )}
          </Button>
        </div>

        {/* Filters */}
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Bộ lọc</span>
          </div>

          {/* Type Filters */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(NODE_TYPE_CONFIG).map(([type, config]) => {
              const Icon = config.icon;
              const isSelected = selectedTypes.includes(type as KnowledgeNodeType);
              return (
                <Button
                  key={type}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => toggleTypeFilter(type as KnowledgeNodeType)}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {config.label}
                </Button>
              );
            })}
          </div>

          {/* Threshold & Limit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                Ngưỡng tương đồng: {(threshold * 100).toFixed(0)}%
              </label>
              <Slider
                value={[threshold]}
                onValueChange={([v]) => setThreshold(v)}
                min={0.1}
                max={0.95}
                step={0.05}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                Số kết quả: {limit}
              </label>
              <Slider
                value={[limit]}
                onValueChange={([v]) => setLimit(v)}
                min={5}
                max={50}
                step={5}
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p>{error.message}</p>
              {error.message.includes("embedding") && (
                <p className="text-sm">
                  💡 Có thể nodes chưa có embeddings. Vào tab <strong>Embeddings</strong> và chạy "Chạy Tất Cả" để tạo embeddings.
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {isSearching ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : results && results.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Tìm thấy {results.length} kết quả
              </span>
              {results[0] && (
                <span className="text-muted-foreground">
                  Cao nhất: {(results[0].similarity * 100).toFixed(1)}%
                </span>
              )}
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-3">
                {results.map((result) => (
                  <SearchResultItem
                    key={result.node_id}
                    result={result}
                    onViewInGraph={() => handleViewInGraph(result.node_id)}
                    onSelect={() => onNodeSelect?.(result.node_id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : results !== null ? (
          <div className="text-center py-8 text-muted-foreground space-y-3">
            <Search className="h-8 w-8 mx-auto opacity-50" />
            <div>
              <p>Không tìm thấy kết quả phù hợp</p>
              <p className="text-xs mt-1">Thử điều chỉnh từ khóa hoặc ngưỡng tương đồng</p>
            </div>
            <Alert className="text-left">
              <Zap className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Nếu không có kết quả dù từ khóa hợp lệ, có thể nodes chưa có embeddings. 
                Vào tab <strong>Embeddings</strong> để tạo embeddings trước.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nhập từ khóa để tìm kiếm</p>
            <p className="text-xs mt-1">
              Sử dụng AI để tìm các nodes có nghĩa tương tự
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
