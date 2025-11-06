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
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

interface Material {
  id: string;
  name: string;
  price_per_kg: number;
}

const CalculatorPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [weightGrams, setWeightGrams] = useState("");
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

  const calculatePrice = () => {
    const material = materials.find(m => m.id === selectedMaterialId);
    if (!material || !weightGrams || !printTimeHours) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    const weightKg = parseFloat(weightGrams) / 1000;
    const materialCost = weightKg * material.price_per_kg;

    const hours = parseFloat(printTimeHours);
    const kwh = (parseFloat(printerWattage) / 1000) * hours;
    const electricityCost = kwh * parseFloat(electricityCostPerKwh);

    const laborCost = hours * parseFloat(laborCostPerHour);

    const totalCost = materialCost + electricityCost + laborCost;
    const finalPrice = totalCost * (1 + parseFloat(profitMargin) / 100);

    setCalculatedPrice(finalPrice);
  };

  const handleSaveProject = async () => {
    if (!user || calculatedPrice === null || !projectName) {
      toast.error("Calcula el precio primero y añade un nombre");
      return;
    }

    const material = materials.find(m => m.id === selectedMaterialId);
    if (!material) return;

    const weightKg = parseFloat(weightGrams) / 1000;
    const materialCost = weightKg * material.price_per_kg;
    const hours = parseFloat(printTimeHours);
    const kwh = (parseFloat(printerWattage) / 1000) * hours;
    const electricityCost = kwh * parseFloat(electricityCostPerKwh);
    const laborCost = hours * parseFloat(laborCostPerHour);

    try {
      const { error } = await supabase.from("projects").insert({
        user_id: user.id,
        name: projectName,
        material_id: selectedMaterialId,
        weight_grams: parseFloat(weightGrams),
        print_time_hours: parseFloat(printTimeHours),
        electricity_cost: electricityCost,
        material_cost: materialCost,
        labor_cost: laborCost,
        profit_margin: parseFloat(profitMargin),
        total_price: calculatedPrice,
        notes: notes || null,
      });

      if (error) throw error;

      toast.success("Proyecto guardado");
      navigate("/projects");
    } catch (error: any) {
      toast.error("Error al guardar proyecto");
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

            <div className="space-y-2">
              <Label htmlFor="material">Material *</Label>
              <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un material" />
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

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (gramos) *</Label>
                <Input
                  id="weight"
                  type="number"
                  value={weightGrams}
                  onChange={(e) => setWeightGrams(e.target.value)}
                />
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
