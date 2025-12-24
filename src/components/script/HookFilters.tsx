import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { FRAMEWORK_LABELS } from '@/types/hook';

interface HookFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  framework: string;
  onFrameworkChange: (value: string) => void;
  platform: string;
  onPlatformChange: (value: string) => void;
  onClear: () => void;
}

const PLATFORMS = [
  { value: 'all', label: 'Tất cả nền tảng' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube_shorts', label: 'YouTube Shorts' },
  { value: 'reels', label: 'Instagram Reels' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
];

export function HookFilters({
  search,
  onSearchChange,
  framework,
  onFrameworkChange,
  platform,
  onPlatformChange,
  onClear,
}: HookFiltersProps) {
  const hasFilters = search || framework !== 'all' || platform !== 'all';

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm hook..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Framework filter */}
      <Select value={framework} onValueChange={onFrameworkChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Framework" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả framework</SelectItem>
          {Object.entries(FRAMEWORK_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Platform filter */}
      <Select value={platform} onValueChange={onPlatformChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Nền tảng" />
        </SelectTrigger>
        <SelectContent>
          {PLATFORMS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasFilters && (
        <Button variant="ghost" size="icon" onClick={onClear}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
