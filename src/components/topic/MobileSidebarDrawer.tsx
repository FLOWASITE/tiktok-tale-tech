import React from 'react';
import { Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { BrandInfoCard } from './BrandInfoCard';
import { UpcomingEventsCard } from './UpcomingEventsCard';
import { QuickAccessBank } from './QuickAccessBank';
import { AILearningStatus } from './AILearningStatus';
import { BrandTemplate } from '@/hooks/useBrandTemplates';

interface TopicHistoryItem {
  id: string;
  topic: string;
  pillar?: string;
  performanceScore?: number;
  isFavorite?: boolean;
  createdAt?: string;
}

interface AILearningStats {
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  topPatterns: string[];
  personalizationLevel: number;
}

interface MobileSidebarDrawerProps {
  brand?: BrandTemplate;
  onChangeBrand: () => void;
  onEditBrand?: () => void;
  onGetEventSuggestions: (event: { name: string }) => void;
  onScheduleTopic: (topic: string, date: Date) => void;
  favorites: TopicHistoryItem[];
  recentTopics: TopicHistoryItem[];
  topPerformers: TopicHistoryItem[];
  onSelectTopic: (topic: string) => void;
  onViewAllTopics: () => void;
  aiLearningStats: AILearningStats;
  isEnhancing: boolean;
}

export function MobileSidebarDrawer({
  brand,
  onChangeBrand,
  onEditBrand,
  onGetEventSuggestions,
  onScheduleTopic,
  favorites,
  recentTopics,
  topPerformers,
  onSelectTopic,
  onViewAllTopics,
  aiLearningStats,
  isEnhancing,
}: MobileSidebarDrawerProps) {
  const { t } = useTranslation();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="sm:hidden fixed top-[80px] right-3 z-40 h-10 w-10 rounded-full shadow-lg bg-background/95 backdrop-blur border-2"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className="w-[85vw] max-w-md p-0 overflow-hidden"
      >
        <SheetHeader className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">{t('app.mobileSidebar.moreInfo')}</SheetTitle>
          </div>
        </SheetHeader>
        
        <div className="h-[calc(100vh-60px)] overflow-y-auto p-4 space-y-4">
          {/* Brand Info Card */}
          <BrandInfoCard
            brand={brand}
            onChangeBrand={onChangeBrand}
            onEditBrand={onEditBrand}
          />

          {/* Upcoming Events */}
          <UpcomingEventsCard
            onGetSuggestions={onGetEventSuggestions}
            onScheduleTopic={onScheduleTopic}
          />

          {/* Quick Access Bank */}
          <QuickAccessBank
            favorites={favorites}
            recentTopics={recentTopics}
            topPerformers={topPerformers}
            onSelectTopic={onSelectTopic}
            onViewAll={onViewAllTopics}
          />

          {/* AI Learning Status */}
          <AILearningStatus
            totalFeedback={aiLearningStats.totalFeedback}
            positiveFeedback={aiLearningStats.positiveFeedback}
            negativeFeedback={aiLearningStats.negativeFeedback}
            topPatterns={aiLearningStats.topPatterns}
            personalizationLevel={aiLearningStats.personalizationLevel}
            isLearning={isEnhancing}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
