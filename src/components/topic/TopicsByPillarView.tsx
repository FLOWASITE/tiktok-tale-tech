import { useMemo, useState } from 'react';
import { Layers, ChevronDown, ChevronUp, Grid3X3, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EnhancedTopicSuggestion } from '@/types/topicDiscovery';
import { ContentPillar } from '@/types/topicDiscovery';
import { TopicIdeaCard } from './TopicIdeaCard';

interface TopicsByPillarViewProps {
  topics: EnhancedTopicSuggestion[];
  contentPillars: ContentPillar[];
  onSelectTopic: (topic: EnhancedTopicSuggestion) => void;
  onSaveTopic?: (topic: EnhancedTopicSuggestion) => void;
  onScheduleTopic?: (topic: EnhancedTopicSuggestion) => void;
  onShowExplanation?: (topic: EnhancedTopicSuggestion) => void;
  selectable?: boolean;
  selectedTopics?: EnhancedTopicSuggestion[];
  onToggleSelection?: (topic: EnhancedTopicSuggestion, checked: boolean) => void;
  className?: string;
}

interface PillarGroup {
  pillar: ContentPillar | { name: string; icon?: string };
  topics: EnhancedTopicSuggestion[];
}

export function TopicsByPillarView({
  topics,
  contentPillars,
  onSelectTopic,
  onSaveTopic,
  onScheduleTopic,
  onShowExplanation,
  selectable = false,
  selectedTopics = [],
  onToggleSelection,
  className,
}: TopicsByPillarViewProps) {
  const [collapsedPillars, setCollapsedPillars] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Group topics by pillar
  const groupedTopics = useMemo(() => {
    const groups: PillarGroup[] = [];
    const pillarMap = new Map<string, EnhancedTopicSuggestion[]>();
    const unmatchedTopics: EnhancedTopicSuggestion[] = [];

    // Initialize pillar groups
    contentPillars.forEach(pillar => {
      pillarMap.set(pillar.name.toLowerCase(), []);
    });

    // Assign topics to pillars
    topics.forEach(topic => {
      if (topic.pillar) {
        const pillarKey = topic.pillar.toLowerCase();
        const existingTopics = pillarMap.get(pillarKey);
        if (existingTopics) {
          existingTopics.push(topic);
        } else {
          // Topic has a pillar that doesn't match any content pillar
          const matchedPillar = contentPillars.find(p => 
            p.name.toLowerCase().includes(pillarKey) || 
            pillarKey.includes(p.name.toLowerCase())
          );
          if (matchedPillar) {
            const pillTopics = pillarMap.get(matchedPillar.name.toLowerCase()) || [];
            pillTopics.push(topic);
            pillarMap.set(matchedPillar.name.toLowerCase(), pillTopics);
          } else {
            unmatchedTopics.push(topic);
          }
        }
      } else {
        unmatchedTopics.push(topic);
      }
    });

    // Create groups from content pillars
    contentPillars.forEach(pillar => {
      const pillarTopics = pillarMap.get(pillar.name.toLowerCase()) || [];
      groups.push({ pillar, topics: pillarTopics });
    });

    // Add unmatched topics as "Other" group
    if (unmatchedTopics.length > 0) {
      groups.push({
        pillar: { name: 'Khác', icon: '📌' },
        topics: unmatchedTopics,
      });
    }

    return groups.filter(g => g.topics.length > 0);
  }, [topics, contentPillars]);

  const togglePillar = (pillarName: string) => {
    setCollapsedPillars(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pillarName)) {
        newSet.delete(pillarName);
      } else {
        newSet.add(pillarName);
      }
      return newSet;
    });
  };

  const isTopicSelected = (topic: EnhancedTopicSuggestion) => {
    return selectedTopics.some(t => t.topic === topic.topic);
  };

  if (groupedTopics.length === 0) {
    return (
      <Card className={cn('gradient-card border-dashed', className)}>
        <CardContent className="py-12 text-center">
          <Layers className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Không có topics nào để hiển thị theo pillars
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Topics theo Content Pillars</h3>
          <Badge variant="secondary" className="text-xs">
            {groupedTopics.length} nhóm
          </Badge>
        </div>

        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Pillar sections */}
      <div className="space-y-3">
        {groupedTopics.map(({ pillar, topics: pillarTopics }) => {
          const isCollapsed = collapsedPillars.has(pillar.name);
          const pillarIcon = 'icon' in pillar ? pillar.icon : undefined;

          return (
            <Collapsible
              key={pillar.name}
              open={!isCollapsed}
              onOpenChange={() => togglePillar(pillar.name)}
            >
              <Card className="overflow-hidden border-border/50">
                <CollapsibleTrigger asChild>
                  <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {pillarIcon && <span>{pillarIcon}</span>}
                        {pillar.name}
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {pillarTopics.length} topics
                        </Badge>
                      </CardTitle>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {isCollapsed ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronUp className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4">
                    <div className={cn(
                      viewMode === 'grid' 
                        ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3' 
                        : 'space-y-2'
                    )}>
                      {pillarTopics.map((topic, idx) => (
                        <TopicIdeaCard
                          key={`${topic.topic}-${idx}`}
                          topic={topic}
                          onSelect={onSelectTopic}
                          onSave={onSaveTopic}
                          onSchedule={onScheduleTopic}
                          onShowExplanation={onShowExplanation}
                          selectable={selectable}
                          checked={isTopicSelected(topic)}
                          onCheckedChange={(checked) => onToggleSelection?.(topic, checked)}
                          compact={viewMode === 'list'}
                        />
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
