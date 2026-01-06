import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Zap, ChevronDown, ShoppingCart, GraduationCap, Calendar, Megaphone, Users, Gift, Rocket } from 'lucide-react';
import { type AdCopyFormData, type AdPlatform, type AdObjective, type AdFunnelStage } from '@/types/adCopy';

interface QuickTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  preset: {
    platform?: AdPlatform;
    objective?: AdObjective;
    funnelStage?: AdFunnelStage;
    topicHint?: string;
  };
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    id: 'ecommerce-product',
    name: 'Ra mắt sản phẩm E-commerce',
    description: 'Quảng cáo sản phẩm mới, tập trung vào chuyển đổi',
    icon: <ShoppingCart className="h-4 w-4" />,
    category: 'E-commerce',
    preset: {
      platform: 'facebook_feed',
      objective: 'conversions',
      funnelStage: 'conversion',
      topicHint: 'Mô tả sản phẩm, giá, ưu đãi đặc biệt...',
    },
  },
  {
    id: 'ecommerce-sale',
    name: 'Flash Sale / Giảm giá',
    description: 'Tạo urgency với ưu đãi có thời hạn',
    icon: <Gift className="h-4 w-4" />,
    category: 'E-commerce',
    preset: {
      platform: 'instagram_story',
      objective: 'conversions',
      funnelStage: 'conversion',
      topicHint: 'Giảm X% chỉ trong 24h, mua 1 tặng 1...',
    },
  },
  {
    id: 'course-launch',
    name: 'Khóa học / Webinar',
    description: 'Thu lead đăng ký khóa học online',
    icon: <GraduationCap className="h-4 w-4" />,
    category: 'Education',
    preset: {
      platform: 'facebook_feed',
      objective: 'leads',
      funnelStage: 'consideration',
      topicHint: 'Tên khóa học, lợi ích học viên nhận được...',
    },
  },
  {
    id: 'event-registration',
    name: 'Sự kiện / Workshop',
    description: 'Tăng đăng ký tham gia sự kiện',
    icon: <Calendar className="h-4 w-4" />,
    category: 'Events',
    preset: {
      platform: 'linkedin',
      objective: 'leads',
      funnelStage: 'consideration',
      topicHint: 'Tên sự kiện, ngày giờ, diễn giả, lợi ích...',
    },
  },
  {
    id: 'brand-awareness',
    name: 'Nhận diện thương hiệu',
    description: 'Tiếp cận đối tượng mới, tăng awareness',
    icon: <Megaphone className="h-4 w-4" />,
    category: 'Branding',
    preset: {
      platform: 'instagram_reels',
      objective: 'awareness',
      funnelStage: 'awareness',
      topicHint: 'Câu chuyện thương hiệu, giá trị cốt lõi...',
    },
  },
  {
    id: 'retargeting',
    name: 'Retargeting / Remarketing',
    description: 'Nhắc nhở khách đã quan tâm',
    icon: <Users className="h-4 w-4" />,
    category: 'Retargeting',
    preset: {
      platform: 'facebook_feed',
      objective: 'conversions',
      funnelStage: 'conversion',
      topicHint: 'Ưu đãi đặc biệt cho khách quay lại...',
    },
  },
  {
    id: 'app-install',
    name: 'Cài đặt App',
    description: 'Tăng lượt download ứng dụng',
    icon: <Rocket className="h-4 w-4" />,
    category: 'Apps',
    preset: {
      platform: 'tiktok',
      objective: 'traffic',
      funnelStage: 'consideration',
      topicHint: 'Tính năng app, lợi ích khi sử dụng...',
    },
  },
];

interface TemplateQuickStartProps {
  onSelectTemplate: (template: QuickTemplate) => void;
}

export function TemplateQuickStart({ onSelectTemplate }: TemplateQuickStartProps) {
  const categories = [...new Set(QUICK_TEMPLATES.map(t => t.category))];
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          className="gap-2 border-dashed border-primary/50 text-primary hover:bg-primary/5 hover:border-primary"
        >
          <Zap className="h-4 w-4" />
          Template nhanh
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {categories.map((category, catIdx) => (
          <React.Fragment key={category}>
            {catIdx > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs text-muted-foreground">{category}</DropdownMenuLabel>
            {QUICK_TEMPLATES.filter(t => t.category === category).map(template => (
              <DropdownMenuItem 
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className="flex items-start gap-3 py-2.5 cursor-pointer"
              >
                <div className="p-1.5 rounded-md bg-primary/10 text-primary mt-0.5">
                  {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{template.description}</div>
                </div>
              </DropdownMenuItem>
            ))}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { QUICK_TEMPLATES };
export type { QuickTemplate };
