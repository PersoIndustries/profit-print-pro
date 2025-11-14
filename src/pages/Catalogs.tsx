import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTierFeatures } from "@/hooks/useTierFeatures";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Download, Trash2, Edit, Crown, Eye } from "lucide-react";
import { CardHeader, CardContent } from "@/components/ui/card";
import { CatalogItemForm } from "@/components/CatalogItemForm";
import { CatalogPreview } from "@/components/CatalogPreview";
import jsPDF from "jspdf";

interface CatalogItem {
  id: string;
  user_id: string;
  project_id: string;
  reference_code: string;
  name: string;
  sizes: Array<{ size: string; dimensions: string }>;
  pvp_price: number;
  image_url: string | null;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
}

export default function Catalogs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro, isEnterprise, loading: tierLoading } = useTierFeatures();
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, name")
        .order("name");

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Fetch catalog items
      const { data: catalogData, error: catalogError } = await supabase
        .from("catalog_items" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (catalogError) throw catalogError;
      setCatalogItems((catalogData || []).map((item: any) => ({
        ...item,
        sizes: item.sizes as Array<{ size: string; dimensions: string }>
      })));
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este item del catálogo?")) return;

    try {
      const { error } = await supabase
        .from("catalog_items" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Item eliminado del catálogo");
      fetchData();
    } catch (error) {
      console.error("Error deleting catalog item:", error);
      toast.error("Error al eliminar el item");
    }
  };

  const handleEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingItem(null);
    fetchData();
  };

  const generatePDF = async () => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Cover page
      pdf.setFontSize(32);
      pdf.setTextColor(147, 51, 234); // purple
      pdf.text("Catálogo de Productos", pageWidth / 2, 100, { align: "center" });
      
      pdf.setFontSize(16);
      pdf.setTextColor(100, 100, 100);
      pdf.text("Impresión 3D", pageWidth / 2, 120, { align: "center" });
      
      pdf.setFontSize(12);
      pdf.text(new Date().toLocaleDateString("es-ES"), pageWidth / 2, 140, { align: "center" });

      // Product pages
      for (let i = 0; i < catalogItems.length; i++) {
        const item = catalogItems[i];
        pdf.addPage();

        let yPos = 20;

        // Reference code
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`REF: ${item.reference_code}`, 20, yPos);
        yPos += 10;

        // Product name
        pdf.setFontSize(20);
        pdf.setTextColor(0, 0, 0);
        pdf.text(item.name, 20, yPos);
        yPos += 15;

        // Image
        if (item.image_url) {
          try {
            const imgData = await fetch(item.image_url).then(r => r.blob()).then(b => {
              return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(b);
              });
            });
            pdf.addImage(imgData, "JPEG", 20, yPos, 80, 80);
            yPos += 90;
          } catch (error) {
            console.error("Error loading image:", error);
          }
        }

        // Sizes
        if (item.sizes && item.sizes.length > 0) {
          pdf.setFontSize(14);
          pdf.setTextColor(0, 0, 0);
          pdf.text("Tamaños disponibles:", 20, yPos);
          yPos += 8;

          pdf.setFontSize(10);
          item.sizes.forEach((size) => {
            pdf.text(`• ${size.size} - ${size.dimensions}`, 25, yPos);
            yPos += 6;
          });
          yPos += 5;
        }

        // Price
        pdf.setFontSize(18);
        pdf.setTextColor(147, 51, 234);
        pdf.text(`PVP: ${Number(item.pvp_price).toFixed(2)}€`, 20, yPos);
      }

      pdf.save(`catalogo-${new Date().getTime()}.pdf`);
      toast.success("Catálogo descargado");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    }
  };

  if (!isPro && !isEnterprise && !tierLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-8 text-center">
          <Crown className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-2xl font-bold mb-2">Función Business</h2>
          <p className="text-muted-foreground mb-4">
            Los catálogos están disponibles solo para usuarios Profesional y Empresa
          </p>
          <Button onClick={() => navigate("/pricing")}>
            Ver Planes
          </Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Catálogos</h1>
          <p className="text-muted-foreground">
            Crea catálogos profesionales con tus productos
          </p>
        </div>
        <div className="flex gap-2">
          {catalogItems.length > 0 && (
            <>
              <Button onClick={() => setIsPreviewOpen(true)} variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Vista Previa
              </Button>
              <Button onClick={generatePDF} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
            </>
          )}
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Añadir Producto
          </Button>
        </div>
      </div>

      {catalogItems.length === 0 ? (
        <Card className="p-12 text-center">
          <h3 className="text-xl font-semibold mb-2">No hay productos en el catálogo</h3>
          <p className="text-muted-foreground mb-4">
            Añade productos desde tus proyectos para crear tu catálogo
          </p>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Añadir Primer Producto
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Group by project */}
          {Object.entries(
            catalogItems.reduce((acc, item) => {
              const projectName = projects.find(p => p.id === item.project_id)?.name || 'Sin proyecto';
              if (!acc[projectName]) acc[projectName] = [];
              acc[projectName].push(item);
              return acc;
            }, {} as Record<string, CatalogItem[]>)
          ).map(([projectName, items]) => (
            <Card key={projectName}>
              <CardHeader>
                <h3 className="text-xl font-bold">Proyecto: {projectName}</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-muted-foreground">{item.reference_code}</span>
                        <span className="font-medium">{item.name}</span>
                        {item.sizes && item.sizes.length > 0 && (
                          <span className="text-sm text-muted-foreground">
                            {item.sizes.map(s => s.size).join(', ')}
                          </span>
                        )}
                        <span className="font-bold text-primary ml-auto">{Number(item.pvp_price).toFixed(2)}€</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isFormOpen && (
        <CatalogItemForm
          isOpen={isFormOpen}
          onClose={handleFormClose}
          projects={projects}
          editingItem={editingItem}
        />
      )}

      {isPreviewOpen && (
        <CatalogPreview
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          items={catalogItems}
          onDownload={generatePDF}
        />
      )}
    </div>
  );
}
