// ============================================
// Bulk Import/Export Panel
// CSV/JSON import and export for graph data
// ============================================

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  Loader2,
  Check,
  AlertCircle,
  Copy,
  FileDown,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { KnowledgeNodeType } from "@/types/knowledgeGraph";

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
  edgesCreated: number;
  errors: string[];
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
      // Fetch nodes
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
        const { data: edgeData, error: edgeError } = await supabase
          .from("industry_knowledge_edges")
          .select("*");

        if (edgeError) throw edgeError;
        edges = edgeData || [];
      }

      const exportData = {
        exportedAt: new Date().toISOString(),
        nodes,
        edges,
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
        // CSV format - export nodes and edges separately
        const nodesCSV = convertToCSV(nodes);
        content = nodesCSV;
        filename = `knowledge-graph-nodes-${Date.now()}.csv`;
        mimeType = "text/csv";
      }

      // Download file
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
                  JSON
                </div>
              </SelectItem>
              <SelectItem value="csv">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV
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
              Nodes
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeEdges}
                onChange={(e) => setIncludeEdges(e.target.checked)}
                className="rounded"
              />
              Edges
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
// Import Panel
// ============================================

function ImportPanel() {
  const [isImporting, setIsImporting] = useState(false);
  const [importData, setImportData] = useState<string>("");
  const [preview, setPreview] = useState<{ nodes: number; edges: number } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportData(content);
      
      try {
        const parsed = JSON.parse(content);
        setPreview({
          nodes: parsed.nodes?.length || 0,
          edges: parsed.edges?.length || 0,
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

    try {
      const data = JSON.parse(importData);
      const errors: string[] = [];
      let nodesCreated = 0;
      let edgesCreated = 0;

      // Import nodes
      if (data.nodes?.length > 0) {
        for (const node of data.nodes) {
          try {
            const { error } = await supabase
              .from("industry_knowledge_nodes")
              .upsert({
                ...node,
                id: undefined, // Let DB generate new ID
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }, {
                onConflict: "node_key",
              });

            if (error) throw error;
            nodesCreated++;
          } catch (err: any) {
            errors.push(`Node ${node.node_key}: ${err.message}`);
          }
        }
      }

      // Import edges (skip for now as they reference IDs)
      if (data.edges?.length > 0) {
        // Note: Edges import requires node ID mapping
        errors.push("Edge import not yet supported - requires node ID mapping");
      }

      setResult({
        success: errors.length === 0,
        nodesCreated,
        edgesCreated,
        errors,
      });

      toast({
        title: errors.length === 0 ? "Import thành công" : "Import hoàn tất với lỗi",
        description: `Đã tạo ${nodesCreated} nodes, ${edgesCreated} edges`,
        variant: errors.length === 0 ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Import error:", error);
      setResult({
        success: false,
        nodesCreated: 0,
        edgesCreated: 0,
        errors: ["Invalid JSON format"],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClear = () => {
    setImportData("");
    setPreview(null);
    setResult(null);
  };

  return (
    <div className="space-y-4">
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
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-2">Preview:</p>
          <div className="flex gap-4 text-sm">
            <span>{preview.nodes} nodes</span>
            <span>{preview.edges} edges</span>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div
          className={`p-3 rounded-lg ${
            result.success ? "bg-green-500/10" : "bg-destructive/10"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {result.success ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
            <span className="font-medium">
              {result.success ? "Import thành công" : "Import có lỗi"}
            </span>
          </div>
          <p className="text-sm">
            Nodes: {result.nodesCreated}, Edges: {result.edgesCreated}
          </p>
          {result.errors.length > 0 && (
            <div className="mt-2 text-xs text-destructive max-h-24 overflow-auto">
              {result.errors.slice(0, 5).map((err, i) => (
                <p key={i}>{err}</p>
              ))}
              {result.errors.length > 5 && (
                <p>...và {result.errors.length - 5} lỗi khác</p>
              )}
            </div>
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
          Bulk import và export dữ liệu Knowledge Graph
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
