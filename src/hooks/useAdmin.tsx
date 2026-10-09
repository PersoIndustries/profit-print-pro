import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cachedFetch } from "@/lib/queryCache";
import { useAuth } from "./useAuth";

export const useAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    cachedFetch(`admin:${user.id}`, 5 * 60_000, async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    })
      .then((v) => !cancelled && setIsAdmin(v))
      .catch((error) => {
        console.error("[useAdmin] Error checking admin status:", error);
        if (!cancelled) setIsAdmin(false);
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { isAdmin, loading };
};
