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
import { getMaterialIcon } from "@/utils/materialIcons";

interface Project {
  id: string;
  name: string;
  weight_grams: number;
  print_time_hours: number;
  total_price: number;
  notes: string | null;
  created_at: string;
  image_url?: string | null;
  tags?: string[] | null;
  project_materials?: {
    material_id: string;
    weight_grams: number;
    materials: {
      name: string;
      color: string | null;
      type: string | null;
      display_mode: 'color' | 'icon';
    };
  }[];
}

interface ProjectMaterial {
  material_id: string;
  weight_grams: number;
  materials: {
    name: string;
    color: string | null;
    type: string | null;
    display_mode: 'color' | 'icon';
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
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

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
      .select("project_id, material_id, weight_grams, materials(name, color, type, display_mode)")
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

  // Obtener todos los tags únicos de los proyectos
  const allTags = Array.from(
    new Set(
      projects
        .flatMap(p => p.tags || [])
        .filter(Boolean)
    )
  ).sort();

  // Filtrar proyectos por tag seleccionado
  const filteredProjects = selectedTag
    ? projects.filter(p => p.tags && p.tags.includes(selectedTag))
    : projects;

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

      {/* Filtro de tags */}
      {allTags.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">Filtrar por tag:</span>
              <Button
                variant={selectedTag === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTag(null)}
              >
                Todos
              </Button>
              {allTags.map((tag) => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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

      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              No hay proyectos todavía. Crea tu primer proyecto.
            </p>
            </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="overflow-hidden">
              {canAddImages && project.image_url && (
                <div className="h-32 overflow-hidden bg-muted">
                  <img 
                    src={project.image_url} 
                    alt={project.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center text-base">
                  <span className="truncate">{project.name}</span>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditProject(project.id)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteProject(project.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{project.weight_grams}g</span>
                  <span>•</span>
                  <span>{project.print_time_hours}h</span>
                  <span>•</span>
                  <span className="font-semibold text-foreground">{project.total_price?.toFixed(2)}€</span>
                </div>
                {projectMaterials[project.id] && projectMaterials[project.id].length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {projectMaterials[project.id].slice(0, 3).map((pm, idx) => {
                      const MaterialIcon = pm.materials?.display_mode === 'icon' ? getMaterialIcon(pm.materials.type) : null;
                      return (
                        <div key={idx} className="text-xs flex items-center gap-1">
                          {pm.materials?.display_mode === 'color' && pm.materials?.color && (
                            <span 
                              className="inline-block w-2.5 h-2.5 rounded-full border border-border flex-shrink-0"
                              style={{ backgroundColor: pm.materials.color }}
                            />
                          )}
                          {MaterialIcon && (
                            <MaterialIcon className="w-3 h-3 flex-shrink-0" />
                          )}
                          <span className="truncate max-w-[80px]">{pm.materials?.name}</span>
                          <span className="text-muted-foreground">({pm.weight_grams}g)</span>
                        </div>
                      );
                    })}
                    {projectMaterials[project.id].length > 3 && (
                      <span className="text-xs text-muted-foreground">+{projectMaterials[project.id].length - 3} más</span>
                    )}
                  </div>
                )}
                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {project.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs py-0 h-5">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((project) => (
            <Card key={project.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {canAddImages && project.image_url && (
                    <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      <img 
                        src={project.image_url} 
                        alt={project.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-base font-semibold truncate">{project.name}</h3>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditProject(project.id)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteProject(project.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{project.weight_grams}g</span>
                        <span>•</span>
                        <span>{project.print_time_hours}h</span>
                        <span>•</span>
                        <span className="font-semibold text-foreground">{project.total_price?.toFixed(2)}€</span>
                      </div>
                      {projectMaterials[project.id] && projectMaterials[project.id].length > 0 && (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {projectMaterials[project.id].slice(0, 4).map((pm, idx) => {
                            const MaterialIcon = pm.materials?.display_mode === 'icon' ? getMaterialIcon(pm.materials.type) : null;
                            return (
                              <div key={idx} className="text-xs flex items-center gap-1">
                                {pm.materials?.display_mode === 'color' && pm.materials?.color && (
                                  <span 
                                    className="inline-block w-2.5 h-2.5 rounded-full border border-border flex-shrink-0"
                                    style={{ backgroundColor: pm.materials.color }}
                                  />
                                )}
                                {MaterialIcon && (
                                  <MaterialIcon className="w-3 h-3 flex-shrink-0" />
                                )}
                                <span className="truncate max-w-[100px]">{pm.materials?.name}</span>
                                <span className="text-muted-foreground">({pm.weight_grams}g)</span>
                              </div>
                            );
                          })}
                          {projectMaterials[project.id].length > 4 && (
                            <span className="text-xs text-muted-foreground">+{projectMaterials[project.id].length - 4} más</span>
                          )}
                        </div>
                      )}
                      {project.tags && project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {project.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs py-0 h-5">
                              {tag}
                            </Badge>
                          ))}
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
