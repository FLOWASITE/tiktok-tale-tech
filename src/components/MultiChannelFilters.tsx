import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ContentGoal, Channel, CONTENT_GOALS, CHANNELS } from '@/types/multichannel';

interface MultiChannelFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  goalFilter: ContentGoal | 'all';
  onGoalFilterChange: (goal: ContentGoal | 'all') => void;
  channelFilter: Channel | 'all';
  onChannelFilterChange: (channel: Channel | 'all') => void;
}

export function MultiChannelFilters({
  searchQuery,
  onSearchChange,
  goalFilter,
  onGoalFilterChange,
  channelFilter,
  onChannelFilterChange,
}: MultiChannelFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm theo chủ đề..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Goal Filter */}
      <Select value={goalFilter} onValueChange={(v) => onGoalFilterChange(v as ContentGoal | 'all')}>
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="Mục tiêu" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả mục tiêu</SelectItem>
          {CONTENT_GOALS.map((goal) => (
            <SelectItem key={goal.value} value={goal.value}>
              {goal.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Channel Filter */}
      <Select value={channelFilter} onValueChange={(v) => onChannelFilterChange(v as Channel | 'all')}>
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="Kênh" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả kênh</SelectItem>
          {CHANNELS.map((channel) => (
            <SelectItem key={channel.value} value={channel.value}>
              {channel.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
