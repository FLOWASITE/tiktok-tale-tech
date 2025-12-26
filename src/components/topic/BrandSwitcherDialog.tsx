import { useState, useMemo } from 'react';
import { 
  Building2, Search, Plus, Check, Star, Layers, 
  Clock, ArrowRight, Crown, Sparkles, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { ContentPillar } from '@/types/topicDiscovery';

interface BrandSwitcherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brands: BrandTemplate[];
  selectedBrandId?: string;
  onSelectBrand: (brandId: string | null) => void;
  onCreateBrand?: () => void;
  onViewBrand?: (brandId: string) => void;
}

export function BrandSwitcherDialog({
  open,
  onOpenChange,
  brands,
  selectedBrandId,
  onSelectBrand,
  onCreateBrand,
  onViewBrand,
}: BrandSwitcherDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Filter brands
  const filteredBrands = useMemo(() => {
    let result = brands;

    // Tab filter
    if (activeTab === 'with-pillars') {
      result = result.filter(b => {
        const pillars = b.content_pillars as ContentPillar[] | null;
        return pillars && pillars.length > 0;
      });
    } else if (activeTab === 'recent') {
      result = [...result].sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ).slice(0, 5);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.brand_name.toLowerCase().includes(query) ||
        b.industry?.some(i => i.toLowerCase().includes(query)) ||
        b.brand_positioning?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [brands, activeTab, searchQuery]);

  const handleSelect = (brandId: string) => {
    onSelectBrand(brandId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Chọn Brand
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, ngành hàng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Tất cả ({brands.length})
            </TabsTrigger>
            <TabsTrigger value="with-pillars" className="gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Có Pillars
            </TabsTrigger>
            <TabsTrigger value="recent" className="gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Gần đây
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            <ScrollArea className="h-[400px] pr-4 -mr-4">
              <div className="grid gap-3 py-4">
                {filteredBrands.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">
                      {searchQuery 
                        ? 'Không tìm thấy Brand phù hợp'
                        : activeTab === 'with-pillars'
                        ? 'Chưa có Brand nào có Content Pillars'
                        : 'Chưa có Brand nào'}
                    </p>
                  </div>
                ) : (
                  filteredBrands.map((brand) => {
                    const isSelected = brand.id === selectedBrandId;
                    const pillars = (brand.content_pillars as ContentPillar[]) || [];
                    
                    return (
                      <Card
                        key={brand.id}
                        className={cn(
                          'cursor-pointer transition-all duration-200 overflow-hidden',
                          'hover:shadow-md hover:border-primary/30',
                          isSelected && 'ring-2 ring-primary border-primary bg-primary/5'
                        )}
                        onClick={() => handleSelect(brand.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Avatar */}
                            <div className="relative">
                              <Avatar className="w-12 h-12 rounded-lg border border-border">
                                {brand.logo_url ? (
                                  <AvatarImage src={brand.logo_url} alt={brand.brand_name} />
                                ) : null}
                                <AvatarFallback className="rounded-lg bg-gradient-to-br from-primary/20 to-violet-500/20 text-primary font-bold">
                                  {brand.brand_name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {brand.is_default && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                                  <Crown className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-sm truncate">
                                  {brand.brand_name}
                                </h4>
                                {brand.industry && brand.industry.length > 0 && (
                                  <Badge variant="outline" className="text-[10px] shrink-0">
                                    {brand.industry[0]}
                                  </Badge>
                                )}
                              </div>

                              {brand.brand_positioning && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                  {brand.brand_positioning}
                                </p>
                              )}

                              {/* Voice & Pillars summary */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {brand.tone_of_voice && brand.tone_of_voice.length > 0 && (
                                  <Badge variant="secondary" className="text-[10px] gap-1">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    {brand.tone_of_voice.slice(0, 2).join(', ')}
                                  </Badge>
                                )}
                                {pillars.length > 0 && (
                                  <Badge variant="secondary" className="text-[10px] gap-1">
                                    <Layers className="w-2.5 h-2.5" />
                                    {pillars.length} pillars
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Selection indicator */}
                            <div className="shrink-0">
                              {isSelected ? (
                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                  <Check className="w-4 h-4 text-primary-foreground" />
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onViewBrand) onViewBrand(brand.id);
                                  }}
                                >
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="pt-4 border-t border-border flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => {
              onSelectBrand(null);
              onOpenChange(false);
            }}
            className="gap-1.5"
          >
            <X className="w-4 h-4" />
            Bỏ chọn Brand
          </Button>
          
          {onCreateBrand && (
            <Button onClick={() => {
              onCreateBrand();
              onOpenChange(false);
            }} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Tạo Brand mới
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
