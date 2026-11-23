import { useState, useEffect } from 'react';
import { NavLink, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import ExplorePage   from './pages/ExplorePage';
import Ads           from './pages/Ads';
import Announcements from './pages/Announcements';
import ReportIssue   from './pages/ReportIssue';
import RequestData   from './pages/RequestData';
import Timetable     from './pages/Timetable';
import Admin         from './pages/Admin';
import Users         from './pages/Users';
import Login         from './pages/Login';
import MyAds         from './pages/MyAds';
import { AuthProvider, useAuth } from './AuthContext';

const NAV_GROUPS = {
  admin: [
    { group: 'OVERVIEW', links: [
      { to: '/admin', label: 'Dashboard',    icon: '🛠️' },
      { to: '/',      label: 'Explore City', icon: '🏙️' },
      { to: '/users', label: 'Manage Users', icon: '👥' },
    ]},
    { group: 'CITY SERVICES', links: [
      { to: '/announcements', label: 'Announcements', icon: '📢' },
      { to: '/timetable',     label: 'Transit',       icon: '🚆' },
    ]},
    { group: 'CIVIC', links: [
      { to: '/report-issue', label: 'Report Issues', icon: '⚠️' },
      { to: '/request-data', label: 'Requests',      icon: '📝' },
    ]},
    { group: 'COMMUNITY', links: [
      { to: '/ads', label: 'Advertisements', icon: '💼' },
    ]},
  ],
  citizen: [
    { group: 'OVERVIEW', links: [
      { to: '/', label: 'Explore City', icon: '🏙️' },
    ]},
    { group: 'CITY SERVICES', links: [
      { to: '/announcements', label: 'Announcements', icon: '📢' },
      { to: '/timetable',     label: 'Transit',       icon: '🚆' },
    ]},
    { group: 'CIVIC', links: [
      { to: '/report-issue', label: 'Report Issues', icon: '⚠️' },
      { to: '/request-data', label: 'Requests',      icon: '📝' },
    ]},
    { group: 'COMMUNITY', links: [
      { to: '/ads', label: 'Advertisements', icon: '💼' },
    ]},
  ],
  merchant: [
    { group: 'OVERVIEW', links: [
      { to: '/', label: 'Explore City', icon: '🏙️' },
    ]},
    { group: 'CITY SERVICES', links: [
      { to: '/announcements', label: 'Announcements', icon: '📢' },
      { to: '/timetable',     label: 'Transit',       icon: '🚆' },
    ]},
    { group: 'CIVIC', links: [
      { to: '/report-issue', label: 'Report Issues', icon: '⚠️' },
      { to: '/request-data', label: 'Requests',      icon: '📝' },
    ]},
    { group: 'COMMUNITY', links: [
      { to: '/ads', label: 'Advertisements', icon: '💼' },
    ]},
    { group: 'BUSINESS', links: [
      { to: '/my-ads', label: 'My Ads', icon: '📋' },
    ]},
  ],
};

function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const groups = NAV_GROUPS[user?.role] ?? NAV_GROUPS.citizen;

  const handleLinkClick = () => {
    // Close sidebar on mobile when a link is clicked
    if (window.innerWidth < 900) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />
      )}

      <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
        {/* Close button — visible only on mobile */}
        <button
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Close menu"
        >
          ✕
        </button>

        <div className="sidebar-brand">
          <div className="brand-mark">SC</div>
          <div><h2>SmartCity</h2><p>City Portal</p></div>
        </div>
        <nav className="sidebar-menu">
          {groups.map(({ group, links }) => (
            <div key={group} className="sidebar-group">
              <p className="sidebar-group-label">{group}</p>
              {links.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                  onClick={handleLinkClick}
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-profile">
            <div className="profile-badge">{user?.name?.split(' ').map(n => n[0]).join('')}</div>
            <div>
              <p>{user?.name}</p>
              <span className="role-pill">{user?.role}</span>
            </div>
          </div>
          <button onClick={() => { logout(); onClose(); }} className="sidebar-logout">Sign Out</button>
        </div>
      </aside>
    </>
  );
}

function MobileTopbar({ onMenuOpen }) {
  const location = useLocation();
  const { user } = useAuth();
  const pageTitles = {
    '/':              'Explore City',
    '/ads':           'Advertisements',
    '/announcements': 'Announcements',
    '/report-issue':  'Report Issues',
    '/request-data':  'Requests',
    '/timetable':     'Transit',
    '/admin':         'Dashboard',
    '/users':         'Manage Users',
    '/my-ads':        'My Ads',
  };
  const title = pageTitles[location.pathname] || 'SmartCity';

  return (
    <div className="mobile-topbar">
      <button
        className="hamburger-btn"
        onClick={onMenuOpen}
        aria-label="Open navigation menu"
        id="hamburger-menu-btn"
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>
      <div className="mobile-topbar-brand">
        <div className="brand-mark brand-mark-sm">SC</div>
        <span className="mobile-topbar-title">{title}</span>
      </div>
      <div className="mobile-topbar-user">
        <div className="profile-badge profile-badge-sm">
          {user?.name?.split(' ').map(n => n[0]).join('')}
        </div>
      </div>
    </div>
  );
}

function Header() {
  const { user } = useAuth();
  const location = useLocation();
  const pageTitles = {
    '/':              'Explore City',
    '/ads':           'Advertisements',
    '/announcements': 'Announcements',
    '/report-issue':  'Report Issues',
    '/request-data':  'Requests',
    '/timetable':     'Transit',
    '/admin':         'Dashboard',
    '/users':         'Manage Users',
    '/my-ads':        'My Ads',
  };
  const title = pageTitles[location.pathname] || 'SmartCity';
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="page-user">
        <span className="role-pill shadow">{user?.role}</span>
        <span className="header-user">{user?.name}</span>
      </div>
    </div>
  );
}

function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireRole({ children, roles, redirectTo = '/' }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(user.role)) return <Navigate to={redirectTo} replace />;
  return children;
}

function LoginRedirect() {
  const { user } = useAuth();
  if (!user) return <Login />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  const location = useLocation();
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 900) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="app-shell">
      {/* Mobile topbar with hamburger */}
      <MobileTopbar onMenuOpen={() => setSidebarOpen(true)} />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-view">
        {/* Desktop header */}
        <Header />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function AppInner() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRedirect />} />
      <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index                element={<ExplorePage />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="timetable"     element={<Timetable />} />
        <Route path="report-issue"  element={<ReportIssue />} />
        <Route path="request-data"  element={<RequestData />} />
        <Route path="ads"           element={<Ads />} />
        <Route path="my-ads"        element={<RequireRole roles={['merchant']}><MyAds /></RequireRole>} />
        <Route path="admin"         element={<RequireRole roles={['admin']}><Admin /></RequireRole>} />
        <Route path="users"         element={<RequireRole roles={['admin']}><Users /></RequireRole>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

export default App;
