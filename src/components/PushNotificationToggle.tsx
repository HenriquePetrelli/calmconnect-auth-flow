import { Switch } from '@/components/ui/switch';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/** Settings-row toggle for push notifications, reused across the patient,
 * psychologist and admin profile screens. Renders nothing if the browser
 * can't do push at all or the project has no Firebase config yet. */
export const PushNotificationToggle = () => {
  const { isSupported, isEnabled, loading, enablePush, disablePush } = usePushNotifications();

  if (!isSupported) return null;

  return (
    <div className="flex items-center justify-between py-4">
      <div className="space-y-0.5 pr-4">
        <div className="text-sm font-medium">Notificações push</div>
        <div className="text-xs text-muted-foreground">
          Receba alertas mesmo com o app fechado
        </div>
      </div>
      <Switch
        checked={isEnabled}
        disabled={loading}
        onCheckedChange={(checked) => (checked ? enablePush() : disablePush())}
        aria-label="Alternar notificações push"
      />
    </div>
  );
};
