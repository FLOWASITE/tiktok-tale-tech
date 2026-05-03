import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { PillarKeywordSection } from './PillarKeywordSection';
import { SuggestedTopicsFromKeyword } from '@/components/seo/SuggestedTopicsFromKeyword';

interface Props {
  clusterId: string | null | undefined;
  selectedKeywordIds: string[];
  onClusterChange: (clusterId: string | null, keywordIds: string[]) => void;
  onKeywordIdsChange: (ids: string[]) => void;
  onPickTopic: (title: string) => void;
  disabled?: boolean;
}

/**
 * SEO-first entry block: Pillar → Keyword → AI suggested topics.
 * The actual Topic textarea remains in parent (user can still edit/override).
 */
export function SeoFirstEntry({
  clusterId,
  selectedKeywordIds,
  onClusterChange,
  onKeywordIdsChange,
  onPickTopic,
  disabled,
}: Props) {
  return (
    <div className="space-y-3">
      <PillarKeywordSection
        variant="card"
        clusterId={clusterId}
        selectedKeywordIds={selectedKeywordIds}
        onClusterChange={onClusterChange}
        onKeywordIdsChange={onKeywordIdsChange}
      />

      <Card className="p-4 space-y-2 border-border/60 bg-muted/20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold">3. Topic gợi ý từ keyword</Label>
        </div>
        <SuggestedTopicsFromKeyword
          clusterId={clusterId}
          selectedKeywordIds={selectedKeywordIds}
          onPick={onPickTopic}
          disabled={disabled}
        />
      </Card>
    </div>
  );
}
