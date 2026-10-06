import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MaterialType } from "@/hooks/useMaterialTypes";

const ALL = "__all__";

interface PickerMaterial {
  id: string;
  name: string;
  material_type_id?: string | null;
}

interface Props {
  materials: PickerMaterial[];
  types: MaterialType[];
  value: string | undefined;
  onChange: (materialId: string) => void;
  placeholder: string;
  emptyText: string;
}

/** Optional type filter followed by a material select filtered by that type. */
export function MaterialLinePicker({ materials, types, value, onChange, placeholder, emptyText }: Props) {
  const { t } = useTranslation();
  const initialType = materials.find((m) => m.id === value)?.material_type_id || ALL;
  const [typeId, setTypeId] = useState<string>(initialType);

  const filtered = typeId === ALL ? materials : materials.filter((m) => m.material_type_id === typeId);
  // Keep the currently selected material visible even if it doesn't match the filter
  const selected = materials.find((m) => m.id === value);
  const list = selected && !filtered.includes(selected) ? [selected, ...filtered] : filtered;

  return (
    <div className="flex gap-1">
      {types.length > 0 && (
        <Select value={typeId} onValueChange={setTypeId}>
          <SelectTrigger className="h-8 w-[120px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("materialTypes.allTypes")}</SelectItem>
            {types.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className="h-8 flex-1 min-w-0">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {list.length === 0 ? (
            <div className="p-2 text-xs text-muted-foreground text-center">{emptyText}</div>
          ) : (
            list.map((material) => (
              <SelectItem key={material.id} value={material.id}>
                {material.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
