import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Trash2, Plus, GripVertical, Upload, X, Crown } from "lucide-react";
import { useTierFeatures } from "@/hooks/useTierFeatures";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Card, CardContent } from "@/components/ui/card";

interface Material {
  id: string;
  name: string;
  price_per_kg: number;
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

interface ProjectFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string | null;
  onSuccess: () => void;
}

export function ProjectFormModal({ open, onOpenChange, projectId, onSuccess }: ProjectFormModalProps) {
  const { user } = useAuth();
  const { isPro, isEnterprise } = useTierFeatures();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projectName, setProjectName] = useState("");
  const [printTimeHours, setPrintTimeHours] = useState("");
  const [profitMargin, setProfitMargin] = useState("30");
  const [notes, setNotes] = useState("");
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([]);
  const [nextLineId, setNextLineId] = useState(1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (open) {
      fetchMaterials();
      if (projectId) {
        loadProject(projectId);
      } else {
        resetForm();
      }
    }
  }, [open, projectId]);

  const resetForm = () => {
    setProjectName("");
    setPrintTimeHours("");
    setProfitMargin("30");
    setNotes("");
    setCalculatedPrice(null);
    setInvoiceLines([]);
    setNextLineId(1);
    setImageFile(null);
    setImagePreview(null);
    setCurrentImageUrl(null);
  };

  const loadProject = async (id: string) => {
    if (!user) return;

    try {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (projectError) throw projectError;

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
      setCurrentImageUrl(project.image_url || null);
      setImagePreview(null);
      setImageFile(null);

      const lines: InvoiceLine[] = [];
      let lineCounter = 1;

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
    setHasUnsavedChanges(true);
  };

  const updateInvoiceLine = (id: string, field: keyof InvoiceLine, value: string) => {
    setHasUnsavedChanges(true);
    setInvoiceLines(lines => lines.map(line => {
      if (line.id !== id) return line;
      
      const updated = { ...line, [field]: value };
      
      if (field === 'materialId' && value) {
        const material = materials.find(m => m.id === value);
        if (material) {
          updated.description = material.name;
          updated.unitPrice = (material.price_per_kg / 1000).toFixed(4);
        }
      }
      
      const qty = parseFloat(updated.quantity) || 0;
      const price = parseFloat(updated.unitPrice) || 0;
      updated.total = qty * price;
      
      return updated;
    }));
  };

  const removeInvoiceLine = (id: string) => {
    setInvoiceLines(lines => lines.filter(line => line.id !== id));
    setHasUnsavedChanges(true);
  };

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor selecciona un archivo de imagen válido");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen debe ser menor a 5MB");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setHasUnsavedChanges(true);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (projectId) {
      setCurrentImageUrl(null);
    }
    setHasUnsavedChanges(true);
  };

  const uploadImage = async (projectIdForUpload: string): Promise<string | null> => {
    if (!imageFile || !user) return null;

    setUploadingImage(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}/${projectIdForUpload}.${fileExt}`;

      // Delete old image if exists
      if (currentImageUrl) {
        const oldPath = currentImageUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('project-images').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('project-images')
        .upload(fileName, imageFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('project-images')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error: any) {
      toast.error("Error al subir imagen: " + error.message);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProject = async () => {
    if (!user || calculatedPrice === null || !projectName) {
      toast.error("Calcula el precio primero y añade un nombre");
      return;
    }

    const materialLines = invoiceLines.filter(line => line.type === 'material' && line.materialId);
    
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

    const laborCost = invoiceLines
      .filter(l => l.type === 'labor')
      .reduce((sum, l) => sum + l.total, 0);
    
    const electricityCost = invoiceLines
      .filter(l => l.type === 'amortization')
      .reduce((sum, l) => sum + l.total, 0);

    try {
      if (projectId) {
        // Upload image if there's a new one
        let imageUrl = currentImageUrl;
        if (imageFile) {
          const uploadedUrl = await uploadImage(projectId);
          if (uploadedUrl) imageUrl = uploadedUrl;
        } else if (!currentImageUrl && imagePreview === null) {
          // User removed the image
          imageUrl = null;
        }

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
            image_url: imageUrl,
          })
          .eq("id", projectId);

        if (projectError) throw projectError;

        await supabase.from("project_materials").delete().eq("project_id", projectId);

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

        // Upload image for new project
        if (imageFile && project) {
          const imageUrl = await uploadImage(project.id);
          if (imageUrl) {
            await supabase
              .from("projects")
              .update({ image_url: imageUrl })
              .eq("id", project.id);
          }
        }

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
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Error al guardar proyecto: " + error.message);
    }
  };

  const handleCloseAttempt = (shouldClose: boolean) => {
    if (!shouldClose) return;
    
    if (hasUnsavedChanges && !isEditMode) {
      setShowExitDialog(true);
    } else {
      onOpenChange(false);
    }
  };

  const confirmExit = () => {
    setShowExitDialog(false);
    setHasUnsavedChanges(false);
    resetForm();
    onOpenChange(false);
  };

  const { subtotal, total } = calculateTotals();

  return (
    <>
    <Dialog open={open} onOpenChange={handleCloseAttempt}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{projectId ? 'Editar Proyecto' : 'Nuevo Proyecto'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="projectName">Nombre del Proyecto *</Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Ej: Pieza para cliente X"
            />
          </div>

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

          {(isPro || isEnterprise) && (
            <div className="space-y-2">
              <Label>Imagen del Proyecto</Label>
              {(imagePreview || currentImageUrl) ? (
                <div className="relative">
                  <img
                    src={imagePreview || currentImageUrl || ''}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <Label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Click para subir una imagen (máx. 5MB)
                    </span>
                  </Label>
                </div>
              )}
            </div>
          )}

          {!isPro && !isEnterprise && (
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Crown className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Agrega imágenes a tus proyectos</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Actualiza a Pro o Business para subir imágenes de tus proyectos.
                  </p>
                </div>
              </div>
            </div>
          )}

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
              <Button 
                onClick={handleSaveProject} 
                variant="default" 
                className="w-full"
                disabled={uploadingImage}
              >
                <Save className="w-4 h-4 mr-2" />
                {uploadingImage ? 'Subiendo imagen...' : projectId ? 'Actualizar Proyecto' : 'Crear Proyecto'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
      <AlertDialogContent className="z-[100]">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Salir sin guardar?</AlertDialogTitle>
          <AlertDialogDescription>
            Tienes cambios sin guardar. Si sales ahora, se perderán todos los datos ingresados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continuar editando</AlertDialogCancel>
          <AlertDialogAction onClick={confirmExit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Salir sin guardar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
