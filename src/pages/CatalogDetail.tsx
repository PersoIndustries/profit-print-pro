import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Edit, Loader2, Image as ImageIcon, Eye, GripVertical } from "lucide-react";
import { CatalogProjectFormModal } from "@/components/CatalogProjectFormModal";
import { CatalogPreviewModal } from "@/components/CatalogPreviewModal";
import { CatalogSectionFormModal } from "@/components/CatalogSectionFormModal";
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

interface CatalogProject {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  project_id: string | null;
  colors: string[] | null;
  catalog_section_id: string | null;
  position: number;
  _count?: { products: number };
}

interface CatalogSection {
  id: string;
  title: string;
  position: number;
}

type CatalogItem = 
  | { type: 'section'; id: string; data: CatalogSection }
  | { type: 'project'; id: string; data: CatalogProject };

export default function CatalogDetail() {
  const navigate = useNavigate();
  const { catalogId } = useParams<{ catalogId: string }>();
  const { user } = useAuth();
  const [catalogName, setCatalogName] = useState("");
  const [sections, setSections] = useState<CatalogSection[]>([]);
  const [projects, setProjects] = useState<CatalogProject[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | undefined>();
  const [editingSectionId, setEditingSectionId] = useState<string | undefined>();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<CatalogItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (user && catalogId) {
      fetchCatalogData();
    }
  }, [user, catalogId]);

  useEffect(() => {
    // Construir la lista de items ordenada
    const itemsList: CatalogItem[] = [];
    
    // Combinar secciones y proyectos sin sección, ordenados por position
    const allItems: Array<{ position: number; type: 'section' | 'project'; id: string }> = [
      ...sections.map(s => ({ position: s.position, type: 'section' as const, id: s.id })),
      ...projects.filter(p => !p.catalog_section_id).map(p => ({ position: p.position, type: 'project' as const, id: p.id }))
    ].sort((a, b) => a.position - b.position);

    // Agregar items en orden
    for (const item of allItems) {
      if (item.type === 'section') {
        const section = sections.find(s => s.id === item.id);
        if (section) {
          itemsList.push({ type: 'section', id: section.id, data: section });
          // Agregar proyectos de esta sección
          const sectionProjects = projects
            .filter(p => p.catalog_section_id === section.id)
            .sort((a, b) => a.position - b.position);
          for (const project of sectionProjects) {
            itemsList.push({ type: 'project', id: project.id, data: project });
          }
        }
      } else {
        const project = projects.find(p => p.id === item.id);
        if (project) {
          itemsList.push({ type: 'project', id: project.id, data: project });
        }
      }
    }

    setItems(itemsList);
  }, [sections, projects]);

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
      setSections(sectionsData || []);

      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("catalog_projects")
        .select(`
          *,
          catalog_products (count)
        `)
        .eq("catalog_id", catalogId)
        .order("position", { ascending: true });

      if (projectsError) throw projectsError;

      const projectsWithCount = (projectsData || []).map((project: any) => ({
        ...project,
        colors: Array.isArray(project.colors) ? project.colors.filter((c): c is string => typeof c === 'string') : null,
        position: project.position ?? 0,
        catalog_section_id: project.catalog_section_id ?? null,
        _count: {
          products: project.catalog_products?.[0]?.count || 0
        }
      }));

      setProjects(projectsWithCount);
    } catch (error) {
      console.error("Error fetching catalog data:", error);
      toast.error("Error al cargar los datos del catálogo");
    } finally {
      setLoading(false);
    }
  };

  const saveOrder = async (newItems: CatalogItem[]) => {
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
          .from("catalog_sections")
          .update({ position: update.position })
          .eq("id", update.id);
      }

      // Actualizar posiciones y secciones de proyectos
      let projectPosition = 0;
      let currentSectionId: string | null = null;
      const projectUpdates: Array<{ id: string; position: number; catalog_section_id: string | null }> = [];

      for (const item of newItems) {
        if (item.type === 'section') {
          currentSectionId = item.id;
          projectPosition = 0;
        } else if (item.type === 'project') {
          projectUpdates.push({
            id: item.id,
            position: projectPosition,
            catalog_section_id: currentSectionId,
          });
          projectPosition++;
        }
      }

      // Actualizar todos los proyectos en batch
      for (const update of projectUpdates) {
        await supabase
          .from("catalog_projects")
          .update({
            position: update.position,
            catalog_section_id: update.catalog_section_id,
          })
          .eq("id", update.id);
      }

      toast.success("Orden guardado");
      fetchCatalogData();
    } catch (error) {
      console.error("Error saving order:", error);
      toast.error("Error al guardar el orden");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    const draggedItem = items.find(item => item.id === event.active.id) || null;
    setActiveItem(draggedItem);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveItem(null);

    if (!over || active.id === over.id) return;

    const activeIndex = items.findIndex(item => item.id === active.id);
    const overIndex = items.findIndex(item => item.id === over.id);
    const overItem = items.find(item => item.id === over.id);

    if (activeIndex === -1 || overIndex === -1) return;

    let destinationIndex = overIndex;

    if (activeItem?.type === 'project' && overItem?.type === 'section') {
      destinationIndex = overIndex + 1;
    }

    const newItems = [...items];
    const [removed] = newItems.splice(activeIndex, 1);

    if (activeIndex < destinationIndex) {
      destinationIndex -= 1;
    }

    if (destinationIndex < 0) destinationIndex = 0;
    if (destinationIndex > newItems.length) destinationIndex = newItems.length;

    newItems.splice(destinationIndex, 0, removed);

    setItems(newItems);
    await saveOrder(newItems);
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
      // Mover proyectos fuera de la sección
      await supabase
        .from("catalog_projects")
        .update({ catalog_section_id: null })
        .eq("catalog_section_id", sectionId);

      // Eliminar la sección
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

  const handleEditProject = (projectId: string) => {
    setEditingProjectId(projectId);
    setProjectModalOpen(true);
  };

  const handleNewProject = () => {
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

  const handleViewProducts = (projectId: string) => {
    navigate(`/catalogs/${catalogId}/project/${projectId}/products`);
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
        <Button variant="ghost" onClick={() => navigate("/catalogs")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Catálogos
        </Button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{catalogName}</h1>
          <p className="text-muted-foreground">Proyectos del catálogo</p>
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
          <Button onClick={handleNewProject}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Proyecto
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay proyectos en este catálogo</p>
            <Button onClick={handleNewProject} variant="outline" className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Crear primer proyecto
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
                    <SectionHeader section={item.data} onEdit={handleEditSection} onDelete={handleDeleteSection} />
                  ) : (
                    <SortableProjectCard
                      project={item.data}
                      onEdit={handleEditProject}
                      onDelete={handleDeleteProject}
                      onViewProducts={handleViewProducts}
                      viewMode="list"
                    />
                  )}
                </div>
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeItem ? (
              <div className="opacity-50">
                {activeItem.type === 'section' ? (
                  <SectionHeader
                    section={activeItem.data as CatalogSection}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                ) : (
                  <ProjectCard
                    project={activeItem.data as CatalogProject}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onViewProducts={() => {}}
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
          <span className="text-sm">Guardando orden...</span>
        </div>
      )}

      {catalogId && (
        <>
          <CatalogProjectFormModal
            open={projectModalOpen}
            onOpenChange={setProjectModalOpen}
            catalogId={catalogId}
            projectId={editingProjectId}
            onSuccess={fetchCatalogData}
          />
          <CatalogSectionFormModal
            open={sectionModalOpen}
            onOpenChange={setSectionModalOpen}
            catalogId={catalogId}
            sectionId={editingSectionId}
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

// Componente para el header de sección
function SectionHeader({ section, onEdit, onDelete }: { section: CatalogSection; onEdit: (id: string) => void; onDelete: (id: string) => void }) {
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

// Componente para proyecto sortable
function SortableProjectCard({ project, onEdit, onDelete, onViewProducts, viewMode }: {
  project: CatalogProject;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onViewProducts: (id: string) => void;
  viewMode: 'grid' | 'list';
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  return (
    <ProjectCard
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      project={project}
      onEdit={onEdit}
      onDelete={onDelete}
      onViewProducts={onViewProducts}
      viewMode={viewMode}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  );
}

// Componente base para proyecto
function ProjectCard({ project, onEdit, onDelete, onViewProducts, viewMode, style, dragHandleProps, ref: forwardedRef }: {
  project: CatalogProject;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onViewProducts: (id: string) => void;
  viewMode: 'grid' | 'list';
  style?: React.CSSProperties;
  dragHandleProps?: any;
  ref?: React.Ref<HTMLDivElement>;
}) {
  const cardContent = viewMode === 'grid' ? (
    <>
      {project.image_url && (
        <div className="w-full h-40 overflow-hidden rounded-t-lg bg-muted">
          <img
            src={project.image_url}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="truncate">{project.name}</span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(project.id)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(project.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {project.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {project.description}
          </p>
        )}
        {project.colors && project.colors.length > 0 && (
          <div className="flex gap-1 mb-3">
            {project.colors.map((color, idx) => (
              <div
                key={idx}
                className="w-6 h-6 rounded-md border-2 border-border"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {project._count?.products || 0} producto(s)
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewProducts(project.id)}
          >
            Ver Productos
          </Button>
        </div>
      </CardContent>
    </>
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
        {project.image_url && (
          <div className="w-24 h-24 flex-shrink-0 overflow-hidden rounded-lg">
            <img
              src={project.image_url}
              alt={project.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg mb-1">{project.name}</CardTitle>
              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                  {project.description}
                </p>
              )}
              <div className="flex items-center gap-4">
                {project.colors && project.colors.length > 0 && (
                  <div className="flex gap-1">
                    {project.colors.map((color, idx) => (
                      <div
                        key={idx}
                        className="w-5 h-5 rounded-md border-2 border-border"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                )}
                <span className="text-sm text-muted-foreground">
                  {project._count?.products || 0} producto(s)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewProducts(project.id)}
              >
                Ver Productos
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(project.id)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(project.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
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
