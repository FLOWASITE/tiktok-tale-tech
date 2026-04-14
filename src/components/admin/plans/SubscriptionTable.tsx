import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, History, ArrowUpDown, ChevronUp, ChevronDown, AlertTriangle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import type { SubRow, SortField, ConfirmAction } from "./subscription-types";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  expired: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  trial: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

function getDaysRemaining(dateStr: string): number {
  return differenceInDays(new Date(dateStr), new Date());
}

function getRowHighlight(sub: SubRow): string {
  if (sub.status !== "active") return "";
  const days = getDaysRemaining(sub.current_period_end);
  if (days < 0) return "bg-destructive/8 dark:bg-destructive/15";
  if (days <= 7) return "bg-yellow-50 dark:bg-yellow-900/15";
  return "";
}

interface SubscriptionTableProps {
  paginated: SubRow[];
  filtered: SubRow[];
  page: number;
  totalPages: number;
  itemsPerPage: number;
  sortField: SortField;
  sortOrder: "asc" | "desc";
  selectedIds: Set<string>;
  isMutating: boolean;
  onSort: (field: SortField) => void;
  onPageChange: (page: number) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onConfirmAction: (action: ConfirmAction) => void;
  onPlanChange: (subId: string, planType: string, orgName: string, currentPlan: string) => void;
  onOpenPayment: (orgId: string, orgName: string) => void;
  onOpenDetail: (sub: SubRow) => void;
  allPageSelected: boolean;
}

export default function SubscriptionTable({
  paginated, filtered, page, totalPages, itemsPerPage,
  sortField, sortOrder, selectedIds, isMutating,
  onSort, onPageChange, onToggleSelect, onToggleSelectAll,
  onConfirmAction, onPlanChange, onOpenPayment, onOpenDetail, allPageSelected,
}: SubscriptionTableProps) {

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortOrder === "asc" ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  const renderDaysRemaining = (sub: SubRow) => {
    if (!sub.current_period_end) return null;
    const days = getDaysRemaining(sub.current_period_end);
    if (days < 0) return <span className="text-xs text-destructive font-medium">Đã hết hạn</span>;
    if (days === 0) return <span className="text-xs text-destructive font-medium">Hết hạn hôm nay</span>;
    if (days <= 7) return <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" /> còn {days} ngày</span>;
    return <span className="text-xs text-muted-foreground">còn {days} ngày</span>;
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox checked={allPageSelected} onCheckedChange={onToggleSelectAll} />
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => onSort("org_name")}>
                <div className="flex items-center">Workspace <SortIcon field="org_name" /></div>
              </TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => onSort("plan_type")}>
                <div className="flex items-center">Gói <SortIcon field="plan_type" /></div>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => onSort("status")}>
                <div className="flex items-center">Trạng thái <SortIcon field="status" /></div>
              </TableHead>
              <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => onSort("created_at")}>
                <div className="flex items-center">Ngày tạo <SortIcon field="created_at" /></div>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => onSort("current_period_end")}>
                <div className="flex items-center">Hết hạn <SortIcon field="current_period_end" /></div>
              </TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((sub) => {
              const rowHighlight = getRowHighlight(sub);
              const selectedHighlight = selectedIds.has(sub.id) ? "bg-primary/5" : "";
              return (
                <TableRow key={sub.id} className={`${rowHighlight} ${selectedHighlight}`.trim()}>
                  <TableCell>
                    <Checkbox checked={selectedIds.has(sub.id)} onCheckedChange={() => onToggleSelect(sub.id)} />
                  </TableCell>
                  <TableCell
                    className="font-medium max-w-[200px] truncate cursor-pointer hover:text-primary hover:underline"
                    onClick={() => onOpenDetail(sub)}
                  >
                    {sub.org_name}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[180px] truncate">
                    {sub.owner_email}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={sub.plan_type}
                      onValueChange={(val) => onPlanChange(sub.id, val, sub.org_name, sub.plan_type)}
                    >
                      <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[sub.status] || ""}>{sub.status}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {sub.created_at ? format(new Date(sub.created_at), "dd/MM/yyyy") : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-muted-foreground">
                        {sub.current_period_end ? format(new Date(sub.current_period_end), "dd/MM/yyyy") : "—"}
                      </span>
                      {renderDaysRemaining(sub)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={isMutating}
                          onClick={() => onConfirmAction({ type: "renew", subId: sub.id, orgName: sub.org_name })}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Gia hạn 30 ngày</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => onOpenPayment(sub.organization_id, sub.org_name)}>
                          <History className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Lịch sử thanh toán</TooltipContent>
                    </Tooltip>
                    {sub.status === "active" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={isMutating}
                            className="text-destructive hover:text-destructive"
                            onClick={() => onConfirmAction({ type: "cancel", subId: sub.id, orgName: sub.org_name })}
                          >
                            ✕
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Hủy subscription</TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Không tìm thấy subscription nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Hiển thị {(page - 1) * itemsPerPage + 1}–{Math.min(page * itemsPerPage, filtered.length)} / {filtered.length}
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) pageNum = i + 1;
                else if (page <= 3) pageNum = i + 1;
                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = page - 2 + i;
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink isActive={pageNum === page} onClick={() => onPageChange(pageNum)} className="cursor-pointer">
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  );
}
