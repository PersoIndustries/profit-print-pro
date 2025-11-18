import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, ShoppingCart, Trash2, Edit, Check, X } from "lucide-react";
import { toast } from "sonner";

interface ShoppingListItem {
  id: string;
  name: string;
  quantity: string | null;
  notes: string | null;
  is_completed: boolean;
  created_at: string;
}

export default function ShoppingList() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => {
    if (user) {
      fetchItems();
    }
  }, [user]);

  useEffect(() => {
    if (isFormOpen) {
      if (editingItem) {
        setFormName(editingItem.name);
        setFormQuantity(editingItem.quantity || "");
        setFormNotes(editingItem.notes || "");
      } else {
        setFormName("");
        setFormQuantity("");
        setFormNotes("");
      }
    }
  }, [isFormOpen, editingItem]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("shopping_list")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching shopping list:", error);
      toast.error("Error al cargar la lista de la compra");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    try {
      if (editingItem) {
        const { error } = await supabase
          .from("shopping_list")
          .update({
            name: formName.trim(),
            quantity: formQuantity.trim() || null,
            notes: formNotes.trim() || null,
          })
          .eq("id", editingItem.id);

        if (error) throw error;
        toast.success("Item actualizado correctamente");
      } else {
        const { error } = await supabase
          .from("shopping_list")
          .insert({
            name: formName.trim(),
            quantity: formQuantity.trim() || null,
            notes: formNotes.trim() || null,
            is_completed: false,
          });

        if (error) throw error;
        toast.success("Item agregado a la lista");
      }

      setIsFormOpen(false);
      setEditingItem(null);
      fetchItems();
    } catch (error) {
      console.error("Error saving item:", error);
      toast.error("Error al guardar el item");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("shopping_list")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Item eliminado");
      fetchItems();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Error al eliminar el item");
    }
  };

  const handleToggleComplete = async (item: ShoppingListItem) => {
    try {
      const { error } = await supabase
        .from("shopping_list")
        .update({ is_completed: !item.is_completed })
        .eq("id", item.id);

      if (error) throw error;
      fetchItems();
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("Error al actualizar el item");
    }
  };

  const handleEdit = (item: ShoppingListItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleNewItem = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const completedItems = items.filter(item => item.is_completed);
  const pendingItems = items.filter(item => !item.is_completed);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando lista...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-8 h-8" />
            Lista de la Compra
          </h1>
          <p className="text-muted-foreground mt-2">
            Guarda los items que necesitas comprar para futuras compras
          </p>
        </div>
        <Button onClick={handleNewItem}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar Item
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Tu lista está vacía</p>
            <p className="text-sm mb-4">Agrega items que necesites comprar</p>
            <Button onClick={handleNewItem} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Agregar primer item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Items pendientes */}
          {pendingItems.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Pendientes ({pendingItems.length})</h2>
              <div className="grid gap-4">
                {pendingItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="mt-1"
                            onClick={() => handleToggleComplete(item)}
                          >
                            <div className="w-5 h-5 border-2 border-primary rounded flex items-center justify-center">
                              {item.is_completed && <Check className="w-4 h-4 text-primary" />}
                            </div>
                          </Button>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{item.name}</h3>
                            {item.quantity && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Cantidad: {item.quantity}
                              </p>
                            )}
                            {item.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
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
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Items completados */}
          {completedItems.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-muted-foreground">
                Completados ({completedItems.length})
              </h2>
              <div className="grid gap-4">
                {completedItems.map((item) => (
                  <Card key={item.id} className="opacity-60 hover:opacity-80 transition-opacity">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="mt-1"
                            onClick={() => handleToggleComplete(item)}
                          >
                            <div className="w-5 h-5 border-2 border-primary rounded bg-primary flex items-center justify-center">
                              <Check className="w-4 h-4 text-primary-foreground" />
                            </div>
                          </Button>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg line-through">{item.name}</h3>
                            {item.quantity && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Cantidad: {item.quantity}
                              </p>
                            )}
                            {item.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
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
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialog para agregar/editar item */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Item" : "Agregar Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre *</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej: Filamento PLA rojo"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cantidad</label>
              <Input
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
                placeholder="Ej: 1 kg, 2 unidades"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notas</label>
              <Input
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Notas adicionales..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingItem ? "Guardar" : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

