import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import { useTranslation } from 'react-i18next';
import { Bell, Mail, Smartphone } from 'lucide-react';

export const NotificationsSection = () => {
  const { preferences, updatePreferences } = useNotifications();
  const { t } = useTranslation();

  if (!preferences) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t('settings.notifications.title')}
        </CardTitle>
        <CardDescription>{t('settings.notifications.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delivery Methods */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">{t('settings.notifications.deliveryMethods')}</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="in-app">{t('settings.notifications.inApp')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.notifications.inAppDescription')}
                </p>
              </div>
            </div>
            <Switch
              id="in-app"
              checked={preferences.in_app_enabled}
              onCheckedChange={(checked) =>
                updatePreferences({ in_app_enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="email">{t('settings.notifications.email')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.notifications.emailDescription')}
                </p>
              </div>
            </div>
            <Switch
              id="email"
              checked={preferences.email_enabled}
              onCheckedChange={(checked) =>
                updatePreferences({ email_enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="push">{t('settings.notifications.push')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.notifications.pushDescription')}
                </p>
              </div>
            </div>
            <Switch
              id="push"
              checked={preferences.push_enabled}
              onCheckedChange={(checked) =>
                updatePreferences({ push_enabled: checked })
              }
              disabled
            />
          </div>
        </div>

        <Separator />

        {/* Notification Categories */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">{t('settings.notifications.categories')}</h3>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="subscription">
                {t('settings.notifications.subscription')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('settings.notifications.subscriptionDescription')}
              </p>
            </div>
            <Switch
              id="subscription"
              checked={preferences.subscription_notifications}
              onCheckedChange={(checked) =>
                updatePreferences({ subscription_notifications: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="orders">{t('settings.notifications.orders')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settings.notifications.ordersDescription')}
              </p>
            </div>
            <Switch
              id="orders"
              checked={preferences.order_notifications}
              onCheckedChange={(checked) =>
                updatePreferences({ order_notifications: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="projects">{t('settings.notifications.projects')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settings.notifications.projectsDescription')}
              </p>
            </div>
            <Switch
              id="projects"
              checked={preferences.project_notifications}
              onCheckedChange={(checked) =>
                updatePreferences({ project_notifications: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="materials">{t('settings.notifications.materials')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settings.notifications.materialsDescription')}
              </p>
            </div>
            <Switch
              id="materials"
              checked={preferences.material_notifications}
              onCheckedChange={(checked) =>
                updatePreferences({ material_notifications: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="system">{t('settings.notifications.system')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settings.notifications.systemDescription')}
              </p>
            </div>
            <Switch
              id="system"
              checked={preferences.system_notifications}
              onCheckedChange={(checked) =>
                updatePreferences({ system_notifications: checked })
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
