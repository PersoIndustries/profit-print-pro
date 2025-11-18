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
import { Loader2, Plus, Trash } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Material {
  id: string;
  name: string;
}

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
  
  const [acquisitionForm, setAcquisitionForm] = useState({
    material_id: "",
    quantity_grams: "",
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
        .select("id, name")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setMaterials(data || []);
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
      setAcquisitions(data || []);
    } catch (error: any) {
      toast.error(t('inventory.messages.errorLoadingAcquisitions'));
    }
  };

  const handleSaveAcquisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const quantityGrams = parseFloat(acquisitionForm.quantity_grams);
      const unitPrice = parseFloat(acquisitionForm.unit_price);
      const totalPrice = (quantityGrams / 1000) * unitPrice;

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

      toast.success(t('inventory.messages.acquisitionRegistered'));
      setIsAcquisitionDialogOpen(false);
      setAcquisitionForm({
        material_id: "",
        quantity_grams: "",
        unit_price: "",
        supplier: "",
        purchase_date: new Date().toISOString().split('T')[0],
        notes: ""
      });
      fetchData();
    } catch (error: any) {
      toast.error(t('inventory.messages.errorRegisteringAcquisition'));
    }
  };

  const handleDeleteAcquisition = async (id: string) => {
    if (!confirm(t('inventory.dialogs.confirmDeleteAcquisition'))) return;

    try {
      const { error } = await supabase
        .from("material_acquisitions")
        .delete()
        .eq("id", id);

      if (error) throw error;
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
                <TableHead>{t('inventory.tables.pricePerKg')}</TableHead>
                <TableHead>{t('inventory.tables.total')}</TableHead>
                <TableHead>{t('inventory.tables.supplier')}</TableHead>
                <TableHead>{t('inventory.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {acquisitions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay adquisiciones registradas
                  </TableCell>
                </TableRow>
              ) : (
                acquisitions.map((acquisition) => (
                  <TableRow key={acquisition.id}>
                    <TableCell>
                      {format(new Date(acquisition.purchase_date), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>{acquisition.materials.name}</TableCell>
                    <TableCell>
                      {acquisition.quantity_grams}g ({(acquisition.quantity_grams / 1000).toFixed(2)}kg)
                    </TableCell>
                    <TableCell>{acquisition.unit_price.toFixed(2)}€</TableCell>
                    <TableCell>{acquisition.total_price.toFixed(2)}€</TableCell>
                    <TableCell>{acquisition.supplier || "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteAcquisition(acquisition.id)}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para añadir adquisición */}
      <Dialog open={isAcquisitionDialogOpen} onOpenChange={setIsAcquisitionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('inventory.tabs.acquisitions')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAcquisition} className="space-y-4">
            <div>
              <Label htmlFor="acq_material">{t('inventory.material')} *</Label>
              <Select
                value={acquisitionForm.material_id}
                onValueChange={(value) => setAcquisitionForm({ ...acquisitionForm, material_id: value })}
              >
                <SelectTrigger id="acq_material">
                  <SelectValue placeholder="Seleccionar material" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((mat) => (
                    <SelectItem key={mat.id} value={mat.id}>
                      {mat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="acq_quantity">{t('inventory.formLabels.quantity')} *</Label>
              <Input
                id="acq_quantity"
                type="number"
                step="1"
                value={acquisitionForm.quantity_grams}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, quantity_grams: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="acq_price">{t('inventory.formLabels.unitPrice')} *</Label>
              <Input
                id="acq_price"
                type="number"
                step="0.01"
                value={acquisitionForm.unit_price}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, unit_price: e.target.value })}
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
              <Button type="button" variant="outline" onClick={() => setIsAcquisitionDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {t('inventory.dialogs.create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Acquisitions;

