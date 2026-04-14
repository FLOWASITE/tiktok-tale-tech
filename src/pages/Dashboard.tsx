import { useMemo, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { DashboardStats } from '@/components/DashboardStats';
import { MyAssignments } from '@/components/MyAssignments';
import { TodaySchedules } from '@/components/TodaySchedules';
import { PendingReviews } from '@/components/PendingReviews';
import { TopicQuickAccess } from '@/components/TopicQuickAccess';
import { PerformanceReminderWidget } from '@/components/PerformanceReminderWidget';
import { useContentSchedules } from '@/hooks/useContentSchedules';
import { useMultiChannelContents } from '@/hooks/useMultiChannelContents';
import { 
  DashboardHeader, 
  QuickActionGrid, 
  AIInsightsCard, 
  ActivityTimeline,
  TodayFocus,
  ActiveCampaignsWidget,
  CampaignMilestoneReminder,
  UsageQuotaWidget,
  NewUserWelcome
} from '@/components/dashboard';
import { useScripts } from '@/hooks/useScripts';
import { useCarousels } from '@/hooks/useCarousels';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { useCampaignIntegration } from '@/hooks/useCampaignIntegration';
import { 
  CoachmarkProvider, 
  CoachmarkOverlay, 
  WelcomeModal,
  CompletionModal,
  useCoachmark,
  DASHBOARD_STEPS, 
  COACHMARK_STORAGE_KEY 
} from '@/components/onboarding';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Separator } from '@/components/ui/separator';

// Section divider component
function DashboardSection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 whitespace-nowrap">
          {title}
        </h2>
        <Separator className="flex-1" />
      </div>
      {children}
    </div>
  );
}

