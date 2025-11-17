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
      let isFirstProject = true;
      for (const project of projects) {
        // Check if we need a new page (only if not first project and not enough space)
        const estimatedProjectHeight = 80 + (project.products.length * 6);
        if (!isFirstProject && yPosition + estimatedProjectHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        isFirstProject = false;

        // Project header
        pdf.setFontSize(18);
        pdf.setTextColor(0, 0, 0);
        pdf.text(project.name, margin, yPosition);
        yPosition += 12;

        // Layout: Image and description on left, table on right
        const imageSize = 60;
        const leftColumnWidth = imageSize + 10;
        const rightColumnStartX = margin + leftColumnWidth;
        const rightColumnWidth = pageWidth - rightColumnStartX - margin;
        let leftColumnY = yPosition;
        let rightColumnY = yPosition;

        // Project image (left side)
        if (project.image_url) {
          try {
            const imgData = await fetch(project.image_url)
              .then(res => res.blob())
              .then(blob => new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              }));
            
            pdf.addImage(imgData, 'JPEG', margin, leftColumnY, imageSize, imageSize);
            leftColumnY += imageSize + 5;
          } catch (error) {
            console.error("Error loading image:", error);
          }
        }

        // Project description (below image, left side)
        if (project.description) {
          pdf.setFontSize(9);
          pdf.setTextColor(80, 80, 80);
          const lines = pdf.splitTextToSize(project.description, leftColumnWidth - 5);
          pdf.text(lines, margin, leftColumnY);
          leftColumnY += lines.length * 4 + 5;
        }

        // Colors (below description, left side)
        if (project.colors && project.colors.length > 0) {
          pdf.setFontSize(9);
          pdf.setTextColor(0, 0, 0);
          pdf.text("Colores:", margin, leftColumnY);
          leftColumnY += 6;

          let xPos = margin;
          project.colors.forEach((color) => {
            const rgb = hexToRgb(color);
            if (rgb) {
              pdf.setFillColor(rgb.r, rgb.g, rgb.b);
              pdf.rect(xPos, leftColumnY - 2, 6, 6, 'F');
              pdf.setDrawColor(200, 200, 200);
              pdf.rect(xPos, leftColumnY - 2, 6, 6);
              xPos += 9;
            }
          });
          leftColumnY += 10;
        }

        // Products table (right side, aligned with top)
        if (project.products.length > 0) {
          // Table header
          pdf.setFontSize(9);
          pdf.setFillColor(240, 240, 240);
          pdf.rect(rightColumnStartX, rightColumnY - 5, rightColumnWidth, 7, 'F');
          pdf.setTextColor(0, 0, 0);
          pdf.text("Ref.", rightColumnStartX + 2, rightColumnY);
          pdf.text("Nombre", rightColumnStartX + 20, rightColumnY);
          pdf.text("Dim.", rightColumnStartX + 70, rightColumnY);
          pdf.text("Precio", rightColumnStartX + rightColumnWidth - 25, rightColumnY, { align: "right" });
          rightColumnY += 7;

          // Products rows
          project.products.forEach((product) => {
            // Check if we need a new page for this product
            if (rightColumnY > pageHeight - margin - 10) {
              pdf.addPage();
              yPosition = margin;
              leftColumnY = margin + 12;
              rightColumnY = margin + 12;
              
              // Redraw header on new page
              pdf.setFontSize(18);
              pdf.setTextColor(0, 0, 0);
              pdf.text(project.name, margin, yPosition);
              
              // Redraw image if exists
              if (project.image_url) {
                try {
                  const imgData = await fetch(project.image_url)
                    .then(res => res.blob())
                    .then(blob => new Promise<string>((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve(reader.result as string);
                      reader.readAsDataURL(blob);
                    }));
                  
                  pdf.addImage(imgData, 'JPEG', margin, leftColumnY, imageSize, imageSize);
                } catch (error) {
                  console.error("Error loading image:", error);
                }
              }

              // Redraw table header
              pdf.setFontSize(9);
              pdf.setFillColor(240, 240, 240);
              pdf.rect(rightColumnStartX, rightColumnY - 5, rightColumnWidth, 7, 'F');
              pdf.setTextColor(0, 0, 0);
              pdf.text("Ref.", rightColumnStartX + 2, rightColumnY);
              pdf.text("Nombre", rightColumnStartX + 20, rightColumnY);
              pdf.text("Dim.", rightColumnStartX + 70, rightColumnY);
              pdf.text("Precio", rightColumnStartX + rightColumnWidth - 25, rightColumnY, { align: "right" });
              rightColumnY += 7;
            }

            pdf.setFontSize(8);
            pdf.setTextColor(60, 60, 60);
            pdf.text(product.reference_code, rightColumnStartX + 2, rightColumnY);
            
            const nameLines = pdf.splitTextToSize(product.name, 45);
            pdf.text(nameLines, rightColumnStartX + 20, rightColumnY);
            
            if (product.dimensions) {
              const dimLines = pdf.splitTextToSize(product.dimensions, 20);
              pdf.text(dimLines, rightColumnStartX + 70, rightColumnY);
            }
            
            pdf.text(`${product.price.toFixed(2)} €`, rightColumnStartX + rightColumnWidth - 25, rightColumnY, { align: "right" });
            
            rightColumnY += Math.max(5, nameLines.length * 3.5 + 1);
          });
        }

        // Update yPosition to the bottom of the tallest column
        yPosition = Math.max(leftColumnY, rightColumnY) + 10;
        
        // Add some space between projects
        if (yPosition < pageHeight - margin - 20) {
          yPosition += 5;
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

                <div className="flex gap-6">
                  {/* Image - Left side, square */}
                  {project.image_url && (
                    <div className="flex-shrink-0">
                      <img
                        src={project.image_url}
                        alt={project.name}
                        className="w-48 h-48 object-cover rounded-md"
                      />
                    </div>
                  )}

                  {/* Content - Right side */}
                  <div className="flex-1 space-y-4">
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
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
