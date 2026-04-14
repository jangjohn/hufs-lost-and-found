import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import NotificationBell from './NotificationBell';

function navClass(isActive: boolean) {
  return [
    'rounded-full px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-slate-900 text-white'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ');
}

export default function Layout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const guestLinks = [
    { to: '/', label: 'Browse' },
    { to: '/login', label: 'Sign in' },
  ];

  const authedLinks = [
    { to: '/', label: 'Browse' },
    { to: '/post', label: 'Post item' },
    { to: '/matches', label: 'Matches' },
    { to: '/profile', label: 'Profile' },
  ];

  const links = user ? authedLinks : guestLinks;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#eff6ff,_#f8fafc_40%,_#f8fafc)] text-slate-900">
      <nav className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <NavLink to="/" className="text-base font-semibold tracking-tight text-sky-700 sm:text-lg">
              HUFS Lost & Found
            </NavLink>
            <span className="hidden rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 sm:inline-flex">
              Campus community board
            </span>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => navClass(isActive)}>
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <NotificationBell />
                <span className="max-w-[180px] truncate text-sm text-slate-500">{user.displayName ?? user.email}</span>
                <button
                  onClick={signOut}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Sign out
                </button>
              </>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-600 md:hidden"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
          >
            <span className="flex h-5 w-5 flex-col items-center justify-center gap-1">
              <span className={`block h-0.5 w-4 bg-current transition ${menuOpen ? 'translate-y-1.5 rotate-45' : ''}`} />
              <span className={`block h-0.5 w-4 bg-current transition ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 w-4 bg-current transition ${menuOpen ? '-translate-y-1.5 -rotate-45' : ''}`} />
            </span>
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
            <div className="flex flex-col gap-2">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => navClass(isActive)}>
                  {link.label}
                </NavLink>
              ))}
              {user ? (
                <button
                  onClick={signOut}
                  className="mt-2 rounded-full border border-slate-200 px-4 py-2 text-left text-sm font-medium text-slate-600"
                >
                  Sign out
                </button>
              ) : null}
            </div>
          </div>
        )}
      </nav>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
