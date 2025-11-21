import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function SecuritySection() {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error(t('settings.messages.passwordsDontMatch'));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t('settings.messages.passwordMinLength'));
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      toast.success(t('settings.messages.passwordUpdated'));
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || t('settings.messages.errorChangingPassword'));
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{t('settings.security.title')}</CardTitle>
        <CardDescription className="text-sm">{t('settings.security.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div className="space-y-3">
            <div>
              <Label htmlFor="new_password" className="text-sm">{t('settings.security.newPassword')}</Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('settings.security.newPasswordPlaceholder')}
                className="h-9 text-sm"
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm_password" className="text-sm">{t('settings.security.confirmPassword')}</Label>
              <Input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('settings.security.confirmPasswordPlaceholder')}
                className="h-9 text-sm"
                required
              />
            </div>
          </div>

          <Button type="submit" size="sm" className="mt-2">{t('settings.security.changePassword')}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
