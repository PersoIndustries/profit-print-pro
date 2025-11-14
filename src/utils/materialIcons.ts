import { Disc, Droplet, KeyRound, Wrench, Paintbrush, FileBox, Package, LucideIcon } from 'lucide-react';

export const MATERIAL_TYPES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'filament', label: 'Filamento', icon: Disc },
  { value: 'resin', label: 'Resina', icon: Droplet },
  { value: 'glue', label: 'Pegamento', icon: Droplet },
  { value: 'keyring', label: 'Llavero', icon: KeyRound },
  { value: 'screw', label: 'Tornillo', icon: Wrench },
  { value: 'paint', label: 'Pintura', icon: Paintbrush },
  { value: 'sandpaper', label: 'Lija', icon: FileBox },
  { value: 'other', label: 'Otro', icon: Package },
];

export const getMaterialIcon = (type: string | null): LucideIcon => {
  const materialType = MATERIAL_TYPES.find(t => t.value === type);
  return materialType?.icon || Package;
};
