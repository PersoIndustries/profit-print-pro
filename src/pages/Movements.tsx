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
import { Loader2, Trash } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface Material {
  id: string;
  name: string;
}

interface Movement {
  id: string;
  material_id: string;
  movement_type: string;
  quantity_grams: number;
  notes: string | null;
  created_at: string;
  materials: Material;
}

const Movements = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const { hasFeature } = useTierFeatures();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isWasteDialogOpen, setIsWasteDialogOpen] = useState(false);
  
  const [wasteForm, setWasteForm] = useState({
    material_id: "",
    quantity_grams: "",
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
        fetchMovements()
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

  const fetchMovements = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("*, materials!fk_material(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setMovements((data || []).map(mov => ({
        ...mov,
        materials: {
          ...mov.materials,
        }
      })));
    } catch (error: any) {
      toast.error(t('inventory.messages.errorLoadingMovements'));
    }
  };

  const handleSaveWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const quantityGrams = parseFloat(wasteForm.quantity_grams);

      const { data: inventoryData } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("material_id", wasteForm.material_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!inventoryData || inventoryData.quantity_grams < quantityGrams) {
        toast.error(t('inventory.messages.insufficientStock'));
        return;
      }

      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({
          quantity_grams: inventoryData.quantity_grams - quantityGrams
        })
        .eq("id", inventoryData.id);

      if (updateError) throw updateError;

      const { error: movementError } = await supabase
        .from("inventory_movements")
        .insert([
          {
            user_id: user.id,
            material_id: wasteForm.material_id,
            movement_type: "waste",
            quantity_grams: quantityGrams,
            notes: wasteForm.notes || null
          }
        ]);

      if (movementError) throw movementError;

      toast.success(t('inventory.messages.wasteRegistered'));
      setIsWasteDialogOpen(false);
      setWasteForm({
        material_id: "",
        quantity_grams: "",
        notes: ""
      });
      fetchData();
    } catch (error: any) {
      toast.error(t('inventory.messages.errorRegisteringWaste'));
    }
  };

  const getMovementTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      acquisition: t('inventory.movementTypes.acquisition'),
      consumption: t('inventory.movementTypes.consumption'),
      waste: t('inventory.movementTypes.waste'),
      adjustment: t('inventory.movementTypes.adjustment')
    };
    return types[type] || type;
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!hasFeature('movement_history')) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-primary">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="max-w-md mx-auto space-y-6">
              <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <Trash className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Historial de Movimientos - Business</h3>
                <p className="text-muted-foreground mb-4">
                  Accede al historial completo de movimientos de inventario. Esta función está disponible en el plan Business.
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
            <CardTitle>{t('inventory.tables.movementHistory')}</CardTitle>
            <Button onClick={() => setIsWasteDialogOpen(true)} variant="outline" className="shadow-sm">
              <Trash className="w-4 h-4 mr-2" />
              {t('inventory.dialogs.registerWaste')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('inventory.tables.dateAndTime')}</TableHead>
                <TableHead>{t('inventory.material')}</TableHead>
                <TableHead>{t('inventory.type')}</TableHead>
                <TableHead>{t('inventory.tables.quantity')}</TableHead>
                <TableHead>{t('inventory.tables.notes')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No hay movimientos registrados
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      {format(new Date(movement.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell>{movement.materials.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getMovementTypeLabel(movement.movement_type)}</Badge>
                    </TableCell>
                    <TableCell>
                      {movement.quantity_grams}g ({(movement.quantity_grams / 1000).toFixed(2)}kg)
                    </TableCell>
                    <TableCell>{movement.notes || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para registrar desperdicio */}
      <Dialog open={isWasteDialogOpen} onOpenChange={setIsWasteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('inventory.dialogs.registerWaste')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveWaste} className="space-y-4">
            <div>
              <Label htmlFor="waste_material">{t('inventory.material')} *</Label>
              <Select
                value={wasteForm.material_id}
                onValueChange={(value) => setWasteForm({ ...wasteForm, material_id: value })}
              >
                <SelectTrigger id="waste_material">
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
              <Label htmlFor="waste_quantity">{t('inventory.formLabels.quantity')} *</Label>
              <Input
                id="waste_quantity"
                type="number"
                step="1"
                value={wasteForm.quantity_grams}
                onChange={(e) => setWasteForm({ ...wasteForm, quantity_grams: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="waste_notes">{t('inventory.formLabels.notes')}</Label>
              <Textarea
                id="waste_notes"
                value={wasteForm.notes}
                onChange={(e) => setWasteForm({ ...wasteForm, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsWasteDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">{t('inventory.dialogs.registerWaste')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Movements;

