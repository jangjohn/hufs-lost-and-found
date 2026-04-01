import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../hooks/useNotification';

export default function NotificationBell() {
  const { user } = useAuth();
  const { permission, requestPermission } = useNotification(user?.uid);

  if (permission === 'granted') {
    return (
      <span className="text-gray-500 text-lg cursor-default" title="알림 활성화됨">
        🔔
      </span>
    );
  }

  return (
    <button
      onClick={requestPermission}
      className="text-gray-400 text-lg hover:text-gray-600"
      title="알림 허용하기"
    >
      🔕
    </button>
  );
}
