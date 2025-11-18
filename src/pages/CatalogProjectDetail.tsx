import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Edit, Loader2, Package, GripVertical } from "lucide-react";
import { CatalogProductFormModal } from "@/components/CatalogProductFormModal";
import { CatalogProductSectionFormModal } from "@/components/CatalogProductSectionFormModal";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CatalogProduct {
  id: string;
  reference_code: string;
  name: string;
  dimensions: string | null;
  price: number;
  catalog_product_section_id: string | null;
  position: number;
}

interface CatalogProductSection {
  id: string;
  title: string;
  position: number;
}

interface ProjectData {
  name: string;
  colors: any;
}

type ProductItem = 
  | { type: 'section'; id: string; data: CatalogProductSection }
  | { type: 'product'; id: string; data: CatalogProduct };

export default function CatalogProjectDetail() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { catalogId, projectId } = useParams<{ catalogId: string; projectId: string }>();
  const { user } = useAuth();
  const [projectName, setProjectName] = useState("");
  const [projectColors, setProjectColors] = useState<string[]>([]);
  const [sections, setSections] = useState<CatalogProductSection[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | undefined>();
  const [editingSectionId, setEditingSectionId] = useState<string | undefined>();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (user && projectId) {
      fetchProjectData();
    }
  }, [user, projectId]);

  useEffect(() => {
    // Construir la lista de items ordenada
    const itemsList: ProductItem[] = [];
    
    // Combinar secciones y productos sin sección, ordenados por position
    const allItems: Array<{ position: number; type: 'section' | 'product'; id: string }> = [
      ...sections.map(s => ({ position: s.position, type: 'section' as const, id: s.id })),
      ...products.filter(p => !p.catalog_product_section_id).map(p => ({ position: p.position, type: 'product' as const, id: p.id }))
    ].sort((a, b) => a.position - b.position);

    // Agregar items en orden
    for (const item of allItems) {
      if (item.type === 'section') {
        const section = sections.find(s => s.id === item.id);
        if (section) {
          itemsList.push({ type: 'section', id: section.id, data: section });
          // Agregar productos de esta sección
          const sectionProducts = products
            .filter(p => p.catalog_product_section_id === section.id)
            .sort((a, b) => a.position - b.position);
          for (const product of sectionProducts) {
            itemsList.push({ type: 'product', id: product.id, data: product });
          }
        }
      } else {
        const product = products.find(p => p.id === item.id);
        if (product) {
          itemsList.push({ type: 'product', id: product.id, data: product });
        }
      }
    }

    setItems(itemsList);
  }, [sections, products]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);

      // Fetch project info
      const { data: projectData, error: projectError } = await supabase
        .from("catalog_projects")
        .select("name, colors")
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;
      setProjectName(projectData.name);
      const colorsArray = Array.isArray(projectData.colors) ? projectData.colors.filter((c): c is string => typeof c === 'string') : [];
      setProjectColors(colorsArray);

      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from("catalog_product_sections")
        .select("*")
        .eq("catalog_project_id", projectId)
        .order("position", { ascending: true });

      if (sectionsError) throw sectionsError;
      setSections(sectionsData || []);

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from("catalog_products")
        .select("*")
        .eq("catalog_project_id", projectId)
        .order("position", { ascending: true });

      if (productsError) throw productsError;
      setProducts((productsData || []).map((product: any) => ({
        ...product,
        position: product.position ?? 0,
        catalog_product_section_id: product.catalog_product_section_id ?? null,
      })));
    } catch (error) {
      console.error("Error fetching project data:", error);
      toast.error(t('catalog.detail.messages.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const saveOrder = async (newItems: ProductItem[]) => {
    setIsSaving(true);
    try {
      // Actualizar posiciones de secciones
      const sectionUpdates = newItems
        .filter(item => item.type === 'section')
        .map((item, index) => ({
          id: item.id,
          position: index,
        }));

      for (const update of sectionUpdates) {
        await supabase
          .from("catalog_product_sections")
          .update({ position: update.position })
          .eq("id", update.id);
      }

      // Actualizar posiciones y secciones de productos
      let productPosition = 0;
      let currentSectionId: string | null = null;
      const productUpdates: Array<{ id: string; position: number; catalog_product_section_id: string | null }> = [];

      for (const item of newItems) {
        if (item.type === 'section') {
          currentSectionId = item.id;
          productPosition = 0;
        } else if (item.type === 'product') {
          productUpdates.push({
            id: item.id,
            position: productPosition,
            catalog_product_section_id: currentSectionId,
          });
          productPosition++;
        }
      }

      // Actualizar todos los productos en batch
      for (const update of productUpdates) {
        await supabase
          .from("catalog_products")
          .update({
            position: update.position,
            catalog_product_section_id: update.catalog_product_section_id,
          })
          .eq("id", update.id);
      }

      toast.success(t('catalog.projectDetail.orderSaved'));
      fetchProjectData();
    } catch (error) {
      console.error("Error saving order:", error);
      toast.error(t('catalog.projectDetail.errorSavingOrder'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeIndex = items.findIndex(item => item.id === active.id);
    const overIndex = items.findIndex(item => item.id === over.id);

    if (activeIndex === -1 || overIndex === -1) return;

    const newItems = [...items];
    const [removed] = newItems.splice(activeIndex, 1);
    newItems.splice(overIndex, 0, removed);

    setItems(newItems);
    await saveOrder(newItems);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm(t('catalog.projectDetail.confirmDeleteProduct'))) return;

    try {
      const { error } = await supabase
        .from("catalog_products")
        .delete()
        .eq("id", productId);

      if (error) throw error;
      toast.success(t('catalog.detail.messages.productDeleted'));
      fetchProjectData();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error(t('catalog.detail.messages.errorDeletingProduct'));
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm(t('catalog.projectDetail.confirmDeleteSection'))) return;

    try {
      // Mover productos fuera de la sección
      await supabase
        .from("catalog_products")
        .update({ catalog_product_section_id: null })
        .eq("catalog_product_section_id", sectionId);

      // Eliminar la sección
      const { error } = await supabase
        .from("catalog_product_sections")
        .delete()
        .eq("id", sectionId);

      if (error) throw error;
      toast.success(t('catalog.detail.messages.sectionDeleted'));
      fetchProjectData();
    } catch (error) {
      console.error("Error deleting section:", error);
      toast.error(t('catalog.detail.messages.errorDeletingSection'));
    }
  };

  const handleEditProduct = (productId: string) => {
    setEditingProductId(productId);
    setProductModalOpen(true);
  };

  const handleNewProduct = () => {
    setEditingProductId(undefined);
    setProductModalOpen(true);
  };

  const handleEditSection = (sectionId: string) => {
    setEditingSectionId(sectionId);
    setSectionModalOpen(true);
  };

  const handleNewSection = () => {
    setEditingSectionId(undefined);
    setSectionModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const allItemIds = items.map(item => item.id);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(`/catalogs/${catalogId}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('catalog.projectDetail.backToCatalog')}
        </Button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{projectName}</h1>
          <p className="text-muted-foreground">{t('catalog.projectDetail.projectProducts')}</p>
          {projectColors.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-medium">{t('catalog.projectDetail.colors')}:</span>
              <div className="flex gap-1">
                {projectColors.map((color, idx) => (
                  <div
                    key={idx}
                    className="w-6 h-6 rounded-md border-2 border-border"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleNewSection}>
            <Plus className="w-4 h-4 mr-2" />
            {t('catalog.detail.section.addProject')}
          </Button>
          <Button onClick={handleNewProduct}>
            <Plus className="w-4 h-4 mr-2" />
            {t('catalog.detail.project.addProduct')}
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('catalog.projectDetail.noProducts')}</p>
            <Button onClick={handleNewProduct} variant="outline" className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              {t('catalog.projectDetail.createFirstProduct')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={allItemIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id}>
                  {item.type === 'section' ? (
                    <ProductSectionHeader section={item.data} onEdit={handleEditSection} onDelete={handleDeleteSection} />
                  ) : (
                    <SortableProductCard
                      product={item.data}
                      onEdit={handleEditProduct}
                      onDelete={handleDeleteProduct}
                      viewMode="list"
                    />
                  )}
                </div>
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeId ? (
              <div className="opacity-50">
                {items.find(item => item.id === activeId)?.type === 'section' ? (
                  <ProductSectionHeader
                    section={sections.find(s => s.id === activeId)!}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                ) : (
                  <ProductCard
                    product={products.find(p => p.id === activeId)!}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    viewMode="list"
                  />
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-3 shadow-lg flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t('catalog.projectDetail.savingOrder')}</span>
        </div>
      )}

      {projectId && (
        <>
          <CatalogProductFormModal
            open={productModalOpen}
            onOpenChange={setProductModalOpen}
            catalogProjectId={projectId}
            productId={editingProductId}
            onSuccess={fetchProjectData}
          />
          <CatalogProductSectionFormModal
            open={sectionModalOpen}
            onOpenChange={setSectionModalOpen}
            catalogProjectId={projectId}
            sectionId={editingSectionId}
            onSuccess={fetchProjectData}
          />
        </>
      )}
    </div>
  );
}

// Componente para el header de sección de productos
function ProductSectionHeader({ section, onEdit, onDelete }: { section: CatalogProductSection; onEdit: (id: string) => void; onDelete: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="bg-muted/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="w-5 h-5" />
            </div>
            <CardTitle className="text-xl">{section.title}</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(section.id)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(section.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente para producto sortable
function SortableProductCard({ product, onEdit, onDelete, viewMode }: {
  product: CatalogProduct;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  viewMode: 'grid' | 'list';
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  return (
    <ProductCard
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      product={product}
      onEdit={onEdit}
      onDelete={onDelete}
      viewMode={viewMode}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  );
}

// Componente base para producto
function ProductCard({ product, onEdit, onDelete, viewMode, style, dragHandleProps, ref: forwardedRef }: {
  product: CatalogProduct;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  viewMode: 'grid' | 'list';
  style?: React.CSSProperties;
  dragHandleProps?: any;
  ref?: React.Ref<HTMLDivElement>;
}) {
  const cardContent = viewMode === 'grid' ? (
    <CardContent className="p-6">
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1 flex-1">
            <p className="text-sm text-muted-foreground">{product.reference_code}</p>
            <h3 className="font-semibold text-lg">{product.name}</h3>
          </div>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onEdit(product.id)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(product.id)}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>

        {product.dimensions && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{t('catalog.productForm.dimensions')}:</span> {product.dimensions}
          </p>
        )}

        <p className="text-lg font-bold text-primary">
          {product.price.toFixed(2)} €
        </p>
      </div>
    </CardContent>
  ) : (
    <CardContent className="p-4">
      <div className="flex items-center gap-4">
        {dragHandleProps && (
          <div
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="w-5 h-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground mb-1">{product.reference_code}</p>
              <h3 className="font-semibold text-base mb-1">{product.name}</h3>
              {product.dimensions && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">{t('catalog.productForm.dimensions')}:</span> {product.dimensions}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary">
                {product.price.toFixed(2)} €
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEdit(product.id)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(product.id)}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>
    </CardContent>
  );

  return (
    <Card ref={forwardedRef} style={style} className="hover:shadow-lg transition-shadow">
      {cardContent}
    </Card>
  );
}
