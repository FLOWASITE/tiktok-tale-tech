import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { GENDER_OPTIONS, AGE_OPTIONS } from '@/lib/characterSchema';

export type SortKey = 'updated' | 'name' | 'completeness';

interface Props {
  query: string;
  onQuery: (v: string) => void;
  gender: string;
  onGender: (v: string) => void;
  ageRange: string;
  onAge: (v: string) => void;
  sort: SortKey;
  onSort: (v: SortKey) => void;
  filterByBrand: boolean;
  onFilterByBrand: (v: boolean) => void;
  hasBrand: boolean;
  totalCount: number;
  visibleCount: number;
}

export function CharacterFilters({
  query,
  onQuery,
  gender,
  onGender,
  ageRange,
  onAge,
  sort,
  onSort,
  filterByBrand,
  onFilterByBrand,
  hasBrand,
  totalCount,
  visibleCount,
}: Props) {
  const hasActiveFilter = !!query || !!gender || !!ageRange;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Tìm theo tên, mô tả, trang phục…"
            className="pl-8 h-9 text-sm"
          />
          {query && (
            <button
              onClick={() => onQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Select value={gender || 'all'} onValueChange={(v) => onGender(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9 w-32 text-xs">
            <SelectValue placeholder="Giới tính" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi giới tính</SelectItem>
            {GENDER_OPTIONS.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ageRange || 'all'} onValueChange={(v) => onAge(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9 w-28 text-xs">
            <SelectValue placeholder="Tuổi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi độ tuổi</SelectItem>
            {AGE_OPTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => onSort(v as SortKey)}>
          <SelectTrigger className="h-9 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Mới cập nhật</SelectItem>
            <SelectItem value="name">Tên A → Z</SelectItem>
            <SelectItem value="completeness">Hoàn thiện ↓</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilter && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs gap-1.5"
            onClick={() => {
              onQuery('');
              onGender('');
              onAge('');
            }}
          >
            <X className="w-3 h-3" /> Xoá lọc
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <Badge variant="outline" className="h-5 px-2 font-normal">
          {visibleCount === totalCount ? `${totalCount} nhân vật` : `${visibleCount} / ${totalCount}`}
        </Badge>
        {hasBrand && (
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Switch checked={filterByBrand} onCheckedChange={onFilterByBrand} className="h-4 w-7 [&>span]:h-3 [&>span]:w-3" />
            <span>Chỉ brand hiện tại</span>
          </label>
        )}
        <span className="hidden sm:inline text-[10px]">
          Phím tắt: <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">⌘K</kbd> tìm,{' '}
          <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">N</kbd> tạo mới
        </span>
      </div>
    </div>
  );
}
