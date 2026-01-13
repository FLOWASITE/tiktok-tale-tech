// ============================================
// Bulk Import/Export Panel
// CSV/JSON import and export for graph data
// With full edge import support
// ============================================

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  Loader2,
  Check,
  AlertCircle,
  FileDown,
  Info,
  Link2,
  Box,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { KnowledgeNodeType, KnowledgeEdgeType } from "@/types/knowledgeGraph";

// ============================================
// Types
// ============================================

interface ExportOptions {
  format: "json" | "csv";
  includeNodes: boolean;
  includeEdges: boolean;
  nodeTypes: KnowledgeNodeType[];
}

interface ImportResult {
  success: boolean;
  nodesCreated: number;
  nodesUpdated: number;
  edgesCreated: number;
  edgesSkipped: number;
  errors: string[];
}

interface ImportPreview {
  nodes: number;
  edges: number;
  nodeTypes: Record<string, number>;
  edgeTypes: Record<string, number>;
}

interface NodeKeyMap {
  [nodeKey: string]: string; // node_key -> node_id
}

// ============================================
// Export Panel
// ============================================

function ExportPanel() {
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [includeNodes, setIncludeNodes] = useState(true);
  const [includeEdges, setIncludeEdges] = useState(true);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let nodes: any[] = [];
      let edges: any[] = [];

      if (includeNodes) {
        const { data: nodeData, error: nodeError } = await supabase
          .from("industry_knowledge_nodes")
          .select("*")
          .eq("is_active", true);

        if (nodeError) throw nodeError;
        nodes = nodeData || [];
      }

      if (includeEdges) {
        // First fetch edges
        const { data: edgeData, error: edgeError } = await supabase
          .from("industry_knowledge_edges")
          .select("*");

        if (edgeError) throw edgeError;
        
        // Build a map of node IDs to node_keys
        const nodeIdToKey: Record<string, string> = {};
        nodes.forEach((n: any) => {
          nodeIdToKey[n.id] = n.node_key;
        });
        
        // If nodes weren't included, fetch them for mapping
        if (!includeNodes) {
          const { data: allNodes } = await supabase
            .from("industry_knowledge_nodes")
            .select("id, node_key");
          (allNodes || []).forEach((n: any) => {
            nodeIdToKey[n.id] = n.node_key;
          });
        }
        
        // Map edges to include node_keys for reimport
        edges = (edgeData || []).map(edge => ({
          ...edge,
          source_node_key: nodeIdToKey[edge.source_node_id],
          target_node_key: nodeIdToKey[edge.target_node_id],
        }));
      }

      const exportData = {
        exportedAt: new Date().toISOString(),
        version: "1.1",
        nodes: nodes.map(n => ({
          node_key: n.node_key,
          node_type: n.node_type,
          display_name: n.display_name,
          description: n.description,
          properties: n.properties,
          global_pack_id: n.global_pack_id,
        })),
        edges: edges.map(e => ({
          source_node_key: e.source_node_key,
          target_node_key: e.target_node_key,
          edge_type: e.edge_type,
          weight: e.weight,
          properties: e.properties,
        })),
        summary: {
          totalNodes: nodes.length,
          totalEdges: edges.length,
        },
      };

      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === "json") {
        content = JSON.stringify(exportData, null, 2);
        filename = `knowledge-graph-export-${Date.now()}.json`;
        mimeType = "application/json";
      } else {
        const nodesCSV = convertToCSV(nodes);
        content = nodesCSV;
        filename = `knowledge-graph-nodes-${Date.now()}.csv`;
        mimeType = "text/csv";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export thành công",
        description: `Đã export ${nodes.length} nodes và ${edges.length} edges`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export thất bại",
        description: "Có lỗi xảy ra khi export dữ liệu",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Export bao gồm <code>node_key</code> cho mỗi node và edge để hỗ trợ reimport mà không cần mapping ID.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Định dạng</label>
          <Select value={format} onValueChange={(v) => setFormat(v as "json" | "csv")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">
                <div className="flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  JSON (nodes + edges)
                </div>
              </SelectItem>
              <SelectItem value="csv">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV (nodes only)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Bao gồm</label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeNodes}
                onChange={(e) => setIncludeNodes(e.target.checked)}
                className="rounded"
              />
              <Box className="h-4 w-4" />
              Nodes
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeEdges}
                onChange={(e) => setIncludeEdges(e.target.checked)}
                className="rounded"
                disabled={format === "csv"}
              />
              <Link2 className="h-4 w-4" />
              Edges {format === "csv" && "(chỉ JSON)"}
            </label>
          </div>
        </div>
      </div>

      <Button
        onClick={handleExport}
        disabled={isExporting || (!includeNodes && !includeEdges)}
        className="w-full"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        Export Data
      </Button>
    </div>
  );
}

