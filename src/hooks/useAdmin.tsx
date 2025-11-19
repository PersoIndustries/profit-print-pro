import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Esperar a que termine de cargar la autenticación
    if (authLoading) {
      console.log('[useAdmin] Auth still loading, waiting...');
      setLoading(true);
      return;
    }

    if (!user) {
      console.log('[useAdmin] No user, setting isAdmin to false');
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const checkAdmin = async () => {
      try {
        setLoading(true);
        console.log('[useAdmin] Checking admin status for user:', user.id);
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error) {
          console.error('[useAdmin] Error checking admin status:', error);
          console.error('[useAdmin] Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          // No lanzar error, solo establecer como no admin
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        
        const isAdminUser = !!data;
        console.log('[useAdmin] Admin check result:', isAdminUser ? 'IS ADMIN' : 'NOT ADMIN');
        if (data) {
          console.log('[useAdmin] Admin role found:', data);
        }
        setIsAdmin(isAdminUser);
      } catch (error: any) {
        console.error('[useAdmin] Exception checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [user, authLoading]);

  return { isAdmin, loading };
};
