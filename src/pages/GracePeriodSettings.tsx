import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Download, Crown, Calendar, ImageOff, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export default function GracePeriodSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { subscription, loading } = useSubscription();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!subscription?.gracePeriod.isInGracePeriod) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              {t('gracePeriod.settings.noGracePeriod.title')}
            </CardTitle>
            <CardDescription>
              {t('gracePeriod.settings.noGracePeriod.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/settings')}>
              {t('common.back')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysUntilDeletion = subscription.gracePeriod.daysUntilDeletion || 0;
  const percentageRemaining = (daysUntilDeletion / 90) * 100;
  const previousTierName = subscription.gracePeriod.previousTier === 'tier_2' ? 'Enterprise' : 'Pro';

  const handleExportData = async () => {
    try {
      setExporting(true);
      toast.info(t('gracePeriod.settings.export.starting'));

      // Fetch all user data
      const [
        { data: projects },
        { data: materials },
        { data: orders },
        { data: prints },
        { data: catalogs }
      ] = await Promise.all([
        supabase.from('projects').select('*').eq('user_id', user!.id),
        supabase.from('materials').select('*').eq('user_id', user!.id),
        supabase.from('orders').select('*').eq('user_id', user!.id),
        supabase.from('prints').select('*').eq('user_id', user!.id),
        supabase.from('catalogs').select('*').eq('user_id', user!.id)
      ]);

      // Create export object
      const exportData = {
        exportDate: new Date().toISOString(),
        gracePeriod: subscription.gracePeriod,
        subscription: {
          tier: subscription.tier,
          status: subscription.status
        },
        data: {
          projects: projects || [],
          materials: materials || [],
          orders: orders || [],
          prints: prints || [],
          catalogs: catalogs || []
        }
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `printgest-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(t('gracePeriod.settings.export.success'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('gracePeriod.settings.export.error'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('gracePeriod.settings.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('gracePeriod.settings.subtitle')}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/settings')}>
          {t('common.back')}
        </Button>
      </div>

      {/* Status Alert */}
      <Alert variant={daysUntilDeletion <= 7 ? 'destructive' : 'default'}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="font-bold">
          {daysUntilDeletion <= 1 
            ? t('gracePeriod.lastDay')
            : daysUntilDeletion <= 7
            ? t('gracePeriod.finalWeek', { days: daysUntilDeletion })
            : t('gracePeriod.warning', { days: daysUntilDeletion })}
        </AlertTitle>
        <AlertDescription>
          {t('gracePeriod.settings.statusDescription', { tier: previousTierName })}
        </AlertDescription>
      </Alert>

      {/* Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('gracePeriod.settings.timeline.title')}
          </CardTitle>
          <CardDescription>
            {t('gracePeriod.settings.timeline.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>{t('gracePeriod.settings.timeline.daysRemaining')}</span>
              <span className="font-bold">{daysUntilDeletion} {t('gracePeriod.settings.timeline.days')}</span>
            </div>
            <Progress value={percentageRemaining} className="h-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{t('gracePeriod.settings.timeline.downgradeDate')}</p>
              <p className="font-semibold">
                {subscription.gracePeriod.downgradeDate 
                  ? new Date(subscription.gracePeriod.downgradeDate).toLocaleDateString()
                  : '-'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{t('gracePeriod.settings.timeline.deletionDate')}</p>
              <p className="font-semibold text-red-600">
                {subscription.gracePeriod.gracePeriodEnd 
                  ? new Date(subscription.gracePeriod.gracePeriodEnd).toLocaleDateString()
                  : '-'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{t('gracePeriod.settings.timeline.previousTier')}</p>
              <p className="font-semibold">{previousTierName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Read-Only Mode Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageOff className="h-5 w-5" />
            {t('gracePeriod.settings.readOnly.title')}
          </CardTitle>
          <CardDescription>
            {t('gracePeriod.settings.readOnly.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground">•</span>
              <span>{t('gracePeriod.settings.readOnly.cantCreate')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground">•</span>
              <span>{t('gracePeriod.settings.readOnly.cantModify')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground">•</span>
              <span>{t('gracePeriod.settings.readOnly.imagesDeleted')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>{t('gracePeriod.settings.readOnly.dataPreserved')}</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('gracePeriod.settings.actions.title')}</CardTitle>
          <CardDescription>
            {t('gracePeriod.settings.actions.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">{t('gracePeriod.settings.actions.reactivate.title')}</h4>
            <p className="text-sm text-muted-foreground">
              {t('gracePeriod.settings.actions.reactivate.description', { tier: previousTierName })}
            </p>
            <Button className="w-full" onClick={() => navigate('/pricing')}>
              <Crown className="h-4 w-4 mr-2" />
              {t('gracePeriod.reactivate')}
            </Button>
          </div>

          <div className="pt-4 border-t space-y-2">
            <h4 className="font-semibold">{t('gracePeriod.settings.actions.export.title')}</h4>
            <p className="text-sm text-muted-foreground">
              {t('gracePeriod.settings.actions.export.description')}
            </p>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleExportData}
              disabled={exporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? t('gracePeriod.settings.export.exporting') : t('gracePeriod.settings.export.button')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
