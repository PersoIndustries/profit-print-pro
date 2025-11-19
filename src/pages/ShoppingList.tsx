import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ShoppingCart, Trash2, Edit, Check, X, Euro, List, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ShoppingListItem {
  id: string;
  name: string;
  quantity: string | null;
  notes: string | null;
  estimated_price: number | null;
  is_completed: boolean;
  shopping_list_id: string;
  created_at: string;
}

interface ShoppingList {
  id: string;
  name: string;
  created_at: string;
}

export default function ShoppingListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isListFormOpen, setIsListFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);
  const [formName, setFormName] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formEstimatedPrice, setFormEstimatedPrice] = useState("");
  const [formListName, setFormListName] = useState("");

  useEffect(() => {
    if (user) {
      fetchLists();
    }
  }, [user]);

  useEffect(() => {
    if (selectedListId) {
      fetchItems();
    } else {
      setItems([]);
    }
  }, [selectedListId, user]);

  useEffect(() => {
    if (isFormOpen) {
      if (editingItem) {
        setFormName(editingItem.name);
        setFormQuantity(editingItem.quantity || "");
        setFormNotes(editingItem.notes || "");
        setFormEstimatedPrice(editingItem.estimated_price?.toString() || "");
      } else {
        setFormName("");
        setFormQuantity("");
        setFormNotes("");
        setFormEstimatedPrice("");
      }
    }
  }, [isFormOpen, editingItem]);

  useEffect(() => {
    if (isListFormOpen) {
      if (editingList) {
        setFormListName(editingList.name);
      } else {
        setFormListName("");
      }
    }
  }, [isListFormOpen, editingList]);

  const fetchLists = async () => {
    try {
      const { data, error } = await supabase
        .from("shopping_lists")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLists(data || []);
      
      // Si hay listas y no hay una seleccionada, seleccionar la primera
      if (data && data.length > 0 && !selectedListId) {
        setSelectedListId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching lists:", error);
      toast.error(t('shoppingList.messages.errorLoadingLists'));
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    if (!selectedListId) return;
    
    try {
      const { data, error } = await supabase
        .from("shopping_list")
        .select("*")
        .eq("shopping_list_id", selectedListId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching shopping list:", error);
      toast.error(t('shoppingList.messages.errorLoadingItems'));
    }
  };

  const handleSaveList = async () => {
    if (!formListName.trim()) {
      toast.error(t('shoppingList.messages.listNameRequired'));
      return;
    }

    if (!user) {
      toast.error("Error: usuario no autenticado");
      return;
    }

    try {
      if (editingList) {
        const { error } = await supabase
          .from("shopping_lists")
          .update({ name: formListName.trim() })
          .eq("id", editingList.id);

        if (error) throw error;
        toast.success(t('shoppingList.messages.listUpdated'));
      } else {
        // Verificar límite de listas de compra
        if (subscription && !subscription.canAdd.shoppingLists) {
          toast.error(t('shoppingList.messages.shoppingListLimitReached', { limit: subscription.limits.shoppingLists }));
          return;
        }

        const { error } = await supabase
          .from("shopping_lists")
          .insert({ 
            user_id: user.id,
            name: formListName.trim() 
          });

        if (error) throw error;
        toast.success(t('shoppingList.messages.listCreated'));
      }

      setIsListFormOpen(false);
      setEditingList(null);
      setFormListName("");
      fetchLists();
    } catch (error: any) {
      console.error("Error saving list:", error);
      toast.error(error.message || t('shoppingList.messages.errorSavingList'));
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm(t('shoppingList.confirmDeleteList'))) {
      return;
    }

    try {
      const { error } = await supabase
        .from("shopping_lists")
        .delete()
        .eq("id", listId);

      if (error) throw error;
      toast.success(t('shoppingList.messages.listDeleted'));
      
      // Si se eliminó la lista seleccionada, seleccionar otra o ninguna
      if (selectedListId === listId) {
        const remainingLists = lists.filter(l => l.id !== listId);
        setSelectedListId(remainingLists.length > 0 ? remainingLists[0].id : null);
      }
      
      fetchLists();
    } catch (error) {
      console.error("Error deleting list:", error);
      toast.error(t('shoppingList.messages.errorDeletingList'));
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error(t('shoppingList.messages.nameRequired'));
      return;
    }

    if (!selectedListId) {
      toast.error(t('shoppingList.messages.selectListFirst'));
      return;
    }

    try {
      const estimatedPriceValue = formEstimatedPrice.trim() 
        ? (isNaN(parseFloat(formEstimatedPrice.trim())) ? null : parseFloat(formEstimatedPrice.trim()))
        : null;

      if (editingItem) {
        const { error } = await supabase
          .from("shopping_list")
          .update({
            name: formName.trim(),
            quantity: formQuantity.trim() || null,
            notes: formNotes.trim() || null,
            estimated_price: estimatedPriceValue,
          })
          .eq("id", editingItem.id);

        if (error) throw error;
        toast.success(t('shoppingList.messages.itemUpdated'));
      } else {
        const { error } = await supabase
          .from("shopping_list")
          .insert({
            name: formName.trim(),
            quantity: formQuantity.trim() || null,
            notes: formNotes.trim() || null,
            estimated_price: estimatedPriceValue,
            shopping_list_id: selectedListId,
            is_completed: false,
          });

        if (error) throw error;
        toast.success(t('shoppingList.messages.itemAdded'));
      }

      setIsFormOpen(false);
      setEditingItem(null);
      fetchItems();
    } catch (error) {
      console.error("Error saving item:", error);
      toast.error(t('shoppingList.messages.errorSavingItem'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("shopping_list")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success(t('shoppingList.messages.itemDeleted'));
      fetchItems();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error(t('shoppingList.messages.errorDeletingItem'));
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
      toast.error(t('shoppingList.messages.errorUpdatingItem'));
    }
  };

  const handleEdit = (item: ShoppingListItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleNewItem = () => {
    if (!selectedListId) {
      toast.error(t('shoppingList.messages.selectListFirst'));
      return;
    }
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleNewList = () => {
    setEditingList(null);
    setIsListFormOpen(true);
  };

  const handleEditList = (list: ShoppingList) => {
    setEditingList(list);
    setIsListFormOpen(true);
  };

  const selectedList = lists.find(l => l.id === selectedListId);
  const completedItems = items.filter(item => item.is_completed);
  const pendingItems = items.filter(item => !item.is_completed);
  const totalEstimatedPrice = pendingItems.reduce((sum, item) => sum + (item.estimated_price || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('shoppingList.loading')}</p>
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
            {t('shoppingList.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('shoppingList.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleNewList} variant="outline">
            <List className="w-4 h-4 mr-2" />
            {t('shoppingList.newList')}
          </Button>
          <Button onClick={handleNewItem} disabled={!selectedListId}>
            <Plus className="w-4 h-4 mr-2" />
            {t('shoppingList.addItem')}
          </Button>
        </div>
      </div>

      {/* Selector de listas */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium whitespace-nowrap">{t('shoppingList.listLabel')}</label>
            <Select value={selectedListId || ""} onValueChange={setSelectedListId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={t('shoppingList.selectList')} />
              </SelectTrigger>
              <SelectContent>
                {lists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedList && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditList(selectedList)}>
                    <Edit className="w-4 h-4 mr-2" />
                    {t('shoppingList.editList')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleDeleteList(selectedList.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('shoppingList.deleteList')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

      {lists.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <List className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">{t('shoppingList.noLists')}</p>
            <p className="text-sm mb-4">{t('shoppingList.createFirstList')}</p>
            <Button onClick={handleNewList} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              {t('shoppingList.createFirstListButton')}
            </Button>
          </CardContent>
        </Card>
      ) : !selectedListId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">{t('shoppingList.selectListMessage')}</p>
            <p className="text-sm mb-4">{t('shoppingList.selectListDescription')}</p>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">{t('shoppingList.emptyList', { name: selectedList?.name })}</p>
            <p className="text-sm mb-4">{t('shoppingList.addItemsToList')}</p>
            <Button onClick={handleNewItem} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              {t('shoppingList.addFirstItem')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Resumen de precio total */}
          {totalEstimatedPrice > 0 && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('shoppingList.totalEstimatedPrice')}</span>
                  <span className="text-lg font-bold text-primary flex items-center gap-1">
                    <Euro className="w-4 h-4" />
                    {totalEstimatedPrice.toFixed(2)} €
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items pendientes */}
          {pendingItems.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">{t('shoppingList.pending')} ({pendingItems.length})</h2>
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
                                {t('shoppingList.quantity')}: {item.quantity}
                              </p>
                            )}
                            {item.estimated_price && (
                              <p className="text-sm font-medium text-primary mt-1 flex items-center gap-1">
                                <Euro className="w-3 h-3" />
                                {t('shoppingList.estimatedPrice')}: {item.estimated_price.toFixed(2)} €
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
                {t('shoppingList.completed')} ({completedItems.length})
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
                                {t('shoppingList.quantity')}: {item.quantity}
                              </p>
                            )}
                            {item.estimated_price && (
                              <p className="text-sm font-medium text-primary mt-1 flex items-center gap-1 line-through">
                                <Euro className="w-3 h-3" />
                                {t('shoppingList.estimatedPrice')}: {item.estimated_price.toFixed(2)} €
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
              {editingItem ? t('shoppingList.editItem') : t('shoppingList.addItem')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('shoppingList.nameLabel')}</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t('shoppingList.itemNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('shoppingList.quantity')}</label>
              <Input
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
                placeholder={t('shoppingList.quantityPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('shoppingList.estimatedPriceLabel')}</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formEstimatedPrice}
                onChange={(e) => setFormEstimatedPrice(e.target.value)}
                placeholder={t('shoppingList.pricePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('shoppingList.notes')}</label>
              <Input
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder={t('shoppingList.notesPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              {t('shoppingList.cancel')}
            </Button>
            <Button onClick={handleSave}>
              {editingItem ? t('shoppingList.save') : t('shoppingList.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para agregar/editar lista */}
      <Dialog open={isListFormOpen} onOpenChange={setIsListFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingList ? t('shoppingList.editList') : t('shoppingList.newList')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('shoppingList.listNameLabel')}</label>
              <Input
                value={formListName}
                onChange={(e) => setFormListName(e.target.value)}
                placeholder={t('shoppingList.listNamePlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsListFormOpen(false)}>
              {t('shoppingList.cancel')}
            </Button>
            <Button onClick={handleSaveList}>
              {editingList ? t('shoppingList.save') : t('shoppingList.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