// ============================================
// Import Panel with Edge Support
// ============================================

function ImportPanel() {
  const [isImporting, setIsImporting] = useState(false);
  const [importData, setImportData] = useState<string>("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportData(content);
      setResult(null);
      
      try {
        const parsed = JSON.parse(content);
        
        // Count node types
        const nodeTypes: Record<string, number> = {};
        (parsed.nodes || []).forEach((n: any) => {
          const type = n.node_type || 'unknown';
          nodeTypes[type] = (nodeTypes[type] || 0) + 1;
        });

        // Count edge types
        const edgeTypes: Record<string, number> = {};
        (parsed.edges || []).forEach((e: any) => {
          const type = e.edge_type || 'unknown';
          edgeTypes[type] = (edgeTypes[type] || 0) + 1;
        });

        setPreview({
          nodes: parsed.nodes?.length || 0,
          edges: parsed.edges?.length || 0,
          nodeTypes,
          edgeTypes,
        });
      } catch {
        setPreview(null);
      }
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/json": [".json"],
    },
    maxFiles: 1,
  });

  const handleImport = async () => {
    if (!importData) return;

    setIsImporting(true);
    setResult(null);
    setImportProgress(0);

    try {
      const data = JSON.parse(importData);
      const errors: string[] = [];
      let nodesCreated = 0;
      let nodesUpdated = 0;
      let edgesCreated = 0;
      let edgesSkipped = 0;

      const totalItems = (data.nodes?.length || 0) + (data.edges?.length || 0);
      let processedItems = 0;

      // Build node_key -> id map from existing nodes
      const nodeKeyMap: NodeKeyMap = {};

      // Import nodes first
      if (data.nodes?.length > 0) {
        for (const node of data.nodes) {
          try {
            // Check if node exists
            const { data: existing } = await supabase
              .from("industry_knowledge_nodes")
              .select("id")
              .eq("node_key", node.node_key)
              .single();

            if (existing) {
              // Update existing node
              const { error } = await supabase
                .from("industry_knowledge_nodes")
                .update({
                  display_name: node.display_name,
                  description: node.description,
                  properties: node.properties,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existing.id);

              if (error) throw error;
              nodeKeyMap[node.node_key] = existing.id;
              nodesUpdated++;
            } else {
              // Create new node
              const { data: created, error } = await supabase
                .from("industry_knowledge_nodes")
                .insert({
                  node_key: node.node_key,
                  node_type: node.node_type,
                  display_name: node.display_name,
                  description: node.description,
                  properties: node.properties,
                  global_pack_id: node.global_pack_id,
                  is_active: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .select("id")
                .single();

              if (error) throw error;
              if (created) {
                nodeKeyMap[node.node_key] = created.id;
              }
              nodesCreated++;
            }
          } catch (err: any) {
            errors.push(`Node ${node.node_key}: ${err.message}`);
          }

          processedItems++;
          setImportProgress(Math.round((processedItems / totalItems) * 100));
        }
      }

      // Fetch remaining nodes for edge mapping
      const { data: allNodes } = await supabase
        .from("industry_knowledge_nodes")
        .select("id, node_key")
        .eq("is_active", true);

      if (allNodes) {
        allNodes.forEach(n => {
          if (!nodeKeyMap[n.node_key]) {
            nodeKeyMap[n.node_key] = n.id;
          }
        });
      }

      // Import edges
      if (data.edges?.length > 0) {
        for (const edge of data.edges) {
          try {
            const sourceId = nodeKeyMap[edge.source_node_key];
            const targetId = nodeKeyMap[edge.target_node_key];

            if (!sourceId || !targetId) {
              errors.push(`Edge ${edge.source_node_key} -> ${edge.target_node_key}: Missing node(s)`);
              edgesSkipped++;
              processedItems++;
              setImportProgress(Math.round((processedItems / totalItems) * 100));
              continue;
            }

            // Check if edge already exists
            const { data: existingEdge } = await supabase
              .from("industry_knowledge_edges")
              .select("id")
              .eq("source_node_id", sourceId)
              .eq("target_node_id", targetId)
              .eq("edge_type", edge.edge_type)
              .single();

            if (existingEdge) {
              edgesSkipped++;
            } else {
              const { error } = await supabase
                .from("industry_knowledge_edges")
                .insert({
                  source_node_id: sourceId,
                  target_node_id: targetId,
                  edge_type: edge.edge_type,
                  weight: edge.weight || 1.0,
                  properties: edge.properties,
                  created_at: new Date().toISOString(),
                });

              if (error) throw error;
              edgesCreated++;
            }
          } catch (err: any) {
            errors.push(`Edge: ${err.message}`);
          }

          processedItems++;
          setImportProgress(Math.round((processedItems / totalItems) * 100));
        }
      }

      setResult({
        success: errors.length === 0,
        nodesCreated,
        nodesUpdated,
        edgesCreated,
        edgesSkipped,
        errors,
      });

      toast({
        title: errors.length === 0 ? "Import thành công" : "Import hoàn tất với lỗi",
        description: `Nodes: +${nodesCreated} mới, ~${nodesUpdated} cập nhật | Edges: +${edgesCreated} mới, ${edgesSkipped} bỏ qua`,
        variant: errors.length === 0 ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Import error:", error);
      setResult({
        success: false,
        nodesCreated: 0,
        nodesUpdated: 0,
        edgesCreated: 0,
        edgesSkipped: 0,
        errors: ["Invalid JSON format"],
      });
    } finally {
      setIsImporting(false);
      setImportProgress(100);
    }
  };

  const handleClear = () => {
    setImportData("");
    setPreview(null);
    setResult(null);
    setImportProgress(0);
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Import sử dụng <code>node_key</code> để mapping. Edges sẽ được tạo tự động nếu cả source và target nodes tồn tại.
        </AlertDescription>
      </Alert>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        {isDragActive ? (
          <p>Thả file vào đây...</p>
        ) : (
          <>
            <p>Kéo thả file JSON vào đây</p>
            <p className="text-xs text-muted-foreground mt-1">
              hoặc click để chọn file
            </p>
          </>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <p className="text-sm font-medium">Preview:</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Box className="h-4 w-4" />
                {preview.nodes} nodes
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(preview.nodeTypes).map(([type, count]) => (
                  <Badge key={type} variant="secondary" className="text-xs">
                    {type}: {count}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Link2 className="h-4 w-4" />
                {preview.edges} edges
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(preview.edgeTypes).map(([type, count]) => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {type}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      {isImporting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Đang import...</span>
            <span>{importProgress}%</span>
          </div>
          <Progress value={importProgress} className="h-2" />
        </div>
      )}

      {/* Result */}
      {result && (
        <div
          className={`p-4 rounded-lg ${
            result.success ? "bg-green-500/10" : "bg-destructive/10"
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            {result.success ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-destructive" />
            )}
            <span className="font-medium">
              {result.success ? "Import thành công" : "Import có lỗi"}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Nodes</p>
              <div className="flex gap-2">
                <Badge variant="secondary">+{result.nodesCreated} mới</Badge>
                <Badge variant="outline">~{result.nodesUpdated} cập nhật</Badge>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Edges</p>
              <div className="flex gap-2">
                <Badge variant="secondary">+{result.edgesCreated} mới</Badge>
                <Badge variant="outline">{result.edgesSkipped} bỏ qua</Badge>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <ScrollArea className="mt-3 max-h-24">
              <div className="text-xs text-destructive space-y-1">
                {result.errors.slice(0, 10).map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
                {result.errors.length > 10 && (
                  <p>...và {result.errors.length - 10} lỗi khác</p>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={handleImport}
          disabled={isImporting || !importData}
          className="flex-1"
        >
          {isImporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Import
        </Button>
        {importData && (
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Helper Functions
// ============================================

function convertToCSV(data: any[]): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(",")];

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      if (value === null || value === undefined) return "";
      if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

// ============================================
// Main Component
// ============================================

export function BulkImportExport() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          Import / Export
        </CardTitle>
        <CardDescription>
          Bulk import và export dữ liệu Knowledge Graph với hỗ trợ đầy đủ nodes và edges
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="export">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <Upload className="h-4 w-4" />
              Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="mt-4">
            <ExportPanel />
          </TabsContent>

          <TabsContent value="import" className="mt-4">
            <ImportPanel />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
