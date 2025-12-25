import { useMemo } from 'react';
import { VideoType, VideoTypeCategory, VIDEO_TYPE_LABELS } from '@/types/script';

interface VideoTypeRecommendation {
  videoType: VideoType;
  score: number; // 0-100
  reason: string;
  category: VideoTypeCategory;
}

interface TopicKeywords {
  educational: string[];
  warning: string[];
  comparison: string[];
  howto: string[];
  story: string[];
  question: string[];
  review: string[];
  tips: string[];
  analysis: string[];
  myth: string[];
}

// Keywords that indicate specific video types
const TOPIC_KEYWORDS: TopicKeywords = {
  educational: ['kiến thức', 'học', 'hiểu', 'giải thích', 'tìm hiểu', 'nghiên cứu', 'phân tích', 'chuyên sâu', 'nền tảng'],
  warning: ['sai lầm', 'đừng', 'tránh', 'cẩn thận', 'nguy hiểm', 'rủi ro', 'lưu ý', 'cảnh báo', 'không nên', 'thất bại'],
  comparison: ['so sánh', 'trước sau', 'khác biệt', 'thay đổi', 'biến đổi', 'kết quả', 'transformation', 'before after'],
  howto: ['cách', 'hướng dẫn', 'tutorial', 'bước', 'làm thế nào', 'how to', 'quy trình', 'setup', 'cài đặt'],
  story: ['câu chuyện', 'kể', 'trải nghiệm', 'journey', 'hành trình', 'tôi đã', 'từng', 'story', 'pov'],
  question: ['tại sao', 'như thế nào', 'bao nhiêu', 'khi nào', 'ở đâu', 'ai', '?', 'hỏi đáp', 'q&a'],
  review: ['review', 'đánh giá', 'trải nghiệm', 'test', 'thử', 'dùng thử', 'mua', 'sản phẩm', 'dịch vụ'],
  tips: ['tips', 'mẹo', 'trick', 'bí kíp', 'top', 'danh sách', 'điều', 'thứ', 'cách'],
  analysis: ['phân tích', 'giải mã', 'bóc tách', 'deep dive', 'chi tiết', 'nghiên cứu', 'data', 'số liệu'],
  myth: ['sự thật', 'myth', 'quan niệm', 'bạn nghĩ', 'thực tế', 'đúng sai', 'thật sự', 'ai bảo']
};

// Industry to video type mapping
const INDUSTRY_VIDEO_TYPE_MAP: Record<string, { recommended: VideoType[]; reason: string }> = {
  // B2B Professional
  'ke-toan': { 
    recommended: ['expert_share', 'warning_mistake', 'tutorial_howto', 'quick_qa'], 
    reason: 'Ngành kế toán cần nội dung chuyên môn, cảnh báo sai lầm phổ biến'
  },
  'tai-chinh': { 
    recommended: ['expert_share', 'analyze_explain', 'case_study', 'warning_mistake'], 
    reason: 'Tài chính cần phân tích sâu và case study thực tế'
  },
  'luat': { 
    recommended: ['expert_share', 'quick_qa', 'warning_mistake', 'myth_busting'], 
    reason: 'Pháp lý cần giải đáp thắc mắc và bóc sai lầm'
  },
  'bat-dong-san': { 
    recommended: ['case_study', 'transformation', 'before_after', 'warning_mistake'], 
    reason: 'BĐS hiệu quả với case study và biến đổi thực tế'
  },
  'cong-nghe': { 
    recommended: ['tutorial_howto', 'product_review', 'analyze_explain', 'listicle'], 
    reason: 'Tech cần hướng dẫn và review sản phẩm'
  },
  // B2C
  'thoi-trang': { 
    recommended: ['day_in_life', 'behind_scenes', 'transformation', 'story_pov'], 
    reason: 'Thời trang hiệu quả với lifestyle và storytelling'
  },
  'lam-dep': { 
    recommended: ['tutorial_howto', 'before_after', 'product_review', 'transformation'], 
    reason: 'Làm đẹp cần tutorial và kết quả trước/sau'
  },
  'giao-duc': { 
    recommended: ['expert_share', 'tutorial_howto', 'listicle', 'myth_busting'], 
    reason: 'Giáo dục cần chia sẻ kiến thức có hệ thống'
  },
  'y-te': { 
    recommended: ['expert_share', 'myth_busting', 'quick_qa', 'warning_mistake'], 
    reason: 'Y tế cần bóc sai lầm và giải đáp chuyên môn'
  },
  'am-thuc': { 
    recommended: ['tutorial_howto', 'behind_scenes', 'reaction', 'day_in_life'], 
    reason: 'Ẩm thực cần hướng dẫn và hậu trường'
  },
  'du-lich': { 
    recommended: ['story_pov', 'day_in_life', 'listicle', 'behind_scenes'], 
    reason: 'Du lịch hiệu quả với storytelling và vlog style'
  },
  'marketing': { 
    recommended: ['case_study', 'analyze_explain', 'listicle', 'myth_busting'], 
    reason: 'Marketing cần case study và phân tích chiến lược'
  },
  'startup': { 
    recommended: ['story_pov', 'case_study', 'behind_scenes', 'transformation'], 
    reason: 'Startup hiệu quả với founder story và journey'
  },
};

