import React, { useState } from 'react';
import { Sparkles, RefreshCw, ChevronRight, PenLine, User, Package, Shield, Brain, Wand2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { RefinedTopic, RefineContextUsed } from '@/hooks/useTopicRefinement';

interface TopicRefinementSuggestionsProps {
  refinedTopics: RefinedTopic[];
  isLoading: boolean;
  isTyping?: boolean;
  onSelect: (topic: string, suggestion?: RefinedTopic) => void;
  onRefresh: () => void;
  disabled?: boolean;
  contextUsed?: RefineContextUsed | null;
}

const contextBadgeConfig = [
  { key: 'hasPersonas', icon: User, label: 'Persona', color: 'text-blue-500' },
  { key: 'hasProducts', icon: Package, label: 'Sản phẩm', color: 'text-emerald-500' },
  { key: 'hasIndustryMemory', icon: Shield, label: 'Ngành', color: 'text-amber-500' },
  { key: 'hasLearningContext', icon: Brain, label: 'Học tập', color: 'text-purple-500' },
] as const;

export function TopicRefinementSuggestions({
  refinedTopics,
  isLoading,
  isTyping = false,
  onSelect,
  onRefresh,
  disabled = false,
  contextUsed,
}: TopicRefinementSuggestionsProps) {
  if (!isLoading && !isTyping && refinedTopics.length === 0) {
    return null;
  }

  const contextCount = contextUsed ? 
    [contextUsed.hasPersonas, contextUsed.hasProducts, contextUsed.hasIndustryMemory, contextUsed.hasLearningContext]
      .filter(Boolean).length : 0;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header with glassmorphism */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "p-1.5 rounded-lg",
            isTyping 
              ? "bg-muted/50" 
              : "bg-gradient-to-br from-primary/20 to-primary/10"
          )}>
            {isTyping ? (
              <PenLine className="w-4 h-4 text-muted-foreground animate-pulse" />
            ) : (
              <Wand2 className="w-4 h-4 text-primary" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">
              {isTyping ? 'Đang chờ bạn nhập xong...' : 'Gợi ý cải thiện chủ đề'}
            </span>
            {/* Context badges - compact inline */}
            {contextUsed && contextCount > 0 && !isLoading && !isTyping && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] text-muted-foreground">Dựa trên:</span>
                <TooltipProvider delayDuration={200}>
                  <div className="flex items-center gap-0.5">
                    {contextBadgeConfig.map(({ key, icon: Icon, label, color }) => 
                      contextUsed[key] && (
                        <Tooltip key={key}>
                          <TooltipTrigger asChild>
                            <div className={cn(
                              "p-0.5 rounded-md bg-background/50 border border-border/50",
                              "hover:bg-background transition-colors cursor-help"
                            )}>
                              <Icon className={cn("w-3 h-3", color)} />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            {label}
                          </TooltipContent>
                        </Tooltip>
                      )
                    )}
                  </div>
                </TooltipProvider>
              </div>
            )}
          </div>
        </div>
        
        {refinedTopics.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading || disabled}
            className={cn(
              "h-8 px-2.5 text-xs gap-1.5 rounded-lg",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-background/50 transition-all"
            )}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            <span className="hidden sm:inline">Làm mới</span>
          </Button>
        )}
      </div>

      {/* Content area */}
      <div className="space-y-2">
        {isTyping ? (
          <TypingIndicator />
        ) : isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <RefinementSkeleton key={i} delay={i * 100} />
            ))}
          </div>
        ) : (
          <RefinementCardList
            refinedTopics={refinedTopics}
            onSelect={onSelect}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );
}

interface RefinementCardListProps {
  refinedTopics: RefinedTopic[];
  onSelect: (topic: string, suggestion?: RefinedTopic) => void;
  disabled: boolean;
}

