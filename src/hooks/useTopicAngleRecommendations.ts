import { useMemo } from 'react';
import { TopicAngle, TOPIC_ANGLE_LABELS } from '@/types/script';

export interface AngleRecommendation {
  angle: TopicAngle;
  score: number; // 0-100
  reason: string;
}

// Keywords that signal specific angles
const ANGLE_KEYWORDS: Record<TopicAngle, string[]> = {
  beginner: [
    'cơ bản', 'mới bắt đầu', 'newbie', 'nhập môn', 'bước đầu', 'cho người mới',
    'từ a-z', 'từ đầu', 'lần đầu', 'dễ hiểu', 'đơn giản', 'là gì', 'giới thiệu',
    'khởi đầu', 'abc', 'nền tảng', 'fundamental', 'basic', 'beginner', '101',
  ],
  expert: [
    'nâng cao', 'chuyên sâu', 'deep dive', 'advanced', 'pro', 'chiến lược',
    'framework', 'methodology', 'case study', 'phân tích', 'insight', 'master',
    'chuyên gia', 'senior', 'expert', 'kinh nghiệm', 'bí quyết', 'behind the scenes',
  ],
  quick_tips: [
    'tips', 'mẹo', 'trick', 'nhanh', 'ngay', 'đơn giản', 'dễ', 'top', 'danh sách',
    'bí kíp', 'phút', 'giây', 'hack', 'shortcut', 'quick', 'instant', 'điều',
    'cách nhanh', 'thủ thuật',
  ],
  myth_busting: [
    'sai lầm', 'myth', 'quan niệm sai', 'sự thật', 'bạn nghĩ', 'thực tế',
    'đúng hay sai', 'bóc phốt', 'nhầm lẫn', 'tưởng', 'không phải', 'thật sự',
    'fake', 'hoax', 'đừng tin', 'ai cũng tưởng', 'ai bảo', 'lầm tưởng',
  ],
  data_driven: [
    'số liệu', 'data', 'thống kê', 'nghiên cứu', 'báo cáo', 'report',
    'phần trăm', '%', 'biểu đồ', 'chart', 'survey', 'khảo sát', 'benchmark',
    'ROI', 'KPI', 'metric', 'dữ liệu', 'con số', 'bằng chứng',
  ],
};

// Video type affinity — certain video types naturally pair with certain angles
const VIDEO_TYPE_ANGLE_AFFINITY: Record<string, { angles: TopicAngle[]; boost: number }> = {
  tutorial_howto: { angles: ['beginner', 'quick_tips'], boost: 15 },
  expert_share: { angles: ['expert', 'data_driven'], boost: 15 },
  warning_mistake: { angles: ['myth_busting'], boost: 20 },
  myth_busting: { angles: ['myth_busting', 'data_driven'], boost: 25 },
  listicle: { angles: ['quick_tips'], boost: 20 },
  analyze_explain: { angles: ['expert', 'data_driven'], boost: 15 },
  quick_qa: { angles: ['beginner', 'quick_tips'], boost: 10 },
  case_study: { angles: ['data_driven', 'expert'], boost: 15 },
  product_review: { angles: ['data_driven', 'expert'], boost: 10 },
  before_after: { angles: ['data_driven'], boost: 10 },
};

function analyzeAnglePatterns(topic: string): { angle: TopicAngle; matchCount: number }[] {
  const lower = topic.toLowerCase();
  const results: { angle: TopicAngle; matchCount: number }[] = [];

  for (const [angle, keywords] of Object.entries(ANGLE_KEYWORDS) as [TopicAngle, string[]][]) {
    let count = 0;
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) count++;
    }
    if (count > 0) results.push({ angle, matchCount: count });
  }

  return results.sort((a, b) => b.matchCount - a.matchCount);
}

export function useTopicAngleRecommendations({
  topic,
  videoType,
  enabled = true,
}: {
  topic: string;
  videoType?: string;
  enabled?: boolean;
}): {
  recommendations: AngleRecommendation[];
  topRecommendation: AngleRecommendation | null;
} {
  const recommendations = useMemo(() => {
    if (!enabled || topic.trim().length < 10) return [];

    const scores = new Map<TopicAngle, { score: number; reason: string }>();

    // 1. Keyword analysis
    const patterns = analyzeAnglePatterns(topic);
    for (const { angle, matchCount } of patterns) {
      const score = Math.min(95, 40 + matchCount * 20);
      const label = TOPIC_ANGLE_LABELS[angle]?.label || angle;
      scores.set(angle, {
        score,
        reason: `"${label}" phù hợp dựa trên từ khóa trong chủ đề`,
      });
    }

    // 2. Video type affinity boost
    if (videoType && VIDEO_TYPE_ANGLE_AFFINITY[videoType]) {
      const { angles, boost } = VIDEO_TYPE_ANGLE_AFFINITY[videoType];
      for (const angle of angles) {
        const existing = scores.get(angle);
        if (existing) {
          scores.set(angle, { ...existing, score: Math.min(100, existing.score + boost) });
        } else {
          const label = TOPIC_ANGLE_LABELS[angle]?.label || angle;
          scores.set(angle, {
            score: 50 + boost,
            reason: `"${label}" phù hợp với thể loại video đã chọn`,
          });
        }
      }
    }

    // 3. If nothing matched, don't force a suggestion
    if (scores.size === 0) return [];

    return Array.from(scores.entries())
      .map(([angle, { score, reason }]) => ({ angle, score, reason }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [topic, videoType, enabled]);

  return {
    recommendations,
    topRecommendation: recommendations[0] || null,
  };
}
