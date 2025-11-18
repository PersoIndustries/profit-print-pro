import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Header } from "@/components/Header";

const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasValidSession, setHasValidSession] = useState<boolean | null>(null);

  // Check if we have a valid session (from password recovery)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Reset password session check:", session);
      setHasValidSession(!!session);
    };
    
    checkSession();

    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Reset password auth event:", event, "Session:", session);
      if (event === 'PASSWORD_RECOVERY') {
        setHasValidSession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check if we have a recovery token in the URL
  const searchParams = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash.substring(1));
  const hasTokenInUrl = searchParams.get('type') === 'recovery' || 
                        hashParams.get('type') === 'recovery' ||
                        hashParams.get('access_token');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error(t('auth.passwordsDontMatch'));
      return;
    }

    if (password.length < 6) {
      toast.error(t('auth.passwordMinLength'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      toast.success(t('auth.passwordUpdated'));
      navigate("/auth");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || t('auth.errorResettingPassword'));
    } finally {
      setLoading(false);
    }
  };

  if (hasValidSession === null) {
    // Still checking session
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <p>{t('common.loading')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasValidSession && !hasTokenInUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <KeyRound className="h-12 w-12 mx-auto mb-4 text-primary" />
            <CardTitle>{t('auth.resetPassword.invalidLink')}</CardTitle>
            <CardDescription>
              {t('auth.resetPassword.invalidLinkDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full" 
              onClick={() => navigate("/auth?mode=forgot")}
            >
              {t('auth.resetPassword.requestNewLink')}
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => navigate("/auth")}
            >
              {t('auth.backToLogin')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <Header variant="auth" />

      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <KeyRound className="h-12 w-12 mx-auto mb-4 text-primary" />
            <CardTitle>{t('auth.resetPasswordTitle')}</CardTitle>
            <CardDescription>{t('auth.resetPassword.enterNewPassword')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <Label htmlFor="password">{t('auth.newPassword')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.newPasswordPlaceholder')}
                  required
                  minLength={6}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('common.loading') : t('auth.resetPasswordTitle')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate("/auth")}
              >
                {t('auth.backToLogin')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
