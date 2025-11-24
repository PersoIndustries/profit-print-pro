import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useTierFeatures } from "@/hooks/useTierFeatures";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Crown } from "lucide-react";

interface Profile {
  full_name: string;
  email: string;
  billing_address: string;
  billing_city: string;
  billing_postal_code: string;
  billing_country: string;
  brand_logo_url: string | null;
}

interface ProfileSectionProps {
  profile: Profile;
  userId: string | undefined;
  onProfileUpdate: (profile: Profile) => void;
}

export function ProfileSection({ profile, userId, onProfileUpdate }: ProfileSectionProps) {
  const { t } = useTranslation();
  const { isEnterprise } = useTierFeatures();
  const [localProfile, setLocalProfile] = useState(profile);
  const [brandLogoUploading, setBrandLogoUploading] = useState(false);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: localProfile.full_name,
          billing_address: localProfile.billing_address,
          billing_city: localProfile.billing_city,
          billing_postal_code: localProfile.billing_postal_code,
          billing_country: localProfile.billing_country
        })
        .eq("id", userId);

      if (error) throw error;
      onProfileUpdate(localProfile);
      toast.success(t('settings.messages.profileUpdated'));
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || t('settings.messages.errorUpdatingProfile'));
    }
  };

  const handleBrandLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const isValidType = validTypes.includes(file.type) || 
      ['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(fileExtension || '');
    
    if (!isValidType) {
      toast.error(t('settings.messages.onlyImages'));
      return;
    }

    if (file.size > 2097152) {
      toast.error(t('settings.messages.maxSize'));
      return;
    }

    try {
      setBrandLogoUploading(true);
      
      const fileExt = file.name.split(".").pop()?.toLowerCase() || 'png';
      const fileName = `brand-logo-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      if (localProfile.brand_logo_url) {
        const oldPath = localProfile.brand_logo_url.split('/').slice(-2).join('/');
        await supabase.storage.from("brand-logos").remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from("brand-logos")
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("brand-logos")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ brand_logo_url: publicUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      const updatedProfile = { ...localProfile, brand_logo_url: publicUrl };
      setLocalProfile(updatedProfile);
      onProfileUpdate(updatedProfile);
      toast.success(t('settings.messages.logoUpdated'));
    } catch (error: any) {
      console.error("Error uploading brand logo:", error);
      toast.error(error.message || t('settings.messages.errorUploadingLogo'));
    } finally {
      setBrandLogoUploading(false);
    }
  };

  const handleRemoveBrandLogo = async () => {
    if (!userId || !localProfile.brand_logo_url) return;

    try {
      const oldPath = localProfile.brand_logo_url.split('/').slice(-2).join('/');
      await supabase.storage.from("brand-logos").remove([oldPath]);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ brand_logo_url: null })
        .eq("id", userId);

      if (updateError) throw updateError;

      const updatedProfile = { ...localProfile, brand_logo_url: null };
      setLocalProfile(updatedProfile);
      onProfileUpdate(updatedProfile);
      toast.success(t('settings.messages.logoRemoved'));
    } catch (error: any) {
      console.error("Error removing brand logo:", error);
      toast.error(error.message || t('settings.messages.errorRemovingLogo'));
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{t('settings.profile.title')}</CardTitle>
        <CardDescription className="text-sm">{t('settings.profile.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-2xl">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="full_name" className="text-sm">{t('settings.profile.fullName')}</Label>
              <Input
                id="full_name"
                value={localProfile.full_name}
                onChange={(e) => setLocalProfile({ ...localProfile, full_name: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-sm">{t('settings.profile.email')}</Label>
              <Input id="email" value={localProfile.email} disabled className="h-9 text-sm" />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="text-base font-semibold mb-3">{t('settings.profile.billingAddress')}</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label htmlFor="billing_address" className="text-sm">{t('settings.profile.address')}</Label>
                <Input
                  id="billing_address"
                  value={localProfile.billing_address}
                  onChange={(e) => setLocalProfile({ ...localProfile, billing_address: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="billing_city" className="text-sm">{t('settings.profile.city')}</Label>
                <Input
                  id="billing_city"
                  value={localProfile.billing_city}
                  onChange={(e) => setLocalProfile({ ...localProfile, billing_city: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="billing_postal_code" className="text-sm">{t('settings.profile.postalCode')}</Label>
                <Input
                  id="billing_postal_code"
                  value={localProfile.billing_postal_code}
                  onChange={(e) => setLocalProfile({ ...localProfile, billing_postal_code: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="billing_country" className="text-sm">{t('settings.profile.country')}</Label>
                <Input
                  id="billing_country"
                  value={localProfile.billing_country}
                  onChange={(e) => setLocalProfile({ ...localProfile, billing_country: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          {isEnterprise ? (
            <div className="border-t pt-4 mt-4">
              <h3 className="text-base font-semibold mb-3">{t('settings.profile.brandLogo')}</h3>
              <div className="space-y-3">
                {localProfile.brand_logo_url && (
                  <div className="flex items-center gap-4">
                    <img 
                      src={localProfile.brand_logo_url} 
                      alt={t('settings.profile.altLogo')} 
                      className="w-24 h-24 object-contain border rounded p-2 bg-background"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveBrandLogo}
                      disabled={brandLogoUploading}
                    >
                      {t('settings.profile.removeLogo')}
                    </Button>
                  </div>
                )}
                <div>
                  <Label htmlFor="brand_logo" className="text-sm">{t('settings.profile.uploadBrandLogo')}</Label>
                  <Input
                    id="brand_logo"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                    onChange={handleBrandLogoUpload}
                    disabled={brandLogoUploading}
                    className="h-9 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settings.profile.formats')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-t pt-4 mt-4">
              <div className="bg-muted/50 border border-muted rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Crown className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold mb-1">{t('settings.profile.brandLogo')}</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      El branding personalizado está disponible solo para usuarios Business. Actualiza tu plan para acceder a esta funcionalidad.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = '/pricing'}
                    >
                      Ver Planes
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button type="submit" size="sm" className="mt-4">{t('common.save')}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
