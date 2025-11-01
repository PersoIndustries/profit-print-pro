import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator as CalcIcon, Zap, DollarSign, TrendingUp } from "lucide-react";

interface Material {
  name: string;
  pricePerKg: number;
}

const materials: Material[] = [
  { name: "PLA", pricePerKg: 20 },
  { name: "ABS", pricePerKg: 25 },
  { name: "PETG", pricePerKg: 28 },
  { name: "TPU", pricePerKg: 35 },
  { name: "Nylon", pricePerKg: 40 },
  { name: "Resina", pricePerKg: 50 },
];

export const Calculator = () => {
  const [weight, setWeight] = useState<string>("100");
  const [materialType, setMaterialType] = useState<string>("PLA");
  const [customPrice, setCustomPrice] = useState<string>("");
  const [printTime, setPrintTime] = useState<string>("5");
  const [electricityCost, setElectricityCost] = useState<string>("0.15");
  const [margin, setMargin] = useState<string>("30");
  const [maintenanceCost, setMaintenanceCost] = useState<string>("2");

  const calculateCosts = () => {
    const weightNum = parseFloat(weight) || 0;
    const selectedMaterial = materials.find(m => m.name === materialType);
    const pricePerKg = customPrice ? parseFloat(customPrice) : (selectedMaterial?.pricePerKg || 20);
    const timeNum = parseFloat(printTime) || 0;
    const electricityNum = parseFloat(electricityCost) || 0;
    const marginNum = parseFloat(margin) || 0;
    const maintenanceNum = parseFloat(maintenanceCost) || 0;

    const materialCost = (weightNum / 1000) * pricePerKg;
    const powerConsumption = 0.2; // kW promedio de una impresora 3D
    const electricityCostTotal = timeNum * powerConsumption * electricityNum;
    const totalCost = materialCost + electricityCostTotal + maintenanceNum;
    const suggestedPrice = totalCost * (1 + marginNum / 100);
    const profit = suggestedPrice - totalCost;

    return {
      materialCost: materialCost.toFixed(2),
      electricityCostTotal: electricityCostTotal.toFixed(2),
      maintenanceCost: maintenanceNum.toFixed(2),
      totalCost: totalCost.toFixed(2),
      suggestedPrice: suggestedPrice.toFixed(2),
      profit: profit.toFixed(2),
    };
  };

  const costs = calculateCosts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 animate-in fade-in slide-in-from-top duration-700">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-lg">
              <CalcIcon className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Calculadora de Precios 3D
          </h1>
          <p className="text-muted-foreground text-lg">
            Calcula tus costes y ganancias en impresiones 3D de forma precisa
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Formulario de entrada */}
          <Card className="p-6 space-y-6 shadow-[var(--shadow-card)] border-border/50 backdrop-blur-sm bg-card/95 animate-in fade-in slide-in-from-left duration-700">
            <div className="flex items-center gap-2 pb-4 border-b border-border">
              <CalcIcon className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-semibold">Datos de la Impresión</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Peso del Material (gramos)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="100"
                  className="border-border/50 focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="material">Tipo de Material</Label>
                <Select value={materialType} onValueChange={setMaterialType}>
                  <SelectTrigger id="material" className="border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((mat) => (
                      <SelectItem key={mat.name} value={mat.name}>
                        {mat.name} (€{mat.pricePerKg}/kg)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customPrice">Precio Personalizado del Material (€/kg) - Opcional</Label>
                <Input
                  id="customPrice"
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="Dejar vacío para usar precio por defecto"
                  className="border-border/50 focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="printTime">Tiempo de Impresión (horas)</Label>
                <Input
                  id="printTime"
                  type="number"
                  value={printTime}
                  onChange={(e) => setPrintTime(e.target.value)}
                  placeholder="5"
                  className="border-border/50 focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="electricity">Coste de Electricidad (€/kWh)</Label>
                <Input
                  id="electricity"
                  type="number"
                  step="0.01"
                  value={electricityCost}
                  onChange={(e) => setElectricityCost(e.target.value)}
                  placeholder="0.15"
                  className="border-border/50 focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maintenance">Coste de Mantenimiento/Desgaste (€)</Label>
                <Input
                  id="maintenance"
                  type="number"
                  step="0.01"
                  value={maintenanceCost}
                  onChange={(e) => setMaintenanceCost(e.target.value)}
                  placeholder="2"
                  className="border-border/50 focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="margin">Margen de Ganancia (%)</Label>
                <Input
                  id="margin"
                  type="number"
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                  placeholder="30"
                  className="border-border/50 focus:border-primary transition-colors"
                />
              </div>
            </div>
          </Card>

          {/* Resultados */}
          <div className="space-y-4 animate-in fade-in slide-in-from-right duration-700">
            <Card className="p-6 shadow-[var(--shadow-card)] border-border/50 backdrop-blur-sm bg-card/95">
              <div className="flex items-center gap-2 pb-4 border-b border-border mb-4">
                <DollarSign className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-semibold">Desglose de Costes</h2>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50 transition-all hover:bg-muted">
                  <span className="text-muted-foreground">Material</span>
                  <span className="font-semibold">€{costs.materialCost}</span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50 transition-all hover:bg-muted">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Electricidad
                  </span>
                  <span className="font-semibold">€{costs.electricityCostTotal}</span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50 transition-all hover:bg-muted">
                  <span className="text-muted-foreground">Mantenimiento</span>
                  <span className="font-semibold">€{costs.maintenanceCost}</span>
                </div>

                <div className="flex justify-between items-center p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                  <span className="font-semibold">Coste Total</span>
                  <span className="text-xl font-bold text-primary">€{costs.totalCost}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-[var(--shadow-elegant)] border-2 border-primary/20 backdrop-blur-sm bg-gradient-to-br from-card via-card to-primary/5">
              <div className="flex items-center gap-2 pb-4 border-b border-border mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-semibold">Precio y Ganancia</h2>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground">
                  <div className="text-sm opacity-90 mb-1">Precio de Venta Sugerido</div>
                  <div className="text-3xl font-bold">€{costs.suggestedPrice}</div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-r from-secondary to-primary text-primary-foreground">
                  <div className="text-sm opacity-90 mb-1">Tu Ganancia</div>
                  <div className="text-3xl font-bold">€{costs.profit}</div>
                </div>

                <div className="text-center text-sm text-muted-foreground pt-2">
                  Margen aplicado: {margin}%
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
