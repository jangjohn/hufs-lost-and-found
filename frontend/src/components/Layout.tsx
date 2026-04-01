import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import NotificationBell from './NotificationBell';

export default function Layout() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-bold text-blue-600">
              분실물 찾기
            </Link>
            <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
              홈
            </Link>
            {user && (
              <Link to="/post" className="text-sm text-gray-600 hover:text-gray-900">
                등록하기
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <NotificationBell />
                <Link to="/matches" className="text-sm text-gray-600 hover:text-gray-900">
                  매칭
                </Link>
                <Link to="/profile" className="text-sm text-gray-600 hover:text-gray-900">
                  {user.displayName ?? '프로필'}
                </Link>
                <button
                  onClick={signOut}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
