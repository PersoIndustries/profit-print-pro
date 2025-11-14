import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Card } from "@/components/ui/card";

interface CatalogItem {
  id: string;
  reference_code: string;
  name: string;
  sizes: Array<{ size: string; dimensions: string }>;
  pvp_price: number;
  image_url: string | null;
}

interface CatalogPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  items: CatalogItem[];
  onDownload: () => void;
}

export function CatalogPreview({
  isOpen,
  onClose,
  items,
  onDownload,
}: CatalogPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = items.length + 1; // +1 for cover page

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleDownload = () => {
    onDownload();
    onClose();
  };

  const renderCoverPage = () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-12">
      <h1 className="text-5xl font-bold text-primary mb-4 text-center">
        Catálogo de Productos
      </h1>
      <p className="text-2xl text-muted-foreground mb-8">Impresión 3D</p>
      <p className="text-lg text-muted-foreground">
        {new Date().toLocaleDateString("es-ES", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
      <div className="mt-12 text-center">
        <p className="text-sm text-muted-foreground">
          {items.length} producto{items.length !== 1 ? "s" : ""} en este catálogo
        </p>
      </div>
    </div>
  );

  const renderProductPage = (item: CatalogItem) => (
    <div className="w-full h-full p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <p className="text-sm text-muted-foreground mb-2">
          REF: {item.reference_code}
        </p>
        
        <h2 className="text-3xl font-bold mb-6">{item.name}</h2>

        {item.image_url && (
          <div className="mb-6 rounded-lg overflow-hidden border">
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full max-h-[400px] object-contain bg-muted"
            />
          </div>
        )}

        {item.sizes && item.sizes.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Tamaños disponibles</h3>
            <div className="grid gap-2">
              {item.sizes.map((size, idx) => (
                <Card key={idx} className="p-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{size.size}</span>
                    <span className="text-muted-foreground">{size.dimensions}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t">
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-muted-foreground">PVP:</span>
            <span className="text-4xl font-bold text-primary">
              {Number(item.pvp_price).toFixed(2)}€
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const currentItem = currentPage === 0 ? null : items[currentPage - 1];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>Vista Previa del Catálogo</DialogTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Página {currentPage + 1} de {totalPages}
              </span>
              <Button onClick={handleDownload} size="sm">
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted/30">
          <div className="w-full h-full flex items-center justify-center p-4">
            <Card className="w-full max-w-3xl h-full shadow-2xl bg-background overflow-hidden">
              {currentPage === 0 ? renderCoverPage() : renderProductPage(currentItem!)}
            </Card>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPage(idx)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  currentPage === idx
                    ? "bg-primary"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Ir a página ${idx + 1}`}
              />
            ))}
          </div>

          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentPage === totalPages - 1}
          >
            Siguiente
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
