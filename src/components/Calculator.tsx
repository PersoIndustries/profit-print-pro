import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator as CalcIcon, Zap, DollarSign, TrendingUp, Info, Package, Clock, Wrench, Save, List, Trash2, Plus, X, ShoppingCart, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Material {
  name: string;
  pricePerKg: number;
}

interface ColorLayer {
  id: string;
  materialType: string;
  weight: number;
  customPrice: string;
}

interface SavedProject {
  id: string;
  name: string;
  weight: number;
  materialType: string;
  customPrice: string;
  printTime: number;
  electricityCost: number;
  margin: number;
  maintenanceCost: number;
  isMulticolor: boolean;
  colorLayers?: ColorLayer[];
  totalCost: number;
  suggestedPrice: number;
  profit: number;
  date: string;
}

interface AmortizationProduct {
  id: string;
  name: string;
  cost: number;
  monthlyPrints: number;
  avgPrintProfit: number;
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: string;
  name: string;
  items: OrderItem[];
  total: number;
  date: string;
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
  const [projectName, setProjectName] = useState<string>("");
  const [weight, setWeight] = useState<string>("100");
  const [materialType, setMaterialType] = useState<string>("PLA");
  const [customPrice, setCustomPrice] = useState<string>("");
  const [printTime, setPrintTime] = useState<string>("5");
  const [electricityCost, setElectricityCost] = useState<string>("0.15");
  const [margin, setMargin] = useState<string>("30");
  const [maintenanceCost, setMaintenanceCost] = useState<string>("2");
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  
  // Amortización - Lista de productos
  const [amortizationProducts, setAmortizationProducts] = useState<AmortizationProduct[]>([]);
  const [newProductName, setNewProductName] = useState<string>("");
  const [newProductCost, setNewProductCost] = useState<string>("");
  const [newProductMonthlyPrints, setNewProductMonthlyPrints] = useState<string>("");
  const [newProductAvgProfit, setNewProductAvgProfit] = useState<string>("");
  
  // Pedidos
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  const [savedOrders, setSavedOrders] = useState<Order[]>([]);
  const [orderName, setOrderName] = useState<string>("");
  const [newItemName, setNewItemName] = useState<string>("");
  const [newItemQuantity, setNewItemQuantity] = useState<string>("1");
  const [newItemPrice, setNewItemPrice] = useState<string>("");
  
  // Multicolor
  const [isMulticolor, setIsMulticolor] = useState<boolean>(false);
  const [colorLayers, setColorLayers] = useState<ColorLayer[]>([
    { id: "1", materialType: "PLA", weight: 50, customPrice: "" },
    { id: "2", materialType: "PLA", weight: 50, customPrice: "" },
  ]);

  useEffect(() => {
    const stored = localStorage.getItem("3d-calculator-projects");
    if (stored) {
      setSavedProjects(JSON.parse(stored));
    }
    
    const storedAmortization = localStorage.getItem("3d-calculator-amortization");
    if (storedAmortization) {
      setAmortizationProducts(JSON.parse(storedAmortization));
    }
    
    const storedOrders = localStorage.getItem("3d-calculator-orders");
    if (storedOrders) {
      setSavedOrders(JSON.parse(storedOrders));
    }
  }, []);

  const addColorLayer = () => {
    setColorLayers([...colorLayers, { 
      id: Date.now().toString(), 
      materialType: "PLA", 
      weight: 50, 
      customPrice: "" 
    }]);
  };

  const removeColorLayer = (id: string) => {
    if (colorLayers.length > 2) {
      setColorLayers(colorLayers.filter(layer => layer.id !== id));
    }
  };

  const updateColorLayer = (id: string, field: keyof ColorLayer, value: any) => {
    setColorLayers(colorLayers.map(layer => 
      layer.id === id ? { ...layer, [field]: value } : layer
    ));
  };

