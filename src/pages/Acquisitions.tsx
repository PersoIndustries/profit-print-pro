import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTierFeatures } from "@/hooks/useTierFeatures";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader2, Plus, Trash, Check, ChevronsUpDown, Edit, Info, Disc, Droplet, KeyRound, Wrench, Paintbrush, FileBox, Package } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Material {
  id: string;
  name: string;
  type: string | null;
  color: string | null;
  display_mode: 'color' | 'icon';
}

const getMaterialIcon = (type: string | null) => {
  const icons: Record<string, React.ReactNode> = {
    'filament': <Disc className="w-4 h-4" />,
    'resin': <Droplet className="w-4 h-4" />,
    'glue': <Droplet className="w-4 h-4" />,
    'keyring': <KeyRound className="w-4 h-4" />,
    'screw': <Wrench className="w-4 h-4" />,
    'paint': <Paintbrush className="w-4 h-4" />,
    'sandpaper': <FileBox className="w-4 h-4" />,
    'other': <Package className="w-4 h-4" />
  };
  return icons[type || 'other'] || <Package className="w-4 h-4" />;
};

interface Acquisition {
  id: string;
  material_id: string;
  quantity_grams: number;
  unit_price: number;
  total_price: number;
  supplier: string | null;
  purchase_date: string;
  notes: string | null;
  materials: Material;
}

