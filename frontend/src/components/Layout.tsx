import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Phone,
  BarChart3,
  ClipboardCheck,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  Moon,
  Sun,
  Globe,
  Building2,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';
import i18n from '../i18n';
import { isAdminOrDeveloper, isDeveloper } from '../types';

interface NavItem {
  key: string;
  labelKey: string;
  icon: React.ElementType;
  href: string;
  adminOnly?: boolean;
  developerOnly?: boolean;
}

const navItems: NavItem[] = [
  { key: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, href: '/' },
  { key: 'calls', labelKey: 'nav.calls', icon: Phone, href: '/calls' },
  { key: 'reports', labelKey: 'nav.reports', icon: BarChart3, href: '/reports', adminOnly: true },
  { key: 'criteria', labelKey: 'nav.criteria', icon: ClipboardCheck, href: '/criteria', adminOnly: true },
  { key: 'users', labelKey: 'nav.users', icon: Users, href: '/users', adminOnly: true },
  { key: 'companies', labelKey: 'nav.companies', icon: Building2, href: '/companies', developerOnly: true },
  { key: 'settings', labelKey: 'nav.settings', icon: Settings, href: '/settings' },
  { key: 'contacts', labelKey: 'nav.contacts', icon: MessageSquare, href: '/contacts' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role ? isAdminOrDeveloper(user.role) : false;
  const isDev = user?.role ? isDeveloper(user.role) : false;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'pt' ? 'en' : 'pt';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const filteredNavItems = navItems.filter(item => {
    // Developer sees everything
    if (isDev) return true;
    // Admin sees admin items but not developer-only
    if (item.developerOnly) return false;
    if (item.adminOnly) return isAdmin;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-600 text-white">
              <Phone className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-green-600">Callify</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href));

            return (
              <Link
                key={item.key}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-semibold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {user?.username}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isDev ? t('users.developer') : isAdmin ? t('users.admin') : t('users.user')}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('auth.logout')}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-full px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1" />

            <div className="flex items-center space-x-2">
              {/* Language toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleLanguage}
                title={i18n.language === 'pt' ? 'English' : 'Portugues'}
              >
                <Globe className="w-5 h-5" />
              </Button>

              {/* Theme toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                title={theme === 'light' ? t('settings.darkTheme') : t('settings.lightTheme')}
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
