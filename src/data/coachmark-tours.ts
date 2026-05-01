import { CoachmarkStep } from '@/components/onboarding/types';
import { DASHBOARD_STEPS } from '@/components/onboarding/dashboardSteps';
import { Sparkles, FileText, MessageSquare, Calendar, Video, Layers, Users, Package, Route, Settings } from 'lucide-react';

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
  'brand-personas': [
    {
      id: 'personas-step',
      target: '[data-coachmark="brand-personas"]',
      title: 'Customer Personas',
      description: 'Thiết lập chân dung khách hàng mục tiêu với demographics, pain points, desires.',
      icon: Users,
      placement: 'bottom'
    }
  ],
  'brand-products': [
    {
      id: 'products-step',
      target: '[data-coachmark="brand-products"]',
      title: 'Products',
      description: 'Thêm sản phẩm/dịch vụ với USP, benefits và best channels.',
      icon: Package,
      placement: 'bottom'
    }
  ],
  'brand-journey': [
    {
      id: 'journey-step',
      target: '[data-coachmark="brand-journey"]',
      title: 'Journey Stage Messaging',
      description: 'Thiết lập nội dung theo từng giai đoạn funnel: Awareness → Consideration → Decision → Loyalty.',
      icon: Route,
      placement: 'bottom'
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
  'topic-bank': [
    {
      id: 'topic-bank-nav',
      target: '[data-coachmark="topic-bank"]',
      title: 'Topic Bank',
      description: 'Lưu và quản lý ý tưởng: draft, suggested, used, rejected.',
      icon: MessageSquare,
      placement: 'bottom'
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
      target: '[data-coachmark="sidebar-videoStudio"]',
      title: 'Video Studio',
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
  ],
  'admin-ai': [
    {
      id: 'admin-ai-nav',
      target: '[data-coachmark="admin-ai-management"]',
      title: 'AI Management Center',
      description: 'Cấu hình AI providers, models, parameters và theo dõi metrics.',
      icon: Settings,
      placement: 'bottom'
    }
  ]
};

export function getTourById(tourId: string): CoachmarkStep[] | null {
  return TOUR_CONFIGS[tourId] || null;
}
