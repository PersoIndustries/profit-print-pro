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
}

const Projects = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
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
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <nav className="border-b bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Dashboard
          </Button>
          <Button onClick={() => navigate("/calculator")}>
            Nuevo Proyecto
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Proyectos</h2>
          <p className="text-muted-foreground">
            Todos tus trabajos de impresión 3D
          </p>
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
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Peso:</span>
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
      </main>
    </div>
  );
};

export default Projects;
