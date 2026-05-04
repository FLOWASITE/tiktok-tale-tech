import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import type { BacklinksFilter } from "@/hooks/useBacklinks";

interface Props {
  value: BacklinksFilter;
  onChange: (v: BacklinksFilter) => void;
  platforms: string[];
}

export default function BacklinksFilters({ value, onChange, platforms }: Props) {
  const update = (patch: Partial<BacklinksFilter>) =>
    onChange({ ...value, ...patch, page: 0 });

  const hasFilter =
    !!value.search || (value.platform && value.platform !== "all") ||
    (value.status && value.status !== "all") || value.dateFrom || value.dateTo;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm URL..."
          className="pl-8 h-9"
          value={value.search ?? ""}
          onChange={(e) => update({ search: e.target.value })}
        />
      </div>

      <Select value={value.platform ?? "all"} onValueChange={(v) => update({ platform: v })}>
        <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Platform" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả platform</SelectItem>
          {platforms.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={value.status ?? "all"} onValueChange={(v) => update({ status: v })}>
        <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Mọi trạng thái</SelectItem>
          <SelectItem value="success">Success</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="date"
        className="h-9 w-[150px]"
        value={value.dateFrom ?? ""}
        onChange={(e) => update({ dateFrom: e.target.value || undefined })}
      />
      <Input
        type="date"
        className="h-9 w-[150px]"
        value={value.dateTo ?? ""}
        onChange={(e) => update({ dateTo: e.target.value || undefined })}
      />

      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={() => onChange({ page: 0, pageSize: value.pageSize })}>
          <X className="h-4 w-4 mr-1" /> Xoá bộ lọc
        </Button>
      )}
    </div>
  );
}
