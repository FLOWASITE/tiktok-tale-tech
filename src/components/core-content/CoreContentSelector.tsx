import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, FileText, Sparkles, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCoreContents } from '@/hooks/useCoreContents';
import type { CoreContent } from '@/types/coreContent';

interface CoreContentSelectorProps {
  value?: string | null;
  onValueChange: (value: string | null, coreContent: CoreContent | null) => void;
  organizationId?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function CoreContentSelector({
  value,
  onValueChange,
  organizationId,
  disabled = false,
  placeholder = 'Chọn Core Content (tùy chọn)',
  className,
}: CoreContentSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { coreContents, isLoading } = useCoreContents({
    organizationId,
    filters: {
      status: 'approved', // Only show approved content
    },
  });

  const filteredContents = useMemo(() => {
    if (!searchQuery) return coreContents;
    const query = searchQuery.toLowerCase();
    return coreContents.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.topic.toLowerCase().includes(query)
    );
  }, [coreContents, searchQuery]);

  const selectedContent = value
    ? coreContents.find((c) => c.id === value)
    : null;

  const handleSelect = (contentId: string) => {
    if (contentId === value) {
      onValueChange(null, null);
    } else {
      const content = coreContents.find((c) => c.id === contentId);
      onValueChange(contentId, content || null);
    }
    setOpen(false);
  };

  const handleClear = () => {
    onValueChange(null, null);
  };

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal',
            !selectedContent && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 truncate">
            <FileText className="w-4 h-4 flex-shrink-0" />
            {selectedContent ? (
              <span className="truncate">{selectedContent.title}</span>
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Tìm Core Content..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>Không tìm thấy Core Content phù hợp.</CommandEmpty>
            <CommandGroup>
              {/* Option to clear selection */}
              {value && (
                <CommandItem
                  value="__clear__"
                  onSelect={handleClear}
                  className="text-muted-foreground"
                >
                  <span className="flex-1">Không sử dụng Core Content</span>
                </CommandItem>
              )}
              
              {filteredContents.map((content) => (
                <CommandItem
                  key={content.id}
                  value={content.id}
                  onSelect={() => handleSelect(content.id)}
                  className="flex items-start gap-2 py-3"
                >
                  <Check
                    className={cn(
                      'h-4 w-4 mt-0.5 flex-shrink-0',
                      value === content.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{content.title}</span>
                      {content.quality_score && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {content.quality_score}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {content.topic}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{content.word_count || 0} từ</span>
                      <span>•</span>
                      <span className="capitalize">{content.content_goal}</span>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
