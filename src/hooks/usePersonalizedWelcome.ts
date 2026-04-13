// ============================================
// usePersonalizedWelcome Hook
// Fetches and builds personalized welcome data
// ============================================

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SmartSuggestion {
  id: string;
  type: 'continue' | 'trending' | 'seasonal' | 'recommended' | 'pillar' | 'format';
  label: string;
  prompt: string;
  icon: 'rotate-ccw' | 'trending-up' | 'calendar' | 'sparkles' | 'layout-grid' | 'video' | 'images' | 'message-square';
  priority: number;
  reason?: string;
}

export interface PersonalizedWelcomeData {
  // Brand context
  brandName?: string;
  brandLogo?: string;
  industry?: string[];
  contentPillars?: { name: string; keywords?: string[] }[];
  
  // User preferences
  skillLevel: 'beginner' | 'intermediate' | 'expert';
  preferredFormats: string[];
  preferredCategories: string[];
  
  // Recent activity
  recentTopics: string[];
  topPerformingCategory?: string;
  lastContentGoal?: string;
  daysInactive: number;
  totalTopicsGenerated: number;
  
  // Smart suggestions
  suggestions: SmartSuggestion[];
  
  // Greeting
  greeting: string;
  
  // Loading state
  isLoading: boolean;
}

interface UsePersonalizedWelcomeOptions {
  brandTemplateId?: string;
}

// Get time-based greeting with personality
function getTimeBasedGreeting(daysInactive: number, brandName?: string): string {
  const hour = new Date().getHours();
  let timeGreeting: string;
  
  if (hour >= 5 && hour < 12) {
    timeGreeting = 'Chào buổi sáng!';
  } else if (hour >= 12 && hour < 18) {
    timeGreeting = 'Chào buổi chiều!';
  } else {
    timeGreeting = 'Chào buổi tối!';
  }
  
  // Add context based on inactivity
  if (daysInactive > 7) {
    return `${timeGreeting} Lâu rồi không gặp!`;
  } else if (daysInactive > 1) {
    return `${timeGreeting} Rất vui được gặp lại bạn.`;
  }
  
  return timeGreeting;
}

// Get seasonal suggestion based on current date
function getSeasonalSuggestion(): SmartSuggestion | null {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  
  // Tet (Vietnamese New Year) - usually late Jan/early Feb
  if ((month === 1 && day >= 15) || (month === 2 && day <= 15)) {
    return {
      id: 'seasonal-tet',
      type: 'seasonal',
      label: 'Content Tết 2026',
      prompt: 'Gợi ý ý tưởng content cho dịp Tết Nguyên Đán',
      icon: 'calendar',
      priority: 2,
      reason: 'Sự kiện theo mùa'
    };
  }
  
  // Valentine's Day
  if (month === 2 && day >= 1 && day <= 14) {
    return {
      id: 'seasonal-valentine',
      type: 'seasonal',
      label: 'Valentine\'s Day',
      prompt: 'Gợi ý content cho ngày Valentine',
      icon: 'calendar',
      priority: 2,
      reason: 'Sự kiện sắp đến'
    };
  }
  
  // Women's Day
  if (month === 3 && day >= 1 && day <= 8) {
    return {
      id: 'seasonal-womens-day',
      type: 'seasonal',
      label: 'Ngày 8/3',
      prompt: 'Gợi ý content cho ngày Quốc tế Phụ nữ 8/3',
      icon: 'calendar',
      priority: 2,
      reason: 'Sự kiện sắp đến'
    };
  }
  
  // Year-end content planning
  if (month === 12) {
    return {
      id: 'seasonal-yearend',
      type: 'seasonal',
      label: 'Review năm cũ',
      prompt: 'Gợi ý content tổng kết năm và kế hoạch năm mới',
      icon: 'calendar',
      priority: 2,
      reason: 'Cuối năm'
    };
  }
  
  return null;
}

// Find unused content pillar
function getUnusedPillar(
  pillars: { name: string }[] | undefined, 
  recentTopics: string[]
): string | null {
  if (!pillars || pillars.length === 0) return null;
  
  const recentTopicsLower = recentTopics.map(t => t.toLowerCase()).join(' ');
  
  for (const pillar of pillars) {
    if (!pillar.name) continue;
    if (!recentTopicsLower.includes(pillar.name.toLowerCase())) {
      return pillar.name;
    }
  }
  
  return null;
}

