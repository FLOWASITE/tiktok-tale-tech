import React, { useState, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Sparkles, Star, Library } from 'lucide-react';
import { useHookLibrary } from '@/hooks/useHookLibrary';
import { HookCard } from './HookCard';
import { HookFilters } from './HookFilters';
import { HookGenerator } from './HookGenerator';
import { HookTemplate, GeneratedHook, UserSavedHook } from '@/types/hook';

interface BrandVoice {
  brand_name?: string;
  tone_of_voice?: string[];
  formality_level?: string;
  preferred_words?: string[];
  forbidden_words?: string[];
  brand_positioning?: string;
}

interface HookLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandTemplateId?: string;
  brandVoice?: BrandVoice;
  onSelectHook?: (openingLine: string) => void;
}

export function HookLibrary({
  open,
  onOpenChange,
  brandTemplateId,
  brandVoice,
  onSelectHook,
}: HookLibraryProps) {
  const [activeTab, setActiveTab] = useState('templates');
  const [search, setSearch] = useState('');
  const [framework, setFramework] = useState('all');
  const [platform, setPlatform] = useState('all');

  const {
    templates,
    savedHooks,
    loading,
    brandTemplate,
    saveHook,
    toggleFavorite,
    deleteHook,
    getFilteredTemplates,
  } = useHookLibrary(brandTemplateId);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let filtered = getFilteredTemplates({ framework, platform });
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(t => 
        t.opening_line.toLowerCase().includes(searchLower) ||
        t.name.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [getFilteredTemplates, framework, platform, search]);

  // Filter saved hooks
  const filteredSavedHooks = useMemo(() => {
    let filtered = savedHooks;
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(h => 
        h.original_opening_line.toLowerCase().includes(searchLower) ||
        (h.customized_opening_line?.toLowerCase().includes(searchLower))
      );
    }
    
    if (framework !== 'all') {
      filtered = filtered.filter(h => h.framework === framework);
    }
    
    return filtered;
  }, [savedHooks, search, framework]);

  // Favorite hooks
  const favoriteHooks = useMemo(() => 
    filteredSavedHooks.filter(h => h.is_favorite),
    [filteredSavedHooks]
  );

  const handleSaveHook = async (hook: HookTemplate | GeneratedHook) => {
    await saveHook({
      hook_template_id: 'id' in hook ? hook.id : undefined,
      framework: hook.framework,
      original_opening_line: hook.opening_line,
      visual_direction: hook.visual_direction,
      text_overlay: hook.text_overlay,
    });
  };

  const handleUseHook = (openingLine: string) => {
    onSelectHook?.(openingLine);
    onOpenChange(false);
  };

  const clearFilters = () => {
    setSearch('');
    setFramework('all');
    setPlatform('all');
  };

  const checkBrandCompatibility = (template: HookTemplate) => {
    if (!brandTemplate) return false;
    
    const hasMatchingTone = brandTemplate.tone_of_voice?.some(tone => 
      template.compatible_tones.includes(tone.toLowerCase())
    );
    const hasMatchingFormality = brandTemplate.formality_level && 
      template.compatible_formality.includes(brandTemplate.formality_level.toLowerCase());
    
    return hasMatchingTone || hasMatchingFormality;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Library className="h-5 w-5 text-primary" />
            Hook Library
            {brandVoice?.brand_name && (
              <Badge variant="outline" className="ml-2">
                {brandVoice.brand_name}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-[calc(100vh-80px)]">
          <div className="px-6 pt-4">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="templates" className="text-xs sm:text-sm">
                <BookOpen className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
                Mẫu ({templates.length})
              </TabsTrigger>
              <TabsTrigger value="generator" className="text-xs sm:text-sm">
                <Sparkles className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
                AI Tạo
              </TabsTrigger>
              <TabsTrigger value="saved" className="text-xs sm:text-sm">
                Đã lưu ({savedHooks.length})
              </TabsTrigger>
              <TabsTrigger value="favorites" className="text-xs sm:text-sm">
                <Star className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
                ({favoriteHooks.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Templates Tab */}
          <TabsContent value="templates" className="flex-1 mt-0 overflow-hidden">
            <div className="px-6 py-4">
              <HookFilters
                search={search}
                onSearchChange={setSearch}
                framework={framework}
                onFrameworkChange={setFramework}
                platform={platform}
                onPlatformChange={setPlatform}
                onClear={clearFilters}
              />
            </div>
            
            <ScrollArea className="flex-1 px-6 pb-6" style={{ height: 'calc(100vh - 280px)' }}>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-48 w-full" />
                  ))}
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Không tìm thấy hook phù hợp</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredTemplates.map(template => (
                    <HookCard
                      key={template.id}
                      hook={template}
                      type="template"
                      brandCompatible={checkBrandCompatibility(template)}
                      onSave={() => handleSaveHook(template)}
                      onUse={handleUseHook}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Generator Tab */}
          <TabsContent value="generator" className="flex-1 mt-0 overflow-hidden">
            <ScrollArea className="px-6 py-4" style={{ height: 'calc(100vh - 220px)' }}>
              <HookGenerator
                brandVoice={brandVoice}
                onSaveHook={(hook) => handleSaveHook(hook)}
                onUseHook={handleUseHook}
              />
            </ScrollArea>
          </TabsContent>

          {/* Saved Hooks Tab */}
          <TabsContent value="saved" className="flex-1 mt-0 overflow-hidden">
            <div className="px-6 py-4">
              <HookFilters
                search={search}
                onSearchChange={setSearch}
                framework={framework}
                onFrameworkChange={setFramework}
                platform={platform}
                onPlatformChange={setPlatform}
                onClear={clearFilters}
              />
            </div>
            
            <ScrollArea className="flex-1 px-6 pb-6" style={{ height: 'calc(100vh - 280px)' }}>
              {filteredSavedHooks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Chưa có hook đã lưu</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredSavedHooks.map(hook => (
                    <HookCard
                      key={hook.id}
                      hook={hook}
                      type="saved"
                      onUse={handleUseHook}
                      onToggleFavorite={() => toggleFavorite(hook.id)}
                      onDelete={() => deleteHook(hook.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="flex-1 mt-0 overflow-hidden">
            <ScrollArea className="px-6 py-4" style={{ height: 'calc(100vh - 220px)' }}>
              {favoriteHooks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Chưa có hook yêu thích</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {favoriteHooks.map(hook => (
                    <HookCard
                      key={hook.id}
                      hook={hook}
                      type="saved"
                      onUse={handleUseHook}
                      onToggleFavorite={() => toggleFavorite(hook.id)}
                      onDelete={() => deleteHook(hook.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
