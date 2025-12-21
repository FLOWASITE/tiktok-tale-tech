import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VIDEO_TYPE_LABELS, CHARACTER_TYPE_LABELS, DURATION_LABELS, VideoType, CharacterType, Duration } from '@/types/script';

export interface ScriptFilters {
  search: string;
  videoType: VideoType | 'all';
  characterType: CharacterType | 'all';
  duration: Duration | 'all';
}

interface ScriptFiltersProps {
  filters: ScriptFilters;
  onFiltersChange: (filters: ScriptFilters) => void;
}

export function ScriptFilters({ filters, onFiltersChange }: ScriptFiltersProps) {
  const hasActiveFilters = 
    filters.search || 
    filters.videoType !== 'all' || 
    filters.characterType !== 'all' || 
    filters.duration !== 'all';

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      videoType: 'all',
      characterType: 'all',
      duration: 'all',
    });
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo chủ đề hoặc tiêu đề..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9 bg-background/50 border-border/50 focus:border-primary"
        />
      </div>

      {/* Filter dropdowns */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={filters.videoType}
          onValueChange={(value) => onFiltersChange({ ...filters, videoType: value as VideoType | 'all' })}
        >
          <SelectTrigger className="w-auto min-w-[160px] bg-background/50 border-border/50">
            <SelectValue placeholder="Thể loại" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả thể loại</SelectItem>
            {Object.entries(VIDEO_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.characterType}
          onValueChange={(value) => onFiltersChange({ ...filters, characterType: value as CharacterType | 'all' })}
        >
          <SelectTrigger className="w-auto min-w-[140px] bg-background/50 border-border/50">
            <SelectValue placeholder="Nhân vật" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả nhân vật</SelectItem>
            {Object.entries(CHARACTER_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(filters.duration)}
          onValueChange={(value) => onFiltersChange({ ...filters, duration: value === 'all' ? 'all' : Number(value) as Duration })}
        >
          <SelectTrigger className="w-auto min-w-[140px] bg-background/50 border-border/50">
            <SelectValue placeholder="Thời lượng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả thời lượng</SelectItem>
            {Object.entries(DURATION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Xóa lọc
          </Button>
        )}
      </div>
    </div>
  );
}
