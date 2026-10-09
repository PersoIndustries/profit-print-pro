import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cachedFetch, setCached } from "@/lib/queryCache";

export interface MaterialType {
  id: string;
  name: string;
  category: string;
}

const SUGGESTED = ["PLA Basic", "PLA Matte", "PLA Silk", "PETG", "ABS", "TPU"];
const TTL = 5 * 60_000;
const byName = (a: MaterialType, b: MaterialType) => a.name.localeCompare(b.name);

// Typed loosely: material_types may not yet be in generated types.
const table = () => (supabase as any).from("material_types");

// Keep every mounted hook instance in sync after a mutation.
const listeners = new Set<(types: MaterialType[]) => void>();
const publish = (userId: string, types: MaterialType[]) => {
  setCached(`mt:${userId}`, types, TTL);
  listeners.forEach((l) => l(types));
};

const loadTypes = (userId: string) =>
  cachedFetch<MaterialType[]>(`mt:${userId}`, TTL, async () => {
    const { data, error } = await table().select("id, name, category").eq("user_id", userId).order("name");
    if (error) throw error;
    let rows: MaterialType[] = data || [];
    // Seed suggested types the first time
    if (rows.length === 0 && !localStorage.getItem(`mt-seeded-${userId}`)) {
      localStorage.setItem(`mt-seeded-${userId}`, "1");
      const { data: seeded } = await table()
        .insert(SUGGESTED.map((name) => ({ user_id: userId, name, category: "filament" })))
        .select("id, name, category");
      rows = (seeded || []).sort(byName);
    }
    return rows;
  });

export const useMaterialTypes = () => {
  const { user } = useAuth();
  const [types, setTypes] = useState<MaterialType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listeners.add(setTypes);
    return () => {
      listeners.delete(setTypes);
    };
  }, []);

  const fetchTypes = useCallback(async () => {
    if (!user) return;
    try {
      setTypes(await loadTypes(user.id));
    } catch (error) {
      console.error("Error loading material types:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const createType = async (name: string, category = "filament") => {
    if (!user || !name.trim()) return null;
    const { data, error } = await table()
      .insert({ user_id: user.id, name: name.trim(), category })
      .select("id, name, category")
      .single();
    if (error) throw error;
    publish(user.id, [...types, data].sort(byName));
    return data as MaterialType;
  };

  const renameType = async (id: string, name: string) => {
    const { error } = await table().update({ name: name.trim() }).eq("id", id);
    if (error) throw error;
    publish(user!.id, types.map((t) => (t.id === id ? { ...t, name: name.trim() } : t)).sort(byName));
  };

  /** Returns false if the type is still used by materials. */
  const deleteType = async (id: string) => {
    const { count } = await (supabase as any)
      .from("materials")
      .select("id", { count: "exact", head: true })
      .eq("material_type_id", id);
    if ((count ?? 0) > 0) return false;
    const { error } = await table().delete().eq("id", id);
    if (error) throw error;
    publish(user!.id, types.filter((t) => t.id !== id));
    return true;
  };

  return { types, loading, createType, renameType, deleteType, refetch: fetchTypes };
};
