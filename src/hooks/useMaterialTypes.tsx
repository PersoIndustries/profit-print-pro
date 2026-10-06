import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface MaterialType {
  id: string;
  name: string;
  category: string;
}

const SUGGESTED = ["PLA Basic", "PLA Matte", "PLA Silk", "PETG", "ABS", "TPU"];

// Typed loosely: material_types may not yet be in generated types.
const table = () => (supabase as any).from("material_types");

export const useMaterialTypes = () => {
  const { user } = useAuth();
  const [types, setTypes] = useState<MaterialType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTypes = useCallback(async () => {
    if (!user) return;
    const { data, error } = await table()
      .select("id, name, category")
      .eq("user_id", user.id)
      .order("name");
    if (error) {
      console.error("Error loading material types:", error);
      setLoading(false);
      return;
    }
    let rows: MaterialType[] = data || [];
    // Seed suggested types the first time
    if (rows.length === 0 && !localStorage.getItem(`mt-seeded-${user.id}`)) {
      localStorage.setItem(`mt-seeded-${user.id}`, "1");
      const { data: seeded } = await table()
        .insert(SUGGESTED.map((name) => ({ user_id: user.id, name, category: "filament" })))
        .select("id, name, category");
      rows = (seeded || []).sort((a: MaterialType, b: MaterialType) => a.name.localeCompare(b.name));
    }
    setTypes(rows);
    setLoading(false);
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
    setTypes((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data as MaterialType;
  };

  const renameType = async (id: string, name: string) => {
    const { error } = await table().update({ name: name.trim() }).eq("id", id);
    if (error) throw error;
    setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, name: name.trim() } : t)));
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
    setTypes((prev) => prev.filter((t) => t.id !== id));
    return true;
  };

  return { types, loading, createType, renameType, deleteType, refetch: fetchTypes };
};
