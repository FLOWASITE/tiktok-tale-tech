import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";
import type { BacklinkRow } from "@/hooks/useBacklinks";

interface Props {
  row: BacklinkRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BacklinkDetailSheet({ row, open, onOpenChange }: Props) {
  if (!row) return null;
  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success("Đã copy");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">Chi tiết backlink</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4 text-sm">
          <Field label="Tiêu đề">{row.title || <span className="text-muted-foreground italic">(không có)</span>}</Field>
          <Field label="Platform">
            <Badge variant="outline">{row.platform}</Badge>{" "}
            {row.channel && <Badge variant="secondary">{row.channel}</Badge>}
          </Field>
          <Field label="URL">
            <div className="flex items-center gap-2 break-all">
              <a href={row.external_post_url} target="_blank" rel="noopener noreferrer"
                 className="text-primary hover:underline flex-1">{row.external_post_url}</a>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(row.external_post_url)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <a href={row.external_post_url} target="_blank" rel="noopener noreferrer">
                <Button size="icon" variant="ghost" className="h-7 w-7"><ExternalLink className="h-3.5 w-3.5" /></Button>
              </a>
            </div>
          </Field>
          <Field label="Trạng thái">
            <Badge variant={row.status === "success" ? "default" : "destructive"}>{row.status}</Badge>
          </Field>
          <Field label="External Post ID">
            <code className="text-xs">{row.external_post_id || "-"}</code>
          </Field>
          <Field label="Thời gian">
            {new Date(row.attempted_at).toLocaleString("vi-VN")}
          </Field>
          {row.error_message && (
            <Field label="Lỗi">
              <pre className="text-xs bg-destructive/10 p-2 rounded whitespace-pre-wrap">{row.error_message}</pre>
            </Field>
          )}
          {row.response_payload && (
            <Field label="Response">
              <pre className="text-xs bg-muted p-2 rounded max-h-60 overflow-auto">
                {JSON.stringify(row.response_payload, null, 2)}
              </pre>
            </Field>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground mb-1">{label}</div>
      <div>{children}</div>
    </div>
  );
}
