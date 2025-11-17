import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Edit, Loader2, Image as ImageIcon, Eye, GripVertical, ChevronDown, ChevronRight, Package } from "lucide-react";
import { CatalogProjectFormModal } from "@/components/CatalogProjectFormModal";
import { CatalogPreviewModal } from "@/components/CatalogPreviewModal";
import { CatalogSectionFormModal } from "@/components/CatalogSectionFormModal";
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
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CatalogProject {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  project_id: string | null;
  colors: string[] | null;
  catalog_section_id: string | null;
  position: number;
  products?: CatalogProduct[];
}

interface CatalogProduct {
  id: string;
  reference_code: string;
  name: string;
  dimensions: string | null;
  price: number;
  catalog_product_section_id: string | null;
  position: number;
}

interface CatalogSection {
  id: string;
  title: string;
  position: number;
  projects?: CatalogProject[];
}

interface CatalogProductSection {
  id: string;
  title: string;
  position: number;
  products?: CatalogProduct[];
}

type CatalogItem = 
  | { type: 'section'; id: string; data: CatalogSection }
  | { type: 'project'; id: string; data: CatalogProject; sectionId?: string }
  | { type: 'product'; id: string; data: CatalogProduct; projectId: string; sectionId?: string }
  | { type: 'product-section'; id: string; data: CatalogProductSection; projectId: string };

