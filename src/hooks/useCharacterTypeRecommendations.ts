import { useMemo } from 'react';
import { CharacterType, CharacterCategory, CHARACTER_TYPE_LABELS, VideoType } from '@/types/script';

interface CharacterTypeRecommendation {
  characterType: CharacterType;
  score: number; // 0-100
  reason: string;
  category: CharacterCategory;
}

// Video Type to Character Type mapping - which characters work best for each video type
const VIDEO_TYPE_CHARACTER_MAP: Record<VideoType, { recommended: CharacterType[]; reason: string }> = {
  // Educational
  expert_share: { 
    recommended: ['the_virtuoso', 'the_coach', 'the_bellwether'], 
    reason: 'Chia sẻ chuyên môn cần sự uy tín và chuyên nghiệp' 
  },
  tutorial_howto: { 
    recommended: ['the_coach', 'the_maker', 'the_virtuoso'], 
    reason: 'Hướng dẫn cần người có khả năng truyền đạt rõ ràng' 
  },
  analyze_explain: { 
    recommended: ['the_analyst', 'the_virtuoso', 'the_technophile'], 
    reason: 'Phân tích cần góc nhìn logic và chi tiết' 
  },
  listicle: { 
    recommended: ['the_coach', 'the_enthusiast', 'neutral_presenter'], 
    reason: 'Danh sách tips cần trình bày gọn gàng và hấp dẫn' 
  },
  // Engagement
  warning_mistake: { 
    recommended: ['the_virtuoso', 'the_coach', 'the_iconoclast'], 
    reason: 'Cảnh báo sai lầm cần sự uy tín hoặc thẳng thắn' 
  },
  quick_qa: { 
    recommended: ['the_coach', 'the_virtuoso', 'the_enthusiast'], 
    reason: 'Hỏi đáp cần sự thân thiện và kiến thức sâu' 
  },
  myth_busting: { 
    recommended: ['the_iconoclast', 'the_analyst', 'the_virtuoso'], 
    reason: 'Bóc phốt cần người dám phá vỡ khuôn mẫu' 
  },
  before_after: { 
    recommended: ['the_maker', 'the_coach', 'the_enthusiast'], 
    reason: 'So sánh cần sự nhiệt huyết thể hiện kết quả' 
  },
  // Entertainment
  story_pov: { 
    recommended: ['the_storyteller', 'the_performer', 'the_enthusiast'], 
    reason: 'Kể chuyện cần khả năng cuốn hút người xem' 
  },
  day_in_life: { 
    recommended: ['the_enthusiast', 'the_storyteller', 'the_maker'], 
    reason: 'Vlog style cần sự tự nhiên và đam mê' 
  },
  behind_scenes: { 
    recommended: ['the_maker', 'the_enthusiast', 'the_storyteller'], 
    reason: 'Hậu trường cần sự chân thực và passion' 
  },
  reaction: { 
    recommended: ['the_performer', 'the_iconoclast', 'the_enthusiast'], 
    reason: 'Reaction cần năng lượng và cá tính' 
  },
  // Commercial
  product_review: { 
    recommended: ['the_analyst', 'the_virtuoso', 'the_technophile'], 
    reason: 'Review cần đánh giá khách quan và chuyên môn' 
  },
  case_study: { 
    recommended: ['the_analyst', 'the_virtuoso', 'the_coach'], 
    reason: 'Case study cần phân tích sâu và có hệ thống' 
  },
  transformation: { 
    recommended: ['the_maker', 'the_coach', 'the_storyteller'], 
    reason: 'Biến đổi cần thể hiện journey và kết quả' 
  },
};