// Inner component that uses the coachmark context
function DashboardContent() {
  const { currentOrganization } = useOrganizationContext();
  const orgId = currentOrganization?.id;
  const { t } = useTranslation();
  const { scripts, loading: scriptsLoading } = useScripts();
  const { carousels, loading: carouselsLoading } = useCarousels();
  const { contents: multiChannelContents, loading: multiChannelLoading } = useMultiChannelContents();
  const { templates: brands, loading: brandsLoading } = useBrandTemplates();
  const { allSchedules, fetchAllSchedules } = useContentSchedules();
  const { 
    activeCampaigns, 
    upcomingMilestones, 
    overdueMilestones,
    todayMilestones,
    isLoading: campaignsLoading 
  } = useCampaignIntegration();
  const { 
    start, 
    startWithWelcome, 
    isActive, 
    showWelcomeModal, 
    showCompletionModal, 
    skipWelcome,
    closeCompletionModal 
  } = useCoachmark();

  // Fetch AI image count
  const { data: aiImageCount = 0 } = useQuery({
    queryKey: ['ai_image_count', orgId],
    queryFn: async () => {
      const { count } = await supabase
        .from('channel_image_history')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId!);
      return count ?? 0;
    },
    enabled: !!orgId,
  });

  // Fetch all schedules for counts
  useEffect(() => {
    fetchAllSchedules();
  }, [fetchAllSchedules]);

  // Compute today's schedule count
  const todayScheduleCount = useMemo(() => {
    return allSchedules.filter(s => {
      const d = new Date(s.scheduled_at);
      const now = new Date();
      return d.toDateString() === now.toDateString() && s.publish_status !== 'cancelled';
    }).length;
  }, [allSchedules]);

  // Compute pending review count
  const pendingReviewCount = useMemo(() => {
    return multiChannelContents.filter(c => c.status === 'review').length;
  }, [multiChannelContents]);

  const loading = scriptsLoading || carouselsLoading || multiChannelLoading || brandsLoading;
  const isNewUser = !loading && brands.length === 0;

  const stats = useMemo(() => ({
    scripts: scripts.length,
    carousels: carousels.length,
    multiChannel: multiChannelContents.length,
    brands: brands.length,
    aiImages: aiImageCount,
    aiVideos: 0,
  }), [scripts, carousels, multiChannelContents, brands, aiImageCount]);

  // Activity summary for returning users
  const activitySummary = useMemo(() => {
    if (loading || isNewUser) return undefined;
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentContents = multiChannelContents.filter(c => new Date(c.created_at) > yesterday).length;
    const recentScripts = scripts.filter(s => new Date(s.created_at) > yesterday).length;
    const total = recentContents + recentScripts;
    
    if (total === 0) return undefined;
    return t('app.dashboardHeader.activitySummary', { count: total, defaultValue: `+${total} nội dung mới trong 24h qua` });
  }, [loading, isNewUser, multiChannelContents, scripts, t]);

  // Fetch published channels mapping
  const { data: publishedChannelsMap } = useQuery({
    queryKey: ['published_channels_map', orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('content_publishing_logs')
        .select('content_id, channel')
        .eq('action', 'published')
        .eq('organization_id', orgId!);
      
      const map: Record<string, string[]> = {};
      data?.forEach(log => {
        if (log.content_id) {
          if (!map[log.content_id]) map[log.content_id] = [];
          if (!map[log.content_id].includes(log.channel)) {
            map[log.content_id].push(log.channel);
          }
        }
      });
      return map;
    },
    enabled: !!orgId,
  });

  // Combine all activities and sort by date
  const recentActivities = useMemo(() => {
    const activities: Array<{
      id: string;
      type: 'script' | 'carousel' | 'multichannel';
      title: string;
      createdAt: string;
      metadata?: {
        topic?: string;
        platform?: string;
        channels?: string[];
        publishedChannels?: string[];
      };
    }> = [];

    scripts.forEach((script) => {
      activities.push({
        id: script.id,
        type: 'script',
        title: script.title,
        createdAt: script.created_at,
        metadata: { topic: script.topic, publishedChannels: publishedChannelsMap?.[script.id] },
      });
    });

    carousels.forEach((carousel) => {
      activities.push({
        id: carousel.id,
        type: 'carousel',
        title: carousel.title,
        createdAt: carousel.created_at,
        metadata: { 
          topic: carousel.topic,
          platform: carousel.platform,
          publishedChannels: publishedChannelsMap?.[carousel.id],
        },
      });
    });

    multiChannelContents.forEach((content) => {
      activities.push({
        id: content.id,
        type: 'multichannel',
        title: content.title,
        createdAt: content.created_at,
        metadata: { 
          topic: content.topic,
          channels: content.selected_channels,
          publishedChannels: publishedChannelsMap?.[content.id],
        },
      });
    });

    return activities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [scripts, carousels, multiChannelContents, publishedChannelsMap]);

  // Auto-start onboarding for new users with welcome modal
  useEffect(() => {
    if (loading) return;
    
    const completed = localStorage.getItem(COACHMARK_STORAGE_KEY);
    const isNewUser = !completed && stats.scripts === 0 && stats.carousels === 0 && stats.multiChannel === 0;
    
    if (isNewUser && !isActive && !showWelcomeModal && !showCompletionModal) {
      const timer = setTimeout(() => startWithWelcome(), 800);
      return () => clearTimeout(timer);
    }
  }, [loading, stats, startWithWelcome, isActive, showWelcomeModal, showCompletionModal]);

  const hasMilestones = upcomingMilestones.length > 0 || overdueMilestones.length > 0;

  return (
    <div className="relative min-h-screen">
      <WelcomeModal isOpen={showWelcomeModal} onStart={start} onSkip={skipWelcome} />
      <CompletionModal isOpen={showCompletionModal} onClose={closeCompletionModal} />
      <CoachmarkOverlay />

      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.03, 0.06, 0.03] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary rounded-full blur-3xl" 
        />
        <motion.div 
          animate={{ scale: [1, 1.15, 1], opacity: [0.03, 0.05, 0.03] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-secondary rounded-full blur-3xl" 
        />
      </div>

      <div className="px-3 xs:px-4 sm:container py-4 sm:py-6 lg:py-8 relative space-y-5 sm:space-y-6 lg:space-y-8">
        {/* Hero Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          data-coachmark="header"
        >
          <DashboardHeader 
            pendingCount={pendingReviewCount}
            todayScheduleCount={todayScheduleCount}
            onStartOnboarding={start}
            activitySummary={activitySummary}
          />
        </motion.div>

        {isNewUser ? (
          <NewUserWelcome />
        ) : (
          <>
            {/* Section 1: Tổng quan nhanh */}
            <DashboardSection title={t('app.dashboard.sectionOverview', { defaultValue: 'Tổng quan nhanh' })}>
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                data-coachmark="stats"
              >
                <DashboardStats stats={stats} loading={loading} />
              </motion.div>
            </DashboardSection>

            {/* Section 2: Hành động */}
            <DashboardSection title={t('app.dashboard.sectionActions', { defaultValue: 'Hành động' })}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="lg:col-span-7"
                  data-coachmark="quick-actions"
                >
                  <QuickActionGrid />
                </motion.div>

                <div className="lg:col-span-5 flex flex-col gap-4 sm:gap-5 lg:gap-6">
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    data-coachmark="brand-tip"
                  >
                    <AIInsightsCard />
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <TodayFocus scheduledCount={todayScheduleCount} pendingReviewCount={pendingReviewCount} todayMilestones={todayMilestones} />
                  </motion.div>
                </div>
              </div>
            </DashboardSection>

            {/* Section 3: Lịch & Chiến dịch */}
            <DashboardSection title={t('app.dashboard.sectionSchedule', { defaultValue: 'Lịch & Chiến dịch' })}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="lg:col-span-4"
                  data-coachmark="schedules"
                >
                  <TodaySchedules />
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.33 }}
                  className="lg:col-span-4"
                  data-coachmark="topics"
                >
                  <TopicQuickAccess />
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.36 }}
                  className="lg:col-span-4"
                >
                  <UsageQuotaWidget />
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.38 }}
                  className="lg:col-span-6"
                >
                  <ActiveCampaignsWidget campaigns={activeCampaigns} isLoading={campaignsLoading} />
                </motion.div>

                {hasMilestones && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="lg:col-span-6"
                  >
                    <CampaignMilestoneReminder 
                      milestones={upcomingMilestones} 
                      overdueMilestones={overdueMilestones}
                      isLoading={campaignsLoading} 
                    />
                  </motion.div>
                )}
              </div>
            </DashboardSection>

            {/* Section 4: Hoạt động */}
            <DashboardSection title={t('app.dashboard.sectionActivity', { defaultValue: 'Hoạt động' })}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.42 }}
                  className="lg:col-span-4"
                >
                  <PerformanceReminderWidget />
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.44 }}
                  className="lg:col-span-4"
                >
                  <MyAssignments />
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.46 }}
                  className="lg:col-span-4"
                >
                  <ActivityTimeline activities={recentActivities} loading={loading} />
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.48 }}
                  className="lg:col-span-12"
                >
                  <PendingReviews />
                </motion.div>
              </div>
            </DashboardSection>
          </>
        )}
      </div>
    </div>
  );
}

// Wrapper component with CoachmarkProvider
const Dashboard = () => {
  return (
    <CoachmarkProvider steps={DASHBOARD_STEPS}>
      <DashboardContent />
    </CoachmarkProvider>
  );
};

export default Dashboard;
