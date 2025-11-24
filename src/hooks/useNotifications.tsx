import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: string;
  read: boolean;
  action_url?: string;
  created_at: string;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  subscription_notifications: boolean;
  order_notifications: boolean;
  project_notifications: boolean;
  material_notifications: boolean;
  system_notifications: boolean;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications((data || []) as Notification[]);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch preferences
  const fetchPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences({
          email_enabled: data.email_enabled,
          push_enabled: data.push_enabled,
          in_app_enabled: data.in_app_enabled,
          subscription_notifications: data.subscription_notifications,
          order_notifications: data.order_notifications,
          project_notifications: data.project_notifications,
          material_notifications: data.material_notifications,
          system_notifications: data.system_notifications,
        });
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  // Update preferences
  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...newPreferences,
        });

      if (error) throw error;

      setPreferences(prev => ({ ...prev, ...newPreferences } as NotificationPreferences));
      toast.success('Notification preferences updated');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    fetchNotifications();
    fetchPreferences();

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast for new notification if in-app enabled
          if (preferences?.in_app_enabled !== false) {
            toast(newNotification.title, {
              description: newNotification.message,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, preferences?.in_app_enabled]);

  return {
    notifications,
    unreadCount,
    loading,
    preferences,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    fetchNotifications,
  };
};
