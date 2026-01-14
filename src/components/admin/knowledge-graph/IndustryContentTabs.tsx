/**
 * IndustryContentTabs - Tabbed content viewer for Industry Pack knowledge
 */

import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  FileText, 
  BookOpen, 
  Network, 
  Search,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Calendar,
  Hash,
  Sparkles
} from "lucide-react";
import type { KnowledgeNodeData, KnowledgeEdgeData } from "@/hooks/useIndustryPackKnowledge";
import type { KnowledgeNodeType } from "@/types/knowledgeGraph";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface IndustryContentTabsProps {
  nodes: KnowledgeNodeData[];
  edges: KnowledgeEdgeData[];
  activeFilter: KnowledgeNodeType | null;
}

export function IndustryContentTabs({ nodes, edges, activeFilter }: IndustryContentTabsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("regulations");

  // Filter nodes by type and search
  const filteredNodes = useMemo(() => {
    let result = nodes;
    
    // Apply type filter
    if (activeFilter) {
      result = result.filter(n => n.nodeType === activeFilter);
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(n => 
        (n.displayName.vi || '').toLowerCase().includes(query) ||
        (n.displayName.en || '').toLowerCase().includes(query) ||
        (n.description || '').toLowerCase().includes(query) ||
        (n.documentType || '').toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [nodes, activeFilter, searchQuery]);

  // Separate by type
  const regulations = useMemo(() => 
    filteredNodes.filter(n => n.nodeType === 'regulation'), [filteredNodes]);
  const terms = useMemo(() => 
    filteredNodes.filter(n => n.nodeType === 'term'), [filteredNodes]);
  const concepts = useMemo(() => 
    filteredNodes.filter(n => n.nodeType === 'concept'), [filteredNodes]);
  const personas = useMemo(() => 
    filteredNodes.filter(n => n.nodeType === 'persona'), [filteredNodes]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm nội dung..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="regulations" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Quy định
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {regulations.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="terms" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Thuật ngữ
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {terms.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="graph" className="gap-1.5">
            <Network className="h-3.5 w-3.5" />
            Mối quan hệ
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {edges.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Regulations Tab */}
        <TabsContent value="regulations" className="mt-4">
          <RegulationsTable regulations={regulations} />
        </TabsContent>

        {/* Terms Tab */}
        <TabsContent value="terms" className="mt-4">
          <TermsGrid terms={[...terms, ...concepts]} />
        </TabsContent>

        {/* Graph/Relationships Tab */}
        <TabsContent value="graph" className="mt-4">
          <RelationshipsPanel nodes={filteredNodes} edges={edges} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// Regulations Table
// ============================================

function RegulationsTable({ regulations }: { regulations: KnowledgeNodeData[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (regulations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Chưa có quy định nào</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <ScrollArea className="max-h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Tên quy định</TableHead>
              <TableHead>Loại văn bản</TableHead>
              <TableHead>Ngày hiệu lực</TableHead>
              <TableHead className="text-center">Embedding</TableHead>
              <TableHead className="text-center">Chất lượng</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {regulations.map((reg) => (
              <Collapsible key={reg.id} asChild>
                <>
                  <TableRow 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedId(expandedId === reg.id ? null : reg.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <ChevronDown className={cn(
                              "h-4 w-4 transition-transform",
                              expandedId === reg.id && "rotate-180"
                            )} />
                          </Button>
                        </CollapsibleTrigger>
                        <span className="font-medium line-clamp-1">
                          {reg.displayName.vi || reg.displayName.en || 'Không có tên'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {reg.documentType ? (
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded flex items-center gap-1 w-fit">
                          {reg.documentType}
                        </code>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {reg.effectiveDate ? (
                        <span className="text-sm flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(reg.effectiveDate), 'dd/MM/yyyy', { locale: vi })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {reg.hasEmbedding ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {reg.contentQualityScore !== undefined ? (
                        <QualityBadge score={reg.contentQualityScore} />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                  <CollapsibleContent asChild>
                    {expandedId === reg.id && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={5} className="p-4">
                          <div className="space-y-3">
                            {reg.description && (
                              <div>
                                <h4 className="text-xs font-medium text-muted-foreground mb-1">Mô tả</h4>
                                <p className="text-sm">{reg.description}</p>
                              </div>
                            )}
                            {reg.fullText && (
                              <div>
                                <h4 className="text-xs font-medium text-muted-foreground mb-1">Nội dung đầy đủ</h4>
                                <ScrollArea className="max-h-40 rounded border bg-background p-3">
                                  <p className="text-sm whitespace-pre-wrap">{reg.fullText}</p>
                                </ScrollArea>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Cập nhật: {format(new Date(reg.updatedAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </CollapsibleContent>
                </>
              </Collapsible>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  );
}

// ============================================
// Terms Grid
// ============================================

function TermsGrid({ terms }: { terms: KnowledgeNodeData[] }) {
  if (terms.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Chưa có thuật ngữ nào</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {terms.map((term) => (
        <Card key={term.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">
                  {term.displayName.vi || term.displayName.en || 'Không có tên'}
                </h3>
                {term.displayName.en && term.displayName.vi && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {term.displayName.en}
                  </p>
                )}
              </div>
              <Badge variant={term.nodeType === 'term' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                {term.nodeType === 'term' ? 'Thuật ngữ' : 'Khái niệm'}
              </Badge>
            </div>
            {term.description && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                {term.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              {term.hasEmbedding && (
                <Badge variant="outline" className="text-[10px] gap-0.5">
                  <Sparkles className="h-2.5 w-2.5" />
                  Embedding
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// Relationships Panel
// ============================================

function RelationshipsPanel({ 
  nodes, 
  edges 
}: { 
  nodes: KnowledgeNodeData[]; 
  edges: KnowledgeEdgeData[] 
}) {
  const nodeMap = useMemo(() => 
    new Map(nodes.map(n => [n.id, n])), [nodes]);

  // Group edges by type
  const edgesByType = useMemo(() => {
    const grouped: Record<string, KnowledgeEdgeData[]> = {};
    edges.forEach(edge => {
      if (!grouped[edge.edgeType]) {
        grouped[edge.edgeType] = [];
      }
      grouped[edge.edgeType].push(edge);
    });
    return grouped;
  }, [edges]);

  const edgeTypeLabels: Record<string, string> = {
    related_to: 'Liên quan',
    parent_of: 'Cha của',
    regulated_by: 'Được quy định bởi',
    uses_term: 'Sử dụng thuật ngữ',
    shares_audience: 'Cùng đối tượng',
    competes_with: 'Cạnh tranh với',
    requires_compliance: 'Cần tuân thủ',
    derived_from: 'Phát sinh từ',
    applies_to: 'Áp dụng cho',
  };

  if (edges.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Network className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Chưa có mối quan hệ nào</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(edgesByType).map(([type, typeEdges]) => (
        <Card key={type}>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {edgeTypeLabels[type] || type}
              <Badge variant="secondary" className="text-[10px]">{typeEdges.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {typeEdges.slice(0, 10).map((edge) => {
                const source = nodeMap.get(edge.sourceNodeId);
                const target = nodeMap.get(edge.targetNodeId);
                return (
                  <div key={edge.id} className="flex items-center gap-2 text-sm">
                    <span className="truncate max-w-[40%]">
                      {source?.displayName.vi || source?.displayName.en || edge.sourceNodeId.slice(0, 8)}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="truncate max-w-[40%]">
                      {target?.displayName.vi || target?.displayName.en || edge.targetNodeId.slice(0, 8)}
                    </span>
                  </div>
                );
              })}
              {typeEdges.length > 10 && (
                <p className="text-xs text-muted-foreground">
                  ... và {typeEdges.length - 10} mối quan hệ khác
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// Quality Badge Helper
// ============================================

function QualityBadge({ score }: { score: number }) {
  let variant: 'default' | 'secondary' | 'destructive' = 'secondary';
  let label = 'Thấp';
  
  if (score >= 0.8) {
    variant = 'default';
    label = 'Cao';
  } else if (score >= 0.5) {
    variant = 'secondary';
    label = 'TB';
  } else {
    variant = 'destructive';
    label = 'Thấp';
  }

  return (
    <Badge variant={variant} className="text-[10px]">
      {Math.round(score * 100)}% {label}
    </Badge>
  );
}
