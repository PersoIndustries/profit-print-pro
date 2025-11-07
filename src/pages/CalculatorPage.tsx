import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Material {
  id: string;
  name: string;
  price_per_kg: number;
}

interface ProjectMaterial {
  materialId: string;
  weightGrams: string;
}

const CalculatorPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projectMaterials, setProjectMaterials] = useState<ProjectMaterial[]>([
    { materialId: "", weightGrams: "" }
  ]);
  const [projectName, setProjectName] = useState("");
  const [printTimeHours, setPrintTimeHours] = useState("");
  const [electricityCostPerKwh, setElectricityCostPerKwh] = useState("0.15");
  const [printerWattage, setPrinterWattage] = useState("250");
  const [laborCostPerHour, setLaborCostPerHour] = useState("15");
  const [profitMargin, setProfitMargin] = useState("30");
  const [notes, setNotes] = useState("");
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    fetchMaterials();
  }, [user]);

  const fetchMaterials = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("materials")
        .select("id, name, price_per_kg")
        .eq("user_id", user.id);

      if (error) throw error;
      setMaterials(data || []);
    } catch (error: any) {
      toast.error("Error al cargar materiales");
    }
  };

  const addMaterialRow = () => {
    setProjectMaterials([...projectMaterials, { materialId: "", weightGrams: "" }]);
  };

  const removeMaterialRow = (index: number) => {
    if (projectMaterials.length > 1) {
      setProjectMaterials(projectMaterials.filter((_, i) => i !== index));
    }
  };

  const updateMaterialRow = (index: number, field: keyof ProjectMaterial, value: string) => {
    const updated = [...projectMaterials];
    updated[index][field] = value;
    setProjectMaterials(updated);
  };

  const calculatePrice = () => {
    // Validar que todos los materiales tengan material y peso
    const hasEmptyFields = projectMaterials.some(pm => !pm.materialId || !pm.weightGrams);
    if (hasEmptyFields || !printTimeHours) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    // Calcular costo total de materiales
    let totalMaterialCost = 0;
    for (const pm of projectMaterials) {
      const material = materials.find(m => m.id === pm.materialId);
      if (!material) continue;
      const weightKg = parseFloat(pm.weightGrams) / 1000;
      totalMaterialCost += weightKg * material.price_per_kg;
    }

    const hours = parseFloat(printTimeHours);
    const kwh = (parseFloat(printerWattage) / 1000) * hours;
    const electricityCost = kwh * parseFloat(electricityCostPerKwh);

    const laborCost = hours * parseFloat(laborCostPerHour);

    const totalCost = totalMaterialCost + electricityCost + laborCost;
    const finalPrice = totalCost * (1 + parseFloat(profitMargin) / 100);

    setCalculatedPrice(finalPrice);
  };

  const handleSaveProject = async () => {
    if (!user || calculatedPrice === null || !projectName) {
      toast.error("Calcula el precio primero y añade un nombre");
      return;
    }

    // Calcular costos
    const hours = parseFloat(printTimeHours);
    const kwh = (parseFloat(printerWattage) / 1000) * hours;
    const electricityCost = kwh * parseFloat(electricityCostPerKwh);
    const laborCost = hours * parseFloat(laborCostPerHour);
    
    // Calcular peso total y costo total de materiales
    let totalWeightGrams = 0;
    let totalMaterialCost = 0;
    
    for (const pm of projectMaterials) {
      const material = materials.find(m => m.id === pm.materialId);
      if (!material) continue;
      const weightKg = parseFloat(pm.weightGrams) / 1000;
      totalWeightGrams += parseFloat(pm.weightGrams);
      totalMaterialCost += weightKg * material.price_per_kg;
    }

    try {
      // Insertar proyecto
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: projectName,
          weight_grams: totalWeightGrams,
          print_time_hours: parseFloat(printTimeHours),
          electricity_cost: electricityCost,
          material_cost: totalMaterialCost,
          labor_cost: laborCost,
          profit_margin: parseFloat(profitMargin),
          total_price: calculatedPrice,
          notes: notes || null,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Insertar materiales del proyecto
      const projectMaterialsData = projectMaterials.map(pm => {
        const material = materials.find(m => m.id === pm.materialId);
        if (!material) return null;
        const weightKg = parseFloat(pm.weightGrams) / 1000;
        return {
          project_id: project.id,
          material_id: pm.materialId,
          weight_grams: parseFloat(pm.weightGrams),
          material_cost: weightKg * material.price_per_kg,
        };
      }).filter(Boolean);

      const { error: materialsError } = await supabase
        .from("project_materials")
        .insert(projectMaterialsData);

      if (materialsError) throw materialsError;

      toast.success("Proyecto guardado");
      navigate("/projects");
    } catch (error: any) {
      toast.error("Error al guardar proyecto: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <nav className="border-b bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Dashboard
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Calculadora de Precios 3D</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="projectName">Nombre del Proyecto *</Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Mi proyecto"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Materiales *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addMaterialRow}>
                  + Añadir Material
                </Button>
              </div>
              
              {projectMaterials.map((pm, index) => (
                <div key={index} className="grid md:grid-cols-2 gap-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label>Material</Label>
                    <Select 
                      value={pm.materialId} 
                      onValueChange={(value) => updateMaterialRow(index, 'materialId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona material" />
                      </SelectTrigger>
                      <SelectContent>
                        {materials.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground">
                            No hay materiales. <Button variant="link" onClick={() => navigate("/materials")}>Añadir material</Button>
                          </div>
                        ) : (
                          materials.map((material) => (
                            <SelectItem key={material.id} value={material.id}>
                              {material.name} - €{material.price_per_kg}/kg
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Peso (gramos)</Label>
                      {projectMaterials.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeMaterialRow(index)}
                        >
                          Eliminar
                        </Button>
                      )}
                    </div>
                    <Input
                      type="number"
                      value={pm.weightGrams}
                      onChange={(e) => updateMaterialRow(index, 'weightGrams', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="printTime">Tiempo de Impresión (horas) *</Label>
              <Input
                id="printTime"
                type="number"
                step="0.1"
                value={printTimeHours}
                onChange={(e) => setPrintTimeHours(e.target.value)}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="electricity">Coste Electricidad (€/kWh)</Label>
                <Input
                  id="electricity"
                  type="number"
                  step="0.01"
                  value={electricityCostPerKwh}
                  onChange={(e) => setElectricityCostPerKwh(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wattage">Potencia Impresora (W)</Label>
                <Input
                  id="wattage"
                  type="number"
                  value={printerWattage}
                  onChange={(e) => setPrinterWattage(e.target.value)}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="labor">Coste Mano de Obra (€/h)</Label>
                <Input
                  id="labor"
                  type="number"
                  step="0.1"
                  value={laborCostPerHour}
                  onChange={(e) => setLaborCostPerHour(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profit">Margen de Beneficio (%)</Label>
                <Input
                  id="profit"
                  type="number"
                  step="1"
                  value={profitMargin}
                  onChange={(e) => setProfitMargin(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalles adicionales..."
              />
            </div>

            <Button onClick={calculatePrice} className="w-full">
              Calcular Precio
            </Button>

            {calculatedPrice !== null && (
              <Card className="bg-primary/5 border-primary">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-2">Precio Total</p>
                    <p className="text-4xl font-bold">€{calculatedPrice.toFixed(2)}</p>
                    <Button onClick={handleSaveProject} className="mt-4">
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Proyecto
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CalculatorPage;
