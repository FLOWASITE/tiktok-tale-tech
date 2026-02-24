import { useState, useEffect } from 'react';
import { 
  Search, FileText, Image, Palette, LayoutGrid, Calendar,
  Lightbulb, Sparkles, Star, TrendingUp, ArrowRight, Command
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useMultiChannelContents } from '@/hooks/useMultiChannelContents';
import { useScripts } from '@/hooks/useScripts';
import { useCarousels } from '@/hooks/useCarousels';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { useTopicHistory } from '@/hooks/useTopicHistory';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export function QuickSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const { contents } = useMultiChannelContents();
  const { scripts } = useScripts();
  const { carousels } = useCarousels();
  const { templates: brandTemplates } = useBrandTemplates();
  const { history, favorites, topPerformers, isLoading: topicsLoading } = useTopicHistory({ enabled: open });

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
      case 'multichannel': navigate('/multichannel'); break;
      case 'scripts': navigate('/'); break;
      case 'carousel': navigate('/carousel'); break;
      case 'brands': navigate('/brands'); break;
      case 'calendar': navigate('/calendar'); break;
      case 'topics': navigate('/topics'); break;
    }
  };

  const handleCreateFromTopic = (topic: string, goal: string = 'engagement') => {
    setOpen(false);
    navigate('/multichannel', { state: { prefillTopic: topic, prefillGoal: goal, fromTopics: true } });
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 md:w-64 md:justify-start md:px-3 md:py-2 group"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 md:mr-2 transition-transform group-hover:scale-110" />
        <span className="hidden md:inline-flex text-muted-foreground">{t('app.search.placeholder')}</span>
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t('app.search.inputPlaceholder')} />
        <CommandList className="max-h-[60vh]">
          <CommandEmpty>
            <div className="py-6 text-center">
              <Search className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">{t('app.search.noResults')}</p>
            </div>
          </CommandEmpty>
          
          <CommandGroup heading={t('app.search.quickNav')}>
            <CommandItem onSelect={() => handleSelect('topics')} className="gap-2">
              <div className="p-1.5 rounded-md bg-primary/10"><Lightbulb className="h-3.5 w-3.5 text-primary" /></div>
              <span className="font-medium">{t('app.search.ideaBank')}</span>
              <Badge variant="secondary" className="ml-auto text-[10px]">{t('app.search.new')}</Badge>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('multichannel')} className="gap-2">
              <div className="p-1.5 rounded-md bg-indigo-500/10"><LayoutGrid className="h-3.5 w-3.5 text-indigo-500" /></div>
              <span>{t('app.search.multichannel')}</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('scripts')} className="gap-2">
              <div className="p-1.5 rounded-md bg-emerald-500/10"><FileText className="h-3.5 w-3.5 text-emerald-500" /></div>
              <span>{t('app.search.videoScript')}</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('carousel')} className="gap-2">
              <div className="p-1.5 rounded-md bg-pink-500/10"><Image className="h-3.5 w-3.5 text-pink-500" /></div>
              <span>{t('app.search.carouselPrompt')}</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('brands')} className="gap-2">
              <div className="p-1.5 rounded-md bg-violet-500/10"><Palette className="h-3.5 w-3.5 text-violet-500" /></div>
              <span>{t('app.search.brands')}</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('calendar')} className="gap-2">
              <div className="p-1.5 rounded-md bg-amber-500/10"><Calendar className="h-3.5 w-3.5 text-amber-500" /></div>
              <span>{t('app.search.calendarMgmt')}</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {favorites && favorites.length > 0 && (
            <CommandGroup heading={t('app.search.favoriteTopics')}>
              {favorites.slice(0, 3).map((topic) => (
                <CommandItem key={`fav-${topic.id}`} onSelect={() => handleCreateFromTopic(topic.topic, topic.contentGoal)} className="gap-2">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <div className="flex-1 min-w-0"><span className="truncate">{topic.topic}</span></div>
                  <CommandShortcut><ArrowRight className="w-3 h-3" /></CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {topPerformers && topPerformers.length > 0 && (
            <CommandGroup heading={t('app.search.topPerformers')}>
              {topPerformers.slice(0, 3).map((topic) => (
                <CommandItem key={`top-${topic.id}`} onSelect={() => handleCreateFromTopic(topic.topic, topic.contentGoal)} className="gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <div className="flex-1 min-w-0"><span className="truncate">{topic.topic}</span></div>
                  <Badge className="bg-emerald-500 text-white text-[10px]">{topic.performanceScore}</Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />

          {contents && contents.length > 0 && (
            <CommandGroup heading={t('app.search.multichannel')}>
              {contents.slice(0, 4).map((content) => (
                <CommandItem key={content.id} onSelect={() => handleSelect('multichannel')} className="gap-2">
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="truncate">{content.title}</span>
                    <span className="text-xs text-muted-foreground truncate">{content.topic}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {scripts && scripts.length > 0 && (
            <CommandGroup heading={t('app.search.scripts')}>
              {scripts.slice(0, 4).map((script) => (
                <CommandItem key={script.id} onSelect={() => handleSelect('scripts')} className="gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="truncate">{script.title}</span>
                    <span className="text-xs text-muted-foreground truncate">{script.topic}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {carousels && carousels.length > 0 && (
            <CommandGroup heading="Carousel">
              {carousels.slice(0, 4).map((carousel) => (
                <CommandItem key={carousel.id} onSelect={() => handleSelect('carousel')} className="gap-2">
                  <Image className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="truncate">{carousel.title}</span>
                    <span className="text-xs text-muted-foreground truncate">{carousel.topic}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {brandTemplates && brandTemplates.length > 0 && (
            <CommandGroup heading={t('app.search.brands')}>
              {brandTemplates.slice(0, 4).map((brand) => (
                <CommandItem key={brand.id} onSelect={() => handleSelect('brands')} className="gap-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="truncate">{brand.brand_name}</span>
                    <span className="text-xs text-muted-foreground truncate">{brand.name}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>

        <div className="border-t border-border px-3 py-2 flex items-center justify-between text-xs text-muted-foreground bg-muted/30">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-background border text-[10px]">↵</kbd>
              {t('app.search.select')}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-background border text-[10px]">↑↓</kbd>
              {t('app.search.move')}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-background border text-[10px]">esc</kbd>
              {t('app.search.close')}
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-60">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
        </div>
      </CommandDialog>
    </>
  );
}