// Analyze topic to detect patterns
function analyzeTopicPatterns(topic: string): { pattern: string; score: number }[] {
  const lowerTopic = topic.toLowerCase();
  const patterns: { pattern: string; score: number }[] = [];
  
  for (const [pattern, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    let matchCount = 0;
    for (const keyword of keywords) {
      if (lowerTopic.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      patterns.push({ 
        pattern, 
        score: Math.min(100, matchCount * 30) // Each match adds 30 points, max 100
      });
    }
  }
  
  return patterns.sort((a, b) => b.score - a.score);
}

// Map patterns to video types
const PATTERN_TO_VIDEO_TYPE: Record<string, { types: VideoType[]; baseScore: number }> = {
  educational: { types: ['expert_share', 'analyze_explain'], baseScore: 80 },
  warning: { types: ['warning_mistake'], baseScore: 90 },
  comparison: { types: ['before_after', 'transformation'], baseScore: 85 },
  howto: { types: ['tutorial_howto'], baseScore: 90 },
  story: { types: ['story_pov', 'day_in_life'], baseScore: 85 },
  question: { types: ['quick_qa', 'analyze_explain'], baseScore: 80 },
  review: { types: ['product_review'], baseScore: 90 },
  tips: { types: ['listicle'], baseScore: 85 },
  analysis: { types: ['analyze_explain', 'case_study'], baseScore: 85 },
  myth: { types: ['myth_busting'], baseScore: 90 },
};

// Get category for video type
function getVideoTypeCategory(videoType: VideoType): VideoTypeCategory {
  const categoryMap: Record<VideoType, VideoTypeCategory> = {
    expert_share: 'educational',
    tutorial_howto: 'educational',
    analyze_explain: 'educational',
    listicle: 'educational',
    warning_mistake: 'engagement',
    quick_qa: 'engagement',
    myth_busting: 'engagement',
    before_after: 'engagement',
    story_pov: 'entertainment',
    day_in_life: 'entertainment',
    behind_scenes: 'entertainment',
    reaction: 'entertainment',
    product_review: 'commercial',
    case_study: 'commercial',
    transformation: 'commercial',
  };
  return categoryMap[videoType];
}

// Generate reason for recommendation
function generateReason(videoType: VideoType, patterns: string[], industry?: string): string {
  const videoLabel = VIDEO_TYPE_LABELS[videoType];
  
  if (patterns.length > 0) {
    const patternReasons: Record<string, string> = {
      educational: 'chủ đề có tính giáo dục',
      warning: 'chủ đề đề cập sai lầm/cảnh báo',
      comparison: 'chủ đề có yếu tố so sánh/biến đổi',
      howto: 'chủ đề hướng dẫn thực hành',
      story: 'chủ đề có yếu tố kể chuyện',
      question: 'chủ đề dạng câu hỏi',
      review: 'chủ đề đánh giá sản phẩm/dịch vụ',
      tips: 'chủ đề dạng danh sách/tips',
      analysis: 'chủ đề phân tích chuyên sâu',
      myth: 'chủ đề bóc quan niệm sai',
    };
    
    const reasons = patterns
      .slice(0, 2)
      .map(p => patternReasons[p])
      .filter(Boolean);
    
    if (reasons.length > 0) {
      return `${videoLabel} phù hợp vì ${reasons.join(' và ')}`;
    }
  }
  
  if (industry && INDUSTRY_VIDEO_TYPE_MAP[industry]) {
    return INDUSTRY_VIDEO_TYPE_MAP[industry].reason;
  }
  
  return `${videoLabel} là lựa chọn phổ biến cho chủ đề này`;
}

export function useVideoTypeRecommendations({
  topic,
  industry,
  enabled = true,
}: {
  topic: string;
  industry?: string;
  enabled?: boolean;
}): {
  recommendations: VideoTypeRecommendation[];
  topRecommendation: VideoTypeRecommendation | null;
  isAnalyzing: boolean;
} {
  const recommendations = useMemo(() => {
    if (!enabled || topic.trim().length < 10) {
      return [];
    }
    
    const recs: Map<VideoType, VideoTypeRecommendation> = new Map();
    
    // 1. Analyze topic patterns
    const patterns = analyzeTopicPatterns(topic);
    const matchedPatterns: string[] = patterns.map(p => p.pattern);
    
    for (const { pattern, score: patternScore } of patterns) {
      const mapping = PATTERN_TO_VIDEO_TYPE[pattern];
      if (mapping) {
        for (const videoType of mapping.types) {
          const existingScore = recs.get(videoType)?.score || 0;
          const newScore = Math.min(100, Math.round((mapping.baseScore * patternScore) / 100));
          
          if (newScore > existingScore) {
            recs.set(videoType, {
              videoType,
              score: newScore,
              reason: generateReason(videoType, [pattern], industry),
              category: getVideoTypeCategory(videoType),
            });
          }
        }
      }
    }
    
    // 2. Add industry-based recommendations
    if (industry && INDUSTRY_VIDEO_TYPE_MAP[industry]) {
      const industryRecs = INDUSTRY_VIDEO_TYPE_MAP[industry];
      for (let i = 0; i < industryRecs.recommended.length; i++) {
        const videoType = industryRecs.recommended[i];
        const industryScore = 70 - (i * 10); // First is 70, second is 60, etc.
        
        const existingRec = recs.get(videoType);
        if (!existingRec || existingRec.score < industryScore) {
          recs.set(videoType, {
            videoType,
            score: existingRec ? Math.max(existingRec.score, industryScore) : industryScore,
            reason: existingRec?.reason || industryRecs.reason,
            category: getVideoTypeCategory(videoType),
          });
        }
      }
    }
    
    // 3. If no patterns matched, add default recommendations
    if (recs.size === 0) {
      const defaults: VideoType[] = ['expert_share', 'listicle', 'quick_qa'];
      defaults.forEach((videoType, i) => {
        recs.set(videoType, {
          videoType,
          score: 50 - (i * 10),
          reason: `${VIDEO_TYPE_LABELS[videoType]} là định dạng phổ biến và hiệu quả`,
          category: getVideoTypeCategory(videoType),
        });
      });
    }
    
    // Sort by score and return top 5
    return Array.from(recs.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [topic, industry, enabled]);
  
  return {
    recommendations,
    topRecommendation: recommendations[0] || null,
    isAnalyzing: false,
  };
}
