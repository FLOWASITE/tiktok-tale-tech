/**
 * IndustryKnowledgeExplorer - Main component for viewing Knowledge Graph content per Industry Pack
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Factory, AlertCircle, ArrowRight, ChevronRight, Loader2, FileWarning } from "lucide-react";
import { IndustryPackSelector } from "./IndustryPackSelector";
import { IndustryContentStats } from "./IndustryContentStats";
import { IndustryContentTabs } from "./IndustryContentTabs";
import { useIndustryPackKnowledge } from "@/hooks/useIndustryPackKnowledge";
import { useIsMobile } from "@/hooks/use-mobile";
import type { KnowledgeNodeType } from "@/types/knowledgeGraph";

export function IndustryKnowledgeExplorer() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [nodeTypeFilter, setNodeTypeFilter] = useState<KnowledgeNodeType | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: packKnowledge, isLoading, error } = useIndustryPackKnowledge(selectedPackId);

  // Handle pack selection - open sheet on mobile
  const handleSelectPack = (packId: string) => {
    setSelectedPackId(packId);
    if (isMobile) {
      setSheetOpen(true);
    }
  };

  // Navigate to Graph tab with pack filter
  const handleViewGraph = () => {
    if (selectedPackId && packKnowledge?.packInfo) {
      navigate(`/admin/knowledge-graph?tab=explorer&packId=${selectedPackId}`);
    }
  };

  // Mobile layout with Sheet
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Selected Pack Badge - show immediately when selected */}
        {selectedPackId && (
          <div 
            className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20 cursor-pointer"
            onClick={() => setSheetOpen(true)}
          >
            <div className="flex items-center gap-2">
              <Factory className="h-4 w-4 text-primary" />
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Đang tải...</span>
                </div>
              ) : (
                <span className="font-medium text-sm">{packKnowledge?.packInfo?.name || "Đang tải..."}</span>
              )}
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              Xem chi tiết
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Pack Selector Full Width */}
        <Card>
          <IndustryPackSelector
            selectedPackId={selectedPackId}
            onSelectPack={handleSelectPack}
          />
        </Card>

        {/* Sheet for Content */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="h-[85vh] px-0">
            <SheetHeader className="px-4 pb-2">
              <SheetTitle className="flex items-center gap-2">
                <Factory className="h-4 w-4 text-primary" />
                {isLoading ? (
                  <Skeleton className="h-5 w-40" />
                ) : (
                  packKnowledge?.packInfo?.name || "Nội dung ngành"
                )}
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(85vh-60px)] px-4">
              <div className="space-y-4 pb-6">
                {isLoading ? (
                  <LoadingState />
                ) : error ? (
                  <ErrorState error={error} />
                ) : packKnowledge ? (
                  packKnowledge.stats.total === 0 ? (
                    <NoDataState packName={packKnowledge.packInfo.name} />
                  ) : (
                    <>
                      <IndustryContentStats
                        packInfo={packKnowledge.packInfo}
                        stats={packKnowledge.stats}
                        activeFilter={nodeTypeFilter}
                        onFilterChange={setNodeTypeFilter}
                        onViewGraph={handleViewGraph}
                      />
                      <IndustryContentTabs
                        nodes={packKnowledge.nodes}
                        edges={packKnowledge.edges}
                        activeFilter={nodeTypeFilter}
                      />
                    </>
                  )
                ) : (
                  <EmptyState />
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Desktop layout - 2 columns
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 min-h-[600px]">
      {/* Sidebar - Pack Selector */}
      <Card className="h-fit lg:sticky lg:top-6">
        <IndustryPackSelector
          selectedPackId={selectedPackId}
          onSelectPack={setSelectedPackId}
        />
      </Card>

      {/* Main Content Area */}
      <div className="space-y-6">
        {!selectedPackId ? (
          <EmptyState />
        ) : isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} />
        ) : packKnowledge ? (
          <>
            <IndustryContentStats
              packInfo={packKnowledge.packInfo}
              stats={packKnowledge.stats}
              activeFilter={nodeTypeFilter}
              onFilterChange={setNodeTypeFilter}
              onViewGraph={handleViewGraph}
            />
            <IndustryContentTabs
              nodes={packKnowledge.nodes}
              edges={packKnowledge.edges}
              activeFilter={nodeTypeFilter}
            />
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Factory className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Chọn ngành để xem nội dung</h3>
        <p className="text-muted-foreground max-w-md">
          Chọn một Industry Pack từ danh sách bên trái để xem các quy định, thuật ngữ và mối quan hệ trong Knowledge Graph.
        </p>
        <div className="flex items-center gap-2 mt-6 text-sm text-muted-foreground">
          <span>Chọn ngành</span>
          <ArrowRight className="h-4 w-4" />
          <span>Xem thống kê</span>
          <ArrowRight className="h-4 w-4" />
          <span>Khám phá nội dung</span>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
      
      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-80" />
      <Skeleton className="h-64" />
    </div>
  );
}

function ErrorState({ error }: { error: Error }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Không thể tải dữ liệu: {error.message}
      </AlertDescription>
    </Alert>
  );
}

function NoDataState({ packName }: { packName: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-amber-50 dark:bg-amber-950/30 mb-4">
          <FileWarning className="h-10 w-10 text-amber-500" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Chưa có nội dung</h3>
        <p className="text-muted-foreground max-w-md">
          Industry Pack <strong>"{packName}"</strong> chưa có dữ liệu Knowledge Graph.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Vui lòng liên kết quy định và thuật ngữ từ tab "Nguồn & Crawl".
        </p>
      </CardContent>
    </Card>
  );
}