const Acquisitions = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const { hasFeature } = useTierFeatures();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [acquisitions, setAcquisitions] = useState<Acquisition[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isAcquisitionDialogOpen, setIsAcquisitionDialogOpen] = useState(false);
  const [materialComboboxOpen, setMaterialComboboxOpen] = useState(false);
  
  const [acquisitionForm, setAcquisitionForm] = useState({
    material_id: "",
    quantity_kg: "",
    unit_price: "",
    supplier: "",
    purchase_date: new Date().toISOString().split('T')[0],
    notes: ""
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      await Promise.all([
        fetchMaterials(),
        fetchAcquisitions()
      ]);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchMaterials = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("materials")
        .select("id, name, type, color, display_mode")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setMaterials((data || []).map(m => ({
        ...m,
        display_mode: (m.display_mode || 'color') as 'color' | 'icon'
      })));
    } catch (error: any) {
      toast.error(t('inventory.messages.errorLoadingMaterials'));
    }
  };

  const fetchAcquisitions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("material_acquisitions")
        .select("*, materials(*)")
        .eq("user_id", user.id)
        .order("purchase_date", { ascending: false })
        .limit(50);

      if (error) throw error;
      setAcquisitions((data || []).map(acq => ({
        ...acq,
        materials: {
          ...(Array.isArray(acq.materials) ? acq.materials[0] : acq.materials),
          display_mode: ((Array.isArray(acq.materials) ? acq.materials[0]?.display_mode : acq.materials?.display_mode) || 'color') as 'color' | 'icon'
        }
      })));
    } catch (error: any) {
      toast.error(t('inventory.messages.errorLoadingAcquisitions'));
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAcquisition, setEditingAcquisition] = useState<Acquisition | null>(null);

  const handleSaveAcquisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const quantityKg = parseFloat(acquisitionForm.quantity_kg);
      const quantityGrams = quantityKg * 1000; // Convertir kg a gramos
      const unitPrice = parseFloat(acquisitionForm.unit_price);
      const totalPrice = quantityKg * unitPrice;

      const { error: acquisitionError } = await supabase
        .from("material_acquisitions")
        .insert([
          {
            user_id: user.id,
            material_id: acquisitionForm.material_id,
            quantity_grams: quantityGrams,
            unit_price: unitPrice,
            total_price: totalPrice,
            supplier: acquisitionForm.supplier || null,
            purchase_date: acquisitionForm.purchase_date,
            notes: acquisitionForm.notes || null
          }
        ]);

      if (acquisitionError) throw acquisitionError;

      const { data: inventoryData } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("material_id", acquisitionForm.material_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (inventoryData) {
        const { error: updateError } = await supabase
          .from("inventory_items")
          .update({
            quantity_grams: inventoryData.quantity_grams + quantityGrams
          })
          .eq("id", inventoryData.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("inventory_items")
          .insert([
            {
              user_id: user.id,
              material_id: acquisitionForm.material_id,
              quantity_grams: quantityGrams
            }
          ]);

        if (insertError) throw insertError;
      }

      const { error: movementError } = await supabase
        .from("inventory_movements")
        .insert([
          {
            user_id: user.id,
            material_id: acquisitionForm.material_id,
            movement_type: "acquisition",
            quantity_grams: quantityGrams,
            notes: acquisitionForm.notes || null
          }
        ]);

      if (movementError) throw movementError;

      if (editingAcquisition) {
        // Update existing acquisition
        const oldAcquisition = acquisitions.find(a => a.id === editingAcquisition.id);
        if (oldAcquisition) {
          const quantityDiff = quantityGrams - oldAcquisition.quantity_grams;
          
          // Update inventory
          const { data: inventoryData } = await supabase
            .from("inventory_items")
            .select("*")
            .eq("material_id", acquisitionForm.material_id)
            .eq("user_id", user.id)
            .maybeSingle();

          if (inventoryData) {
            const { error: updateError } = await supabase
              .from("inventory_items")
              .update({
                quantity_grams: inventoryData.quantity_grams + quantityDiff
              })
              .eq("id", inventoryData.id);

            if (updateError) throw updateError;
          }

          // Register movement for edit
          const { error: movementError } = await supabase
            .from("inventory_movements")
            .insert([
              {
                user_id: user.id,
                material_id: acquisitionForm.material_id,
                movement_type: "adjustment",
                quantity_grams: Math.abs(quantityDiff),
                notes: `Edición de adquisición. ${quantityDiff > 0 ? 'Incremento' : 'Reducción'}: ${Math.abs(quantityDiff)}g. ${acquisitionForm.notes || ''}`
              }
            ]);

          if (movementError) throw movementError;
        }

        // Update acquisition
        const { error: updateError } = await supabase
          .from("material_acquisitions")
          .update({
            material_id: acquisitionForm.material_id,
            quantity_grams: quantityGrams,
            unit_price: unitPrice,
            total_price: totalPrice,
            supplier: acquisitionForm.supplier || null,
            purchase_date: acquisitionForm.purchase_date,
            notes: acquisitionForm.notes || null
          })
          .eq("id", editingAcquisition.id);

        if (updateError) throw updateError;
        toast.success('Adquisición actualizada');
      } else {
        toast.success(t('inventory.messages.acquisitionRegistered'));
      }
      
      setIsAcquisitionDialogOpen(false);
      setEditingAcquisition(null);
      setAcquisitionForm({
        material_id: "",
        quantity_kg: "",
        unit_price: "",
        supplier: "",
        purchase_date: new Date().toISOString().split('T')[0],
        notes: ""
      });
      fetchData();
    } catch (error: any) {
      toast.error(t('inventory.messages.errorRegisteringAcquisition'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAcquisition = (acquisition: Acquisition) => {
    setEditingAcquisition(acquisition);
    setAcquisitionForm({
      material_id: acquisition.material_id,
      quantity_kg: (acquisition.quantity_grams / 1000).toString(),
      unit_price: acquisition.unit_price.toString(),
      supplier: acquisition.supplier || "",
      purchase_date: acquisition.purchase_date.split('T')[0],
      notes: acquisition.notes || ""
    });
    setIsAcquisitionDialogOpen(true);
  };

  const handleDeleteAcquisition = async (id: string) => {
    if (!confirm(t('inventory.dialogs.confirmDeleteAcquisition'))) return;

    try {
      // Find the acquisition to delete
      const acquisitionToDelete = acquisitions.find(a => a.id === id);
      if (!acquisitionToDelete) return;

      // Delete from material_acquisitions
      const { error } = await supabase
        .from("material_acquisitions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Update inventory
      const { data: inventoryData } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("material_id", acquisitionToDelete.material_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (inventoryData) {
        const { error: updateError } = await supabase
          .from("inventory_items")
          .update({
            quantity_grams: inventoryData.quantity_grams - acquisitionToDelete.quantity_grams
          })
          .eq("id", inventoryData.id);

        if (updateError) throw updateError;
      }

      // Register movement for deletion
      const { error: movementError } = await supabase
        .from("inventory_movements")
        .insert([
          {
            user_id: user!.id,
            material_id: acquisitionToDelete.material_id,
            movement_type: "adjustment",
            quantity_grams: acquisitionToDelete.quantity_grams,
            notes: `Eliminación de adquisición. Reducción: ${acquisitionToDelete.quantity_grams}g`
          }
        ]);

      if (movementError) throw movementError;

      toast.success(t('inventory.messages.acquisitionDeleted'));
      fetchData();
    } catch (error: any) {
      toast.error(t('inventory.messages.errorDeletingAcquisition'));
    }
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!hasFeature('acquisition_history')) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-primary">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="max-w-md mx-auto space-y-6">
              <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <Plus className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Adquisiciones - Premium</h3>
                <p className="text-muted-foreground mb-4">
                  Accede al historial completo de adquisiciones de materiales. Esta función está disponible en planes Pro y Business.
                </p>
              </div>
              <Button onClick={() => navigate('/pricing')} size="lg">
                Ver Planes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('inventory.tables.recentAcquisitions')}</CardTitle>
            <Button onClick={() => setIsAcquisitionDialogOpen(true)} className="shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              {t('inventory.dialogs.newAcquisition')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('inventory.tables.date')}</TableHead>
                <TableHead>{t('inventory.material')}</TableHead>
                <TableHead>{t('inventory.tables.quantity')}</TableHead>
                <TableHead>{t('inventory.tables.pricePerUnit')}</TableHead>
                <TableHead>{t('inventory.tables.total')}</TableHead>
                <TableHead>{t('inventory.tables.supplier')}</TableHead>
                <TableHead>{t('inventory.formLabels.notes')}</TableHead>
                <TableHead>{t('inventory.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {acquisitions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hay adquisiciones registradas
                  </TableCell>
                </TableRow>
              ) : (
                acquisitions.map((acquisition) => {
                  const materialIcon = acquisition.materials.display_mode === 'icon' && acquisition.materials.type
                    ? getMaterialIcon(acquisition.materials.type)
                    : null;
                  
                  return (
                    <TableRow key={acquisition.id}>
                      <TableCell>
                        {format(new Date(acquisition.purchase_date), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {acquisition.materials.display_mode === 'color' ? (
                            <div
                              className="w-4 h-4 rounded-full border flex-shrink-0"
                              style={{ backgroundColor: acquisition.materials.color || '#gray' }}
                            />
                          ) : materialIcon && (
                            <div className="w-4 h-4 flex-shrink-0">
                              {materialIcon}
                            </div>
                          )}
                          <span>{acquisition.materials.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(acquisition.quantity_grams / 1000).toFixed(2)} kg
                      </TableCell>
                      <TableCell>{acquisition.unit_price.toFixed(2)}€</TableCell>
                      <TableCell>{acquisition.total_price.toFixed(2)}€</TableCell>
                      <TableCell>{acquisition.supplier || "-"}</TableCell>
                      <TableCell>
                        {acquisition.notes ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>{acquisition.notes}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditAcquisition(acquisition)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDeleteAcquisition(acquisition.id)}
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para añadir adquisición */}
      <Dialog open={isAcquisitionDialogOpen} onOpenChange={(open) => {
        setIsAcquisitionDialogOpen(open);
        if (!open) {
          setEditingAcquisition(null);
          setAcquisitionForm({
            material_id: "",
            quantity_kg: "",
            unit_price: "",
            supplier: "",
            purchase_date: new Date().toISOString().split('T')[0],
            notes: ""
          });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAcquisition ? 'Editar Adquisición' : t('inventory.tabs.acquisitions')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAcquisition} className="space-y-4">
            <div>
              <Label htmlFor="acq_material">{t('inventory.material')} *</Label>
              <Popover open={materialComboboxOpen} onOpenChange={setMaterialComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={materialComboboxOpen}
                    className="w-full justify-between"
                  >
                    {acquisitionForm.material_id
                      ? materials.find((mat) => mat.id === acquisitionForm.material_id)?.name
                      : "Seleccionar material"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder={t('inventory.searchMaterial')} />
                    <CommandList>
                      <CommandEmpty>No se encontró material.</CommandEmpty>
                      <CommandGroup>
                        {materials.map((mat) => {
                          const materialIcon = mat.display_mode === 'icon' && mat.type
                            ? getMaterialIcon(mat.type)
                            : null;
                          
                          return (
                            <CommandItem
                              key={mat.id}
                              value={mat.name}
                              onSelect={() => {
                                setAcquisitionForm({ ...acquisitionForm, material_id: mat.id });
                                setMaterialComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  acquisitionForm.material_id === mat.id ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {mat.display_mode === 'color' ? (
                                <div
                                  className="w-4 h-4 rounded-full border mr-2 flex-shrink-0"
                                  style={{ backgroundColor: mat.color || '#gray' }}
                                />
                              ) : materialIcon && (
                                <div className="mr-2 flex-shrink-0">
                                  {materialIcon}
                                </div>
                              )}
                              {mat.name}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="acq_quantity">{t('inventory.formLabels.quantityWithUnits')} *</Label>
              <Input
                id="acq_quantity"
                type="number"
                step="0.01"
                min="0"
                value={acquisitionForm.quantity_kg}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, quantity_kg: e.target.value })}
                placeholder="Ej: 1.5 kg, 2 L, 10 unidades"
                required
              />
            </div>
            <div>
              <Label htmlFor="acq_price">{t('inventory.formLabels.unitPrice')} *</Label>
              <Input
                id="acq_price"
                type="number"
                step="0.01"
                min="0"
                value={acquisitionForm.unit_price}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, unit_price: e.target.value })}
                placeholder="Ej: 25.50"
                required
              />
            </div>
            <div>
              <Label htmlFor="acq_supplier">{t('inventory.formLabels.supplier')}</Label>
              <Input
                id="acq_supplier"
                value={acquisitionForm.supplier}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, supplier: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="acq_date">{t('inventory.formLabels.purchaseDate')} *</Label>
              <Input
                id="acq_date"
                type="date"
                value={acquisitionForm.purchase_date}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, purchase_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="acq_notes">{t('inventory.formLabels.notes')}</Label>
              <Textarea
                id="acq_notes"
                value={acquisitionForm.notes}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => {
                setIsAcquisitionDialogOpen(false);
                setEditingAcquisition(null);
              }}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingAcquisition ? 'Actualizando...' : 'Guardando...'}
                  </>
                ) : (
                  editingAcquisition ? 'Actualizar' : t('inventory.dialogs.create')
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Acquisitions;

