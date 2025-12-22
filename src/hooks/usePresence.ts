import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PresenceState {
  [key: string]: {
    user_id: string;
    online_at: string;
  }[];
}

export function usePresence(organizationId?: string) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const updatePresenceState = useCallback((state: PresenceState) => {
    const users = new Set<string>();
    Object.values(state).forEach(presences => {
      presences.forEach(presence => {
        if (presence.user_id) {
          users.add(presence.user_id);
        }
      });
    });
    setOnlineUsers(users);
  }, []);

  useEffect(() => {
    if (!organizationId || !user?.id) return;

    const channelName = `presence:org:${organizationId}`;
    const channel = supabase.channel(channelName);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as PresenceState;
        updatePresenceState(state);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          newPresences.forEach((p: any) => {
            if (p.user_id) next.add(p.user_id);
          });
          return next;
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          leftPresences.forEach((p: any) => {
            if (p.user_id) next.delete(p.user_id);
          });
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, user?.id, updatePresenceState]);

  const isOnline = useCallback((userId: string) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  return {
    onlineUsers,
    isOnline,
    onlineCount: onlineUsers.size,
  };
}
