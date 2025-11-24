import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTierFeatures } from "@/hooks/useTierFeatures";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Image as ImageIcon, X, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface CatalogSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogId: string;
  onSuccess?: () => void;
}

export function CatalogSettingsModal({ open, onOpenChange, catalogId, onSuccess }: CatalogSettingsModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isEnterprise } = useTierFeatures();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPoweredBy, setShowPoweredBy] = useState(true);
  const [coverBackgroundUrl, setCoverBackgroundUrl] = useState<string | null>(null);
  const [showLogoOnCover, setShowLogoOnCover] = useState(true);
  const [showTextOnCover, setShowTextOnCover] = useState(true);
  const [catalogName, setCatalogName] = useState("");
  const [catalogDescription, setCatalogDescription] = useState("");
  const [season, setSeason] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open && catalogId) {
      fetchSettings();
    }
  }, [open, catalogId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("catalogs")
        .select("name, description, season, show_powered_by, cover_background_url, show_logo_on_cover, show_text_on_cover, brand_logo_url")
        .eq("id", catalogId)
        .single();

      if (error) throw error;

      setCatalogName(data.name || "");
      setCatalogDescription(data.description || "");
      setSeason(data.season || "");
      setShowPoweredBy(data.show_powered_by ?? true);
      setCoverBackgroundUrl(data.cover_background_url || null);
      setShowLogoOnCover(data.show_logo_on_cover ?? true);
      setShowTextOnCover(data.show_text_on_cover ?? true);
      setBrandLogoUrl(data.brand_logo_url || null);
    } catch (error: any) {
      console.error("Error fetching catalog settings:", error);
      toast.error(t('catalog.settings.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error(t('catalog.settings.invalidImageType'));
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('catalog.settings.imageTooLarge'));
      return;
    }

    try {
      setUploading(true);

      // Eliminar imagen anterior si existe
      if (coverBackgroundUrl) {
        const oldPath = coverBackgroundUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('catalog-images').remove([oldPath]);
      }

      const fileExt = file.name.split(".").pop()?.toLowerCase() || 'jpg';
      const fileName = `cover-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("catalog-images")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("catalog-images")
        .getPublicUrl(filePath);

      setCoverBackgroundUrl(publicUrl);
      toast.success(t('catalog.settings.imageUploaded'));
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(t('catalog.settings.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!coverBackgroundUrl) return;

    try {
      setUploading(true);
      const oldPath = coverBackgroundUrl.split('/').slice(-2).join('/');
      const { error } = await supabase.storage.from('catalog-images').remove([oldPath]);
      
      if (error) throw error;
      
      setCoverBackgroundUrl(null);
      toast.success(t('catalog.settings.imageRemoved'));
    } catch (error: any) {
      console.error("Error removing image:", error);
      toast.error(t('catalog.settings.removeError'));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("catalogs")
        .update({
          name: catalogName,
          description: catalogDescription || null,
          season: season || null,
          show_powered_by: isEnterprise ? showPoweredBy : true, // Solo Business puede cambiar esto
          cover_background_url: coverBackgroundUrl,
          show_logo_on_cover: showLogoOnCover,
          show_text_on_cover: showTextOnCover,
          brand_logo_url: isEnterprise ? brandLogoUrl : null, // Solo Business puede tener brand logo
        })
        .eq("id", catalogId);

      if (error) throw error;

      toast.success(t('catalog.settings.updated'));
      onSuccess?.(); // Esto actualizará el nombre del catálogo en la página principal
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving catalog settings:", error);
      toast.error(t('catalog.settings.errorUpdating'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('catalog.settings.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Catalog Name */}
          <div className="space-y-2">
            <Label htmlFor="catalog-name">{t('catalog.settings.name')} *</Label>
            <Input
              id="catalog-name"
              value={catalogName}
              onChange={(e) => setCatalogName(e.target.value)}
              placeholder={t('catalog.settings.namePlaceholder')}
              required
            />
          </div>

          {/* Catalog Description */}
          <div className="space-y-2">
            <Label htmlFor="catalog-description">{t('catalog.settings.description')}</Label>
            <Textarea
              id="catalog-description"
              value={catalogDescription}
              onChange={(e) => setCatalogDescription(e.target.value)}
              placeholder={t('catalog.settings.descriptionPlaceholder')}
              rows={3}
            />
          </div>

          {/* Season */}
          <div className="space-y-2">
            <Label htmlFor="catalog-season">{t('catalog.settings.season')}</Label>
            <Input
              id="catalog-season"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              placeholder={t('catalog.settings.seasonPlaceholder')}
            />
            <p className="text-xs text-muted-foreground">
              {t('catalog.settings.seasonDesc')}
            </p>
          </div>

          {/* Powered By - Solo Business */}
          {isEnterprise ? (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-powered-by" className="text-sm font-normal">
                  {t('catalog.settings.showPoweredBy')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('catalog.settings.showPoweredByDesc')}
                </p>
              </div>
              <Switch
                id="show-powered-by"
                checked={showPoweredBy}
                onCheckedChange={setShowPoweredBy}
              />
            </div>
          ) : (
            <div className="bg-muted/50 border border-muted rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Crown className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <Label className="text-sm font-semibold mb-1 block">
                    {t('catalog.settings.showPoweredBy')}
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Ocultar "Powered by Layer Suite" está disponible solo para usuarios Business.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cover Background */}
          <div className="space-y-2">
            <Label>{t('catalog.settings.coverBackground')}</Label>
            <p className="text-xs text-muted-foreground">
              {t('catalog.settings.coverBackgroundDesc')}
            </p>
            {coverBackgroundUrl ? (
              <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                <img
                  src={coverBackgroundUrl}
                  alt="Cover background"
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveImage}
                  disabled={uploading}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <Label htmlFor="cover-background-upload" className="cursor-pointer">
                  <Button variant="outline" asChild disabled={uploading}>
                    <span>
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('catalog.settings.uploading')}
                        </>
                      ) : (
                        t('catalog.settings.uploadImage')
                      )}
                    </span>
                  </Button>
                </Label>
                <Input
                  id="cover-background-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </div>
            )}
          </div>

          {/* Show Logo on Cover */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-logo-cover" className="text-sm font-normal">
                {t('catalog.settings.showLogoOnCover')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('catalog.settings.showLogoOnCoverDesc')}
              </p>
            </div>
            <Switch
              id="show-logo-cover"
              checked={showLogoOnCover}
              onCheckedChange={setShowLogoOnCover}
            />
          </div>

          {/* Show Text on Cover */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-text-cover" className="text-sm font-normal">
                {t('catalog.settings.showTextOnCover')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('catalog.settings.showTextOnCoverDesc')}
              </p>
            </div>
            <Switch
              id="show-text-cover"
              checked={showTextOnCover}
              onCheckedChange={setShowTextOnCover}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={loading || uploading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('common.saving')}
              </>
            ) : (
              t('common.save')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

