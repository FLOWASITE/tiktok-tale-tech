import { CoachmarkStep } from '@/components/onboarding/types';
import { DASHBOARD_STEPS } from '@/components/onboarding/dashboardSteps';
import { Sparkles, FileText, MessageSquare, Calendar, Video, Layers } from 'lucide-react';

// Tour configurations by ID
export const TOUR_CONFIGS: Record<string, CoachmarkStep[]> = {
  'dashboard': DASHBOARD_STEPS,
  'brand-creation': [
    {
      id: 'brand-nav',
      target: '[data-coachmark="sidebar-brands"]',
      title: 'Quản lý Brands',
      description: 'Đây là nơi quản lý tất cả Brand Templates của bạn. Click để bắt đầu tạo brand mới.',
      icon: Sparkles,
      placement: 'right'
    }
  ],
  'content-creation': [
    {
      id: 'content-nav',
      target: '[data-coachmark="sidebar-multichannel"]',
      title: 'Tạo Nội dung Đa kênh',
      description: 'Click vào đây để tạo nội dung cho nhiều kênh social media cùng lúc.',
      icon: FileText,
      placement: 'right'
    }
  ],
  'ai-chatbot': [
    {
      id: 'topics-nav',
      target: '[data-coachmark="sidebar-topics"]',
      title: 'Kho Ý Tưởng AI',
      description: 'AI Chatbot giúp bạn brainstorm ý tưởng và phân tích trending topics.',
      icon: MessageSquare,
      placement: 'right'
    }
  ],
  'calendar': [
    {
      id: 'calendar-nav',
      target: '[data-coachmark="sidebar-calendar"]',
      title: 'Lịch Nội dung',
      description: 'Xem và quản lý lịch đăng bài của bạn tại đây.',
      icon: Calendar,
      placement: 'right'
    }
  ],
  'scripts': [
    {
      id: 'scripts-nav',
      target: '[data-coachmark="sidebar-scripts"]',
      title: 'Kịch bản Video',
      description: 'Tạo kịch bản cho TikTok, Reels, Shorts với AI hỗ trợ.',
      icon: Video,
      placement: 'right'
    }
  ],
  'carousel': [
    {
      id: 'carousel-nav',
      target: '[data-coachmark="sidebar-carousel"]',
      title: 'Carousel Design',
      description: 'Thiết kế carousel đẹp cho Instagram và LinkedIn.',
      icon: Layers,
      placement: 'right'
    }
  ]
};

export function getTourById(tourId: string): CoachmarkStep[] | null {
  return TOUR_CONFIGS[tourId] || null;
}
