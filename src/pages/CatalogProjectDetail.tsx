import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Edit, Loader2, Package, Grid3x3, List } from "lucide-react";
import { CatalogProductFormModal } from "@/components/CatalogProductFormModal";

interface CatalogProduct {
  id: string;
  reference_code: string;
  name: string;
  dimensions: string | null;
  price: number;
}

interface ProjectData {
  name: string;
  colors: any;
}

export default function CatalogProjectDetail() {
  const navigate = useNavigate();
  const { catalogId, projectId } = useParams<{ catalogId: string; projectId: string }>();
  const { user } = useAuth();
  const [projectName, setProjectName] = useState("");
  const [projectColors, setProjectColors] = useState<string[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (user && projectId) {
      fetchProjectData();
    }
  }, [user, projectId]);

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

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from("catalog_products")
        .select("*")
        .eq("catalog_project_id", projectId)
        .order("reference_code");

      if (productsError) throw productsError;
      setProducts(productsData || []);
    } catch (error) {
      console.error("Error fetching project data:", error);
      toast.error("Error al cargar los datos del proyecto");
    } finally {
      setLoading(false);
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
      fetchProjectData();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Error al eliminar el producto");
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
        <Button variant="ghost" onClick={() => navigate(`/catalogs/${catalogId}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Catálogo
        </Button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{projectName}</h1>
          <p className="text-muted-foreground">Productos del proyecto</p>
          {projectColors.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-medium">Colores:</span>
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
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleNewProduct}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay productos en este proyecto</p>
            <Button onClick={handleNewProduct} variant="outline" className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Crear primer producto
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
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
                        onClick={() => handleEditProduct(product.id)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {product.dimensions && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Dimensiones:</span> {product.dimensions}
                    </p>
                  )}

                  <p className="text-lg font-bold text-primary">
                    {product.price.toFixed(2)} €
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground mb-1">{product.reference_code}</p>
                        <h3 className="font-semibold text-base mb-1">{product.name}</h3>
                        {product.dimensions && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Dimensiones:</span> {product.dimensions}
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
                      onClick={() => handleEditProduct(product.id)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {projectId && (
        <CatalogProductFormModal
          open={productModalOpen}
          onOpenChange={setProductModalOpen}
          catalogProjectId={projectId}
          productId={editingProductId}
          onSuccess={fetchProjectData}
        />
      )}
    </div>
  );
}
