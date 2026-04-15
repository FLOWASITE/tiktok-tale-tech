import { useMemo } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopicItem {
  id: string;
  topic: string;
  category?: string;
  relatedKeywords?: string[];
}

interface SimilarTopicsSuggestionProps {
  currentItem: TopicItem;
  allItems: TopicItem[];
  onSelect: (topic: string, id: string) => void;
  maxResults?: number;
}

function computeSimilarity(a: TopicItem, b: TopicItem): number {
  if (a.id === b.id) return -1;

  let score = 0;

  // Category match: +0.3
  if (a.category && b.category && a.category === b.category) {
    score += 0.3;
  }

  // Keyword overlap (Jaccard-like)
  const kwA = new Set((a.relatedKeywords || []).map(k => k.toLowerCase()));
  const kwB = new Set((b.relatedKeywords || []).map(k => k.toLowerCase()));
  if (kwA.size > 0 && kwB.size > 0) {
    let intersection = 0;
    kwA.forEach(k => { if (kwB.has(k)) intersection++; });
    const union = new Set([...kwA, ...kwB]).size;
    score += (intersection / union) * 0.4;
  }

  // Topic text word overlap
  const wordsA = new Set(a.topic.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.topic.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  if (wordsA.size > 0 && wordsB.size > 0) {
    let intersection = 0;
    wordsA.forEach(w => { if (wordsB.has(w)) intersection++; });
    const union = new Set([...wordsA, ...wordsB]).size;
    score += (intersection / union) * 0.3;
  }

  return score;
}

export function SimilarTopicsSuggestion({
  currentItem,
  allItems,
  onSelect,
  maxResults = 3,
}: SimilarTopicsSuggestionProps) {
  const similarTopics = useMemo(() => {
    return allItems
      .map(item => ({ item, score: computeSimilarity(currentItem, item) }))
      .filter(r => r.score > 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(r => r.item);
  }, [currentItem, allItems, maxResults]);

  if (similarTopics.length === 0) return null;

  return (
    <div className="space-y-1 border-t border-border/40 pt-2 mt-1">
      <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
        <Sparkles className="w-3 h-3" />
        Chủ đề tương tự
      </div>
      <div className="space-y-0.5">
        {similarTopics.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(t.topic, t.id);
            }}
            className={cn(
              "w-full text-left flex items-center gap-1.5 px-1.5 py-1 rounded",
              "text-[10px] text-foreground/80 hover:bg-primary/10 hover:text-primary transition-colors"
            )}
          >
            <ArrowRight className="w-2.5 h-2.5 shrink-0 text-muted-foreground" />
            <span className="line-clamp-1">{t.topic}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
