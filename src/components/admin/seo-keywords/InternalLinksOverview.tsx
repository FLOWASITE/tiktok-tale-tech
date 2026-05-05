import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowDownLeft, ArrowUpRight, Link2, ExternalLink, Sparkles, HelpCircle } from "lucide-react";

const ColHead = ({ icon, label, tip }: { icon: React.ReactNode; label: string; tip: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="inline-flex items-center gap-1 text-xs cursor-help">
        {icon} {label} <HelpCircle className="h-2.5 w-2.5 opacity-50" />
      </span>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-[240px] text-xs leading-relaxed">{tip}</TooltipContent>
  </Tooltip>
);
import { useInternalLinksOverview, type InternalLinkRow } from "@/hooks/useInternalLinksOverview";
import InternalLinksPanel from "@/components/seo/InternalLinksPanel";

export default function InternalLinksOverview() {
  const { data, isLoading } = useInternalLinksOverview();
  const [active, setActive] = useState<InternalLinkRow | null>(null);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Bài viết</TableHead>
                  <TableHead className="w-[110px] text-center">
                    <ColHead icon={<ArrowDownLeft className="h-3 w-3" />} label="Internal in"
                      tip="Số bài blog khác đang link ĐẾN bài này. Càng cao càng tốt — bài đó là 'trung tâm' của cluster." />
                  </TableHead>
                  <TableHead className="w-[110px] text-center">
                    <ColHead icon={<ArrowUpRight className="h-3 w-3" />} label="Internal out"
                      tip="Số bài blog khác mà bài này đang link ĐI. Tăng bằng cách bấm 'Quản lý' → AI gợi ý link nội bộ." />
                  </TableHead>
                  <TableHead className="w-[110px] text-center">
                    <ColHead icon={<ExternalLink className="h-3 w-3" />} label="Backlinks"
                      tip="Số post Social/Website đã trỏ về bài này. Tự sinh khi publish multichannel có chèn link blog." />
                  </TableHead>
                  <TableHead className="w-[110px] text-center">
                    <ColHead icon={<Sparkles className="h-3 w-3" />} label="Equity"
                      tip="Equity = Internal in + Backlinks. ≥3 = mạnh (bài hub). =0 = đói link, cần bơm." />
                  </TableHead>
                  <TableHead className="w-[140px] text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell>
                  </TableRow>
                ))}
                {!isLoading && (data?.rows ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12">
                      <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                        <Link2 className="h-8 w-8 opacity-40" />
                        <p className="text-sm font-medium text-foreground">Chưa có liên kết nội bộ nào</p>
                        <p className="text-xs max-w-md">
                          Internal link giúp phân phối PageRank giữa các bài blog cùng cluster. Mở 1 bài long-form
                          (Website/WordPress/Blogger) → bấm <strong>"Gợi ý liên kết nội bộ"</strong> → AI sẽ đề xuất
                          các bài liên quan để link sang nhau.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              {!isLoading && (data?.rows ?? []).map((r) => {
                const equity = r.in_count + r.backlink_count;
                const tone =
                  equity >= 3 ? "default" : equity === 0 ? "destructive" : "secondary";
                return (
                  <TableRow key={r.content_id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">
                      {r.title}
                      {equity === 0 && (
                        <Badge variant="destructive" className="ml-2 text-[10px] py-0 h-4">
                          Cần bơm link
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm">{r.in_count}</TableCell>
                    <TableCell className="text-center text-sm">{r.out_count}</TableCell>
                    <TableCell className="text-center text-sm">{r.backlink_count}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={tone as any} className="text-xs">{equity}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setActive(r)} className="gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" /> Quản lý
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              {active?.title}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {active && <InternalLinksPanel contentId={active.content_id} />}
          </div>
        </SheetContent>
      </Sheet>
      </div>
    </TooltipProvider>
  );
}

