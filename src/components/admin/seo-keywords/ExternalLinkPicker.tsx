import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Link2, Search } from "lucide-react";
import { useExternalLinks, type ExternalLink } from "@/hooks/useExternalLinks";

interface Props {
  trigger?: React.ReactNode;
  /** Optional: filter to same domain (internal) hoặc khác domain (backlink) */
  mode?: "internal" | "backlink" | "all";
  currentDomain?: string;
  onPick: (link: { url: string; title: string; anchor: string }) => void;
}

export default function ExternalLinkPicker({
  trigger, mode = "all", currentDomain, onPick,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useExternalLinks({
    search,
    domain: mode === "internal" && currentDomain ? currentDomain : "all",
    page: 0,
    pageSize: 30,
  });

  const rows = (data?.rows || []).filter((r) => {
    if (mode === "backlink" && currentDomain) return r.domain !== currentDomain;
    return true;
  });

  const pick = (r: ExternalLink) => {
    onPick({ url: r.url, title: r.title || r.url, anchor: r.title || r.url });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Link2 className="h-3.5 w-3.5 mr-1.5" /> Chèn link từ pool
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "internal" ? "Chèn internal link" : mode === "backlink" ? "Chèn backlink" : "Chèn link"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Tìm theo tiêu đề hoặc URL…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ScrollArea className="h-[400px] border rounded-md">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Chưa có URL phù hợp. Hãy sync nguồn link trong{" "}
                <strong>Track → Links → Pool URL</strong> trước.
              </div>
            ) : (
              <div className="divide-y">
                {rows.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => pick(r)}
                    className="w-full text-left p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm line-clamp-1 flex-1">{r.title || "(không có tiêu đề)"}</div>
                      <Badge variant="outline" className="text-[10px]">{r.domain}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{r.url}</div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