// Generate smart suggestions based on context
function generateSmartSuggestions(data: {
  brandName?: string;
  contentPillars?: { name: string }[];
  preferredFormats: string[];
  preferredCategories: string[];
  recentTopics: string[];
  topPerformingCategory?: string;
  lastContentGoal?: string;
  totalTopicsGenerated: number;
}): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];
  
  // 1. Continue where left off
  if (data.lastContentGoal) {
    suggestions.push({
      id: 'continue-goal',
      type: 'continue',
      label: `Tiếp tục: ${data.lastContentGoal.slice(0, 25)}${data.lastContentGoal.length > 25 ? '...' : ''}`,
      prompt: `Tiếp tục giúp tôi về "${data.lastContentGoal}"`,
      icon: 'rotate-ccw',
      priority: 1,
      reason: 'Phiên trước'
    });
  }
  
  // 2. Top performing category
  if (data.topPerformingCategory) {
    suggestions.push({
      id: 'top-category',
      type: 'recommended',
      label: `${data.topPerformingCategory}`,
      prompt: `Gợi ý thêm topics về ${data.topPerformingCategory}`,
      icon: 'sparkles',
      priority: 2,
      reason: 'Hiệu quả cao'
    });
  }
  
  // 3. Seasonal suggestion
  const seasonal = getSeasonalSuggestion();
  if (seasonal) {
    suggestions.push(seasonal);
  }
  
  // 4. Unused content pillar
  const unusedPillar = getUnusedPillar(data.contentPillars, data.recentTopics);
  if (unusedPillar) {
    suggestions.push({
      id: 'unused-pillar',
      type: 'pillar',
      label: unusedPillar,
      prompt: `Gợi ý content cho pillar "${unusedPillar}"`,
      icon: 'layout-grid',
      priority: 4,
      reason: 'Chưa có content gần đây'
    });
  }
  
  // 5. Format-based suggestions for users with preferences
  if (data.preferredFormats.includes('script') || data.preferredFormats.includes('tiktok')) {
    suggestions.push({
      id: 'format-script',
      type: 'format',
      label: 'TikTok Script',
      prompt: 'Gợi ý ý tưởng TikTok script hấp dẫn cho thương hiệu của tôi',
      icon: 'video',
      priority: 5
    });
  }
  
  if (data.preferredFormats.includes('carousel')) {
    suggestions.push({
      id: 'format-carousel',
      type: 'format',
      label: 'Carousel Ideas',
      prompt: 'Gợi ý ý tưởng carousel cho Instagram/LinkedIn',
      icon: 'images',
      priority: 6
    });
  }
  
  // 6. Trending (always available as fallback)
  if (suggestions.length < 4) {
    suggestions.push({
      id: 'trending',
      type: 'trending',
      label: 'Xu hướng mới',
      prompt: 'Có xu hướng content nào đang hot trong ngành của tôi không?',
      icon: 'trending-up',
      priority: 7,
      reason: 'Cập nhật trends'
    });
  }
  
  // 7. For new users - discovery
  if (data.totalTopicsGenerated === 0) {
    suggestions.unshift({
      id: 'discovery',
      type: 'recommended',
      label: 'Khám phá Flowa',
      prompt: 'Hướng dẫn tôi cách sử dụng Flowa để tạo content hiệu quả',
      icon: 'sparkles',
      priority: 0,
      reason: 'Bắt đầu'
    });
  }
  
  return suggestions.sort((a, b) => a.priority - b.priority).slice(0, 5);
}

