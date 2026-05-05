import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Server, Network, Package, Building2, Settings } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/factory-overview', label: '廠區總覽', icon: Building2, end: false },
  { to: '/servers', label: 'Servers', icon: Server, end: false },
  { to: '/clusters', label: 'Clusters', icon: Network, end: false },
  { to: '/batches', label: '採購批次', icon: Package, end: false },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 text-white flex flex-col shadow-lg shrink-0">
        <div className="px-6 py-5 border-b border-gray-700">
          <h1 className="text-lg font-bold tracking-tight text-white leading-tight">
            MoSite
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Server Management</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        {/* Settings link pinned at bottom */}
        <div className="px-3 pb-3">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Settings size={18} />
            系統設定
          </NavLink>
        </div>
        <div className="px-6 py-4 border-t border-gray-700">
          <p className="text-xs text-gray-500">v1.0.0</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center shadow-sm shrink-0">
          <h2 className="text-base font-semibold text-gray-700">
            MoSite — Server Management
          </h2>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
