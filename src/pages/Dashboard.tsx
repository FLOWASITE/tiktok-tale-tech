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
  UsageQuotaWidget
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

// Inner component that uses the coachmark context
function DashboardContent() {
  const { currentOrganization } = useOrganizationContext();
  const orgId = currentOrganization?.id;
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

  const stats = useMemo(() => ({
    scripts: scripts.length,
    carousels: carousels.length,
    multiChannel: multiChannelContents.length,
    brands: brands.length,
    aiImages: aiImageCount,
    aiVideos: 0,
  }), [scripts, carousels, multiChannelContents, brands, aiImageCount]);

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

    // Sort by date descending and take top 10
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
      // Delay to let UI render
      const timer = setTimeout(() => startWithWelcome(), 800);
      return () => clearTimeout(timer);
    }
  }, [loading, stats, startWithWelcome, isActive, showWelcomeModal, showCompletionModal]);

  return (
    <div className="relative min-h-screen">
      {/* Welcome Modal */}
      <WelcomeModal 
        isOpen={showWelcomeModal} 
        onStart={start} 
        onSkip={skipWelcome} 
      />

      {/* Completion Modal */}
      <CompletionModal 
        isOpen={showCompletionModal} 
        onClose={closeCompletionModal} 
      />

      {/* Coachmark Overlay */}
      <CoachmarkOverlay />

      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.03, 0.06, 0.03],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary rounded-full blur-3xl" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.15, 1],
            opacity: [0.03, 0.05, 0.03],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-secondary rounded-full blur-3xl" 
        />
      </div>

      <div className="px-3 xs:px-4 sm:container py-4 sm:py-6 lg:py-8 relative space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Hero Header */}
        <div data-coachmark="header">
          <DashboardHeader 
            pendingCount={pendingReviewCount}
            todayScheduleCount={todayScheduleCount}
            onStartOnboarding={start}
          />
        </div>

        {/* Stats */}
        <div data-coachmark="stats">
          <DashboardStats stats={stats} loading={loading} />
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          {/* Large card - Quick Actions (spans 5 cols on lg) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-5"
            data-coachmark="quick-actions"
          >
            <QuickActionGrid />
          </motion.div>

          {/* Medium card - Topics (spans 4 cols on lg) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-4"
            data-coachmark="topics"
          >
            <TopicQuickAccess />
          </motion.div>

          {/* Small card - Today Focus (spans 3 cols on lg) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-3"
          >
            <TodayFocus scheduledCount={todayScheduleCount} pendingReviewCount={pendingReviewCount} todayMilestones={todayMilestones} />
          </motion.div>

          {/* AI Insights (spans 4 cols on lg) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-4"
            data-coachmark="brand-tip"
          >
            <AIInsightsCard />
          </motion.div>

          {/* Today Schedules (spans 4 cols on lg) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-4"
            data-coachmark="schedules"
          >
            <TodaySchedules />
          </motion.div>

          {/* Usage Quota Widget (spans 4 cols on lg) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="lg:col-span-4"
          >
            <UsageQuotaWidget />
          </motion.div>

          {/* Performance Reminder (spans 4 cols on lg) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="lg:col-span-4"
          >
            <PerformanceReminderWidget />
          </motion.div>

          {/* Active Campaigns Widget (spans 6 cols on lg) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="lg:col-span-6"
          >
            <ActiveCampaignsWidget campaigns={activeCampaigns} isLoading={campaignsLoading} />
          </motion.div>

          {/* Campaign Milestone Reminder (spans 6 cols on lg) */}
          {(upcomingMilestones.length > 0 || overdueMilestones.length > 0) && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.78 }}
              className="lg:col-span-6"
            >
              <CampaignMilestoneReminder 
                milestones={upcomingMilestones} 
                overdueMilestones={overdueMilestones}
                isLoading={campaignsLoading} 
              />
            </motion.div>
          )}

          {/* My Assignments (spans 6 cols on lg) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="lg:col-span-6"
          >
            <MyAssignments />
          </motion.div>

          {/* Activity Timeline (spans 6 cols on lg) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="lg:col-span-6"
          >
            <ActivityTimeline activities={recentActivities} loading={loading} />
          </motion.div>

          {/* Pending Reviews - Full width */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="lg:col-span-12"
          >
            <PendingReviews />
          </motion.div>
        </div>
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
