import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useEffect } from "react";

interface ImportUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

interface CsvRow {
  email: string;
  name: string;
  password: string;
  role: string;
  plan: string;
}

interface ImportResult {
  email: string;
  success: boolean;
  error?: string;
}

interface Org {
  id: string;
  name: string;
}

export function ImportUsersDialog({ open, onOpenChange, onImported }: ImportUsersDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("none");
  const [orgRole, setOrgRole] = useState<string>("member");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);

  useEffect(() => {
    if (open) {
      supabase.from("organizations").select("id, name").then(({ data }) => {
        setOrgs(data || []);
      });
    }
  }, [open]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error("CSV phải có ít nhất 1 header + 1 dòng dữ liệu");
        return;
      }

      const parsed: CsvRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols.length >= 3 && cols[0].includes("@")) {
          parsed.push({
            email: cols[0],
            name: cols[1] || "",
            password: cols[2] || "Password123!",
            role: cols[3] || "user",
            plan: cols[4] || "free",
          });
        }
      }
      setRows(parsed);
      setResults([]);
      setProgress(0);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    setResults([]);
    setProgress(0);

    const importResults: ImportResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const body: Record<string, unknown> = {
          action: "create_user",
          email: row.email,
          password: row.password,
          full_name: row.name,
          role: row.role,
          plan_type: row.plan,
        };

        if (selectedOrg !== "none") {
          body.organization_ids = [selectedOrg];
          body.org_role = orgRole;
        }

        const { data, error } = await supabase.functions.invoke("admin-manage-user", { body });

        if (error || data?.error) {
          importResults.push({ email: row.email, success: false, error: data?.error || error?.message });
        } else {
          importResults.push({ email: row.email, success: true });
        }
      } catch (err: unknown) {
        importResults.push({ email: row.email, success: false, error: err instanceof Error ? err.message : "Unknown error" });
      }

      setProgress(Math.round(((i + 1) / rows.length) * 100));
      setResults([...importResults]);
    }

    const successCount = importResults.filter((r) => r.success).length;
    toast.success(`Import hoàn tất: ${successCount}/${rows.length} thành công`);
    setImporting(false);
    if (successCount > 0) onImported();
  }

  function handleClose(isOpen: boolean) {
    if (!importing) {
      setRows([]);
      setResults([]);
      setProgress(0);
      onOpenChange(isOpen);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Users từ CSV
          </DialogTitle>
          <DialogDescription>
            Upload file CSV với format: email, name, password, role, plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File upload */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
            >
              <FileText className="h-4 w-4 mr-1" />
              Chọn file CSV
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            {rows.length > 0 && (
              <Badge variant="secondary">{rows.length} rows</Badge>
            )}
          </div>

          {/* Org assignment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Gán vào Organization</label>
              <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không gán</SelectItem>
                  {orgs.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedOrg !== "none" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Role trong Org</label>
                <Select value={orgRole} onValueChange={setOrgRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Preview table */}
          {rows.length > 0 && (
            <div className="rounded-md border overflow-x-auto max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tên</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Plan</TableHead>
                    {results.length > 0 && <TableHead>Kết quả</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => {
                    const result = results[idx];
                    return (
                      <TableRow key={idx}>
                        <TableCell className="text-xs">{idx + 1}</TableCell>
                        <TableCell className="text-sm">{row.email}</TableCell>
                        <TableCell className="text-sm">{row.name || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{row.role}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{row.plan}</Badge></TableCell>
                        {results.length > 0 && (
                          <TableCell>
                            {result ? (
                              result.success ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-destructive">
                                  <XCircle className="h-4 w-4" />
                                  {result.error?.slice(0, 30)}
                                </span>
                              )
                            ) : importing ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : null}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {progress}% — {results.filter((r) => r.success).length} thành công, {results.filter((r) => !r.success).length} lỗi
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={importing}>
            Đóng
          </Button>
          <Button onClick={handleImport} disabled={rows.length === 0 || importing}>
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Đang import...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1" />
                Import {rows.length} users
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
