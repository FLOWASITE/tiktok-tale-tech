import { 
  Sparkles, 
  BarChart3, 
  Zap, 
  Lightbulb, 
  Calendar, 
  Bookmark, 
  Layers,
  Globe 
} from 'lucide-react';
import { CoachmarkStep } from './types';

export const DASHBOARD_STEPS: CoachmarkStep[] = [
  {
    id: 'welcome',
    target: '[data-coachmark="header"]',
    title: 'Chào mừng đến Flowa! 🎉',
    description: 'Đây là Dashboard - trung tâm quản lý tất cả content của bạn. Để tôi hướng dẫn qua các tính năng chính!',
    icon: Sparkles,
    placement: 'bottom',
    spotlightPadding: 16,
  },
  {
    id: 'stats',
    target: '[data-coachmark="stats"]',
    title: 'Tổng quan nhanh',
    description: 'Xem số lượng Scripts, Carousels và Multichannel content bạn đã tạo tại đây.',
    icon: BarChart3,
    placement: 'bottom',
    spotlightPadding: 12,
  },
  {
    id: 'quick-actions',
    target: '[data-coachmark="quick-actions"]',
    title: 'Bắt đầu tạo content',
    description: 'Chọn loại content bạn muốn tạo: Đa kênh, Video Script, hoặc Carousel. Tất cả đều được hỗ trợ bởi AI!',
    icon: Zap,
    placement: 'right',
    spotlightPadding: 12,
  },
  {
    id: 'topics',
    target: '[data-coachmark="topics"]',
    title: 'Kho ý tưởng AI',
    description: 'AI sẽ gợi ý những chủ đề content phù hợp nhất với thương hiệu và ngành nghề của bạn.',
    icon: Lightbulb,
    placement: 'left',
    spotlightPadding: 12,
  },
  {
    id: 'schedules',
    target: '[data-coachmark="schedules"]',
    title: 'Lịch đăng bài',
    description: 'Xem content nào cần đăng hôm nay và quản lý lịch xuất bản của bạn.',
    icon: Calendar,
    placement: 'top',
    spotlightPadding: 12,
  },
  {
    id: 'brand-tip',
    target: '[data-coachmark="brand-tip"]',
    title: '💡 Mẹo quan trọng!',
    description: 'Tạo Brand Template trước để AI hiểu rõ thương hiệu và tạo content chất lượng, nhất quán hơn.',
    icon: Bookmark,
    placement: 'top',
    spotlightPadding: 12,
    action: {
      label: 'Tạo Brand ngay',
      href: '/brands',
    },
  },
  {
    id: 'connections',
    target: '[data-coachmark="connections-action"]',
    title: '🔗 Kết nối kênh mạng xã hội',
    description: 'Liên kết Facebook, Instagram, TikTok... để đăng bài trực tiếp từ Flowa. Kết nối càng sớm, trải nghiệm càng mượt!',
    icon: Globe,
    placement: 'right',
    spotlightPadding: 8,
    action: {
      label: 'Kết nối ngay',
      href: '/connections',
    },
  },
  {
    id: 'first-content',
    target: '[data-coachmark="multichannel-action"]',
    title: 'Thử tạo content đầu tiên!',
    description: 'Bắt đầu với Multichannel - tạo content cho nhiều kênh cùng lúc chỉ với 1 click!',
    icon: Layers,
    placement: 'right',
    spotlightPadding: 8,
    action: {
      label: 'Bắt đầu ngay',
      href: '/multichannel',
    },
  },
];

export const COACHMARK_STORAGE_KEY = 'flowa-coachmark-dashboard-completed';
export const COACHMARK_PROGRESS_KEY = 'flowa-coachmark-dashboard-progress';
