import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';
import { Search } from 'lucide-react';

const AVAILABLE_ICONS = [
  'zap', 'message-square', 'lightbulb', 'image', 'wand-2', 
  'search', 'star', 'heart', 'bookmark', 'target', 
  'trending-up', 'bar-chart', 'pie-chart', 'database',
  'code', 'terminal', 'globe', 'mail', 'phone', 'users',
  'file-text', 'folder', 'settings', 'shield', 'lock',
  'key', 'eye', 'edit', 'trash-2', 'plus', 'minus',
  'check', 'x', 'alert-triangle', 'info', 'help-circle',
  'sparkles', 'brain', 'bot', 'cpu', 'layers',
  'palette', 'pen-tool', 'camera', 'video', 'music',
  'mic', 'headphones', 'volume-2', 'bell', 'calendar',
] as const;

type IconName = typeof AVAILABLE_ICONS[number];

// Map kebab-case to PascalCase for lucide icons
const iconNameToComponent = (name: string): React.ComponentType<{ className?: string }> | null => {
  const pascalCase = name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  return icons[pascalCase] || null;
};

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  className?: string;
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredIcons = AVAILABLE_ICONS.filter(icon => 
    icon.toLowerCase().includes(search.toLowerCase())
  );

  const SelectedIcon = iconNameToComponent(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn("h-10 w-10", className)}
        >
          {SelectedIcon ? (
            <SelectedIcon className="h-4 w-4" />
          ) : (
            <LucideIcons.HelpCircle className="h-4 w-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Tìm icon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto">
          {filteredIcons.map((iconName) => {
            const IconComponent = iconNameToComponent(iconName);
            if (!IconComponent) return null;
            
            return (
              <Button
                key={iconName}
                variant={value === iconName ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  onChange(iconName);
                  setOpen(false);
                }}
                title={iconName}
              >
                <IconComponent className="h-4 w-4" />
              </Button>
            );
          })}
        </div>
        {filteredIcons.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Không tìm thấy icon
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Utility function to get icon component by name
export function getIconByName(name: string): React.ReactNode {
  const IconComponent = iconNameToComponent(name);
  if (IconComponent) {
    return <IconComponent className="h-4 w-4" />;
  }
  return <LucideIcons.HelpCircle className="h-4 w-4" />;
}
