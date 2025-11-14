import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Edit, List, Grid3x3, Crown } from "lucide-react";
import { toast } from "sonner";
import { ProjectFormModal } from "@/components/ProjectFormModal";
import { useTierFeatures } from "@/hooks/useTierFeatures";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface Project {
  id: string;
  name: string;
  weight_grams: number;
  print_time_hours: number;
  total_price: number;
  notes: string | null;
  created_at: string;
  image_url?: string | null;
  project_materials?: {
    material_id: string;
    weight_grams: number;
    materials: {
      name: string;
      color: string;
    };
  }[];
}

interface ProjectMaterial {
  material_id: string;
  weight_grams: number;
  materials: {
    name: string;
    color: string;
  };
}

const Projects = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { isPro, isEnterprise } = useTierFeatures();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMaterials, setProjectMaterials] = useState<Record<string, ProjectMaterial[]>>({});
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;

    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Obtener materiales de cada proyecto
      if (projectsData && projectsData.length > 0) {
        const { data: materialsData, error: materialsError } = await supabase
          .from("project_materials")
          .select("project_id, material_id, weight_grams, materials(name, color)")
          .in("project_id", projectsData.map(p => p.id));

        if (materialsError) throw materialsError;

        // Organizar materiales por proyecto
        const materialsByProject: Record<string, ProjectMaterial[]> = {};
        materialsData?.forEach((pm: any) => {
          if (!materialsByProject[pm.project_id]) {
            materialsByProject[pm.project_id] = [];
          }
          materialsByProject[pm.project_id].push({
            material_id: pm.material_id,
            weight_grams: pm.weight_grams,
            materials: pm.materials,
          });
        });
        setProjectMaterials(materialsByProject);
      }
    } catch (error: any) {
      toast.error("Error al cargar proyectos");
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);

      if (error) throw error;

      toast.success("Proyecto eliminado");
      fetchProjects();
    } catch (error: any) {
      toast.error("Error al eliminar proyecto");
    }
  };

  const handleCreateProject = () => {
    setSelectedProjectId(null);
    setIsModalOpen(true);
  };

  const handleEditProject = (id: string) => {
    setSelectedProjectId(id);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchProjects();
  };

  if (loading || projectsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const canAddImages = isPro || isEnterprise;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Proyectos</h1>
        <div className="flex items-center gap-3">
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "grid" | "list")}>
            <ToggleGroupItem value="list" aria-label="Vista lista">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Vista cuadrícula">
              <Grid3x3 className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button onClick={handleCreateProject}>
            Nuevo Proyecto
          </Button>
        </div>
      </div>

      {!canAddImages && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Crown className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Agrega imágenes a tus proyectos</h3>
                <p className="text-muted-foreground mb-4">
                  Con los planes Pro o Business puedes agregar imágenes a cada proyecto para visualizarlos mejor.
                </p>
                <Button onClick={() => navigate("/pricing")} size="sm">
                  Actualizar plan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {projects.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              No hay proyectos todavía. Crea tu primer proyecto.
            </p>
            </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="overflow-hidden">
              {canAddImages && project.image_url && (
                <div className="h-48 overflow-hidden bg-muted">
                  <img 
                    src={project.image_url} 
                    alt={project.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span>{project.name}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditProject(project.id)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteProject(project.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Materiales:</p>
                  <div className="mt-1 space-y-1">
                    {projectMaterials[project.id]?.map((pm, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium">{pm.materials?.name}</span>
                        <span className="text-muted-foreground"> ({pm.weight_grams}g)</span>
                        {pm.materials?.color && (
                          <span 
                            className="inline-block w-3 h-3 rounded-full ml-2 border border-border"
                            style={{ backgroundColor: pm.materials.color }}
                          />
                        )}
                      </div>
                    )) || <p className="text-sm text-muted-foreground">Sin materiales</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Peso:</p>
                    <p className="font-medium">{project.weight_grams}g</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tiempo:</p>
                    <p className="font-medium">{project.print_time_hours}h</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Precio:</p>
                    <p className="font-medium">{project.total_price?.toFixed(2)}€</p>
                  </div>
                </div>
                {project.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notas:</p>
                    <p className="text-sm">{project.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  {canAddImages && project.image_url && (
                    <div className="w-32 h-32 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      <img 
                        src={project.image_url} 
                        alt={project.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-semibold">{project.name}</h3>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditProject(project.id)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteProject(project.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Materiales:</p>
                        <div className="space-y-1">
                          {projectMaterials[project.id]?.map((pm, idx) => (
                            <div key={idx} className="text-sm">
                              <span className="font-medium">{pm.materials?.name}</span>
                              <span className="text-muted-foreground"> ({pm.weight_grams}g)</span>
                              {pm.materials?.color && (
                                <span 
                                  className="inline-block w-3 h-3 rounded-full ml-2 border border-border"
                                  style={{ backgroundColor: pm.materials.color }}
                                />
                              )}
                            </div>
                          )) || <p className="text-sm text-muted-foreground">Sin materiales</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Peso:</p>
                          <p className="font-medium">{project.weight_grams}g</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Tiempo:</p>
                          <p className="font-medium">{project.print_time_hours}h</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">Precio:</p>
                          <p className="font-medium">{project.total_price?.toFixed(2)}€</p>
                        </div>
                      </div>
                      {project.notes && (
                        <div>
                          <p className="text-sm text-muted-foreground">Notas:</p>
                          <p className="text-sm">{project.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProjectFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        projectId={selectedProjectId}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default Projects;
