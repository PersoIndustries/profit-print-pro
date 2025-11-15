import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Download } from "lucide-react";
import jsPDF from "jspdf";

interface CatalogPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogId: string;
  catalogName: string;
}

interface Product {
  id: string;
  reference_code: string;
  name: string;
  dimensions: string | null;
  price: number;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  colors: string[] | null;
  products: Product[];
}

export function CatalogPreviewModal({ open, onOpenChange, catalogId, catalogName }: CatalogPreviewModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (open && catalogId) {
      fetchCatalogData();
    }
  }, [open, catalogId]);

  const fetchCatalogData = async () => {
    try {
      setLoading(true);

      const { data: projectsData, error: projectsError } = await supabase
        .from("catalog_projects")
        .select("*")
        .eq("catalog_id", catalogId)
        .order("name");

      if (projectsError) throw projectsError;

      const projectsWithProducts = await Promise.all(
        (projectsData || []).map(async (project) => {
          const { data: productsData } = await supabase
            .from("catalog_products")
            .select("*")
            .eq("catalog_project_id", project.id)
            .order("reference_code");

          return {
            ...project,
            colors: Array.isArray(project.colors) ? project.colors.filter((c): c is string => typeof c === 'string') : null,
            products: productsData || []
          };
        })
      );

      setProjects(projectsWithProducts);
    } catch (error) {
      console.error("Error fetching catalog data:", error);
      toast.error("Error al cargar los datos del catálogo");
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    try {
      setGenerating(true);
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Cover page
      pdf.setFontSize(24);
      pdf.setTextColor(147, 51, 234);
      pdf.text(catalogName, pageWidth / 2, 60, { align: "center" });

      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text("Catálogo de Productos", pageWidth / 2, 80, { align: "center" });

      // Projects and products
      for (const project of projects) {
        pdf.addPage();
        yPosition = margin;

        // Project header
        pdf.setFontSize(18);
        pdf.setTextColor(0, 0, 0);
        pdf.text(project.name, margin, yPosition);
        yPosition += 10;

        // Project image
        if (project.image_url) {
          try {
            const imgData = await fetch(project.image_url)
              .then(res => res.blob())
              .then(blob => new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              }));
            
            pdf.addImage(imgData, 'JPEG', margin, yPosition, 60, 40);
            yPosition += 45;
          } catch (error) {
            console.error("Error loading image:", error);
          }
        }

        // Project description
        if (project.description) {
          pdf.setFontSize(10);
          pdf.setTextColor(80, 80, 80);
          const lines = pdf.splitTextToSize(project.description, pageWidth - 2 * margin);
          pdf.text(lines, margin, yPosition);
          yPosition += lines.length * 5 + 5;
        }

        // Colors
        if (project.colors && project.colors.length > 0) {
          pdf.setFontSize(10);
          pdf.setTextColor(0, 0, 0);
          pdf.text("Colores disponibles:", margin, yPosition);
          yPosition += 7;

          let xPos = margin;
          project.colors.forEach((color) => {
            const rgb = hexToRgb(color);
            if (rgb) {
              pdf.setFillColor(rgb.r, rgb.g, rgb.b);
              pdf.rect(xPos, yPosition - 3, 8, 8, 'F');
              pdf.setDrawColor(200, 200, 200);
              pdf.rect(xPos, yPosition - 3, 8, 8);
              xPos += 12;
            }
          });
          yPosition += 12;
        }

        // Products list
        if (project.products.length > 0) {
          yPosition += 5;
          pdf.setFontSize(12);
          pdf.setTextColor(0, 0, 0);
          pdf.text("Productos", margin, yPosition);
          yPosition += 8;

          // Table header
          pdf.setFontSize(9);
          pdf.setFillColor(240, 240, 240);
          pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');
          pdf.setTextColor(0, 0, 0);
          pdf.text("Ref.", margin + 2, yPosition);
          pdf.text("Nombre", margin + 30, yPosition);
          pdf.text("Dimensiones", margin + 100, yPosition);
          pdf.text("Precio", pageWidth - margin - 25, yPosition);
          yPosition += 8;

          // Products
          project.products.forEach((product) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = margin;
            }

            pdf.setFontSize(8);
            pdf.setTextColor(60, 60, 60);
            pdf.text(product.reference_code, margin + 2, yPosition);
            
            const nameLines = pdf.splitTextToSize(product.name, 65);
            pdf.text(nameLines, margin + 30, yPosition);
            
            if (product.dimensions) {
              pdf.text(product.dimensions, margin + 100, yPosition);
            }
            
            pdf.text(`${product.price.toFixed(2)} €`, pageWidth - margin - 25, yPosition);
            
            yPosition += Math.max(6, nameLines.length * 4 + 2);
          });
        }
      }

      pdf.save(`${catalogName}.pdf`);
      toast.success("PDF generado correctamente");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    } finally {
      setGenerating(false);
    }
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Vista Previa: {catalogName}</DialogTitle>
            <Button onClick={generatePDF} disabled={generating}>
              {generating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Descargar PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto border rounded-md p-6 bg-background">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Cover */}
            <div className="text-center py-12 border-b">
              <h1 className="text-4xl font-bold text-primary mb-4">{catalogName}</h1>
              <p className="text-muted-foreground">Catálogo de Productos</p>
            </div>

            {/* Projects */}
            {projects.map((project) => (
              <div key={project.id} className="space-y-4 border-b pb-8">
                <h2 className="text-2xl font-bold">{project.name}</h2>

                {project.image_url && (
                  <img
                    src={project.image_url}
                    alt={project.name}
                    className="w-48 h-32 object-cover rounded-md"
                  />
                )}

                {project.description && (
                  <p className="text-muted-foreground">{project.description}</p>
                )}

                {project.colors && project.colors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Colores disponibles:</p>
                    <div className="flex gap-2">
                      {project.colors.map((color, idx) => (
                        <div
                          key={idx}
                          className="w-8 h-8 rounded-md border-2 border-border"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {project.products.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Productos</h3>
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-2 text-sm font-medium">Ref.</th>
                            <th className="text-left p-2 text-sm font-medium">Nombre</th>
                            <th className="text-left p-2 text-sm font-medium">Dimensiones</th>
                            <th className="text-right p-2 text-sm font-medium">Precio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {project.products.map((product) => (
                            <tr key={product.id} className="border-t">
                              <td className="p-2 text-sm">{product.reference_code}</td>
                              <td className="p-2 text-sm">{product.name}</td>
                              <td className="p-2 text-sm">{product.dimensions || "-"}</td>
                              <td className="p-2 text-sm text-right font-medium">{product.price.toFixed(2)} €</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
