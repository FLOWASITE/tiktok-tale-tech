import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAudiences } from '@/hooks/useAudiences';
import { SavedAudience, formatAudienceSummary } from '@/types/audience';
import { 
  Users, ChevronDown, Search, Star, Plus, Check, Loader2 
} from 'lucide-react';

interface AudienceQuickPickerProps {
  organizationId?: string;
  brandTemplateId?: string;
  value?: string | null;
  onChange: (audienceId: string | null, audience?: SavedAudience) => void;
  onCreateNew?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function AudienceQuickPicker({
  organizationId,
  brandTemplateId,
  value,
  onChange,
  onCreateNew,
  disabled = false,
  placeholder = "Chọn audience template..."
}: AudienceQuickPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const { audiences, isLoading, toggleFavorite } = useAudiences({ 
    organizationId, 
    brandTemplateId 
  });

  const selectedAudience = audiences.find(a => a.id === value);

  const filteredAudiences = audiences.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    formatAudienceSummary(a).toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (audience: SavedAudience) => {
    onChange(audience.id, audience);
    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    onChange(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between text-left font-normal",
            !selectedAudience && "text-muted-foreground"
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Users className="h-4 w-4 shrink-0" />
            {selectedAudience ? (
              <span className="truncate">{selectedAudience.name}</span>
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm audience..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        <ScrollArea className="max-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAudiences.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {search ? 'Không tìm thấy audience' : 'Chưa có audience nào'}
            </div>
          ) : (
            <div className="p-1">
              {filteredAudiences.map(audience => (
                <div
                  key={audience.id}
                  className={cn(
                    "flex items-start gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                    value === audience.id && "bg-muted"
                  )}
                  onClick={() => handleSelect(audience)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{audience.name}</span>
                      {audience.is_favorite && (
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {formatAudienceSummary(audience)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        Đã dùng {audience.usage_count} lần
                      </Badge>
                    </div>
                  </div>
                  {value === audience.id && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-2 border-t flex items-center gap-2">
          {selectedAudience && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClear}
              className="text-xs"
            >
              Bỏ chọn
            </Button>
          )}
          <div className="flex-1" />
          {onCreateNew && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setOpen(false);
                onCreateNew();
              }}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Tạo mới
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