  const calculateCosts = () => {
    let materialCost = 0;
    
    if (isMulticolor) {
      materialCost = colorLayers.reduce((total, layer) => {
        const selectedMaterial = materials.find(m => m.name === layer.materialType);
        const pricePerKg = layer.customPrice ? parseFloat(layer.customPrice) : (selectedMaterial?.pricePerKg || 20);
        return total + (layer.weight / 1000) * pricePerKg;
      }, 0);
    } else {
      const weightNum = parseFloat(weight) || 0;
      const selectedMaterial = materials.find(m => m.name === materialType);
      const pricePerKg = customPrice ? parseFloat(customPrice) : (selectedMaterial?.pricePerKg || 20);
      materialCost = (weightNum / 1000) * pricePerKg;
    }

    const timeNum = parseFloat(printTime) || 0;
    const electricityNum = parseFloat(electricityCost) || 0;
    const marginNum = parseFloat(margin) || 0;
    const maintenanceNum = parseFloat(maintenanceCost) || 0;

    const powerConsumption = 0.2;
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

  const calculateAmortization = (product: AmortizationProduct) => {
    const monthlyProfit = product.monthlyPrints * product.avgPrintProfit;
    const monthsToAmortize = product.cost / monthlyProfit;
    const yearlyProfit = monthlyProfit * 12;
    
    return {
      monthlyProfit: monthlyProfit.toFixed(2),
      monthsToAmortize: monthsToAmortize.toFixed(1),
      yearlyProfit: yearlyProfit.toFixed(2),
    };
  };

  const addAmortizationProduct = () => {
    if (!newProductName.trim()) {
      toast.error("Por favor, ingresa un nombre para el producto");
      return;
    }
    if (!newProductCost || parseFloat(newProductCost) <= 0) {
      toast.error("Por favor, ingresa un coste válido");
      return;
    }
    if (!newProductMonthlyPrints || parseFloat(newProductMonthlyPrints) <= 0) {
      toast.error("Por favor, ingresa un número válido de impresiones mensuales");
      return;
    }
    if (!newProductAvgProfit || parseFloat(newProductAvgProfit) <= 0) {
      toast.error("Por favor, ingresa una ganancia promedio válida");
      return;
    }

    const newProduct: AmortizationProduct = {
      id: Date.now().toString(),
      name: newProductName,
      cost: parseFloat(newProductCost),
      monthlyPrints: parseFloat(newProductMonthlyPrints),
      avgPrintProfit: parseFloat(newProductAvgProfit),
    };

    const updated = [...amortizationProducts, newProduct];
    setAmortizationProducts(updated);
    localStorage.setItem("3d-calculator-amortization", JSON.stringify(updated));
    
    // Limpiar formulario
    setNewProductName("");
    setNewProductCost("");
    setNewProductMonthlyPrints("");
    setNewProductAvgProfit("");
    
    toast.success(`Producto "${newProductName}" agregado`);
  };

  const deleteAmortizationProduct = (id: string) => {
    const updated = amortizationProducts.filter(p => p.id !== id);
    setAmortizationProducts(updated);
    localStorage.setItem("3d-calculator-amortization", JSON.stringify(updated));
    toast.success("Producto eliminado");
  };

  const saveProject = () => {
    if (!projectName.trim()) {
      toast.error("Por favor, ingresa un nombre para el proyecto");
      return;
    }

    const newProject: SavedProject = {
      id: Date.now().toString(),
      name: projectName,
      weight: parseFloat(weight),
      materialType,
      customPrice,
      printTime: parseFloat(printTime),
      electricityCost: parseFloat(electricityCost),
      margin: parseFloat(margin),
      maintenanceCost: parseFloat(maintenanceCost),
      isMulticolor,
      colorLayers: isMulticolor ? [...colorLayers] : undefined,
      totalCost: parseFloat(costs.totalCost),
      suggestedPrice: parseFloat(costs.suggestedPrice),
      profit: parseFloat(costs.profit),
      date: new Date().toISOString(),
    };

    const updated = [...savedProjects, newProject];
    setSavedProjects(updated);
    localStorage.setItem("3d-calculator-projects", JSON.stringify(updated));
    toast.success(`Proyecto "${projectName}" guardado exitosamente`);
    setProjectName("");
  };

  const deleteProject = (id: string) => {
    const updated = savedProjects.filter(p => p.id !== id);
    setSavedProjects(updated);
    localStorage.setItem("3d-calculator-projects", JSON.stringify(updated));
    toast.success("Proyecto eliminado");
  };

  const loadProject = (project: SavedProject) => {
    setWeight(project.weight.toString());
    setMaterialType(project.materialType);
    setCustomPrice(project.customPrice);
    setPrintTime(project.printTime.toString());
    setElectricityCost(project.electricityCost.toString());
    setMargin(project.margin.toString());
    setMaintenanceCost(project.maintenanceCost.toString());
    setIsMulticolor(project.isMulticolor);
    if (project.colorLayers) {
      setColorLayers(project.colorLayers);
    }
    toast.success(`Proyecto "${project.name}" cargado`);
  };

  // Funciones de pedidos
  const addItemToOrder = () => {
    if (!newItemName.trim()) {
      toast.error("Por favor, ingresa un nombre para el item");
      return;
    }
    if (!newItemPrice || parseFloat(newItemPrice) <= 0) {
      toast.error("Por favor, ingresa un precio válido");
      return;
    }
    if (!newItemQuantity || parseFloat(newItemQuantity) <= 0) {
      toast.error("Por favor, ingresa una cantidad válida");
      return;
    }

    const newItem: OrderItem = {
      id: Date.now().toString(),
      name: newItemName,
      quantity: parseFloat(newItemQuantity),
      unitPrice: parseFloat(newItemPrice),
    };

    setCurrentOrder([...currentOrder, newItem]);
    setNewItemName("");
    setNewItemQuantity("1");
    setNewItemPrice("");
    toast.success(`"${newItemName}" agregado al pedido`);
  };

  const addCurrentCalculationToOrder = () => {
    if (!projectName.trim()) {
      toast.error("Por favor, ingresa un nombre para el item");
      return;
    }

    const newItem: OrderItem = {
      id: Date.now().toString(),
      name: projectName,
      quantity: 1,
      unitPrice: parseFloat(costs.suggestedPrice),
    };

    setCurrentOrder([...currentOrder, newItem]);
    toast.success(`"${projectName}" agregado al pedido`);
  };

  const removeItemFromOrder = (id: string) => {
    setCurrentOrder(currentOrder.filter(item => item.id !== id));
    toast.success("Item eliminado del pedido");
  };

  const calculateOrderTotal = () => {
    return currentOrder.reduce((total, item) => total + (item.quantity * item.unitPrice), 0).toFixed(2);
  };

  const saveOrder = () => {
    if (!orderName.trim()) {
      toast.error("Por favor, ingresa un nombre para el pedido");
      return;
    }
    if (currentOrder.length === 0) {
      toast.error("El pedido está vacío");
      return;
    }

    const newOrder: Order = {
      id: Date.now().toString(),
      name: orderName,
      items: [...currentOrder],
      total: parseFloat(calculateOrderTotal()),
      date: new Date().toISOString(),
    };

    const updated = [...savedOrders, newOrder];
    setSavedOrders(updated);
    localStorage.setItem("3d-calculator-orders", JSON.stringify(updated));
    toast.success(`Pedido "${orderName}" guardado exitosamente`);
    
    // Limpiar pedido actual
    setCurrentOrder([]);
    setOrderName("");
  };

  const deleteOrder = (id: string) => {
    const updated = savedOrders.filter(o => o.id !== id);
    setSavedOrders(updated);
    localStorage.setItem("3d-calculator-orders", JSON.stringify(updated));
    toast.success("Pedido eliminado");
  };

  const loadOrder = (order: Order) => {
    setCurrentOrder([...order.items]);
    setOrderName(order.name + " (copia)");
    toast.success(`Pedido "${order.name}" cargado`);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2 animate-in fade-in slide-in-from-top duration-700">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-lg">
                <CalcIcon className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Calculadora de Precios 3D Pro
            </h1>
            <p className="text-muted-foreground text-lg">
              Calcula costes, amortización y gestiona tus proyectos de impresión 3D
            </p>
          </div>

          <Tabs defaultValue="calculator" className="w-full">
            <TabsList className="grid w-full grid-cols-4 max-w-3xl mx-auto mb-6">
              <TabsTrigger value="calculator" className="flex items-center gap-2">
                <CalcIcon className="w-4 h-4" />
                Calculadora
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Pedidos
              </TabsTrigger>
              <TabsTrigger value="projects" className="flex items-center gap-2">
                <List className="w-4 h-4" />
                Proyectos ({savedProjects.length})
              </TabsTrigger>
              <TabsTrigger value="amortization" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Amortización
              </TabsTrigger>
            </TabsList>

            {/* Tab: Calculadora */}
            <TabsContent value="calculator" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Formulario */}
                <Card className="p-6 space-y-6 shadow-[var(--shadow-card)] border-border/50 backdrop-blur-sm bg-card/95 animate-in fade-in slide-in-from-left duration-700">
                  <div className="flex items-center gap-2 pb-4 border-b border-border">
                    <CalcIcon className="w-5 h-5 text-primary" />
                    <h2 className="text-2xl font-semibold">Datos de la Impresión</h2>
                  </div>

                  <div className="space-y-5">
                    {/* Nombre del proyecto */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="projectName" className="flex items-center gap-2">
                          <Save className="w-4 h-4 text-primary" />
                          Nombre del Proyecto
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Asigna un nombre identificativo a tu proyecto para guardarlo y consultarlo después. Ej: "Figura Mario Bros", "Soporte para móvil"</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="projectName"
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Ej: Maceta decorativa"
                        className="border-border/50 focus:border-primary transition-colors"
                      />
                    </div>

                    {/* Multicolor toggle */}
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 flex-1">
                        <Label htmlFor="multicolor" className="cursor-pointer">Impresión Multicolor</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Activa esta opción si tu impresión usa varios colores o tipos de filamento. Podrás especificar el peso y material de cada color por separado.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <input
                        id="multicolor"
                        type="checkbox"
                        checked={isMulticolor}
                        onChange={(e) => setIsMulticolor(e.target.checked)}
                        className="w-5 h-5 rounded accent-primary cursor-pointer"
                      />
                    </div>

                    {!isMulticolor ? (
                      <>
                        {/* Peso simple */}
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
                                <p><strong>¿Qué es?</strong> El peso total del filamento que se usará en la impresión.</p>
                                <p className="mt-2"><strong>¿Dónde encontrarlo?</strong> En tu software de laminado (Cura, PrusaSlicer, Simplify3D, etc.) aparece como "Peso del filamento" o "Material weight".</p>
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
                                <p><strong>¿Qué es?</strong> El tipo de filamento que usarás para imprimir.</p>
                                <p className="mt-2"><strong>Tipos:</strong></p>
                                <ul className="text-xs mt-1 space-y-1">
                                  <li>• <strong>PLA:</strong> Más común, fácil de imprimir</li>
                                  <li>• <strong>ABS:</strong> Resistente al calor</li>
                                  <li>• <strong>PETG:</strong> Resistente y flexible</li>
                                  <li>• <strong>TPU:</strong> Flexible y elástico</li>
                                  <li>• <strong>Nylon:</strong> Muy resistente</li>
                                  <li>• <strong>Resina:</strong> Para impresoras SLA/DLP</li>
                                </ul>
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
                            <Label htmlFor="customPrice" className="text-sm">Precio Personalizado (€/kg)</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p><strong>¿Qué es?</strong> El precio real que pagaste por tu bobina de filamento.</p>
                                <p className="mt-2"><strong>¿Cómo calcularlo?</strong> Divide el precio de tu bobina entre su peso. Ej: Bobina de 1kg a €25 = €25/kg</p>
                                <p className="mt-2">Si lo dejas vacío, se usará el precio predeterminado del material seleccionado.</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Input
                            id="customPrice"
                            type="number"
                            step="0.01"
                            value={customPrice}
                            onChange={(e) => setCustomPrice(e.target.value)}
                            placeholder="Opcional"
                            className="border-border/50 focus:border-primary transition-colors"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Capas de Color</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={addColorLayer}
                            className="gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Añadir Color
                          </Button>
                        </div>
                        {colorLayers.map((layer, index) => (
                          <Card key={layer.id} className="p-4 space-y-3 bg-muted/30">
                            <div className="flex items-center justify-between">
                              <Label className="font-semibold">Color {index + 1}</Label>
                              {colorLayers.length > 2 && (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => removeColorLayer(layer.id)}
                                  className="h-6 w-6"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Material</Label>
                                <Select
                                  value={layer.materialType}
                                  onValueChange={(val) => updateColorLayer(layer.id, "materialType", val)}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {materials.map((mat) => (
                                      <SelectItem key={mat.name} value={mat.name}>
                                        {mat.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Peso (g)</Label>
                                <Input
                                  type="number"
                                  value={layer.weight}
                                  onChange={(e) => updateColorLayer(layer.id, "weight", parseFloat(e.target.value))}
                                  className="h-9"
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Precio personalizado (€/kg) - Opcional</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={layer.customPrice}
                                onChange={(e) => updateColorLayer(layer.id, "customPrice", e.target.value)}
                                placeholder="Opcional"
                                className="h-9"
                              />
                            </div>
                          </Card>
                        ))}
                        <div className="text-sm text-muted-foreground bg-primary/5 p-3 rounded-lg">
                          <strong>Peso total:</strong> {colorLayers.reduce((sum, l) => sum + l.weight, 0)}g
                        </div>
                      </div>
                    )}

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
                            <p><strong>¿Qué es?</strong> La duración estimada que tardará en completarse la impresión.</p>
                            <p className="mt-2"><strong>¿Dónde encontrarlo?</strong> Tu software de laminado te muestra el tiempo estimado antes de exportar el archivo GCode.</p>
                            <p className="mt-2"><strong>Consejo:</strong> Añade un 5-10% extra para compensar posibles retrasos.</p>
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
                            <p><strong>¿Qué es?</strong> El precio que pagas por cada kilovatio-hora (kWh) de electricidad.</p>
                            <p className="mt-2"><strong>¿Dónde encontrarlo?</strong> En tu factura eléctrica, busca "Precio energía" o "€/kWh".</p>
                            <p className="mt-2"><strong>Referencia España:</strong> Entre €0.10 y €0.30 dependiendo de tu tarifa y horario.</p>
                            <p className="mt-2"><strong>Nota:</strong> Una impresora 3D consume aproximadamente 0.2 kW/h en funcionamiento.</p>
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
                          Coste de Mantenimiento (€)
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>¿Qué incluye?</strong></p>
                            <ul className="text-xs mt-1 space-y-1">
                              <li>• Desgaste de boquillas (nozzles)</li>
                              <li>• Rodamientos y correas</li>
                              <li>• Cinta adhesiva para la cama</li>
                              <li>• Tu tiempo de supervisión</li>
                              <li>• Post-procesado (lijado, pintura)</li>
                            </ul>
                            <p className="mt-2"><strong>Recomendación:</strong> €1-3 para piezas simples, €3-10 para complejas.</p>
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
                            <p><strong>¿Qué es?</strong> El porcentaje de beneficio que quieres obtener sobre tus costes totales.</p>
                            <p className="mt-2"><strong>Guía de márgenes:</strong></p>
                            <ul className="text-xs mt-1 space-y-1">
                              <li>• 20-30%: Piezas simples o producción en masa</li>
                              <li>• 30-50%: Piezas estándar</li>
                              <li>• 50-100%: Diseños personalizados o complejos</li>
                              <li>• 100%+: Diseños exclusivos o urgentes</li>
                            </ul>
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

                    <Button 
                      onClick={saveProject} 
                      className="w-full gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                    >
                      <Save className="w-4 h-4" />
                      Guardar Proyecto
                    </Button>
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
                          Material{isMulticolor && " (Multicolor)"}
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
            </TabsContent>

            {/* Tab: Pedidos */}
            <TabsContent value="orders" className="space-y-6 animate-in fade-in duration-500">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Formulario de Pedido Actual */}
                <Card className="p-6 space-y-6 shadow-[var(--shadow-card)] border-border/50 backdrop-blur-sm bg-card/95">
                  <div className="flex items-center gap-2 pb-4 border-b border-border">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    <h2 className="text-2xl font-semibold">Preparar Pedido</h2>
                  </div>

                  {/* Nombre del pedido */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="orderName" className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        Nombre del Pedido
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Nombre identificativo del pedido para poder guardarlo y consultarlo después. Ej: "Pedido Cliente Juan - 15/11"</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="orderName"
                      type="text"
                      value={orderName}
                      onChange={(e) => setOrderName(e.target.value)}
                      placeholder="Ej: Pedido María - Noviembre"
                      className="border-border/50 focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Botón para agregar cálculo actual */}
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm text-muted-foreground mb-2">¿Quieres agregar tu cálculo actual al pedido?</p>
                    <Button 
                      onClick={addCurrentCalculationToOrder}
                      variant="outline"
                      className="w-full gap-2"
                      disabled={!projectName.trim()}
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Cálculo Actual (€{costs.suggestedPrice})
                    </Button>
                  </div>

                  {/* Agregar item manual */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">O agregar item manualmente</Label>
                    
                    <div className="space-y-2">
                      <Label htmlFor="itemName">Nombre del Item</Label>
                      <Input
                        id="itemName"
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Ej: Figura Yoda"
                        className="border-border/50 focus:border-primary transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="itemQuantity">Cantidad</Label>
                        <Input
                          id="itemQuantity"
                          type="number"
                          step="1"
                          min="1"
                          value={newItemQuantity}
                          onChange={(e) => setNewItemQuantity(e.target.value)}
                          placeholder="1"
                          className="border-border/50 focus:border-primary transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="itemPrice">Precio Unitario (€)</Label>
                        <Input
                          id="itemPrice"
                          type="number"
                          step="0.01"
                          min="0"
                          value={newItemPrice}
                          onChange={(e) => setNewItemPrice(e.target.value)}
                          placeholder="10.00"
                          className="border-border/50 focus:border-primary transition-colors"
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={addItemToOrder}
                      className="w-full gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Item al Pedido
                    </Button>
                  </div>
                </Card>

                {/* Pedido Actual */}
                <Card className="p-6 space-y-4 shadow-[var(--shadow-card)] border-border/50 backdrop-blur-sm bg-card/95">
                  <div className="flex items-center gap-2 pb-4 border-b border-border">
                    <List className="w-5 h-5 text-primary" />
                    <h2 className="text-2xl font-semibold">Items del Pedido</h2>
                  </div>

                  {currentOrder.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No hay items en el pedido</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                        {currentOrder.map((item) => (
                          <div 
                            key={item.id}
                            className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1">
                              <p className="font-semibold">{item.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.quantity} × €{item.unitPrice.toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-lg">
                                €{(item.quantity * item.unitPrice).toFixed(2)}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => removeItemFromOrder(item.id)}
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-border space-y-4">
                        <div className="flex justify-between items-center p-5 rounded-xl bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-2 border-primary/30">
                          <span className="font-bold text-lg">Total del Pedido</span>
                          <span className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            €{calculateOrderTotal()}
                          </span>
                        </div>

                        <Button 
                          onClick={saveOrder}
                          className="w-full gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                          disabled={currentOrder.length === 0 || !orderName.trim()}
                        >
                          <Save className="w-4 h-4" />
                          Guardar Pedido
                        </Button>
                      </div>
                    </>
                  )}
                </Card>
              </div>

              {/* Pedidos Guardados */}
              {savedOrders.length > 0 && (
                <Card className="p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-4 border-b border-border">
                    <FileText className="w-5 h-5 text-primary" />
                    <h2 className="text-2xl font-semibold">Pedidos Guardados</h2>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedOrders.map((order) => (
                      <Card key={order.id} className="p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-muted/20">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg mb-1">{order.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.date).toLocaleDateString('es-ES', { 
                                day: '2-digit', 
                                month: 'short', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteOrder(order.id)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Items: </span>
                            <span className="font-medium">{order.items.length}</span>
                          </div>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {order.items.map((item) => (
                              <div key={item.id} className="text-xs text-muted-foreground pl-2 border-l-2 border-muted">
                                {item.quantity}× {item.name} - €{(item.quantity * item.unitPrice).toFixed(2)}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-border">
                          <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10">
                            <span className="font-semibold">Total:</span>
                            <span className="text-xl font-bold text-primary">€{order.total.toFixed(2)}</span>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadOrder(order)}
                            className="w-full gap-2"
                          >
                            <List className="w-3 h-3" />
                            Cargar Pedido
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* Tab: Proyectos */}
            <TabsContent value="projects" className="space-y-4 animate-in fade-in duration-500">
              {savedProjects.length === 0 ? (
                <Card className="p-12 text-center">
                  <List className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No hay proyectos guardados</h3>
                  <p className="text-muted-foreground">Comienza calculando costes y guarda tus proyectos para consultarlos después</p>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedProjects.map((project) => (
                    <Card key={project.id} className="p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-card/95">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-1">{project.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {new Date(project.date).toLocaleDateString('es-ES', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteProject(project.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-2 mb-4">
                        {project.isMulticolor ? (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Multicolor - </span>
                            <span className="font-medium">
                              {project.colorLayers?.reduce((sum, l) => sum + l.weight, 0)}g
                            </span>
                          </div>
                        ) : (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Material: </span>
                            <span className="font-medium">{project.materialType} ({project.weight}g)</span>
                          </div>
                        )}
                        <div className="text-sm">
                          <span className="text-muted-foreground">Tiempo: </span>
                          <span className="font-medium">{project.printTime}h</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Margen: </span>
                          <span className="font-medium">{project.margin}%</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-border">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Coste:</span>
                          <span className="font-semibold">€{project.totalCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Precio:</span>
                          <span className="font-semibold text-primary">€{project.suggestedPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Ganancia:</span>
                          <span className="font-bold text-secondary">€{project.profit.toFixed(2)}</span>
                        </div>
                      </div>

                      <Button
                        onClick={() => loadProject(project)}
                        variant="outline"
                        className="w-full mt-4"
                      >
                        Cargar Proyecto
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab: Amortización */}
            <TabsContent value="amortization" className="space-y-6 animate-in fade-in duration-500">
              <Card className="p-6 shadow-[var(--shadow-card)] border-border/50 backdrop-blur-sm bg-card/95">
                <div className="flex items-center gap-2 pb-4 border-b border-border">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h2 className="text-2xl font-semibold">Gestión de Amortización de Productos</h2>
                </div>

                {/* Formulario para agregar productos */}
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    Agregar Producto
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="newProductName">Nombre del Producto</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>El nombre de tu impresora o equipo. Ej: "Ender 3 Pro", "Elegoo Mars 3"</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="newProductName"
                        type="text"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        placeholder="Ej: Ender 3 Pro"
                        className="border-border/50 focus:border-primary transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="newProductCost">Coste del Producto (€)</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>¿Qué incluir?</strong> El precio de compra de tu impresora 3D más accesorios iniciales (cama de cristal, boquillas extras, etc.).</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="newProductCost"
                        type="number"
                        step="0.01"
                        value={newProductCost}
                        onChange={(e) => setNewProductCost(e.target.value)}
                        placeholder="300"
                        className="border-border/50 focus:border-primary transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="newProductMonthlyPrints">Impresiones al Mes</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Número estimado de proyectos o piezas que imprimes mensualmente con este equipo. Sé realista con tu capacidad y demanda.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="newProductMonthlyPrints"
                        type="number"
                        value={newProductMonthlyPrints}
                        onChange={(e) => setNewProductMonthlyPrints(e.target.value)}
                        placeholder="20"
                        className="border-border/50 focus:border-primary transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="newProductAvgProfit">Ganancia Promedio (€/impresión)</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Beneficio neto promedio que obtienes por cada proyecto con este equipo. Puedes calcularlo con la pestaña de calculadora y hacer un promedio.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="newProductAvgProfit"
                        type="number"
                        step="0.01"
                        value={newProductAvgProfit}
                        onChange={(e) => setNewProductAvgProfit(e.target.value)}
                        placeholder="10"
                        className="border-border/50 focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={addAmortizationProduct}
                    className="w-full md:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Producto
                  </Button>
                </div>
              </Card>

              {/* Lista de productos */}
              {amortizationProducts.length === 0 ? (
                <Card className="p-8 text-center bg-muted/30">
                  <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No tienes productos agregados</p>
                  <p className="text-sm text-muted-foreground mt-1">Agrega tu primera impresora o equipo para calcular su amortización</p>
                </Card>
              ) : (
                <div className="grid lg:grid-cols-2 gap-6">
                  {amortizationProducts.map((product) => {
                    const amortization = calculateAmortization(product);
                    return (
                      <Card key={product.id} className="p-6 space-y-4 shadow-[var(--shadow-elegant)] border-2 border-primary/20 backdrop-blur-sm bg-gradient-to-br from-card via-card to-primary/5">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-foreground">{product.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Inversión inicial: <span className="font-semibold text-foreground">€{product.cost.toFixed(2)}</span>
                            </p>
                          </div>
                          <Button
                            onClick={() => deleteAmortizationProduct(product.id)}
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="p-3 rounded-lg bg-muted/50">
                            <div className="text-muted-foreground">Impresiones/mes</div>
                            <div className="font-semibold text-foreground">{product.monthlyPrints}</div>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <div className="text-muted-foreground">Ganancia/impresión</div>
                            <div className="font-semibold text-foreground">€{product.avgPrintProfit.toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-border">
                          <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                            <div className="text-xs text-muted-foreground mb-1">Ganancia Mensual</div>
                            <div className="text-2xl font-bold text-primary">€{amortization.monthlyProfit}</div>
                          </div>

                          <div className="p-4 rounded-xl bg-gradient-to-r from-secondary/10 to-primary/10 border border-secondary/20">
                            <div className="text-xs text-muted-foreground mb-1">Meses para Amortizar</div>
                            <div className="text-2xl font-bold text-secondary">{amortization.monthsToAmortize}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              ({(parseFloat(amortization.monthsToAmortize) / 12).toFixed(1)} años)
                            </div>
                          </div>

                          <div className="p-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground">
                            <div className="text-xs opacity-90 mb-1">Ganancia Anual Proyectada</div>
                            <div className="text-2xl font-bold">€{amortization.yearlyProfit}</div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Info Card */}
              <Card className="p-5 bg-muted/50">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>
                      <strong className="text-foreground">¿Qué es la amortización?</strong> Es el tiempo que tardas en recuperar la inversión inicial de tu impresora a través de las ganancias.
                    </p>
                    <p>
                      Una vez amortizada, todas las ganancias futuras son beneficio neto (descontando costes operativos).
                    </p>
                    <p>
                      <strong className="text-foreground">Consejo:</strong> Gestiona varios equipos de forma independiente para tener un control preciso de tu negocio.
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
};
