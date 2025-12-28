import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Book, Search, X, Copy, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIndustryGlossary } from '@/hooks/useIndustryGlossary';
import { GLOSSARY_CATEGORIES, type GlossaryCategory } from '@/types/industryGlossary';
import { toast } from 'sonner';

interface GlossaryQuickLookupProps {
  industryTemplateId?: string;
  onInsertTerm?: (term: string) => void;
  trigger?: React.ReactNode;
  className?: string;
}

export function GlossaryQuickLookup({
  industryTemplateId,
  onInsertTerm,
  trigger,
  className,
}: GlossaryQuickLookupProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GlossaryCategory | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { glossary, isLoading } = useIndustryGlossary({
    industryTemplateId,
    category: selectedCategory === 'all' ? undefined : selectedCategory,
    searchQuery: searchQuery || undefined,
  });

  const handleCopy = (term: string, id: string) => {
    navigator.clipboard.writeText(term);
    setCopiedId(id);
    toast.success('Đã sao chép thuật ngữ');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsert = (term: string) => {
    if (onInsertTerm) {
      onInsertTerm(term);
      setOpen(false);
      toast.success('Đã chèn thuật ngữ');
    }
  };

  const getCategoryInfo = (category: string) => {
    return GLOSSARY_CATEGORIES.find(c => c.value === category);
  };

  if (!industryTemplateId) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className={cn('gap-1.5', className)}
          >
            <Book className="h-4 w-4" />
            Từ điển ngành
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="end">
        <div className="flex items-center gap-2 p-3 border-b">
          <Book className="h-4 w-4 text-blue-500" />
          <span className="font-medium">Từ điển thuật ngữ ngành</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            {glossary.length} thuật ngữ
          </Badge>
        </div>

        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm thuật ngữ..."
              className="pl-9 pr-8"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as GlossaryCategory | 'all')}>
          <div className="px-3 pt-2">
            <TabsList className="w-full h-auto flex-wrap gap-1 bg-transparent p-0">
              <TabsTrigger
                value="all"
                className="text-xs px-2 py-1 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Tất cả
              </TabsTrigger>
              {GLOSSARY_CATEGORIES.map((cat) => (
                <TabsTrigger
                  key={cat.value}
                  value={cat.value}
                  className="text-xs px-2 py-1 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {cat.icon} {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value={selectedCategory} className="mt-0">
            <ScrollArea className="h-[280px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Sparkles className="h-5 w-5 animate-pulse text-muted-foreground" />
                </div>
              ) : glossary.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Book className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'Không tìm thấy thuật ngữ' : 'Chưa có thuật ngữ'}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {glossary.map((term) => {
                    const categoryInfo = getCategoryInfo(term.category);
                    return (
                      <div
                        key={term.id}
                        className="group rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{term.term}</span>
                              {term.abbreviation && (
                                <Badge variant="outline" className="text-[10px]">
                                  {term.abbreviation}
                                </Badge>
                              )}
                              {term.is_preferred && (
                                <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-[10px]">
                                  Ưu tiên
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {term.definition}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleCopy(term.term, term.id)}
                            >
                              {copiedId === term.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            {onInsertTerm && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleInsert(term.term)}
                              >
                                Chèn
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {categoryInfo?.icon} {categoryInfo?.label}
                          </Badge>
                          {term.related_terms && term.related_terms.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{term.related_terms.length} liên quan
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
