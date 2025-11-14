import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Trash2, Plus, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Material {
  id: string;
  name: string;
  price_per_kg: number;
}

interface ProjectMaterial {
  materialId: string;
  weightGrams: string;
}

type LineType = 'material' | 'labor' | 'packaging' | 'amortization' | 'print_time' | 'other';

interface InvoiceLine {
  id: string;
  type: LineType;
  description: string;
  quantity: string;
  unitPrice: string;
  total: number;
  materialId?: string;
}

// Componente para cada fila sortable
interface SortableRowProps {
  line: InvoiceLine;
  materials: Material[];
  updateInvoiceLine: (id: string, field: keyof InvoiceLine, value: string) => void;
  removeInvoiceLine: (id: string) => void;
  getLineTypeLabel: (type: LineType) => string;
}

function SortableRow({ line, materials, updateInvoiceLine, removeInvoiceLine, getLineTypeLabel }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: line.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing hover:bg-muted/50 rounded p-1"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="font-medium text-xs">
        {getLineTypeLabel(line.type)}
      </TableCell>
      <TableCell>
        {line.type === 'material' ? (
          <Select 
            value={line.materialId || ''} 
            onValueChange={(value) => updateInvoiceLine(line.id, 'materialId', value)}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Selecciona material" />
            </SelectTrigger>
            <SelectContent>
              {materials.length === 0 ? (
                <div className="p-2 text-xs text-muted-foreground text-center">
                  No hay materiales
                </div>
              ) : (
                materials.map((material) => (
                  <SelectItem key={material.id} value={material.id}>
                    {material.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        ) : (
          <Input
            className="h-8"
            value={line.description}
            onChange={(e) => updateInvoiceLine(line.id, 'description', e.target.value)}
            placeholder="Descripción"
          />
        )}
      </TableCell>
      <TableCell>
        <Input
          className="h-8"
          type="number"
          step="0.01"
          value={line.quantity}
          onChange={(e) => updateInvoiceLine(line.id, 'quantity', e.target.value)}
          placeholder="0"
        />
      </TableCell>
      <TableCell>
        <Input
          className="h-8"
          type="number"
          step="0.01"
          value={line.unitPrice}
          onChange={(e) => updateInvoiceLine(line.id, 'unitPrice', e.target.value)}
          placeholder="0.00"
        />
      </TableCell>
      <TableCell className="text-right font-medium">
        €{line.total.toFixed(2)}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => removeInvoiceLine(line.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

const CalculatorPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projectMaterials, setProjectMaterials] = useState<ProjectMaterial[]>([]);
  const [projectName, setProjectName] = useState("");
  const [printTimeHours, setPrintTimeHours] = useState("");
  const [profitMargin, setProfitMargin] = useState("30");
  const [notes, setNotes] = useState("");
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Sistema de líneas tipo factura
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([]);
  const [nextLineId, setNextLineId] = useState(1);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const loadData = async () => {
      await fetchMaterials();
      if (projectId) {
        await loadProject(projectId);
      }
    };
    loadData();
  }, [user, projectId]);

  const loadProject = async (id: string) => {
    if (!user) return;

    try {
      // Cargar proyecto
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (projectError) throw projectError;

      // Cargar materiales del proyecto con información completa
      const { data: projMaterials, error: materialsError } = await supabase
        .from("project_materials")
        .select("material_id, weight_grams, material_cost, materials(name, price_per_kg)")
        .eq("project_id", id);

      if (materialsError) throw materialsError;

      setProjectName(project.name);
      setPrintTimeHours(project.print_time_hours?.toString() || "");
      setNotes(project.notes || "");
      setProfitMargin(project.profit_margin?.toString() || "30");
      setCalculatedPrice(project.total_price);
      setIsEditMode(true);

      // Convertir materiales a líneas de factura
      const lines: InvoiceLine[] = [];
      let lineCounter = 1;

      // Añadir materiales como líneas
      if (projMaterials && projMaterials.length > 0) {
        projMaterials.forEach((pm: any) => {
          if (pm.materials) {
            const unitPrice = (pm.materials.price_per_kg / 1000).toFixed(4);
            lines.push({
              id: `line-${lineCounter++}`,
              type: 'material',
              description: pm.materials.name,
              quantity: pm.weight_grams.toString(),
              unitPrice: unitPrice,
              total: pm.material_cost,
              materialId: pm.material_id
            });
          }
        });
      }

      // Añadir mano de obra si existe
      if (project.labor_cost && project.labor_cost > 0) {
        lines.push({
          id: `line-${lineCounter++}`,
          type: 'labor',
          description: 'Mano de obra',
          quantity: project.print_time_hours?.toString() || '1',
          unitPrice: (project.labor_cost / (project.print_time_hours || 1)).toFixed(2),
          total: project.labor_cost
        });
      }

      // Añadir amortización/electricidad si existe
      if (project.electricity_cost && project.electricity_cost > 0) {
        lines.push({
          id: `line-${lineCounter++}`,
          type: 'amortization',
          description: 'Amortización / Electricidad',
          quantity: '1',
          unitPrice: project.electricity_cost.toFixed(2),
          total: project.electricity_cost
        });
      }

      setInvoiceLines(lines);
      setNextLineId(lineCounter);

    } catch (error: any) {
      toast.error("Error al cargar proyecto");
      console.error(error);
    }
  };

  const fetchMaterials = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("materials")
        .select("id, name, price_per_kg")
        .eq("user_id", user.id)
        .order("is_favorite", { ascending: false })
        .order("name", { ascending: true });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error: any) {
      toast.error("Error al cargar materiales");
    }
  };

  const getLineTypeLabel = (type: LineType): string => {
    const labels: Record<LineType, string> = {
      material: 'Material',
      labor: 'Mano de Obra',
      packaging: 'Embalaje',
      amortization: 'Amortización',
      print_time: 'Horas de Impresión',
      other: 'Otros'
    };
    return labels[type];
  };

  const addInvoiceLine = (type: LineType) => {
    const newLine: InvoiceLine = {
      id: `line-${nextLineId}`,
      type,
      description: '',
      quantity: '1',
      unitPrice: '0',
      total: 0
    };
    setInvoiceLines([...invoiceLines, newLine]);
    setNextLineId(nextLineId + 1);
  };

  const updateInvoiceLine = (id: string, field: keyof InvoiceLine, value: string) => {
    setInvoiceLines(lines => lines.map(line => {
      if (line.id !== id) return line;
      
      const updated = { ...line, [field]: value };
      
      // Si es un material, actualizar descripción y precio automáticamente
      if (field === 'materialId' && value) {
        const material = materials.find(m => m.id === value);
        if (material) {
          updated.description = material.name;
          updated.unitPrice = (material.price_per_kg / 1000).toFixed(4); // precio por gramo
        }
      }
      
      // Calcular total
      const qty = parseFloat(updated.quantity) || 0;
      const price = parseFloat(updated.unitPrice) || 0;
      updated.total = qty * price;
      
      return updated;
    }));
  };

  const removeInvoiceLine = (id: string) => {
    setInvoiceLines(lines => lines.filter(line => line.id !== id));
  };

  // Drag and Drop handlers
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setInvoiceLines((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const calculateTotals = () => {
    const subtotal = invoiceLines.reduce((sum, line) => sum + line.total, 0);
    const margin = parseFloat(profitMargin) || 0;
    const total = subtotal * (1 + margin / 100);
    return { subtotal, total };
  };

  const calculateAndDisplay = () => {
    if (invoiceLines.length === 0) {
      toast.error("Añade al menos una línea de concepto");
      return;
    }
    
    const { total } = calculateTotals();
    setCalculatedPrice(total);
  };

  const handleSaveProject = async () => {
    if (!user || calculatedPrice === null || !projectName) {
      toast.error("Calcula el precio primero y añade un nombre");
      return;
    }

    // Extraer materiales de las líneas de factura
    const materialLines = invoiceLines.filter(line => line.type === 'material' && line.materialId);
    
    // Calcular peso total y costo total de materiales
    let totalWeightGrams = 0;
    let totalMaterialCost = 0;
    
    for (const line of materialLines) {
      if (!line.materialId) continue;
      const material = materials.find(m => m.id === line.materialId);
      if (!material) continue;
      const weightGrams = parseFloat(line.quantity) || 0;
      totalWeightGrams += weightGrams;
      totalMaterialCost += line.total;
    }

    // Calcular otros costos desde las líneas
    const laborCost = invoiceLines
      .filter(l => l.type === 'labor')
      .reduce((sum, l) => sum + l.total, 0);
    
    const electricityCost = invoiceLines
      .filter(l => l.type === 'amortization')
      .reduce((sum, l) => sum + l.total, 0);

    try {
      if (isEditMode && projectId) {
        // Actualizar proyecto existente
        const { error: projectError } = await supabase
          .from("projects")
          .update({
            name: projectName,
            weight_grams: totalWeightGrams,
            print_time_hours: parseFloat(printTimeHours) || 0,
            electricity_cost: electricityCost,
            material_cost: totalMaterialCost,
            labor_cost: laborCost,
            profit_margin: parseFloat(profitMargin),
            total_price: calculatedPrice,
            notes: notes || null,
          })
          .eq("id", projectId);

        if (projectError) throw projectError;

        // Eliminar materiales anteriores
        await supabase.from("project_materials").delete().eq("project_id", projectId);

        // Insertar nuevos materiales
        if (materialLines.length > 0) {
          const projectMaterialsData = materialLines.map(line => {
            const material = materials.find(m => m.id === line.materialId);
            if (!material) return null;
            return {
              project_id: projectId,
              material_id: line.materialId,
              weight_grams: parseFloat(line.quantity) || 0,
              material_cost: line.total,
            };
          }).filter(Boolean);

          if (projectMaterialsData.length > 0) {
            const { error: materialsError } = await supabase
              .from("project_materials")
              .insert(projectMaterialsData);

            if (materialsError) throw materialsError;
          }
        }

        toast.success("Proyecto actualizado");
      } else {
        // Insertar nuevo proyecto
        const { data: project, error: projectError } = await supabase
          .from("projects")
          .insert({
            user_id: user.id,
            name: projectName,
            weight_grams: totalWeightGrams,
            print_time_hours: parseFloat(printTimeHours) || 0,
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
        if (materialLines.length > 0) {
          const projectMaterialsData = materialLines.map(line => {
            const material = materials.find(m => m.id === line.materialId);
            if (!material) return null;
            return {
              project_id: project.id,
              material_id: line.materialId,
              weight_grams: parseFloat(line.quantity) || 0,
              material_cost: line.total,
            };
          }).filter(Boolean);

          if (projectMaterialsData.length > 0) {
            const { error: materialsError } = await supabase
              .from("project_materials")
              .insert(projectMaterialsData);

            if (materialsError) throw materialsError;
          }
        }

        toast.success("Proyecto guardado");
      }
      
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

  const { subtotal, total } = calculateTotals();

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{isEditMode ? 'Editar Proyecto' : 'Calculadora de Precios'}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Añade líneas de concepto tipo factura</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sección de líneas tipo factura */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-lg font-semibold">Conceptos / Líneas</Label>
              <div className="flex gap-2 flex-wrap">
                <Button type="button" variant="outline" size="sm" onClick={() => addInvoiceLine('material')}>
                  <Plus className="w-3 h-3 mr-1" />
                  Material
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addInvoiceLine('labor')}>
                  <Plus className="w-3 h-3 mr-1" />
                  Mano de Obra
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addInvoiceLine('packaging')}>
                  <Plus className="w-3 h-3 mr-1" />
                  Embalaje
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addInvoiceLine('amortization')}>
                  <Plus className="w-3 h-3 mr-1" />
                  Amortización
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addInvoiceLine('print_time')}>
                  <Plus className="w-3 h-3 mr-1" />
                  Horas Impresión
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addInvoiceLine('other')}>
                  <Plus className="w-3 h-3 mr-1" />
                  Otros
                </Button>
              </div>
            </div>

            {invoiceLines.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>No hay líneas añadidas.</p>
                  <p className="text-sm">Usa los botones de arriba para añadir conceptos</p>
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead className="w-[120px]">Tipo</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="w-[100px]">Cantidad</TableHead>
                        <TableHead className="w-[120px]">Precio Unit.</TableHead>
                        <TableHead className="w-[120px] text-right">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <SortableContext
                      items={invoiceLines.map(line => line.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <TableBody>
                        {invoiceLines.map((line) => (
                          <SortableRow 
                            key={line.id} 
                            line={line}
                            materials={materials}
                            updateInvoiceLine={updateInvoiceLine}
                            removeInvoiceLine={removeInvoiceLine}
                            getLineTypeLabel={getLineTypeLabel}
                          />
                        ))}
                      </TableBody>
                    </SortableContext>
                  </Table>
                </DndContext>

                {/* Totales */}
                <div className="border-t bg-muted/30 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">€{subtotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="profitMargin" className="text-sm text-muted-foreground">Margen de Beneficio:</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          id="profitMargin"
                          type="number"
                          step="1"
                          value={profitMargin}
                          onChange={(e) => setProfitMargin(e.target.value)}
                          className="w-20 h-8"
                        />
                        <span className="text-sm">%</span>
                      </div>
                    </div>
                    <span className="text-sm font-medium">
                      +€{(subtotal * (parseFloat(profitMargin) || 0) / 100).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>TOTAL:</span>
                    <span className="text-primary">€{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles adicionales del proyecto..."
            />
          </div>

          <div className="flex gap-2">
            {calculatedPrice === null && (
              <Button onClick={calculateAndDisplay} className="flex-1">
                Calcular Total
              </Button>
            )}
            
            {calculatedPrice !== null && (
              <Button onClick={handleSaveProject} variant="default" className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {isEditMode ? 'Actualizar Proyecto' : 'Crear Proyecto'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalculatorPage;
