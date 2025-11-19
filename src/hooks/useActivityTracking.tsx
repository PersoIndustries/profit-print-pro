/**
 * Hook para trackear actividad del usuario de forma eficiente
 * Usa la tabla user_activity_summary para minimizar el impacto en costos
 */

import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useActivityTracking = () => {
  const { user } = useAuth();
  const sessionStartTime = useRef<Date | null>(null);
  const lastActivityTime = useRef<Date | null>(null);
  const activityCounts = useRef({
    materials: 0,
    projects: 0,
    orders: 0,
    prints: 0,
  });

  useEffect(() => {
    if (!user) return;

    // Track session start
    sessionStartTime.current = new Date();
    lastActivityTime.current = new Date();

    // Track page visibility to calculate session time
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page hidden, save current session
        saveSession();
      } else {
        // Page visible again, start new session
        sessionStartTime.current = new Date();
        lastActivityTime.current = new Date();
      }
    };

    // Track user activity (clicks, keyboard, etc.)
    const handleActivity = () => {
      lastActivityTime.current = new Date();
    };

    // Track when user creates items
    const trackMaterialCreated = () => {
      activityCounts.current.materials++;
      lastActivityTime.current = new Date();
    };

    const trackProjectCreated = () => {
      activityCounts.current.projects++;
      lastActivityTime.current = new Date();
    };

    const trackOrderCreated = () => {
      activityCounts.current.orders++;
      lastActivityTime.current = new Date();
    };

    const trackPrintCreated = () => {
      activityCounts.current.prints++;
      lastActivityTime.current = new Date();
    };

    // Save session periodically (every 5 minutes) and on page unload
    const saveSession = async () => {
      if (!sessionStartTime.current || !lastActivityTime.current) return;

      const sessionMinutes = Math.round(
        (lastActivityTime.current.getTime() - sessionStartTime.current.getTime()) / (1000 * 60)
      );

      if (sessionMinutes < 1) return; // Don't save sessions < 1 minute

      const today = new Date().toISOString().split('T')[0];

      try {
        await supabase.rpc('upsert_daily_activity', {
          p_user_id: user.id,
          p_activity_date: today,
          p_session_minutes: sessionMinutes,
          p_materials_created: activityCounts.current.materials,
          p_projects_created: activityCounts.current.projects,
          p_orders_created: activityCounts.current.orders,
          p_prints_created: activityCounts.current.prints,
        });

        // Reset counters after saving
        activityCounts.current = {
          materials: 0,
          projects: 0,
          orders: 0,
          prints: 0,
        };
      } catch (error) {
        console.error('Error saving activity:', error);
      }
    };

    // Set up event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('click', handleActivity);
    document.addEventListener('keydown', handleActivity);
    document.addEventListener('mousemove', handleActivity);

    // Custom events for tracking item creation (you'll need to dispatch these from your components)
    window.addEventListener('material:created', trackMaterialCreated);
    window.addEventListener('project:created', trackProjectCreated);
    window.addEventListener('order:created', trackOrderCreated);
    window.addEventListener('print:created', trackPrintCreated);

    // Save session every 5 minutes
    const intervalId = setInterval(saveSession, 5 * 60 * 1000);

    // Save session on page unload
    window.addEventListener('beforeunload', saveSession);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', handleActivity);
      document.removeEventListener('keydown', handleActivity);
      document.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('material:created', trackMaterialCreated);
      window.removeEventListener('project:created', trackProjectCreated);
      window.removeEventListener('order:created', trackOrderCreated);
      window.removeEventListener('print:created', trackPrintCreated);
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', saveSession);
      
      // Save final session
      saveSession();
    };
  }, [user]);
};

/**
 * Helper function to dispatch activity events
 * Use this in your components when items are created
 */
export const trackActivity = (type: 'material' | 'project' | 'order' | 'print') => {
  window.dispatchEvent(new CustomEvent(`${type}:created`));
};

