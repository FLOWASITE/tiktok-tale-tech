/**
 * IndustryContentTabs - Tabbed content viewer for Industry Pack knowledge
 */

import React, { useState, useMemo, useCallback } from "react";
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
  FileText, 
  BookOpen, 
  Network, 
  Search,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Calendar,
  Download,
  ExternalLink,
  Sparkles,
  Users,
} from "lucide-react";
import type { KnowledgeNodeData, KnowledgeEdgeData } from "@/hooks/useIndustryPackKnowledge";
import type { KnowledgeNodeType } from "@/types/knowledgeGraph";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import Papa from "papaparse";

interface IndustryContentTabsProps {
  nodes: KnowledgeNodeData[];
  edges: KnowledgeEdgeData[];
  activeFilter: KnowledgeNodeType | null;
}

// ============================================
// Export CSV Utility
// ============================================

function exportToCSV(data: Record<string, unknown>[], filename: string) {
  const csv = Papa.unparse(data);
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
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

      {/* Tabs - Scrollable on mobile */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 pb-1">
          <TabsList className="w-max min-w-full">
            <TabsTrigger value="regulations" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Quy định</span>
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {regulations.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="terms" className="gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Thuật ngữ</span>
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {terms.length + concepts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="personas" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Persona</span>
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {personas.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="graph" className="gap-1.5">
              <Network className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mối quan hệ</span>
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {edges.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Regulations Tab */}
        <TabsContent value="regulations" className="mt-4">
          <RegulationsTable regulations={regulations} />
        </TabsContent>

        {/* Terms Tab */}
        <TabsContent value="terms" className="mt-4">
          <TermsGrid terms={[...terms, ...concepts]} />
        </TabsContent>

        {/* Personas Tab */}
        <TabsContent value="personas" className="mt-4">
          <PersonasGrid personas={personas} />
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
// Regulations Table (Fixed Collapsible Pattern)
// ============================================

function RegulationsTable({ regulations }: { regulations: KnowledgeNodeData[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleExportCSV = useCallback(() => {
    const data = regulations.map(reg => ({
      'Tên quy định (VI)': reg.displayName.vi || '',
      'Tên quy định (EN)': reg.displayName.en || '',
      'Loại văn bản': reg.documentType || '',
      'Ngày hiệu lực': reg.effectiveDate || '',
      'Có Embedding': reg.hasEmbedding ? 'Có' : 'Không',
      'Chất lượng': reg.contentQualityScore ? `${Math.round(reg.contentQualityScore * 100)}%` : '',
      'Mô tả': reg.description || '',
      'URL nguồn': reg.sourceUrl || '',
    }));
    exportToCSV(data, `quy-dinh-${format(new Date(), 'yyyyMMdd')}`);
  }, [regulations]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

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
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">
          Danh sách quy định ({regulations.length})
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Xuất CSV
        </Button>
      </CardHeader>
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
              <React.Fragment key={reg.id}>
                {/* Main Row */}
                <TableRow 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleExpand(reg.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                        <ChevronDown className={cn(
                          "h-4 w-4 transition-transform",
                          expandedId === reg.id && "rotate-180"
                        )} />
                      </Button>
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
                
                {/* Expanded Row (conditional render - no Collapsible) */}
                {expandedId === reg.id && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
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
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span>Cập nhật: {format(new Date(reg.updatedAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</span>
                          {reg.sourceUrl && (
                            <a 
                              href={reg.sourceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3" />
                              Xem nguồn gốc
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
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
  const handleExportCSV = useCallback(() => {
    const data = terms.map(term => ({
      'Tên (VI)': term.displayName.vi || '',
      'Tên (EN)': term.displayName.en || '',
      'Loại': term.nodeType === 'term' ? 'Thuật ngữ' : 'Khái niệm',
      'Mô tả': term.description || '',
      'Có Embedding': term.hasEmbedding ? 'Có' : 'Không',
    }));
    exportToCSV(data, `thuat-ngu-${format(new Date(), 'yyyyMMdd')}`);
  }, [terms]);

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
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Xuất CSV
        </Button>
      </div>
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
    </div>
  );
}

// ============================================
// Personas Grid (NEW)
// ============================================

function PersonasGrid({ personas }: { personas: KnowledgeNodeData[] }) {
  const handleExportCSV = useCallback(() => {
    const data = personas.map(persona => ({
      'Tên (VI)': persona.displayName.vi || '',
      'Tên (EN)': persona.displayName.en || '',
      'Mô tả': persona.description || '',
      'Có Embedding': persona.hasEmbedding ? 'Có' : 'Không',
    }));
    exportToCSV(data, `persona-${format(new Date(), 'yyyyMMdd')}`);
  }, [personas]);

  if (personas.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Chưa có persona nào</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Xuất CSV
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {personas.map((persona) => (
          <Card key={persona.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm">
                    {persona.displayName.vi || persona.displayName.en || 'Không có tên'}
                  </h3>
                  {persona.displayName.en && persona.displayName.vi && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {persona.displayName.en}
                    </p>
                  )}
                  {persona.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
                      {persona.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    {persona.hasEmbedding && (
                      <Badge variant="outline" className="text-[10px] gap-0.5">
                        <Sparkles className="h-2.5 w-2.5" />
                        Embedding
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
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

  const handleExportCSV = useCallback(() => {
    const data = edges.map(edge => {
      const source = nodeMap.get(edge.sourceNodeId);
      const target = nodeMap.get(edge.targetNodeId);
      return {
        'Loại quan hệ': edgeTypeLabels[edge.edgeType] || edge.edgeType,
        'Node nguồn (VI)': source?.displayName.vi || '',
        'Node nguồn (EN)': source?.displayName.en || '',
        'Node đích (VI)': target?.displayName.vi || '',
        'Node đích (EN)': target?.displayName.en || '',
        'Trọng số': edge.weight ?? '',
      };
    });
    exportToCSV(data, `moi-quan-he-${format(new Date(), 'yyyyMMdd')}`);
  }, [edges, nodeMap, edgeTypeLabels]);

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
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Xuất CSV
        </Button>
      </div>
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
