import { useState, useEffect } from 'react';
import { Search, FileText, Image, Palette, LayoutGrid, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useMultiChannelContents } from '@/hooks/useMultiChannelContents';
import { useScripts } from '@/hooks/useScripts';
import { useCarousels } from '@/hooks/useCarousels';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';

export function QuickSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  
  const { contents } = useMultiChannelContents();
  const { scripts } = useScripts();
  const { carousels } = useCarousels();
  const { templates: brandTemplates } = useBrandTemplates();

  // Keyboard shortcut to open search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (type: string, id?: string) => {
    setOpen(false);
    switch (type) {
      case 'multichannel':
        navigate('/multichannel');
        break;
      case 'scripts':
        navigate('/');
        break;
      case 'carousel':
        navigate('/carousel');
        break;
      case 'brands':
        navigate('/brands');
        break;
      case 'calendar':
        navigate('/calendar');
        break;
      default:
        break;
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 md:w-64 md:justify-start md:px-3 md:py-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 md:mr-2" />
        <span className="hidden md:inline-flex text-muted-foreground">
          Tìm kiếm nhanh...
        </span>
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Tìm kiếm nội dung, kịch bản, carousel, thương hiệu..." />
        <CommandList>
          <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>
          
          {/* Quick Navigation */}
          <CommandGroup heading="Điều hướng nhanh">
            <CommandItem onSelect={() => handleSelect('multichannel')}>
              <LayoutGrid className="mr-2 h-4 w-4" />
              <span>Nội dung đa kênh</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('scripts')}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Kịch bản Video</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('carousel')}>
              <Image className="mr-2 h-4 w-4" />
              <span>Carousel Prompt</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('brands')}>
              <Palette className="mr-2 h-4 w-4" />
              <span>Thương hiệu</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('calendar')}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Quản lý lịch đăng</span>
            </CommandItem>
          </CommandGroup>

          {/* Multi-channel Contents */}
          {contents && contents.length > 0 && (
            <CommandGroup heading="Nội dung đa kênh">
              {contents.slice(0, 5).map((content) => (
                <CommandItem
                  key={content.id}
                  onSelect={() => handleSelect('multichannel')}
                >
                  <LayoutGrid className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{content.title}</span>
                    <span className="text-xs text-muted-foreground">{content.topic}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Scripts */}
          {scripts && scripts.length > 0 && (
            <CommandGroup heading="Kịch bản">
              {scripts.slice(0, 5).map((script) => (
                <CommandItem
                  key={script.id}
                  onSelect={() => handleSelect('scripts')}
                >
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{script.title}</span>
                    <span className="text-xs text-muted-foreground">{script.topic}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Carousels */}
          {carousels && carousels.length > 0 && (
            <CommandGroup heading="Carousel">
              {carousels.slice(0, 5).map((carousel) => (
                <CommandItem
                  key={carousel.id}
                  onSelect={() => handleSelect('carousel')}
                >
                  <Image className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{carousel.title}</span>
                    <span className="text-xs text-muted-foreground">{carousel.topic}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Brands */}
          {brandTemplates && brandTemplates.length > 0 && (
            <CommandGroup heading="Thương hiệu">
              {brandTemplates.slice(0, 5).map((brand) => (
                <CommandItem
                  key={brand.id}
                  onSelect={() => handleSelect('brands')}
                >
                  <Palette className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{brand.brand_name}</span>
                    <span className="text-xs text-muted-foreground">{brand.name}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
