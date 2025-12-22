import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  FileText, 
  Image, 
  Video, 
  Layers,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function TasksFAB() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      icon: Layers,
      label: 'Multi-channel Content',
      description: 'Tạo nội dung đa kênh',
      path: '/multi-channel',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Image,
      label: 'Carousel',
      description: 'Tạo carousel cho mạng xã hội',
      path: '/carousel',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Video,
      label: 'Script Video',
      description: 'Tạo kịch bản video',
      path: '/script',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            size="lg"
            className={cn(
              "h-14 w-14 rounded-full shadow-lg transition-all duration-300",
              "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
              "hover:scale-110 hover:shadow-xl hover:shadow-primary/25",
              "active:scale-95",
              isOpen && "rotate-45 bg-muted hover:from-muted hover:to-muted"
            )}
          >
            {isOpen ? (
              <X className="h-6 w-6 text-foreground transition-transform" />
            ) : (
              <Plus className="h-6 w-6 text-primary-foreground transition-transform" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          side="top" 
          sideOffset={12}
          className="w-72 p-2 animate-scale-in"
        >
          <DropdownMenuLabel className="text-xs text-muted-foreground font-medium px-2 py-1.5">
            Tạo nội dung mới
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {menuItems.map((item) => (
            <DropdownMenuItem
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setIsOpen(false);
              }}
              className="flex items-center gap-3 p-3 cursor-pointer rounded-lg transition-colors hover:bg-accent focus:bg-accent"
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                item.bgColor
              )}>
                <item.icon className={cn("w-5 h-5", item.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Ripple effect indicator */}
      {!isOpen && (
        <span className="absolute inset-0 rounded-full animate-ping bg-primary/30 pointer-events-none" />
      )}
    </div>
  );
}