// Industry to Character Type mapping
const INDUSTRY_CHARACTER_MAP: Record<string, { recommended: CharacterType[]; reason: string }> = {
  // B2B Professional
  'ke-toan': { 
    recommended: ['the_virtuoso', 'the_analyst', 'the_coach'], 
    reason: 'Kế toán cần sự chuyên môn và đáng tin cậy' 
  },
  'tai-chinh': { 
    recommended: ['the_analyst', 'the_virtuoso', 'the_bellwether'], 
    reason: 'Tài chính cần phân tích logic và uy tín' 
  },
  'luat': { 
    recommended: ['the_virtuoso', 'the_coach', 'the_analyst'], 
    reason: 'Pháp lý cần chuyên môn cao và giải thích rõ ràng' 
  },
  'bat-dong-san': { 
    recommended: ['the_bellwether', 'the_coach', 'the_storyteller'], 
    reason: 'BĐS cần dẫn dắt xu hướng và kể chuyện' 
  },
  'cong-nghe': { 
    recommended: ['the_technophile', 'the_maker', 'the_analyst'], 
    reason: 'Tech cần am hiểu công nghệ và đam mê sáng tạo' 
  },
  // B2C
  'thoi-trang': { 
    recommended: ['the_bellwether', 'the_performer', 'the_iconoclast'], 
    reason: 'Thời trang cần dẫn xu hướng và cá tính' 
  },
  'lam-dep': { 
    recommended: ['the_coach', 'the_maker', 'the_enthusiast'], 
    reason: 'Làm đẹp cần hướng dẫn thực tế và đam mê' 
  },
  'giao-duc': { 
    recommended: ['the_coach', 'the_virtuoso', 'the_enthusiast'], 
    reason: 'Giáo dục cần khả năng truyền đạt và đam mê' 
  },
  'y-te': { 
    recommended: ['the_virtuoso', 'the_coach', 'the_analyst'], 
    reason: 'Y tế cần chuyên môn cao và đáng tin cậy' 
  },
  'am-thuc': { 
    recommended: ['the_enthusiast', 'the_maker', 'the_storyteller'], 
    reason: 'Ẩm thực cần đam mê và khả năng trình bày' 
  },
  'du-lich': { 
    recommended: ['the_storyteller', 'the_enthusiast', 'the_performer'], 
    reason: 'Du lịch cần kể chuyện hấp dẫn và năng lượng' 
  },
  'marketing': { 
    recommended: ['the_analyst', 'the_bellwether', 'the_coach'], 
    reason: 'Marketing cần phân tích data và dẫn xu hướng' 
  },
  'startup': { 
    recommended: ['the_maker', 'the_storyteller', 'the_iconoclast'], 
    reason: 'Startup cần thể hiện passion và dám khác biệt' 
  },
};

// Topic keywords that suggest specific character types
const TOPIC_CHARACTER_KEYWORDS: Record<CharacterType, string[]> = {
  the_virtuoso: ['chuyên gia', 'chuyên môn', 'kỹ thuật', 'professional', 'expert', 'master'],
  the_bellwether: ['xu hướng', 'trend', 'tiên phong', 'đầu tiên', 'mới nhất', 'leading'],
  the_coach: ['hướng dẫn', 'dạy', 'học', 'mentor', 'cách', 'bước', 'tips'],
  the_performer: ['show', 'biểu diễn', 'năng lượng', 'entertaining', 'vui', 'hài'],
  the_storyteller: ['câu chuyện', 'story', 'kể', 'journey', 'hành trình', 'trải nghiệm'],
  the_iconoclast: ['sự thật', 'bóc phốt', 'myth', 'sai lầm', 'thực tế', 'khác biệt'],
  the_technophile: ['công nghệ', 'tech', 'app', 'tool', 'software', 'AI', 'digital'],
  the_analyst: ['phân tích', 'data', 'số liệu', 'nghiên cứu', 'thống kê', 'so sánh'],
  the_enthusiast: ['đam mê', 'yêu thích', 'passion', 'review', 'trải nghiệm', 'chia sẻ'],
  the_maker: ['tạo', 'làm', 'DIY', 'build', 'sáng tạo', 'project', 'thực hành'],
  neutral_presenter: ['thông tin', 'tin tức', 'cập nhật', 'tổng hợp', 'news'],
};

// Get category for character type
function getCharacterCategory(characterType: CharacterType): CharacterCategory {
  const categoryMap: Record<CharacterType, CharacterCategory> = {
    the_virtuoso: 'professional',
    the_bellwether: 'professional',
    the_coach: 'professional',
    the_performer: 'creative',
    the_storyteller: 'creative',
    the_iconoclast: 'creative',
    the_technophile: 'technical',
    the_analyst: 'technical',
    the_enthusiast: 'passionate',
    the_maker: 'passionate',
    neutral_presenter: 'neutral',
  };
  return categoryMap[characterType];
}

