import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, ArrowLeft, Edit } from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  weight_grams: number;
  print_time_hours: number;
  total_price: number;
  notes: string | null;
  created_at: string;
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMaterials, setProjectMaterials] = useState<Record<string, ProjectMaterial[]>>({});
  const [projectsLoading, setProjectsLoading] = useState(true);

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

  if (loading || projectsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold mb-2">Proyectos</h2>
          <p className="text-muted-foreground">
            Todos tus trabajos de impresión 3D
          </p>
        </div>
        <Button onClick={() => navigate("/calculator")}>
          Nuevo Proyecto
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              No hay proyectos guardados. Crea tu primer proyecto desde la calculadora.
            </CardContent>
          </Card>
        ) : (
          projects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span className="truncate">{project.name}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigate(`/calculator/${project.id}`)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteProject(project.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {projectMaterials[project.id] && projectMaterials[project.id].length > 0 && (
                      <div className="pb-2 border-b">
                        <span className="text-muted-foreground font-medium">Materiales:</span>
                        <div className="mt-1 space-y-1">
                          {projectMaterials[project.id].map((pm, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="flex items-center gap-2">
                                {pm.materials.color && (
                                  <span 
                                    className="w-3 h-3 rounded-full border" 
                                    style={{ backgroundColor: pm.materials.color }}
                                  />
                                )}
                                {pm.materials.name}
                              </span>
                              <span>{pm.weight_grams}g</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Peso Total:</span>
                      <span className="font-medium">{project.weight_grams}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tiempo:</span>
                      <span className="font-medium">{project.print_time_hours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Precio Total:</span>
                      <span className="font-bold text-lg">€{Number(project.total_price).toFixed(2)}</span>
                    </div>
                    {project.notes && (
                      <div className="pt-2 border-t">
                        <p className="text-muted-foreground text-xs">{project.notes}</p>
                      </div>
                    )}
                    <div className="pt-2 text-xs text-muted-foreground">
                      {new Date(project.created_at).toLocaleDateString('es-ES')}
                    </div>
                  </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  );
};

export default Projects;
