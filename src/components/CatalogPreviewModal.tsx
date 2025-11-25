import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Download } from "lucide-react";
import jsPDF from "jspdf";
import placeholderImage from "@/assets/placeholder.jpg";

interface CatalogPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogId: string;
  catalogName: string;
  showPoweredBy?: boolean;
  brandLogoUrl?: string | null;
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
  catalog_section_id: string | null;
  creator: string | null;
}

interface Section {
  id: string;
  title: string;
  position: number;
  display_type: 'list' | 'grid' | 'full_page';
  projects: Project[];
}

export function CatalogPreviewModal({ open, onOpenChange, catalogId, catalogName, showPoweredBy = true, brandLogoUrl = null }: CatalogPreviewModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [sections, setSections] = useState<Section[]>([]);
  const [projectsWithoutSection, setProjectsWithoutSection] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [userBrandLogoUrl, setUserBrandLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open && catalogId) {
      fetchCatalogData();
      fetchUserBrandLogo();
    }
  }, [open, catalogId, user]);

  const fetchUserBrandLogo = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("brand_logo_url")
        .eq("id", user.id)
        .single();
      
      if (!error && data) {
        setUserBrandLogoUrl(data.brand_logo_url);
      }
    } catch (error) {
      console.error("Error fetching user brand logo:", error);
    }
  };

  const fetchCatalogData = async () => {
    try {
      setLoading(true);

      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from("catalog_sections")
        .select("*")
        .eq("catalog_id", catalogId)
        .order("position", { ascending: true });

      if (sectionsError) throw sectionsError;

      // Fetch all projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("catalog_projects")
        .select("*")
        .eq("catalog_id", catalogId)
        .order("position", { ascending: true });

      if (projectsError) throw projectsError;

      // Fetch products for all projects
      const projectsWithProducts = await Promise.all(
        (projectsData || []).map(async (project) => {
          const { data: productsData } = await supabase
            .from("catalog_products")
            .select("*")
            .eq("catalog_project_id", project.id)
            .order("position", { ascending: true });

          return {
            ...project,
            colors: Array.isArray(project.colors) ? project.colors.filter((c): c is string => typeof c === 'string') : null,
            products: productsData || []
          };
        })
      );

      // Organize projects by section
      const sectionsWithProjects = (sectionsData || []).map((section: any) => ({
        ...section,
        display_type: (section.display_type || 'list') as 'list' | 'grid' | 'full_page',
        projects: projectsWithProducts
          .filter(p => p.catalog_section_id === section.id)
          .sort((a, b) => a.position - b.position),
      }));

      // Projects without section
      const orphanProjects = projectsWithProducts
        .filter(p => p.catalog_section_id === null)
        .sort((a, b) => a.position - b.position);

      setSections(sectionsWithProjects);
      setProjectsWithoutSection(orphanProjects);
    } catch (error) {
      console.error("Error fetching catalog data:", error);
      toast.error(t('catalog.detail.messages.errorLoading'));
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
      pdf.setFontSize(26);
      pdf.setTextColor(147, 51, 234);
      pdf.text(catalogName, pageWidth / 2, 80, { align: "center" });

      pdf.setFontSize(14);
      pdf.setTextColor(100, 100, 100);
      pdf.text(t('catalog.preview.productCatalog'), pageWidth / 2, 95, { align: "center" });

      // Start content on new page
      pdf.addPage();
      yPosition = margin;

      // Process sections with their projects
      for (const section of sections) {
        // Section title - starts on new page
        if (yPosition > margin + 10) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setFontSize(20);
        pdf.setTextColor(147, 51, 234);
        pdf.text(section.title, margin, yPosition);
        yPosition += 15;

        // Draw separator line
        pdf.setDrawColor(147, 51, 234);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 10;

        // Process projects in this section
        for (const project of section.projects) {
          // Check if we need a new page
          const estimatedProjectHeight = 85 + (project.products.length * 6);
          if (yPosition + estimatedProjectHeight > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }

        // Project header
        pdf.setFontSize(18);
        pdf.setTextColor(0, 0, 0);
        pdf.text(project.name, margin, yPosition);
        yPosition += 10;
        
        // Creator
        if (project.creator) {
          pdf.setFontSize(10);
          pdf.setTextColor(100, 100, 100);
          pdf.text(`${t('catalog.preview.creator')}: ${project.creator}`, margin, yPosition);
          yPosition += 8;
        } else {
          yPosition += 2;
        }

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
          pdf.text(t('catalog.preview.colors'), margin, leftColumnY);
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
          pdf.text(t('catalog.preview.ref'), rightColumnStartX + 2, rightColumnY);
          pdf.text(t('catalog.preview.name'), rightColumnStartX + 20, rightColumnY);
          pdf.text(t('catalog.preview.dimensions'), rightColumnStartX + 70, rightColumnY);
          pdf.text(t('catalog.preview.price'), rightColumnStartX + rightColumnWidth - 25, rightColumnY, { align: "right" });
          rightColumnY += 7;

          // Products rows
          for (const product of project.products) {
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
              pdf.text(t('catalog.preview.ref'), rightColumnStartX + 2, rightColumnY);
              pdf.text(t('catalog.preview.name'), rightColumnStartX + 20, rightColumnY);
              pdf.text(t('catalog.preview.dimensions'), rightColumnStartX + 70, rightColumnY);
              pdf.text(t('catalog.preview.price'), rightColumnStartX + rightColumnWidth - 25, rightColumnY, { align: "right" });
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
          }
        }

          // Update yPosition to the bottom of the tallest column
          yPosition = Math.max(leftColumnY, rightColumnY) + 15;
        }
      }

      // Process projects without section if any
      if (projectsWithoutSection.length > 0) {
        // Add section for orphan projects
        if (yPosition > margin + 10) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setFontSize(20);
        pdf.setTextColor(100, 100, 100);
        pdf.text(t('catalog.preview.otherProjects'), margin, yPosition);
        yPosition += 15;

        pdf.setDrawColor(100, 100, 100);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 10;

        for (const project of projectsWithoutSection) {
          const estimatedProjectHeight = 85 + (project.products.length * 6);
          if (yPosition + estimatedProjectHeight > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }

          // Project header
          pdf.setFontSize(18);
          pdf.setTextColor(0, 0, 0);
          pdf.text(project.name, margin, yPosition);
          yPosition += 10;
          
          // Creator
          if (project.creator) {
            pdf.setFontSize(10);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`${t('catalog.preview.creator')}: ${project.creator}`, margin, yPosition);
            yPosition += 8;
          } else {
            yPosition += 2;
          }

          const imageSize = 60;
          const leftColumnWidth = imageSize + 10;
          const rightColumnStartX = margin + leftColumnWidth;
          const rightColumnWidth = pageWidth - rightColumnStartX - margin;
          let leftColumnY = yPosition;
          let rightColumnY = yPosition;

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

          if (project.description) {
            pdf.setFontSize(9);
            pdf.setTextColor(80, 80, 80);
            const lines = pdf.splitTextToSize(project.description, leftColumnWidth - 5);
            pdf.text(lines, margin, leftColumnY);
            leftColumnY += lines.length * 4 + 5;
          }

          if (project.colors && project.colors.length > 0) {
            pdf.setFontSize(9);
            pdf.setTextColor(0, 0, 0);
            pdf.text(t('catalog.preview.colors'), margin, leftColumnY);
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

          if (project.products.length > 0) {
            pdf.setFontSize(9);
            pdf.setFillColor(240, 240, 240);
            pdf.rect(rightColumnStartX, rightColumnY - 5, rightColumnWidth, 7, 'F');
            pdf.setTextColor(0, 0, 0);
            pdf.text(t('catalog.preview.ref'), rightColumnStartX + 2, rightColumnY);
            pdf.text(t('catalog.preview.name'), rightColumnStartX + 20, rightColumnY);
            pdf.text(t('catalog.preview.dimensions'), rightColumnStartX + 70, rightColumnY);
            pdf.text(t('catalog.preview.price'), rightColumnStartX + rightColumnWidth - 25, rightColumnY, { align: "right" });
            rightColumnY += 7;

            for (const product of project.products) {
              if (rightColumnY > pageHeight - margin - 10) {
                pdf.addPage();
                yPosition = margin;
                leftColumnY = margin + 12;
                rightColumnY = margin + 12;
                
                pdf.setFontSize(18);
                pdf.setTextColor(0, 0, 0);
                pdf.text(project.name, margin, yPosition);
                
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

                pdf.setFontSize(9);
                pdf.setFillColor(240, 240, 240);
                pdf.rect(rightColumnStartX, rightColumnY - 5, rightColumnWidth, 7, 'F');
                pdf.setTextColor(0, 0, 0);
                pdf.text(t('catalog.preview.ref'), rightColumnStartX + 2, rightColumnY);
                pdf.text(t('catalog.preview.name'), rightColumnStartX + 20, rightColumnY);
                pdf.text(t('catalog.preview.dimensions'), rightColumnStartX + 70, rightColumnY);
                pdf.text(t('catalog.preview.price'), rightColumnStartX + rightColumnWidth - 25, rightColumnY, { align: "right" });
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
            }
          }

          yPosition = Math.max(leftColumnY, rightColumnY) + 15;
        }
      }

      // Footer with logo and "Powered by" on last page
      const finalLogoUrl = brandLogoUrl || userBrandLogoUrl;
      if (finalLogoUrl || showPoweredBy) {
        // Ensure we have space on the last page, otherwise add a new page
        if (yPosition > pageHeight - margin - 30) {
          pdf.addPage();
          yPosition = pageHeight - margin - 30;
        } else {
          yPosition = pageHeight - margin - 30;
        }

        // Draw a line separator
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 10;

        // Logo (left side) if available
        if (finalLogoUrl) {
          try {
            const logoData = await fetch(finalLogoUrl)
              .then(res => res.blob())
              .then(blob => new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              }));
            
            // Try to determine image format
            const logoFormat = finalLogoUrl.toLowerCase().includes('.png') ? 'PNG' : 
                             finalLogoUrl.toLowerCase().includes('.svg') ? 'SVG' : 'JPEG';
            
            // Add logo with max height of 15mm
            const logoHeight = 15;
            const logoWidth = logoHeight; // Square logo, adjust if needed
            pdf.addImage(logoData, logoFormat, margin, yPosition, logoWidth, logoHeight);
          } catch (error) {
            console.error("Error loading brand logo:", error);
          }
        }

        // "Powered by LAYER SUITE" (right side or center if no logo)
        if (showPoweredBy) {
          pdf.setFontSize(8);
          pdf.setTextColor(120, 120, 120);
          const poweredByText = "Powered by LAYER SUITE";
          if (finalLogoUrl) {
            // Right aligned if logo exists
            pdf.text(poweredByText, pageWidth - margin, yPosition + 10, { align: "right" });
          } else {
            // Center aligned if no logo
            pdf.text(poweredByText, pageWidth / 2, yPosition + 10, { align: "center" });
          }
        }
      }

      pdf.save(`${catalogName}.pdf`);
      toast.success(t('catalog.preview.pdfGenerated'));
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(t('catalog.preview.pdfError'));
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
            <DialogTitle>{t('catalog.preview.title')}: {catalogName}</DialogTitle>
            <Button onClick={generatePDF} disabled={generating}>
              {generating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {t('catalog.preview.downloadPDF')}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto border rounded-md bg-gray-100 p-4">
          {/* A4 Page Container */}
          <div className="mx-auto space-y-4" style={{ width: '794px' }}>
            {/* Cover Page */}
            <div className="bg-white shadow-lg" style={{ minHeight: '1123px', padding: '60px' }}>
              <div className="text-center py-12 border-b">
                <h1 className="text-4xl font-bold text-primary mb-4">{catalogName}</h1>
                <p className="text-muted-foreground">{t('catalog.preview.productCatalog')}</p>
              </div>
            </div>

            {/* Sections and Projects */}
            {sections.map((section, sectionIdx) => (
              <div key={section.id} className="bg-white shadow-lg" style={{ minHeight: '1123px', padding: '60px' }}>
                <div className="border-b-2 border-primary pb-2 mb-6">
                  <h2 className="text-3xl font-bold text-primary">{section.title}</h2>
                </div>
                {section.projects.map((project, projectIdx) => (
                  <div key={project.id} className="space-y-4 border-b pb-8 mb-8 last:border-0">
                    <h3 className="text-2xl font-bold">{project.name}</h3>
                    
                    {project.creator && (
                      <p className="text-sm text-muted-foreground">{t('catalog.preview.creator')}: {project.creator}</p>
                    )}

                    <div className="flex gap-6">
                      <div className="flex-shrink-0">
                        <img
                          src={project.image_url || placeholderImage}
                          alt={project.name}
                          className="w-48 h-48 object-cover rounded-md"
                        />
                      </div>

                      <div className="flex-1 space-y-4">
                        {project.description && (
                          <p className="text-muted-foreground">{project.description}</p>
                        )}

                        {project.colors && project.colors.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">{t('catalog.preview.availableColors')}:</p>
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
                            <h4 className="text-lg font-semibold">{t('catalog.preview.products')}</h4>
                            <div className="border rounded-md overflow-hidden">
                              <table className="w-full">
                                <thead className="bg-muted">
                                  <tr>
                                    <th className="text-left p-2 text-sm font-medium">{t('catalog.preview.ref')}</th>
                                    <th className="text-left p-2 text-sm font-medium">{t('catalog.preview.name')}</th>
                                    <th className="text-left p-2 text-sm font-medium">{t('catalog.preview.dimensions')}</th>
                                    <th className="text-right p-2 text-sm font-medium">{t('catalog.preview.price')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {project.products.map((product) => (
                                    <tr key={product.id} className="border-t">
                                      <td className="p-2 text-sm">{product.reference_code}</td>
                                      <td className="p-2 text-sm">{product.name}</td>
                                      <td className="p-2 text-sm">{product.dimensions || "-"}</td>
                                      <td className="p-2 text-sm text-right font-medium">{formatPrice(product.price)}</td>
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
            ))}

            {/* Projects without section */}
            {projectsWithoutSection.length > 0 && (
              <div className="bg-white shadow-lg" style={{ minHeight: '1123px', padding: '60px' }}>
                <div className="border-b-2 border-muted-foreground/30 pb-2 mb-6">
                  <h2 className="text-3xl font-bold text-muted-foreground">{t('catalog.preview.otherProjects')}</h2>
                </div>
                {projectsWithoutSection.map((project) => (
                  <div key={project.id} className="space-y-4 border-b pb-8 mb-8 last:border-0">
                    <h3 className="text-2xl font-bold">{project.name}</h3>
                    
                    {project.creator && (
                      <p className="text-sm text-muted-foreground">{t('catalog.preview.creator')}: {project.creator}</p>
                    )}

                    <div className="flex gap-6">
                      <div className="flex-shrink-0">
                        <img
                          src={project.image_url || placeholderImage}
                          alt={project.name}
                          className="w-48 h-48 object-cover rounded-md"
                        />
                      </div>

                      <div className="flex-1 space-y-4">
                        {project.description && (
                          <p className="text-muted-foreground">{project.description}</p>
                        )}

                        {project.colors && project.colors.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">{t('catalog.preview.availableColors')}:</p>
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
                            <h4 className="text-lg font-semibold">{t('catalog.preview.products')}</h4>
                            <div className="border rounded-md overflow-hidden">
                              <table className="w-full">
                                <thead className="bg-muted">
                                  <tr>
                                    <th className="text-left p-2 text-sm font-medium">{t('catalog.preview.ref')}</th>
                                    <th className="text-left p-2 text-sm font-medium">{t('catalog.preview.name')}</th>
                                    <th className="text-left p-2 text-sm font-medium">{t('catalog.preview.dimensions')}</th>
                                    <th className="text-right p-2 text-sm font-medium">{t('catalog.preview.price')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {project.products.map((product) => (
                                    <tr key={product.id} className="border-t">
                                      <td className="p-2 text-sm">{product.reference_code}</td>
                                      <td className="p-2 text-sm">{product.name}</td>
                                      <td className="p-2 text-sm">{product.dimensions || "-"}</td>
                                      <td className="p-2 text-sm text-right font-medium">{formatPrice(product.price)}</td>
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
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
