import { useState } from 'react';
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerTrigger,
  DrawerFooter,
  DrawerClose
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { 
  SlidersHorizontal, 
  Star, 
  SortAsc, 
  Calendar, 
  LayoutGrid, 
  List,
  Check,
  User,
  Building2,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SortOption = 'name' | 'created_at' | 'is_default';
type FilterScope = 'all' | 'personal' | 'organization';
type ViewMode = 'grid' | 'list';

interface BrandMobileFiltersProps {
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  filterScope: FilterScope;
  onFilterScopeChange: (value: FilterScope) => void;
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
  personalCount: number;
  orgCount: number;
  totalCount: number;
  hasOrganization: boolean;
  organizationName?: string;
}

const sortOptions: { value: SortOption; label: string; icon: typeof Star }[] = [
  { value: 'is_default', label: 'Mặc định trước', icon: Star },
  { value: 'name', label: 'Tên A-Z', icon: SortAsc },
  { value: 'created_at', label: 'Mới nhất', icon: Calendar },
];

export function BrandMobileFilters({
  sortBy,
  onSortChange,
  filterScope,
  onFilterScopeChange,
  viewMode,
  onViewModeChange,
  personalCount,
  orgCount,
  totalCount,
  hasOrganization,
  organizationName,
}: BrandMobileFiltersProps) {
  const [open, setOpen] = useState(false);

  const filterOptions = [
    { value: 'all' as FilterScope, label: 'Tất cả', count: totalCount, icon: Sparkles },
    { value: 'personal' as FilterScope, label: 'Cá nhân', count: personalCount, icon: User },
    ...(hasOrganization ? [{ 
      value: 'organization' as FilterScope, 
      label: organizationName || 'Tổ chức', 
      count: orgCount, 
      icon: Building2 
    }] : [])
  ];

  const handleApply = () => {
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden h-9 gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          <span>Bộ lọc</span>
          {(filterScope !== 'all' || sortBy !== 'is_default') && (
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Bộ lọc & Sắp xếp</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-6 overflow-y-auto">
          {/* Filter Scope */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Hiển thị</h4>
            <div className="grid grid-cols-2 gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onFilterScopeChange(option.value)}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg border transition-all',
                    filterScope === option.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <option.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {option.count}
                  </span>
                  {filterScope === option.value && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Sắp xếp theo</h4>
            <div className="space-y-2">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onSortChange(option.value)}
                  className={cn(
                    'flex items-center gap-3 w-full p-3 rounded-lg border transition-all',
                    sortBy === option.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <option.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{option.label}</span>
                  {sortBy === option.value && (
                    <Check className="w-4 h-4 ml-auto text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* View Mode */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Chế độ xem</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onViewModeChange('grid')}
                className={cn(
                  'flex items-center justify-center gap-2 p-3 rounded-lg border transition-all',
                  viewMode === 'grid'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <LayoutGrid className="w-5 h-5" />
                <span className="text-sm font-medium">Lưới</span>
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                className={cn(
                  'flex items-center justify-center gap-2 p-3 rounded-lg border transition-all',
                  viewMode === 'list'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <List className="w-5 h-5" />
                <span className="text-sm font-medium">Danh sách</span>
              </button>
            </div>
          </div>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button onClick={handleApply} className="w-full">
              Áp dụng
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
