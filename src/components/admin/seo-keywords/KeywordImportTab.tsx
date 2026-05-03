import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Download } from "lucide-react";
import { toast } from "sonner";

const TEMPLATE_CSV = `keyword,volume,difficulty,cpc_vnd,intent
ai tạo content cho spa,1200,35,8500,commercial
phần mềm marketing tự động,2400,55,15000,transactional
cách viết caption hay,890,28,3200,informational`;

export default function KeywordImportTab() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const qc = useQueryClient();
  const [csv, setCsv] = useState("");
  const [importing, setImporting] = useState(false);

  const handleFile = async (file: File) => {
    const text = await file.text();
    setCsv(text);
  };

  const handleImport = async () => {
    if (!csv.trim() || !orgId) return;
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("keyword-bulk-import", {
        body: { csv, organizationId: orgId, locale: "vi", source: "csv_import" },
      });
      if (error) throw error;
      toast.success(`Đã import ${data?.inserted}/${data?.total_parsed} keyword`);
      setCsv("");
      qc.invalidateQueries({ queryKey: ["seo-keywords"] }); qc.invalidateQueries({ queryKey: ["seo-keywords-shared"] });
      qc.invalidateQueries({ queryKey: ["seo-keywords-dashboard"] });
    } catch (e: any) {
      toast.error(e.message || "Lỗi import");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "keywords-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (!orgId) return <p className="text-muted-foreground">Chọn workspace.</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" /> Import keywords từ CSV</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-1" /> Download template
          </Button>
          <Button variant="outline" size="sm" asChild>
            <label className="cursor-pointer">
              <Upload className="h-4 w-4 mr-1" /> Chọn file CSV
              <input type="file" accept=".csv,text/csv" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>
          </Button>
        </div>

        <div>
          <Textarea
            value={csv}
            onChange={e => setCsv(e.target.value)}
            placeholder="Paste CSV ở đây hoặc upload file. Header tối thiểu: keyword. Tùy chọn: volume, difficulty, cpc_vnd, intent. Hỗ trợ GSC export (query, impressions...)."
            rows={12}
            className="font-mono text-xs"
          />
        </div>

        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">Tối đa 5000 dòng/lần. Trùng keyword sẽ được update giá trị mới.</p>
          <Button onClick={handleImport} disabled={importing || !csv.trim()}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
            Import
          </Button>
        </div>

        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Format chấp nhận</summary>
          <pre className="mt-2 p-2 bg-muted rounded">{TEMPLATE_CSV}</pre>
          <p className="mt-2">Cũng hỗ trợ GSC export: <code>query, impressions, clicks, ctr, position</code> — sẽ tự map query→keyword, impressions→volume.</p>
        </details>
      </CardContent>
    </Card>
  );
}