// Analyze topic for character keywords
function analyzeTopicForCharacter(topic: string): { characterType: CharacterType; score: number }[] {
  const lowerTopic = topic.toLowerCase();
  const scores: Map<CharacterType, number> = new Map();
  
  for (const [characterType, keywords] of Object.entries(TOPIC_CHARACTER_KEYWORDS)) {
    let matchCount = 0;
    for (const keyword of keywords) {
      if (lowerTopic.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      scores.set(characterType as CharacterType, Math.min(100, matchCount * 25));
    }
  }
  
  return Array.from(scores.entries())
    .map(([characterType, score]) => ({ characterType, score }))
    .sort((a, b) => b.score - a.score);
}

// Generate reason for recommendation
function generateReason(
  characterType: CharacterType, 
  source: 'videoType' | 'industry' | 'topic' | 'default',
  videoType?: VideoType,
  industry?: string
): string {
  const label = CHARACTER_TYPE_LABELS[characterType];
  
  if (source === 'videoType' && videoType && VIDEO_TYPE_CHARACTER_MAP[videoType]) {
    return VIDEO_TYPE_CHARACTER_MAP[videoType].reason;
  }
  
  if (source === 'industry' && industry && INDUSTRY_CHARACTER_MAP[industry]) {
    return INDUSTRY_CHARACTER_MAP[industry].reason;
  }
  
  if (source === 'topic') {
    return `${label} phù hợp với từ khóa trong chủ đề`;
  }
  
  return `${label} là lựa chọn linh hoạt cho nội dung này`;
}

export function useCharacterTypeRecommendations({
  topic,
  videoType,
  industry,
  enabled = true,
}: {
  topic: string;
  videoType?: VideoType;
  industry?: string;
  enabled?: boolean;
}): {
  recommendations: CharacterTypeRecommendation[];
  topRecommendation: CharacterTypeRecommendation | null;
  isAnalyzing: boolean;
} {
  const recommendations = useMemo(() => {
    if (!enabled || topic.trim().length < 5) {
      return [];
    }
    
    const recs: Map<CharacterType, CharacterTypeRecommendation> = new Map();
    
    // 1. Video Type recommendations (highest priority when selected)
    if (videoType && VIDEO_TYPE_CHARACTER_MAP[videoType]) {
      const videoRecs = VIDEO_TYPE_CHARACTER_MAP[videoType];
      videoRecs.recommended.forEach((charType, i) => {
        const score = 90 - (i * 10); // First: 90, second: 80, third: 70
        recs.set(charType, {
          characterType: charType,
          score,
          reason: generateReason(charType, 'videoType', videoType),
          category: getCharacterCategory(charType),
        });
      });
    }
    
    // 2. Topic keyword analysis
    const topicMatches = analyzeTopicForCharacter(topic);
    for (const { characterType, score: topicScore } of topicMatches) {
      const existing = recs.get(characterType);
      const combinedScore = existing 
        ? Math.min(100, existing.score + Math.round(topicScore * 0.3)) // Boost existing
        : Math.round(topicScore * 0.7); // Lower weight for topic-only
      
      if (!existing || combinedScore > existing.score) {
        recs.set(characterType, {
          characterType,
          score: combinedScore,
          reason: existing?.reason || generateReason(characterType, 'topic'),
          category: getCharacterCategory(characterType),
        });
      }
    }
    
    // 3. Industry-based recommendations
    if (industry && INDUSTRY_CHARACTER_MAP[industry]) {
      const industryRecs = INDUSTRY_CHARACTER_MAP[industry];
      industryRecs.recommended.forEach((charType, i) => {
        const industryScore = 65 - (i * 10); // First: 65, second: 55, third: 45
        const existing = recs.get(charType);
        
        if (!existing) {
          recs.set(charType, {
            characterType: charType,
            score: industryScore,
            reason: generateReason(charType, 'industry', undefined, industry),
            category: getCharacterCategory(charType),
          });
        } else if (existing.score < industryScore + 10) {
          // Slight boost for industry match
          recs.set(charType, {
            ...existing,
            score: Math.min(100, existing.score + 5),
          });
        }
      });
    }
    
    // 4. Default recommendations if none matched
    if (recs.size === 0) {
      const defaults: CharacterType[] = ['the_coach', 'the_enthusiast', 'neutral_presenter'];
      defaults.forEach((charType, i) => {
        recs.set(charType, {
          characterType: charType,
          score: 50 - (i * 10),
          reason: generateReason(charType, 'default'),
          category: getCharacterCategory(charType),
        });
      });
    }
    
    // Sort by score and return top 5
    return Array.from(recs.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [topic, videoType, industry, enabled]);
  
  return {
    recommendations,
    topRecommendation: recommendations[0] || null,
    isAnalyzing: false,
  };
}
