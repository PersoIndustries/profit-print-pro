import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, ShoppingCart, History, Trash } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Material {
  id: string;
  name: string;
  price_per_kg: number;
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

interface Movement {
  id: string;
  material_id: string;
  movement_type: string;
  quantity_grams: number;
  notes: string | null;
  created_at: string;
  materials: Material;
}

const Inventory = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [acquisitions, setAcquisitions] = useState<Acquisition[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isAcquisitionDialogOpen, setIsAcquisitionDialogOpen] = useState(false);
  const [isWasteDialogOpen, setIsWasteDialogOpen] = useState(false);
  
  const [acquisitionForm, setAcquisitionForm] = useState({
    material_id: "",
    quantity_grams: "",
    unit_price: "",
    supplier: "",
    purchase_date: new Date().toISOString().split('T')[0],
    notes: ""
  });

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
        fetchAcquisitions(),
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
        .select("id, name, price_per_kg")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setMaterials(data || []);
    } catch (error: any) {
      toast.error("Error al cargar materiales");
    }
  };

  const fetchAcquisitions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("material_acquisitions")
        .select("*, materials(id, name, price_per_kg)")
        .eq("user_id", user.id)
        .order("purchase_date", { ascending: false });

      if (error) throw error;
      setAcquisitions(data || []);
    } catch (error: any) {
      toast.error("Error al cargar adquisiciones");
    }
  };

  const fetchMovements = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("*, materials!fk_material(id, name, price_per_kg)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setMovements(data || []);
    } catch (error: any) {
      toast.error("Error al cargar movimientos");
    }
  };

  const handleSaveAcquisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const quantityGrams = parseFloat(acquisitionForm.quantity_grams);
      const unitPrice = parseFloat(acquisitionForm.unit_price);
      const totalPrice = (unitPrice / 1000) * quantityGrams;

      const { error } = await supabase
        .from("material_acquisitions")
        .insert({
          user_id: user.id,
          material_id: acquisitionForm.material_id,
          quantity_grams: quantityGrams,
          unit_price: unitPrice,
          total_price: totalPrice,
          supplier: acquisitionForm.supplier || null,
          purchase_date: acquisitionForm.purchase_date,
          notes: acquisitionForm.notes || null
        });

      if (error) throw error;

      // Update inventory
      const { data: existingInventory } = await supabase
        .from("inventory_items")
        .select("quantity_grams")
        .eq("user_id", user.id)
        .eq("material_id", acquisitionForm.material_id)
        .maybeSingle();

      if (existingInventory) {
        await supabase
          .from("inventory_items")
          .update({
            quantity_grams: existingInventory.quantity_grams + quantityGrams
          })
          .eq("user_id", user.id)
          .eq("material_id", acquisitionForm.material_id);
      } else {
        await supabase
          .from("inventory_items")
          .insert({
            user_id: user.id,
            material_id: acquisitionForm.material_id,
            quantity_grams: quantityGrams
          });
      }

      toast.success("Adquisición registrada");
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
      toast.error("Error al registrar adquisición");
      console.error(error);
    }
  };

  const handleSaveWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const quantityGrams = parseFloat(wasteForm.quantity_grams);

      // Get current inventory
      const { data: existingInventory, error: fetchError } = await supabase
        .from("inventory_items")
        .select("quantity_grams")
        .eq("user_id", user.id)
        .eq("material_id", wasteForm.material_id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!existingInventory) {
        toast.error("No hay stock de este material");
        return;
      }

      // Update inventory
      await supabase
        .from("inventory_items")
        .update({
          quantity_grams: existingInventory.quantity_grams - quantityGrams
        })
        .eq("user_id", user.id)
        .eq("material_id", wasteForm.material_id);

      toast.success("Desperdicio registrado");
      setIsWasteDialogOpen(false);
      setWasteForm({
        material_id: "",
        quantity_grams: "",
        notes: ""
      });
      fetchData();
    } catch (error: any) {
      toast.error("Error al registrar desperdicio");
      console.error(error);
    }
  };

  const handleDeleteAcquisition = async (id: string) => {
    if (!confirm("¿Eliminar esta adquisición?")) return;

    try {
      const { error } = await supabase
        .from("material_acquisitions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Adquisición eliminada");
      fetchData();
    } catch (error: any) {
      toast.error("Error al eliminar adquisición");
    }
  };

  const getMovementTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      acquisition: "Adquisición",
      print: "Impresión",
      waste: "Desperdicio",
      adjustment: "Ajuste"
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold">Inventario</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona adquisiciones y movimientos de materiales
          </p>
        </div>
      </div>

      <Tabs defaultValue="acquisitions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="acquisitions" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Adquisiciones
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="acquisitions" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsAcquisitionDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Adquisición
            </Button>
            <Button variant="outline" onClick={() => setIsWasteDialogOpen(true)}>
              <Trash className="w-4 h-4 mr-2" />
              Registrar Desperdicio
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Adquisiciones Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {acquisitions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay adquisiciones registradas
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Precio/kg</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {acquisitions.map((acq) => (
                      <TableRow key={acq.id}>
                        <TableCell>
                          {format(new Date(acq.purchase_date), "dd MMM yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="font-medium">{acq.materials.name}</TableCell>
                        <TableCell>
                          {(acq.quantity_grams / 1000).toFixed(2)} kg
                        </TableCell>
                        <TableCell>€{acq.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="font-bold">€{acq.total_price.toFixed(2)}</TableCell>
                        <TableCell>{acq.supplier || "-"}</TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDeleteAcquisition(acq.id)}
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Movimientos</CardTitle>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay movimientos registrados
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell>
                          {format(new Date(mov.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell>{getMovementTypeLabel(mov.movement_type)}</TableCell>
                        <TableCell className="font-medium">{mov.materials.name}</TableCell>
                        <TableCell className={mov.quantity_grams < 0 ? "text-red-500" : "text-green-500"}>
                          {mov.quantity_grams > 0 ? "+" : ""}{(mov.quantity_grams / 1000).toFixed(2)} kg
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{mov.notes || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Acquisition Dialog */}
      <Dialog open={isAcquisitionDialogOpen} onOpenChange={setIsAcquisitionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Adquisición</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveAcquisition} className="space-y-4">
            <div>
              <Label htmlFor="acq_material">Material *</Label>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="acq_quantity">Cantidad (kg) *</Label>
                <Input
                  id="acq_quantity"
                  type="number"
                  step="0.001"
                  value={acquisitionForm.quantity_grams ? (parseFloat(acquisitionForm.quantity_grams) / 1000).toString() : ""}
                  onChange={(e) => setAcquisitionForm({ 
                    ...acquisitionForm, 
                    quantity_grams: (parseFloat(e.target.value) * 1000).toString() 
                  })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="acq_price">Precio/kg *</Label>
                <Input
                  id="acq_price"
                  type="number"
                  step="0.01"
                  value={acquisitionForm.unit_price}
                  onChange={(e) => setAcquisitionForm({ ...acquisitionForm, unit_price: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="acq_supplier">Proveedor</Label>
              <Input
                id="acq_supplier"
                value={acquisitionForm.supplier}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, supplier: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="acq_date">Fecha de Compra *</Label>
              <Input
                id="acq_date"
                type="date"
                value={acquisitionForm.purchase_date}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, purchase_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="acq_notes">Notas</Label>
              <Textarea
                id="acq_notes"
                value={acquisitionForm.notes}
                onChange={(e) => setAcquisitionForm({ ...acquisitionForm, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsAcquisitionDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Guardar Adquisición
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Waste Dialog */}
      <Dialog open={isWasteDialogOpen} onOpenChange={setIsWasteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Desperdicio</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveWaste} className="space-y-4">
            <div>
              <Label htmlFor="waste_material">Material *</Label>
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
              <Label htmlFor="waste_quantity">Cantidad Desperdiciada (kg) *</Label>
              <Input
                id="waste_quantity"
                type="number"
                step="0.001"
                value={wasteForm.quantity_grams ? (parseFloat(wasteForm.quantity_grams) / 1000).toString() : ""}
                onChange={(e) => setWasteForm({ 
                  ...wasteForm, 
                  quantity_grams: (parseFloat(e.target.value) * 1000).toString() 
                })}
                required
              />
            </div>

            <div>
              <Label htmlFor="waste_notes">Notas</Label>
              <Textarea
                id="waste_notes"
                value={wasteForm.notes}
                onChange={(e) => setWasteForm({ ...wasteForm, notes: e.target.value })}
                rows={3}
                placeholder="Razón del desperdicio..."
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsWasteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive">
                Registrar Desperdicio
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
