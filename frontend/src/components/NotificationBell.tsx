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

function BellIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 ${active ? 'text-slate-500' : 'text-slate-400 group-hover:text-slate-600'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M10 17a2 2 0 0 0 4 0" />
    </svg>
  );
}

export default function NotificationBell() {
  const { user } = useAuth();
  const { permission, requestPermission } = useNotification(user?.uid);
  const t = text[locale];

  if (permission === 'granted') {
    return (
      <span className="inline-flex items-center justify-center" title={t.enabled}>
        <BellIcon active />
      </span>
    );
  }

  return (
    <button
      onClick={requestPermission}
      className="group inline-flex items-center justify-center"
      title={t.enable}
      type="button"
    >
      <BellIcon active={false} />
    </button>
  );
}
