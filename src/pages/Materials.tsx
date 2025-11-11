import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Star } from "lucide-react";
import { toast } from "sonner";

interface Material {
  id: string;
  name: string;
  price_per_kg: number;
  color: string | null;
  type: string | null;
  is_favorite: boolean;
}

const Materials = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [newMaterial, setNewMaterial] = useState({
    name: "",
    price_per_kg: "",
    color: "",
    type: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    fetchMaterials();
  }, [user]);

  const fetchMaterials = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .eq("user_id", user.id)
        .order("is_favorite", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error: any) {
      toast.error("Error al cargar materiales");
    } finally {
      setMaterialsLoading(false);
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from("materials").insert({
        user_id: user.id,
        name: newMaterial.name,
        price_per_kg: parseFloat(newMaterial.price_per_kg),
        color: newMaterial.color || null,
        type: newMaterial.type || null,
      });

      if (error) throw error;

      toast.success("Material añadido");
      setNewMaterial({ name: "", price_per_kg: "", color: "", type: "" });
      fetchMaterials();
    } catch (error: any) {
      toast.error("Error al añadir material");
    }
  };

  const handleToggleFavorite = async (id: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from("materials")
        .update({ is_favorite: !currentFavorite })
        .eq("id", id);

      if (error) throw error;

      toast.success(currentFavorite ? "Eliminado de favoritos" : "Añadido a favoritos");
      fetchMaterials();
    } catch (error: any) {
      toast.error("Error al actualizar favorito");
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      const { error } = await supabase.from("materials").delete().eq("id", id);

      if (error) throw error;

      toast.success("Material eliminado");
      fetchMaterials();
    } catch (error: any) {
      toast.error("Error al eliminar material");
    }
  };

  if (loading || materialsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Gestión de Materiales</h2>
        <p className="text-muted-foreground">
          Administra los materiales que utilizas en tus impresiones
        </p>
      </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Añadir Material</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddMaterial} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={newMaterial.name}
                    onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Precio por KG (€) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={newMaterial.price_per_kg}
                    onChange={(e) => setNewMaterial({ ...newMaterial, price_per_kg: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    value={newMaterial.color}
                    onChange={(e) => setNewMaterial({ ...newMaterial, color: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Input
                    id="type"
                    placeholder="PLA, ABS, PETG, etc."
                    value={newMaterial.type}
                    onChange={(e) => setNewMaterial({ ...newMaterial, type: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir Material
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            {materials.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No hay materiales. Añade tu primer material para comenzar.
                </CardContent>
              </Card>
            ) : (
              materials.map((material) => (
                <Card key={material.id}>
                  <CardContent className="py-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{material.name}</h3>
                          {material.is_favorite && (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          <p>Precio: €{material.price_per_kg}/kg</p>
                          {material.color && <p>Color: {material.color}</p>}
                          {material.type && <p>Tipo: {material.type}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleToggleFavorite(material.id, material.is_favorite)}
                        >
                          <Star className={material.is_favorite ? "w-4 h-4 text-yellow-500 fill-yellow-500" : "w-4 h-4"} />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteMaterial(material.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </>
  );
};

export default Materials;
