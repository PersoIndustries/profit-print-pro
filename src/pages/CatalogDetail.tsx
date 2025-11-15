import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Edit, Loader2, Image as ImageIcon } from "lucide-react";
import { CatalogProjectFormModal } from "@/components/CatalogProjectFormModal";

interface CatalogProject {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  project_id: string | null;
  _count?: { products: number };
}

export default function CatalogDetail() {
  const navigate = useNavigate();
  const { catalogId } = useParams<{ catalogId: string }>();
  const { user } = useAuth();
  const [catalogName, setCatalogName] = useState("");
  const [projects, setProjects] = useState<CatalogProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | undefined>();

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

      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("catalog_projects")
        .select(`
          *,
          catalog_products (count)
        `)
        .eq("catalog_id", catalogId)
        .order("created_at", { ascending: false });

      if (projectsError) throw projectsError;

      const projectsWithCount = (projectsData || []).map((project: any) => ({
        ...project,
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

  const handleEditProject = (projectId: string) => {
    setEditingProjectId(projectId);
    setProjectModalOpen(true);
  };

  const handleNewProject = () => {
    setEditingProjectId(undefined);
    setProjectModalOpen(true);
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
        <Button onClick={handleNewProject}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Proyecto
        </Button>
      </div>

      {projects.length === 0 ? (
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              {project.image_url && (
                <div className="aspect-video w-full overflow-hidden rounded-t-lg">
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
                      onClick={() => handleEditProject(project.id)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteProject(project.id)}
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
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {project._count?.products || 0} producto(s)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewProducts(project.id)}
                  >
                    Ver Productos
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {catalogId && (
        <CatalogProjectFormModal
          open={projectModalOpen}
          onOpenChange={setProjectModalOpen}
          catalogId={catalogId}
          projectId={editingProjectId}
          onSuccess={fetchCatalogData}
        />
      )}
    </div>
  );
}