function RefinementCardList({ refinedTopics, onSelect, disabled }: RefinementCardListProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSelect = (item: RefinedTopic, index: number) => {
    if (disabled || selectedIndex !== null) return;
    
    setSelectedIndex(index);
    
    // Delay callback to show success animation
    setTimeout(() => {
      onSelect(item.topic, item);
      setSelectedIndex(null);
    }, 350);
  };

  return (
    <div className="space-y-2">
      {refinedTopics.map((item, index) => (
        <RefinementCard
          key={index}
          item={item}
          index={index}
          isSelected={selectedIndex === index}
          onSelect={() => handleSelect(item, index)}
          disabled={disabled || selectedIndex !== null}
        />
      ))}
    </div>
  );
}

interface RefinementCardProps {
  item: RefinedTopic;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
}

function RefinementCard({ item, index, isSelected, onSelect, disabled }: RefinementCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "w-full text-left p-3.5 rounded-xl",
        "bg-gradient-to-br from-background to-muted/30",
        "border border-border/60 hover:border-primary/40",
        "shadow-sm hover:shadow-md hover:shadow-primary/5",
        "transition-all duration-200 ease-out",
        "group relative overflow-hidden",
        // Scale effect on click
        "active:scale-[0.98]",
        // Selected state - success animation
        isSelected && "border-emerald-500 bg-emerald-500/5 scale-[0.98]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      style={{
        animationDelay: `${index * 80}ms`,
        animation: 'fade-in 0.4s ease-out forwards',
        opacity: 0,
      }}
    >
      {/* Subtle gradient overlay on hover */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-300",
        isSelected 
          ? "bg-gradient-to-r from-emerald-500/5 via-emerald-500/10 to-emerald-500/5 opacity-100"
          : "bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100"
      )} />
      
      <div className="relative flex items-start justify-between gap-3">
        {/* Number badge */}
        <div className={cn(
          "w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0",
          "text-xs font-semibold transition-all duration-200",
          isSelected 
            ? "bg-emerald-500 text-white"
            : "bg-gradient-to-br from-primary/20 to-primary/10 text-primary border border-primary/20"
        )}>
          {index + 1}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Topic text */}
          <p className={cn(
            "text-sm font-medium leading-relaxed line-clamp-2 transition-colors",
            isSelected ? "text-emerald-600 dark:text-emerald-400" : "text-foreground group-hover:text-primary/90"
          )}>
            {item.topic}
          </p>
          
          {/* Hook with icon */}
          {item.hook && (
            <div className="flex items-start gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground line-clamp-2 italic">
                "{item.hook}"
              </p>
            </div>
          )}
          
          {/* Persona and Product fit badges */}
          {(item.targetPersona || item.productFit) && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {item.targetPersona && (
                <Badge 
                  variant="secondary" 
                  className="h-5 px-2 text-[10px] gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                >
                  <User className="w-2.5 h-2.5" />
                  {item.targetPersona}
                </Badge>
              )}
              {item.productFit && (
                <Badge 
                  variant="secondary" 
                  className="h-5 px-2 text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                >
                  <Package className="w-2.5 h-2.5" />
                  {item.productFit}
                </Badge>
              )}
            </div>
          )}
        </div>
        
        {/* Arrow/Check indicator */}
        <div className={cn(
          "p-1.5 rounded-lg flex-shrink-0 transition-all duration-200",
          isSelected 
            ? "bg-emerald-500 text-white scale-110"
            : "bg-muted/50 group-hover:bg-primary/10 group-hover:translate-x-0.5"
        )}>
          {isSelected ? (
            <Check className="w-4 h-4 animate-scale-in" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </div>
      </div>
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="p-4 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10 backdrop-blur-sm">
      <div className="flex items-center justify-center gap-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Tiếp tục nhập để AI gợi ý cải thiện...
        </p>
      </div>
    </div>
  );
}

function RefinementSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div 
      className="p-3.5 rounded-xl border border-border/40 bg-muted/20 animate-pulse"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-full bg-muted/40" />
        <Skeleton className="h-4 w-4/5 bg-muted/30" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-20 rounded-full bg-muted/30" />
          <Skeleton className="h-5 w-24 rounded-full bg-muted/30" />
        </div>
      </div>
    </div>
  );
}
