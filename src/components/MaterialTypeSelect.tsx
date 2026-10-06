import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MaterialType } from "@/hooks/useMaterialTypes";

const NONE = "__none__";
const NEW = "__new__";
const MANAGE = "__manage__";

interface Props {
  types: MaterialType[];
  value: string | null;
  onChange: (id: string | null) => void;
  createType: (name: string) => Promise<MaterialType | null>;
  renameType: (id: string, name: string) => Promise<void>;
  deleteType: (id: string) => Promise<boolean>;
}

/** Material type selector with inline create and a manage dialog (rename/delete). */
export function MaterialTypeSelect({ types, value, onChange, createType, renameType, deleteType }: Props) {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = async () => {
    try {
      const created = await createType(newName);
      if (created) onChange(created.id);
      setNewName("");
      setCreating(false);
    } catch {
      toast.error(t("materialTypes.errorCreate"));
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await renameType(id, editName);
      setEditingId(null);
    } catch {
      toast.error(t("materialTypes.errorCreate"));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const ok = await deleteType(id);
      if (!ok) {
        toast.error(t("materialTypes.inUse"));
        return;
      }
      if (value === id) onChange(null);
    } catch {
      toast.error(t("materialTypes.errorDelete"));
    }
  };

  if (creating) {
    return (
      <div className="flex gap-2">
        <Input
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t("materialTypes.newPlaceholder")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreate();
            }
          }}
        />
        <Button type="button" size="icon" onClick={handleCreate} disabled={!newName.trim()}>
          <Check className="w-4 h-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => setCreating(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <Select
        value={value || NONE}
        onValueChange={(v) => {
          if (v === NEW) setCreating(true);
          else if (v === MANAGE) setManageOpen(true);
          else onChange(v === NONE ? null : v);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={t("materialTypes.select")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{t("materialTypes.none")}</SelectItem>
          {types.map((type) => (
            <SelectItem key={type.id} value={type.id}>
              {type.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={NEW}>+ {t("materialTypes.new")}</SelectItem>
          <SelectItem value={MANAGE}>{t("materialTypes.manage")}</SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("materialTypes.manage")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {types.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("materialTypes.empty")}</p>
            )}
            {types.map((type) => (
              <div key={type.id} className="flex items-center gap-2">
                {editingId === type.id ? (
                  <>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                    <Button type="button" size="icon" onClick={() => handleRename(type.id)}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{type.name}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(type.id);
                        setEditName(type.name);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" onClick={() => handleDelete(type.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={() => { setManageOpen(false); setCreating(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            {t("materialTypes.new")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
