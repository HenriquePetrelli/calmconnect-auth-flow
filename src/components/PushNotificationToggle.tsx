import { Switch } from '@/components/ui/switch';
import type { ReactNode } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { SettingsRow } from '@/components/settings/SettingsList';

/** Settings-row toggle for push notifications, reused across the patient,
 * psychologist and admin profile screens. Renders nothing if the browser
 * can't do push at all or the project has no Firebase config yet. With an
 * `icon`, it renders as a SettingsRow (patient profile). */
export const PushNotificationToggle = ({ icon }: { icon?: ReactNode } = {}) => {
  const { isSupported, isEnabled, loading, enablePush, disablePush } = usePushNotifications();

  if (!isSupported) return null;

  const toggle = (
    <Switch
      checked={isEnabled}
      disabled={loading}
      onCheckedChange={(checked) => (checked ? enablePush() : disablePush())}
      aria-label="Alternar notificações push"
    />
  );

  if (icon) {
    return (
      <SettingsRow
        icon={icon}
        title="Notificações push"
        description="Receba alertas mesmo com o app fechado"
        trailing={toggle}
      />
    );
  }

  return (
    <div className="flex items-center justify-between py-4">
      <div className="space-y-0.5 pr-4">
        <div className="text-sm font-medium">Notificações push</div>
        <div className="text-xs text-muted-foreground">
          Receba alertas mesmo com o app fechado
        </div>
      </div>
      {toggle}
    </div>
  );
};