export default function CatalogDetail() {
  const navigate = useNavigate();
  const { catalogId } = useParams<{ catalogId: string }>();
  const { user } = useAuth();
  const [catalogName, setCatalogName] = useState("");
  const [sections, setSections] = useState<CatalogSection[]>([]);
  const [projects, setProjects] = useState<CatalogProject[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productSectionModalOpen, setProductSectionModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | undefined>();
  const [editingSectionId, setEditingSectionId] = useState<string | undefined>();
  const [editingProductId, setEditingProductId] = useState<string | undefined>();
  const [editingProductSectionId, setEditingProductSectionId] = useState<string | undefined>();
  const [currentProjectIdForProduct, setCurrentProjectIdForProduct] = useState<string | undefined>();
  const [currentSectionId, setCurrentSectionId] = useState<string | undefined>();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (user && catalogId) {
      fetchCatalogData();
    }
  }, [user, catalogId]);

  const fetchCatalogData = async () => {
    try {
      setLoading(true);

      // Fetch catalog info
      const { data: catalogData, error: catalogError } = await supabase
        .from("catalogs")
        .select("name")
        .eq("id", catalogId)
        .single();

      if (catalogError) throw catalogError;
      setCatalogName(catalogData.name);

      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from("catalog_sections")
        .select("*")
        .eq("catalog_id", catalogId)
        .order("position", { ascending: true });

      if (sectionsError) throw sectionsError;

      // Fetch projects with products
      const { data: projectsData, error: projectsError } = await supabase
        .from("catalog_projects")
        .select(`
          *,
          catalog_products (
            *,
            catalog_product_sections (*)
          )
        `)
        .eq("catalog_id", catalogId)
        .order("position", { ascending: true });

      if (projectsError) throw projectsError;

      // Fetch product sections
      const { data: productSectionsData } = await supabase
        .from("catalog_product_sections")
        .select("*")
        .in("catalog_project_id", (projectsData || []).map(p => p.id))
        .order("position", { ascending: true });

      const productSectionsMap = new Map(
        (productSectionsData || []).map(ps => [ps.id, ps])
      );

      // Process projects with products
      const projectsWithProducts = (projectsData || []).map((project: any) => {
        const colorsArray = Array.isArray(project.colors) 
          ? project.colors.filter((c): c is string => typeof c === 'string') 
          : null;

        // Organize products by section
        const productsBySection = new Map<string, CatalogProduct[]>();
        const productsWithoutSection: CatalogProduct[] = [];

        (project.catalog_products || []).forEach((product: any) => {
          const productData: CatalogProduct = {
            id: product.id,
            reference_code: product.reference_code,
            name: product.name,
            dimensions: product.dimensions,
            price: product.price,
            catalog_product_section_id: product.catalog_product_section_id,
            position: product.position ?? 0,
          };

          if (product.catalog_product_section_id) {
            if (!productsBySection.has(product.catalog_product_section_id)) {
              productsBySection.set(product.catalog_product_section_id, []);
            }
            productsBySection.get(product.catalog_product_section_id)!.push(productData);
          } else {
            productsWithoutSection.push(productData);
          }
        });

        // Sort products within sections
        productsBySection.forEach((products, sectionId) => {
          products.sort((a, b) => a.position - b.position);
        });
        productsWithoutSection.sort((a, b) => a.position - b.position);

        return {
          ...project,
          colors: colorsArray,
          position: project.position ?? 0,
          catalog_section_id: project.catalog_section_id ?? null,
          products: [...productsWithoutSection, ...Array.from(productsBySection.values()).flat()],
          productSections: Array.from(productsBySection.keys()).map(sectionId => ({
            ...productSectionsMap.get(sectionId),
            products: productsBySection.get(sectionId) || [],
          })),
        };
      });

      setProjects(projectsWithProducts);

      // Organize sections with their projects
      const sectionsWithProjects = (sectionsData || []).map(section => ({
        ...section,
        projects: projectsWithProducts
          .filter(p => p.catalog_section_id === section.id)
          .sort((a, b) => a.position - b.position),
      }));

      setSections(sectionsWithProjects);

      // Expand all by default
      setExpandedSections(new Set(sectionsWithProjects.map(s => s.id)));
      setExpandedProjects(new Set(projectsWithProducts.map(p => p.id)));
    } catch (error) {
      console.error("Error fetching catalog data:", error);
      toast.error("Error al cargar los datos del catálogo");
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    // For now, we'll handle simple reordering within the same level
    // Full nested drag and drop would require more complex logic
    await fetchCatalogData();
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("¿Eliminar este proyecto? Se eliminarán todos sus productos.")) return;

    try {
      const { error } = await supabase
        .from("catalog_projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;
      toast.success("Proyecto eliminado");
      fetchCatalogData();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Error al eliminar el proyecto");
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm("¿Eliminar esta sección? Los proyectos dentro se moverán fuera de la sección.")) return;

    try {
      await supabase
        .from("catalog_projects")
        .update({ catalog_section_id: null })
        .eq("catalog_section_id", sectionId);

      const { error } = await supabase
        .from("catalog_sections")
        .delete()
        .eq("id", sectionId);

      if (error) throw error;
      toast.success("Sección eliminada");
      fetchCatalogData();
    } catch (error) {
      console.error("Error deleting section:", error);
      toast.error("Error al eliminar la sección");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("¿Eliminar este producto?")) return;

    try {
      const { error } = await supabase
        .from("catalog_products")
        .delete()
        .eq("id", productId);

      if (error) throw error;
      toast.success("Producto eliminado");
      fetchCatalogData();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Error al eliminar el producto");
    }
  };

  const handleEditProject = (projectId: string) => {
    setEditingProjectId(projectId);
    setProjectModalOpen(true);
  };

  const handleNewProject = (sectionId?: string) => {
    setCurrentSectionId(sectionId);
    setEditingProjectId(undefined);
    setProjectModalOpen(true);
  };

  const handleEditSection = (sectionId: string) => {
    setEditingSectionId(sectionId);
    setSectionModalOpen(true);
  };

  const handleNewSection = () => {
    setEditingSectionId(undefined);
    setSectionModalOpen(true);
  };

  const handleNewProduct = (projectId: string) => {
    setCurrentProjectIdForProduct(projectId);
    setEditingProductId(undefined);
    setProductModalOpen(true);
  };

  const handleEditProduct = (productId: string, projectId: string) => {
    setCurrentProjectIdForProduct(projectId);
    setEditingProductId(productId);
    setProductModalOpen(true);
  };

  const handleNewProductSection = (projectId: string) => {
    setCurrentProjectIdForProduct(projectId);
    setEditingProductSectionId(undefined);
    setProductSectionModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const projectsWithoutSection = projects.filter(p => !p.catalog_section_id).sort((a, b) => a.position - b.position);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate("/catalogs")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Catálogos
        </Button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{catalogName}</h1>
          <p className="text-muted-foreground">Vista unificada del catálogo</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewModalOpen(true)}>
            <Eye className="w-4 h-4 mr-2" />
            Vista Previa
          </Button>
          <Button variant="outline" onClick={handleNewSection}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Sección
          </Button>
          <Button onClick={() => handleNewProject()}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Proyecto
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-3">
          {/* Secciones con proyectos */}
          {sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              isExpanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              onEdit={handleEditSection}
              onDelete={handleDeleteSection}
              onNewProject={() => handleNewProject(section.id)}
              onEditProject={handleEditProject}
              onDeleteProject={handleDeleteProject}
              onNewProduct={handleNewProduct}
              onEditProduct={handleEditProduct}
              onDeleteProduct={handleDeleteProduct}
              onNewProductSection={handleNewProductSection}
              expandedProjects={expandedProjects}
              onToggleProject={toggleProject}
            />
          ))}

          {/* Proyectos sin sección */}
          {projectsWithoutSection.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isExpanded={expandedProjects.has(project.id)}
              onToggle={() => toggleProject(project.id)}
              onEdit={handleEditProject}
              onDelete={handleDeleteProject}
              onNewProduct={handleNewProduct}
              onEditProduct={handleEditProduct}
              onDeleteProduct={handleDeleteProduct}
              onNewProductSection={handleNewProductSection}
            />
          ))}

          {sections.length === 0 && projectsWithoutSection.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay proyectos en este catálogo</p>
                <Button onClick={() => handleNewProject()} variant="outline" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear primer proyecto
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DndContext>

      {catalogId && (
        <>
          <CatalogProjectFormModal
            open={projectModalOpen}
            onOpenChange={(open) => {
              setProjectModalOpen(open);
              if (!open) setCurrentSectionId(undefined);
            }}
            catalogId={catalogId}
            projectId={editingProjectId}
            sectionId={currentSectionId}
            onSuccess={fetchCatalogData}
          />
          <CatalogSectionFormModal
            open={sectionModalOpen}
            onOpenChange={setSectionModalOpen}
            catalogId={catalogId}
            sectionId={editingSectionId}
            onSuccess={fetchCatalogData}
          />
          <CatalogProductFormModal
            open={productModalOpen}
            onOpenChange={setProductModalOpen}
            catalogProjectId={currentProjectIdForProduct || ""}
            productId={editingProductId}
            onSuccess={fetchCatalogData}
          />
          <CatalogProductSectionFormModal
            open={productSectionModalOpen}
            onOpenChange={setProductSectionModalOpen}
            catalogProjectId={currentProjectIdForProduct || ""}
            sectionId={editingProductSectionId}
            onSuccess={fetchCatalogData}
          />
          <CatalogPreviewModal
            open={previewModalOpen}
            onOpenChange={setPreviewModalOpen}
            catalogId={catalogId}
            catalogName={catalogName}
          />
        </>
      )}
    </div>
  );
}

