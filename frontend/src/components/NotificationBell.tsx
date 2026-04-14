import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../hooks/useNotification';

const locale = 'ko' as const;

const text = {
  ko: {
    enabled: '알림이 활성화되어 있습니다',
    enable: '알림 켜기',
  },
  en: {
    enabled: 'Notifications are enabled',
    enable: 'Enable notifications',
  },
};

export default function NotificationBell() {
  const { user } = useAuth();
  const { permission, requestPermission } = useNotification(user?.uid);
  const t = text[locale];

  if (permission === 'granted') {
    return (
      <span className="text-gray-500 text-lg cursor-default" title={t.enabled}>
        馃敂
      </span>
    );
  }

  return (
    <button
      onClick={requestPermission}
      className="text-gray-400 text-lg hover:text-gray-600"
      title={t.enable}
    >
      馃敃
    </button>
  );
}