export function usePersonalizedWelcome(options: UsePersonalizedWelcomeOptions = {}): PersonalizedWelcomeData {
  const { brandTemplateId } = options;
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [brandData, setBrandData] = useState<any>(null);
  const [userPrefs, setUserPrefs] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<{
    topics: string[];
    topCategory?: string;
    lastGoal?: string;
    lastActiveAt?: string;
    totalGenerated: number;
  }>({ topics: [], totalGenerated: 0 });
  
  // Fetch all data in parallel
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Parallel fetch all data sources
        const [brandResult, prefsResult, historyResult, conversationResult] = await Promise.all([
          // Brand template
          brandTemplateId 
            ? supabase
                .from('brand_templates')
                .select('brand_name, logo_url, industry, content_pillars')
                .eq('id', brandTemplateId)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          
          // User preferences
          supabase
            .from('user_preferences')
            .select('skill_level, preferred_tone, preferred_formats, inferred_preferences, topics_generated_count')
            .eq('user_id', user.id)
            .maybeSingle(),
          
          // Recent topic history (last 10)
          supabase
            .from('topic_history')
            .select('topic, category, performance_score, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10),
          
          // Last conversation
          supabase
            .from('chat_conversations')
            .select('content_goal, last_message_at')
            .eq('user_id', user.id)
            .order('last_message_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        ]);
        
        setBrandData(brandResult.data);
        setUserPrefs(prefsResult.data);
        
        // Process topic history
        const topics = historyResult.data?.map(t => t.topic) || [];
        const categoryScores = new Map<string, number>();
        
        historyResult.data?.forEach(t => {
          if (t.category && t.performance_score) {
            const current = categoryScores.get(t.category) || 0;
            categoryScores.set(t.category, current + (t.performance_score || 0));
          }
        });
        
        let topCategory: string | undefined;
        let maxScore = 0;
        categoryScores.forEach((score, cat) => {
          if (score > maxScore) {
            maxScore = score;
            topCategory = cat;
          }
        });
        
        setRecentActivity({
          topics,
          topCategory,
          lastGoal: conversationResult.data?.content_goal,
          lastActiveAt: conversationResult.data?.last_message_at,
          totalGenerated: prefsResult.data?.topics_generated_count || 0
        });
        
      } catch (error) {
        console.error('Error fetching personalized data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user?.id, brandTemplateId]);
  
  // Calculate days inactive
  const daysInactive = useMemo(() => {
    if (!recentActivity.lastActiveAt) return 0;
    const lastActive = new Date(recentActivity.lastActiveAt);
    const now = new Date();
    return Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
  }, [recentActivity.lastActiveAt]);
  
  // Parse content pillars
  const contentPillars = useMemo(() => {
    if (!brandData?.content_pillars) return undefined;
    try {
      const pillars = typeof brandData.content_pillars === 'string' 
        ? JSON.parse(brandData.content_pillars) 
        : brandData.content_pillars;
      return Array.isArray(pillars) ? pillars : undefined;
    } catch {
      return undefined;
    }
  }, [brandData?.content_pillars]);
  
  // Parse inferred preferences
  const inferredPrefs = useMemo(() => {
    if (!userPrefs?.inferred_preferences) return { formats: [], categories: [] };
    try {
      const prefs = typeof userPrefs.inferred_preferences === 'string'
        ? JSON.parse(userPrefs.inferred_preferences)
        : userPrefs.inferred_preferences;
      return {
        formats: prefs.preferred_formats || [],
        categories: prefs.preferred_categories || []
      };
    } catch {
      return { formats: [], categories: [] };
    }
  }, [userPrefs?.inferred_preferences]);
  
  // Build greeting
  const greeting = useMemo(() => {
    return getTimeBasedGreeting(daysInactive, brandData?.brand_name);
  }, [daysInactive, brandData?.brand_name]);
  
  // Generate suggestions
  const suggestions = useMemo(() => {
    return generateSmartSuggestions({
      brandName: brandData?.brand_name,
      contentPillars,
      preferredFormats: inferredPrefs.formats,
      preferredCategories: inferredPrefs.categories,
      recentTopics: recentActivity.topics,
      topPerformingCategory: recentActivity.topCategory,
      lastContentGoal: recentActivity.lastGoal,
      totalTopicsGenerated: recentActivity.totalGenerated
    });
  }, [brandData, contentPillars, inferredPrefs, recentActivity]);
  
  return {
    brandName: brandData?.brand_name,
    brandLogo: brandData?.logo_url,
    industry: brandData?.industry,
    contentPillars,
    skillLevel: (userPrefs?.skill_level as 'beginner' | 'intermediate' | 'expert') || 'beginner',
    preferredFormats: inferredPrefs.formats,
    preferredCategories: inferredPrefs.categories,
    recentTopics: recentActivity.topics,
    topPerformingCategory: recentActivity.topCategory,
    lastContentGoal: recentActivity.lastGoal,
    daysInactive,
    totalTopicsGenerated: recentActivity.totalGenerated,
    suggestions,
    greeting,
    isLoading
  };
}
