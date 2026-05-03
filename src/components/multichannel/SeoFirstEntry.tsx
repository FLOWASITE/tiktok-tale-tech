import { PillarKeywordSection } from './PillarKeywordSection';

interface Props {
  clusterId: string | null | undefined;
  selectedKeywordIds: string[];
  onClusterChange: (clusterId: string | null, keywordIds: string[]) => void;
  onKeywordIdsChange: (ids: string[]) => void;
  disabled?: boolean;
}

/**
 * SEO-first entry block: chỉ Pillar + Keyword picker.
 * Topic suggestions được render ở "Ý tưởng chủ đề" (TopicIdeaHub) bên dưới
 * và tự động bám theo keyword target user chọn.
 */
export function SeoFirstEntry({
  clusterId,
  selectedKeywordIds,
  onClusterChange,
  onKeywordIdsChange,
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
    </div>
  );
}
