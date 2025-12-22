import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContentSchedule, ScheduleFormData, PublishStatus } from '@/types/publishing';
import { Channel } from '@/types/multichannel';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export function useContentSchedules(contentId?: string) {
  const [schedules, setSchedules] = useState<ContentSchedule[]>([]);
  const [allSchedules, setAllSchedules] = useState<ContentSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();

  // Fetch schedules for a specific content
  const fetchSchedules = useCallback(async () => {
    if (!user || !contentId) {
      setSchedules([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('content_schedules')
        .select('*')
        .eq('content_id', contentId)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setSchedules((data || []) as ContentSchedule[]);
    } catch (error: unknown) {
      console.error('Error fetching schedules:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải lịch đăng bài',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, contentId]);

  // Fetch all schedules for organization (for queue view)
  const fetchAllSchedules = useCallback(async () => {
    if (!user || !currentOrganization?.id) {
      setAllSchedules([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('content_schedules')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setAllSchedules((data || []) as ContentSchedule[]);
    } catch (error: unknown) {
      console.error('Error fetching all schedules:', error);
    }
  }, [user, currentOrganization?.id]);

  // Create or update schedule
  const upsertSchedule = async (
    targetContentId: string, 
    formData: ScheduleFormData
  ): Promise<ContentSchedule | null> => {
    if (!user) return null;

    try {
      // Check if schedule exists for this content+channel
      const { data: existing } = await supabase
        .from('content_schedules')
        .select('id')
        .eq('content_id', targetContentId)
        .eq('channel', formData.channel)
        .single();

      const scheduleData = {
        content_id: targetContentId,
        channel: formData.channel,
        organization_id: currentOrganization?.id || null,
        scheduled_at: formData.scheduled_at,
        timezone: formData.timezone || 'Asia/Ho_Chi_Minh',
        notes: formData.notes || null,
        created_by: user.id,
        publish_status: 'scheduled' as PublishStatus,
      };

      let result;
      if (existing?.id) {
        // Update existing
        const { data, error } = await supabase
          .from('content_schedules')
          .update({
            ...scheduleData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        result = data;

        // Log rescheduled action
        await logPublishingAction(existing.id, targetContentId, formData.channel, 'rescheduled');
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('content_schedules')
          .insert(scheduleData)
          .select()
          .single();

        if (error) throw error;
        result = data;

        // Log scheduled action
        await logPublishingAction(result.id, targetContentId, formData.channel, 'scheduled');
      }

      toast({
        title: 'Thành công',
        description: existing?.id ? 'Đã cập nhật lịch đăng' : 'Đã lên lịch đăng bài',
      });

      await fetchSchedules();
      return result as ContentSchedule;
    } catch (error: unknown) {
      console.error('Error upserting schedule:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu lịch đăng',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Cancel schedule
  const cancelSchedule = async (scheduleId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('content_schedules')
        .update({ 
          publish_status: 'cancelled' as PublishStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', scheduleId)
        .select()
        .single();

      if (error) throw error;

      // Log cancelled action
      await logPublishingAction(
        scheduleId, 
        data.content_id, 
        data.channel as Channel, 
        'cancelled'
      );

      toast({
        title: 'Đã hủy',
        description: 'Lịch đăng bài đã được hủy',
      });

      await fetchSchedules();
      return true;
    } catch (error: unknown) {
      console.error('Error cancelling schedule:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể hủy lịch đăng',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Delete schedule
  const deleteSchedule = async (scheduleId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('content_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: 'Đã xóa',
        description: 'Lịch đăng bài đã được xóa',
      });

      await fetchSchedules();
      return true;
    } catch (error: unknown) {
      console.error('Error deleting schedule:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa lịch đăng',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Mark as published manually
  const markAsPublished = async (scheduleId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('content_schedules')
        .update({ 
          publish_status: 'published' as PublishStatus,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', scheduleId)
        .select()
        .single();

      if (error) throw error;

      // Log published action
      await logPublishingAction(
        scheduleId, 
        data.content_id, 
        data.channel as Channel, 
        'published'
      );

      toast({
        title: 'Thành công',
        description: 'Đã đánh dấu là đã đăng',
      });

      await fetchSchedules();
      return true;
    } catch (error: unknown) {
      console.error('Error marking as published:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật trạng thái',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Helper to log publishing action
  const logPublishingAction = async (
    scheduleId: string,
    logContentId: string,
    channel: Channel,
    action: string
  ) => {
    try {
      await supabase.from('content_publishing_logs').insert({
        schedule_id: scheduleId,
        content_id: logContentId,
        channel,
        organization_id: currentOrganization?.id || null,
        action,
        performed_by: user?.id || null,
        performed_at: new Date().toISOString(),
        details: {},
      });
    } catch (error) {
      console.error('Error logging publishing action:', error);
    }
  };

  // Get schedule for a specific channel
  const getScheduleForChannel = (channel: Channel): ContentSchedule | undefined => {
    return schedules.find(s => s.channel === channel && s.publish_status !== 'cancelled');
  };

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  return {
    schedules,
    allSchedules,
    isLoading,
    fetchSchedules,
    fetchAllSchedules,
    upsertSchedule,
    cancelSchedule,
    deleteSchedule,
    markAsPublished,
    getScheduleForChannel,
  };
}