// Componente de Sección
function SectionCard({
  section,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onNewProject,
  onEditProject,
  onDeleteProject,
  onNewProduct,
  onEditProduct,
  onDeleteProduct,
  onNewProductSection,
  expandedProjects,
  onToggleProject,
}: {
  section: CatalogSection;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onNewProject: () => void;
  onEditProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onNewProduct: (projectId: string) => void;
  onEditProduct: (productId: string, projectId: string) => void;
  onDeleteProduct: (productId: string) => void;
  onNewProductSection: (projectId: string) => void;
  expandedProjects: Set<string>;
  onToggleProject: (projectId: string) => void;
}) {
  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onToggle}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
            <CardTitle className="text-lg">{section.title}</CardTitle>
            <span className="text-sm text-muted-foreground">
              ({section.projects?.length || 0} proyectos)
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onNewProject}>
              <Plus className="w-4 h-4 mr-1" />
              Proyecto
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onEdit(section.id)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(section.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {isExpanded && section.projects && section.projects.length > 0 && (
        <CardContent className="pt-0 pl-8 space-y-2">
          {section.projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isExpanded={expandedProjects.has(project.id)}
              onToggle={() => onToggleProject(project.id)}
              onEdit={onEditProject}
              onDelete={onDeleteProject}
              onNewProduct={onNewProduct}
              onEditProduct={onEditProduct}
              onDeleteProduct={onDeleteProduct}
              onNewProductSection={onNewProductSection}
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

// Componente de Proyecto
function ProjectCard({
  project,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onNewProduct,
  onEditProduct,
  onDeleteProduct,
  onNewProductSection,
}: {
  project: CatalogProject;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onNewProduct: (projectId: string) => void;
  onEditProduct: (productId: string, projectId: string) => void;
  onDeleteProduct: (productId: string) => void;
  onNewProductSection: (projectId: string) => void;
}) {
  const hasProducts = project.products && project.products.length > 0;

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={onToggle}
              disabled={!hasProducts}
            >
              {hasProducts ? (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )
              ) : null}
            </Button>
            {project.image_url && (
              <div className="w-12 h-12 flex-shrink-0 overflow-hidden rounded-lg">
                <img
                  src={project.image_url}
                  alt={project.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{project.name}</CardTitle>
              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                  {project.description}
                </p>
              )}
            </div>
            {hasProducts && (
              <span className="text-sm text-muted-foreground flex-shrink-0">
                {project.products!.length} producto(s)
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => onNewProduct(project.id)}>
              <Plus className="w-4 h-4 mr-1" />
              Producto
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onEdit(project.id)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(project.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {isExpanded && hasProducts && (
        <CardContent className="pt-0 pl-12 space-y-2">
          {project.products!.map((product) => (
            <Card key={product.id} className="bg-background">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.reference_code}</p>
                        {product.dimensions && (
                          <p className="text-xs text-muted-foreground">Dimensiones: {product.dimensions}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {product.price.toFixed(2)} €
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEditProduct(product.id, project.id)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onDeleteProduct(product.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
