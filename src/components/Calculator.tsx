import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calculator as CalcIcon, Zap, DollarSign, TrendingUp, Info, Package, Clock, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <TooltipProvider>
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

            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="weight" className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    Peso del Material (gramos)
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Peso total del material utilizado en la impresión. Puedes obtenerlo de tu software de laminado (Cura, PrusaSlicer, etc.)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
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
                <div className="flex items-center gap-2">
                  <Label htmlFor="material">Tipo de Material</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Selecciona el tipo de filamento utilizado. Los precios son aproximados por kg. Puedes personalizarlos en el siguiente campo.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
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
                <div className="flex items-center gap-2">
                  <Label htmlFor="customPrice" className="text-sm">Precio Personalizado del Material (€/kg)</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Opcional: Ingresa el precio real que pagaste por tu filamento si es diferente al predeterminado.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="customPrice"
                  type="number"
                  step="0.01"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="Dejar vacío para usar precio por defecto"
                  className="border-border/50 focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="printTime" className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Tiempo de Impresión (horas)
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Duración estimada de la impresión. Consulta tu software de laminado para obtener este dato.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="printTime"
                  type="number"
                  step="0.1"
                  value={printTime}
                  onChange={(e) => setPrintTime(e.target.value)}
                  placeholder="5"
                  className="border-border/50 focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="electricity" className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    Coste de Electricidad (€/kWh)
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Precio de tu tarifa eléctrica por kWh. En España suele estar entre €0.10 y €0.30. Consulta tu factura para el dato exacto.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
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
                <div className="flex items-center gap-2">
                  <Label htmlFor="maintenance" className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-primary" />
                    Coste de Mantenimiento/Desgaste (€)
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Coste estimado de desgaste de la impresora (boquillas, rodamientos, etc.) y tiempo dedicado por impresión. Recomendado: €1-5 por pieza.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
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
                <div className="flex items-center gap-2">
                  <Label htmlFor="margin" className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Margen de Ganancia (%)
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Porcentaje de beneficio que deseas obtener sobre los costes totales. Típicamente entre 20% y 50% según complejidad.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="margin"
                  type="number"
                  step="1"
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
            <Card className="p-6 shadow-[var(--shadow-card)] border-border/50 backdrop-blur-sm bg-card/95 hover:shadow-[var(--shadow-elegant)] transition-all duration-300">
              <div className="flex items-center gap-2 pb-4 border-b border-border mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">Desglose de Costes</h2>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 transition-all hover:from-muted hover:to-muted/50 hover:scale-[1.02] duration-200">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Material
                  </span>
                  <span className="font-semibold text-lg">€{costs.materialCost}</span>
                </div>

                <div className="flex justify-between items-center p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 transition-all hover:from-muted hover:to-muted/50 hover:scale-[1.02] duration-200">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Electricidad
                  </span>
                  <span className="font-semibold text-lg">€{costs.electricityCostTotal}</span>
                </div>

                <div className="flex justify-between items-center p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 transition-all hover:from-muted hover:to-muted/50 hover:scale-[1.02] duration-200">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    Mantenimiento
                  </span>
                  <span className="font-semibold text-lg">€{costs.maintenanceCost}</span>
                </div>

                <div className="flex justify-between items-center p-5 rounded-xl bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-2 border-primary/30 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] duration-200">
                  <span className="font-bold text-lg">Coste Total</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">€{costs.totalCost}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-[var(--shadow-elegant)] border-2 border-primary/20 backdrop-blur-sm bg-gradient-to-br from-card via-card to-primary/5 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-2 pb-4 border-b border-border mb-4">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-secondary">
                  <TrendingUp className="w-5 h-5 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-semibold">Precio y Ganancia</h2>
              </div>

              <div className="space-y-4">
                <div className="group p-6 rounded-xl bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                  <div className="flex items-center gap-2 mb-2 opacity-90">
                    <DollarSign className="w-4 h-4" />
                    <div className="text-sm font-medium">Precio de Venta Sugerido</div>
                  </div>
                  <div className="text-4xl font-bold tracking-tight">€{costs.suggestedPrice}</div>
                </div>

                <div className="group p-6 rounded-xl bg-gradient-to-br from-secondary via-secondary to-primary text-primary-foreground shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                  <div className="flex items-center gap-2 mb-2 opacity-90">
                    <TrendingUp className="w-4 h-4" />
                    <div className="text-sm font-medium">Tu Ganancia Neta</div>
                  </div>
                  <div className="text-4xl font-bold tracking-tight">€{costs.profit}</div>
                  <div className="text-xs mt-2 opacity-75">
                    Margen: {margin}% sobre costes
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Rentabilidad</div>
                  <div className="text-2xl font-bold text-primary">
                    {((parseFloat(costs.profit) / parseFloat(costs.totalCost)) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Footer con consejos */}
        <Card className="p-6 shadow-[var(--shadow-card)] border-border/50 backdrop-blur-sm bg-card/95 animate-in fade-in slide-in-from-bottom duration-700">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10 shrink-0">
              <Info className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Consejos para optimizar tus precios</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Ajusta el margen según la complejidad y demanda de cada pieza</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Impresiones más largas o complejas justifican márgenes más altos (40-60%)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Revisa periódicamente tus costes de material y electricidad para mantener precios competitivos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>No olvides incluir el tiempo de post-procesado (lijado, pintura) en tus costes de mantenimiento</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
    </TooltipProvider>
  );
};
