type Row = { project_id: string; material_id: string; weight_grams: number; material_cost: number };

/** Merges rows sharing the same material (DB has unique(project_id, material_id)). */
export function mergeProjectMaterials(rows: (Row | null | undefined | false)[]): Row[] {
  const map = new Map<string, Row>();
  for (const r of rows) {
    if (!r) continue;
    const key = `${r.project_id}:${r.material_id}`;
    const prev = map.get(key);
    if (prev) {
      prev.weight_grams += r.weight_grams;
      prev.material_cost += r.material_cost;
    } else {
      map.set(key, { ...r });
    }
  }
  return Array.from(map.values());
}
