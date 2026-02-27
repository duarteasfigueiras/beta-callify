import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  BarChart3,
  ClipboardCheck,
  Users,
  Settings,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Moon,
  Globe,
  LogOut,
  Scale,
  Tag,
  Shield,
  User,
  Plus,
  Download,
  Filter,
  Clock,
  MessageSquare,
  XCircle,
} from 'lucide-react';

type Tab = 'dashboard-admin' | 'dashboard-user' | 'analysis' | 'reports' | 'criteria' | 'users';

/* Dark card style — inline to bypass CSS variable overrides */
const cardStyle: React.CSSProperties = { backgroundColor: '#1f2937', border: '1px solid #374151' };

/* ── Sidebar (exact copy of real Layout.tsx) ── */
function MockSidebar({ activeTab }: { activeTab: Tab }) {
  const { t } = useTranslation();

  const isUserView = activeTab === 'dashboard-user';

  const sidebarMap: Record<Tab, string> = {
    'dashboard-admin': 'dashboard',
    'dashboard-user': 'dashboard',
    analysis: 'calls',
    reports: 'reports',
    criteria: 'criteria',
    users: 'users',
  };
  const activeKey = sidebarMap[activeTab];

  const adminNavItems = [
    { key: 'dashboard', icon: LayoutDashboard, label: t('nav.dashboard', 'Painel') },
    { key: 'calls', icon: Phone, label: t('nav.calls', 'Chamadas') },
    { key: 'reports', icon: BarChart3, label: t('nav.reports', 'Relatórios') },
    { key: 'criteria', icon: ClipboardCheck, label: t('nav.criteria', 'Critérios') },
    { key: 'users', icon: Users, label: t('nav.users', 'Utilizadores') },
    { key: 'settings', icon: Settings, label: t('nav.settings', 'Definições') },
  ];

  const userNavItems = [
    { key: 'dashboard', icon: LayoutDashboard, label: t('nav.dashboard', 'Painel') },
    { key: 'calls', icon: Phone, label: t('nav.calls', 'Chamadas') },
    { key: 'settings', icon: Settings, label: t('nav.settings', 'Definições') },
  ];

  const navItems = isUserView ? userNavItems : adminNavItems;

  const userName = isUserView ? 'Maria S.' : 'Duarte Figueiras';
  const userInitial = isUserView ? 'M' : 'D';
  const userRole = isUserView ? t('users.user', 'Utilizador') : 'Admin/Gestor';

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0">
      {/* Logo */}
      <div className="flex items-center space-x-2 h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-600 text-white">
          <Phone className="w-5 h-5" />
        </div>
        <span className="text-xl font-bold text-green-600">AI CoachCall</span>
      </div>
      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <div
            key={item.key}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${
              item.key === activeKey
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </div>
        ))}
      </nav>
      {/* User */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-semibold">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{userName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{userRole}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg">
          <LogOut className="w-4 h-4" />
          <span>{t('auth.logout', 'Sair')}</span>
        </div>
      </div>
    </aside>
  );
}

/* ── Header ── */
function MockHeader() {
  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 shrink-0">
      <div className="flex-1" />
      <div className="flex items-center space-x-2">
        <button className="p-2 rounded-lg text-gray-500 dark:text-gray-400">
          <Globe className="w-5 h-5" />
        </button>
        <button className="p-2 rounded-lg text-gray-500 dark:text-gray-400">
          <Moon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

/* ── ADMIN DASHBOARD VIEW ── */
function AdminDashboardView() {
  const { t } = useTranslation();

  const stats = [
    { label: t('dashboard.totalCalls', 'Total de Chamadas'), value: '387', icon: Phone, iconBg: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
    { label: t('dashboard.averageScore', 'Pontuação Média'), value: '6.9', icon: TrendingUp, iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: t('dashboard.alertsCount', 'Alertas'), value: '89', icon: AlertTriangle, iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
    { label: t('dashboard.callsWithNextStep', 'Com Próximo Passo'), value: '100%', icon: CheckCircle, iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
  ];

  const calls = [
    { phone: '916 789 012', agent: 'Pedro Lopes', catColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', date: '26/02/2026, 17:14', dur: '10:21', score: 4.7 },
    { phone: '923 456 789', agent: 'Ana Costa', catColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', date: '26/02/2026, 16:07', dur: '4:52', score: 6.7 },
    { phone: '931 234 567', agent: 'Maria Silva', catColor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', date: '26/02/2026, 13:54', dur: '4:11', score: 8.9 },
    { phone: '947 890 123', agent: 'João Santos', catColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', date: '26/02/2026, 13:45', dur: '4:35', score: 6.0 },
  ];

  const alerts = [
    { iconColor: 'text-green-500', badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', label: t('alerts.types.longDuration', 'Duração Longa'), msg: 'Duração excessiva (12 min)' },
    { iconColor: 'text-green-500', badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', label: t('alerts.types.lowScore', 'Pontuação Baixa'), msg: 'Chamada com pontuação baixa (3.8/10)' },
    { iconColor: 'text-amber-500', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', label: t('alerts.types.riskWords', 'Palavras de Risco'), msg: 'Palavras de risco: "cancelar", "insatisfeito"' },
    { iconColor: 'text-blue-500', badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', label: t('alerts.types.longDuration', 'Duração Longa'), msg: 'Chamada com duração excessiva (11 minutos)' },
  ];

  const chartPoints = [6.3, 6.5, 7.3, 6.8, 7.5, 7.2, 7.8, 7.5, 7.0, 7.3, 7.6, 7.2, 7.5, 7.0, 5.5];
  const chartDates = ['28/01', '30/01', '01/02', '03/02', '05/02', '07/02', '09/02', '11/02', '13/02', '15/02', '17/02', '19/02', '21/02', '23/02', '26/02'];

  const topReasons = [
    { label: t('landing.mock.reasonPricing', 'Pedido de Orçamento'), count: 98 },
    { label: t('landing.mock.reasonSupport', 'Suporte Técnico'), count: 84 },
    { label: t('landing.mock.reasonCancel', 'Cancelamento'), count: 67 },
    { label: t('landing.mock.reasonUpgrade', 'Upgrade de Plano'), count: 52 },
    { label: t('landing.mock.reasonBilling', 'Faturação'), count: 41 },
  ];
  const maxCount = Math.max(...topReasons.map(r => r.count));

  const getScoreColor = (s: number) => s >= 8 ? 'text-green-600 dark:text-green-400' : s >= 6 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('dashboard.title', 'Painel')}</h1>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {[t('dashboard.today', 'Hoje'), t('dashboard.7days', '7 dias'), t('dashboard.30days', '30 dias'), t('dashboard.90days', '90 dias'), t('dashboard.all', 'Todos')].map((r, i) => (
              <span key={i} className={`px-3 py-1 text-sm font-medium ${i === 2 ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>{r}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        {stats.map((s, i) => (
          <div key={i} className="rounded-lg shadow-sm p-4" style={cardStyle}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
              </div>
              <div className={`p-2 rounded-full ${s.iconBg}`}>
                <s.icon className={`w-5 h-5 ${s.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="flex-1 grid grid-rows-2 gap-3 min-h-0">
        {/* Row 1 */}
        <div className="grid grid-cols-2 gap-3 min-h-0">
          {/* Recent Calls */}
          <div className="rounded-lg shadow-sm flex flex-col min-h-0" style={cardStyle}>
            <div className="py-2 px-4 shrink-0">
              <h3 className="text-2xl font-semibold leading-none tracking-tight">{t('dashboard.recentCalls', 'Chamadas Recentes')}</h3>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-2">
              <div className="space-y-2">
                {calls.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: '#111827', border: '1px solid #374151' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.phone}</p>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${c.catColor}`}>{c.agent}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{c.date} • {c.dur}</p>
                    </div>
                    <div className={`text-lg font-bold ${getScoreColor(c.score)}`}>{c.score.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="rounded-lg shadow-sm flex flex-col min-h-0" style={cardStyle}>
            <div className="py-2 px-4 shrink-0">
              <h3 className="text-2xl font-semibold leading-none tracking-tight">{t('alerts.title', 'Alertas')}</h3>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-2">
              <div className="space-y-2">
                {alerts.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: '#111827', border: '1px solid #374151' }}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${i === 3 ? 'bg-blue-100 dark:bg-blue-900/30' : i === 2 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                      <Phone className={`w-4 h-4 ${a.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${a.badgeColor}`}>{a.label}</span>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-1">{a.msg}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-2 gap-3 min-h-0">
          {/* Score Evolution */}
          <div className="rounded-lg shadow-sm flex flex-col min-h-0" style={cardStyle}>
            <div className="py-2 px-4 shrink-0">
              <h3 className="text-2xl font-semibold leading-none tracking-tight">{t('dashboard.scoreEvolution', 'Evolução da Pontuação')}</h3>
            </div>
            <div className="flex-1 p-2 min-h-0">
              <svg viewBox="0 0 500 200" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                {/* Horizontal grid lines */}
                <line x1="50" y1="10" x2="480" y2="10" stroke="#4b5563" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="50" y1="50" x2="480" y2="50" stroke="#4b5563" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="50" y1="90" x2="480" y2="90" stroke="#4b5563" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="50" y1="130" x2="480" y2="130" stroke="#4b5563" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="50" y1="170" x2="480" y2="170" stroke="#4b5563" strokeWidth="0.5" strokeDasharray="4 4" />
                {/* Y-axis labels */}
                <text x="35" y="14" fontSize="10" fill="#9ca3af" textAnchor="end">10</text>
                <text x="35" y="54" fontSize="10" fill="#9ca3af" textAnchor="end">7</text>
                <text x="35" y="94" fontSize="10" fill="#9ca3af" textAnchor="end">5</text>
                <text x="35" y="134" fontSize="10" fill="#9ca3af" textAnchor="end">3</text>
                <text x="35" y="174" fontSize="10" fill="#9ca3af" textAnchor="end">0</text>
                <polyline
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  points={chartPoints.map((p, i) => `${50 + i * (430 / (chartPoints.length - 1))},${170 - (p / 10) * 160}`).join(' ')}
                />
                {chartPoints.map((p, i) => (
                  <circle key={i} cx={50 + i * (430 / (chartPoints.length - 1))} cy={170 - (p / 10) * 160} r="3" fill="#16a34a" strokeWidth="2" stroke="#16a34a" />
                ))}
                {chartDates.map((d, i) => (
                  i % 2 === 0 && <text key={i} x={50 + i * (430 / (chartDates.length - 1))} y="192" fontSize="8" fill="#9ca3af" textAnchor="middle">{d}</text>
                ))}
              </svg>
            </div>
          </div>

          {/* Top Contact Reasons */}
          <div className="rounded-lg shadow-sm flex flex-col min-h-0" style={cardStyle}>
            <div className="py-2 px-4 shrink-0 flex items-center justify-between">
              <h3 className="text-2xl font-semibold leading-none tracking-tight">{t('dashboard.topReasons', 'Principais Motivos de Contacto')}</h3>
              <span className="text-xs text-green-600 dark:text-green-400 hover:underline">{t('common.viewAll', 'Ver Todos')}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 min-h-0 flex flex-col justify-center">
              <div className="space-y-6 px-4">
                {topReasons.map((r, i) => (
                  <div key={i}>
                    <div className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-2">{r.label}</div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(r.count / maxCount) * 100}%` }} />
                        </div>
                      </div>
                      <div className="w-10 text-right text-sm font-bold text-gray-700 dark:text-gray-300">{r.count}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── USER DASHBOARD VIEW ── */
function UserDashboardView() {
  const { t } = useTranslation();

  const stats = [
    { label: t('dashboard.totalCalls', 'Total de Chamadas'), value: '124', icon: Phone, iconBg: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
    { label: t('dashboard.averageScore', 'Pontuação Média'), value: '8.4', icon: TrendingUp, iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: t('dashboard.alertsCount', 'Alertas'), value: '3', icon: AlertTriangle, iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
    { label: t('dashboard.callsWithNextStep', 'Com Próximo Passo'), value: '82%', icon: CheckCircle, iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
  ];

  const calls = [
    { phone: '965 432 109', date: '10/02/2026, 14:32', dur: '8:32', score: 9.2 },
    { phone: '965 432 109', date: '10/02/2026, 13:15', dur: '12:15', score: 7.5 },
    { phone: '965 432 109', date: '10/02/2026, 11:44', dur: '6:44', score: 8.8 },
    { phone: '965 432 109', date: '10/02/2026, 10:20', dur: '4:55', score: 6.1 },
  ];

  const alerts = [
    { iconColor: 'text-red-500', badgeColor: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', label: t('alerts.types.lowScore', 'Pontuação Baixa'), msg: 'Score 6.1 — Chamada com 965 432 109' },
    { iconColor: 'text-amber-500', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', label: t('alerts.types.riskWords', 'Palavras de Risco'), msg: '"cancelar" detectado — 965 432 109' },
    { iconColor: 'text-purple-500', badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', label: t('alerts.types.noNextStep', 'Sem Próximo Passo'), msg: 'Chamada sem próximo passo — 965 432 109' },
  ];

  const chartPoints = [6.8, 7.2, 7.5, 7.8, 8.0, 7.6, 8.2, 8.5, 8.1, 8.4, 8.6, 8.4];
  const chartDates = ['30/01', '01/02', '02/02', '03/02', '04/02', '05/02', '06/02', '07/02', '08/02', '09/02', '10/02', '10/02'];

  const getScoreColor = (s: number) => s >= 8 ? 'text-green-600 dark:text-green-400' : s >= 6 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('dashboard.title', 'Painel')}</h1>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #374151' }}>
            {[t('dashboard.today', 'Hoje'), t('dashboard.7days', '7 dias'), t('dashboard.30days', '30 dias'), t('dashboard.90days', '90 dias'), t('dashboard.all', 'Todos')].map((r, i) => (
              <span key={i} className={`px-3 py-1 text-sm font-medium ${i === 2 ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>{r}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        {stats.map((s, i) => (
          <div key={i} className="rounded-lg shadow-sm p-4" style={cardStyle}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
              </div>
              <div className={`p-2 rounded-full ${s.iconBg}`}>
                <s.icon className={`w-5 h-5 ${s.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="flex-1 grid grid-rows-2 gap-3 min-h-0">
        {/* Row 1 */}
        <div className="grid grid-cols-2 gap-3 min-h-0">
          {/* Recent Calls — no agent column, just user's own calls */}
          <div className="rounded-lg shadow-sm flex flex-col min-h-0" style={cardStyle}>
            <div className="py-2 px-4 shrink-0">
              <h3 className="text-2xl font-semibold leading-none tracking-tight">{t('dashboard.recentCalls', 'Chamadas Recentes')}</h3>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-2">
              <div className="space-y-2">
                {calls.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: '#111827', border: '1px solid #374151' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.phone}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{c.date} • {c.dur}</p>
                    </div>
                    <div className={`text-lg font-bold ${getScoreColor(c.score)}`}>{c.score.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="rounded-lg shadow-sm flex flex-col min-h-0" style={cardStyle}>
            <div className="py-2 px-4 shrink-0">
              <h3 className="text-2xl font-semibold leading-none tracking-tight">{t('alerts.title', 'Alertas')}</h3>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-2">
              <div className="space-y-2">
                {alerts.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: '#111827', border: '1px solid #374151' }}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${i === 0 ? 'bg-red-100 dark:bg-red-900/30' : i === 1 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>
                      <Phone className={`w-4 h-4 ${a.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${a.badgeColor}`}>{a.label}</span>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-1">{a.msg}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-2 gap-3 min-h-0">
          {/* Score Evolution */}
          <div className="rounded-lg shadow-sm flex flex-col min-h-0" style={cardStyle}>
            <div className="py-2 px-4 shrink-0">
              <h3 className="text-2xl font-semibold leading-none tracking-tight">{t('dashboard.scoreEvolution', 'Evolução da Pontuação')}</h3>
            </div>
            <div className="flex-1 p-2 min-h-0">
              <svg viewBox="0 0 500 200" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                {/* Horizontal grid lines */}
                <line x1="50" y1="10" x2="480" y2="10" stroke="#4b5563" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="50" y1="50" x2="480" y2="50" stroke="#4b5563" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="50" y1="90" x2="480" y2="90" stroke="#4b5563" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="50" y1="130" x2="480" y2="130" stroke="#4b5563" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="50" y1="170" x2="480" y2="170" stroke="#4b5563" strokeWidth="0.5" strokeDasharray="4 4" />
                {/* Y-axis labels */}
                <text x="35" y="14" fontSize="10" fill="#9ca3af" textAnchor="end">10</text>
                <text x="35" y="54" fontSize="10" fill="#9ca3af" textAnchor="end">7</text>
                <text x="35" y="94" fontSize="10" fill="#9ca3af" textAnchor="end">5</text>
                <text x="35" y="134" fontSize="10" fill="#9ca3af" textAnchor="end">3</text>
                <text x="35" y="174" fontSize="10" fill="#9ca3af" textAnchor="end">0</text>
                <polyline
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  points={chartPoints.map((p, i) => `${50 + i * (430 / (chartPoints.length - 1))},${170 - (p / 10) * 160}`).join(' ')}
                />
                {chartPoints.map((p, i) => (
                  <circle key={i} cx={50 + i * (430 / (chartPoints.length - 1))} cy={170 - (p / 10) * 160} r="3" fill="#16a34a" strokeWidth="2" stroke="#16a34a" />
                ))}
                {chartDates.map((d, i) => (
                  i % 2 === 0 && <text key={i} x={50 + i * (430 / (chartDates.length - 1))} y="192" fontSize="8" fill="#9ca3af" textAnchor="middle">{d}</text>
                ))}
              </svg>
            </div>
          </div>

          {/* Daily Goals */}
          <div className="rounded-lg shadow-sm flex flex-col min-h-0" style={cardStyle}>
            <div className="py-2 px-4 shrink-0">
              <h3 className="text-2xl font-semibold leading-none tracking-tight">{t('dashboard.dailyGoals', 'Objetivos Diários')}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 min-h-0 flex flex-col justify-center">
              <div className="space-y-5 px-2">
                {[
                  { label: t('dashboard.goalCalls', 'Chamadas Realizadas'), current: 8, target: 10, color: 'bg-green-500' },
                  { label: t('dashboard.goalHighScore', 'Chamadas ≥ 8 pts'), current: 6, target: 8, color: 'bg-blue-500' },
                  { label: t('dashboard.goalResolution', 'Taxa de Resolução'), current: 68, target: 100, color: 'bg-amber-500', suffix: '%' },
                  { label: t('dashboard.goalNextStep', 'Com Próximo Passo'), current: 75, target: 100, color: 'bg-purple-500', suffix: '%' },
                ].map((g, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-300">{g.label}</span>
                      <span className="text-sm font-bold text-gray-200">
                        {g.suffix ? `${g.current}${g.suffix}` : `${g.current}/${g.target}`}
                      </span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#374151' }}>
                      <div className={`h-full rounded-full ${g.color}`} style={{ width: `${(g.current / g.target) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── CALL ANALYSIS VIEW ── */
function AnalysisView() {
  const { t } = useTranslation();

  const skills = [
    { name: t('landing.mock.criteriaGreeting', 'Saudação profissional'), score: 5.7 },
    { name: t('landing.mock.criteriaNeeds', 'Identificação de necessidades'), score: 6.7 },
    { name: t('landing.mock.criteriaClosing', 'Fecho da chamada'), score: 6.0 },
    { name: t('landing.mock.criteriaEmpathy', 'Empatia e tom'), score: 7.0 },
    { name: t('landing.mock.criteriaObjHandling', 'Gestão de objeções'), score: 5.4 },
  ];

  const getSkillColor = (s: number) => s >= 8 ? 'bg-green-500' : s >= 6 ? 'bg-yellow-500' : 'bg-red-500';
  const getSkillTextColor = (s: number) => s >= 8 ? 'text-green-600 dark:text-green-400' : s >= 6 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="h-full overflow-y-auto space-y-4 pr-1">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-lg text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('calls.detail', 'Detalhe da Chamada')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">+351 933 444 555</p>
        </div>
      </div>

      {/* Metadata cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: t('calls.date', 'Data'), value: '26/02/2026, 13:06' },
          { label: t('calls.duration', 'Duração'), value: '3:03' },
          { label: t('calls.agent', 'Utilizador'), value: 'Pedro Oliveira' },
          { label: t('calls.score', 'Pontuação'), value: '6.0', scoreColor: 'text-yellow-600 dark:text-yellow-400' },
        ].map((m, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{m.label}</p>
            <p className={`text-lg font-semibold mt-1 ${m.scoreColor || 'text-gray-900 dark:text-white'}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Overall Score */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('calls.overallScore', 'Pontuação Global')}</h3>
        <div className="text-3xl font-bold px-5 py-2 rounded-xl text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30">6.0</div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
        {[t('calls.summary', 'Resumo'), t('calls.evaluation', 'Avaliação'), t('calls.feedback', 'Feedback')].map((tab, i) => (
          <button key={i} className={`py-2 px-1 text-sm font-medium border-b-2 ${i === 0 ? 'border-green-500 text-green-600 dark:text-green-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>{tab}</button>
        ))}
      </div>

      {/* Tab Content — single column like real CallDetail */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-5">
        {/* Summary */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{t('calls.summary', 'Resumo')}</h4>
          <p className="text-sm text-gray-900 dark:text-white leading-relaxed">
            {t('landing.mock.summaryText', 'Chamada de suporte sobre configuração. Guiado passo a passo mas processo foi demorado.')}
          </p>
        </div>

        {/* Next Step */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{t('calls.nextStep', 'Próximo Passo')}</h4>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-sm text-green-800 dark:text-green-200">{t('landing.mock.nextStepText', 'Escalar para equipa técnica de nível 2')}</p>
          </div>
        </div>

        {/* What Went Well — with timestamps */}
        <div>
          <h4 className="text-sm font-medium text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">{t('calls.whatWentWell', 'O Que Pedro Oliveira Fez Bem')}</h4>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <ul className="space-y-2">
              {[
                { text: t('landing.mock.well1', 'Manteve tom calmo e profissional durante toda a chamada'), ts: '01:00' },
                { text: t('landing.mock.well2', 'Explicou cada passo com clareza ao cliente'), ts: '02:15' },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-green-800 dark:text-green-200">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></span>
                  <span className="flex-1">{item.text}</span>
                  <span className="text-xs bg-green-200 dark:bg-green-800 px-2 py-0.5 rounded flex-shrink-0">{item.ts}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* What Went Wrong — with timestamps */}
        <div>
          <h4 className="text-sm font-medium text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">{t('calls.whatWentWrong', 'O Que Pedro Oliveira Deve Melhorar')}</h4>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <ul className="space-y-2">
              {[
                { text: t('landing.mock.wrong1', 'Tempo de espera elevado entre passos de diagnóstico'), ts: '01:30' },
                { text: t('landing.mock.wrong2', 'Não conseguiu resolver sem escalar para nível superior'), ts: '02:45' },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-800 dark:text-red-200">
                  <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></span>
                  <span className="flex-1">{item.text}</span>
                  <span className="text-xs bg-red-200 dark:bg-red-800 px-2 py-0.5 rounded flex-shrink-0">{item.ts}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recommended Phrases */}
        <div>
          <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">{t('calls.recommendedPhrases', 'Frases Recomendadas')}</h4>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <ul className="space-y-2">
              {[
                t('landing.mock.phrase1', '"Vou acompanhá-lo passo a passo na configuração"'),
                t('landing.mock.phrase2', '"Enquanto verifico, deixe-me explicar o que estamos a fazer"'),
                t('landing.mock.phrase3', '"Vou encaminhar para um especialista que resolve hoje mesmo"'),
              ].map((phrase, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                  <span className="italic">{phrase}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Response Improvement Example */}
        <div>
          <h4 className="text-sm font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">{t('calls.responseImprovement', 'Exemplo de Resposta a Melhorar')}</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">{t('calls.before', 'Antes')}</p>
              <p className="text-sm text-red-800 dark:text-red-200 italic">{t('landing.mock.beforeText', '"Isto é um problema técnico, vou ter de passar para outro departamento."')}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">{t('calls.after', 'Depois')}</p>
              <p className="text-sm text-green-800 dark:text-green-200 italic">{t('landing.mock.afterText', '"Vou encaminhar para o nosso especialista em configurações. Ele vai contactá-lo nos próximos 30 minutos para resolver tudo."')}</p>
            </div>
          </div>
        </div>

        {/* Skill Evolution */}
        <div>
          <h4 className="text-sm font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">{t('calls.skillEvolution', 'Evolução por Skill')}</h4>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
            <div className="space-y-3">
              {skills.map((skill, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{skill.name}</span>
                    <span className={`text-sm font-bold ${getSkillTextColor(skill.score)}`}>{skill.score.toFixed(1)}</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full ${getSkillColor(skill.score)} rounded-full`} style={{ width: `${(skill.score / 10) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Performer Comparison */}
        <div>
          <h4 className="text-sm font-medium text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-2">{t('calls.topPerformerComparison', 'Comparação com Top Performer')}</h4>
          <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-4">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('calls.yourScore', 'A Tua Pontuação')}</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">6.0</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('calls.gap', 'Diferença')}</p>
                <p className="text-2xl font-bold text-red-600">-2.9</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('calls.topPerformer', 'Top Performer')}</p>
                <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">8.9</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Reasons */}
        <div>
          <h4 className="text-sm font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-2">{t('calls.contactReasons', 'Motivos de Contacto')}</h4>
          <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-3">
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-teal-800 dark:text-teal-200">
                <span className="w-2 h-2 bg-teal-500 rounded-full mt-1.5 flex-shrink-0"></span>
                <span>{t('landing.mock.contactReason1', 'Dificuldade na configuração inicial do sistema')}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Objections */}
        <div>
          <h4 className="text-sm font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2">{t('calls.objections', 'Objeções do Cliente')}</h4>
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-orange-800 dark:text-orange-200">
                <span className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></span>
                <span>{t('landing.mock.objection1', '"Isto é muito complicado, devia ser mais simples"')}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── REPORTS VIEW ── */
function ReportsView() {
  const { t } = useTranslation();

  const agentScores = [
    { name: 'Maria Costa', calls: 88, score: 7.1 },
    { name: 'Ana Silva', calls: 114, score: 6.8 },
    { name: 'João Santos', calls: 116, score: 6.7 },
    { name: 'Pedro Oliveira', calls: 117, score: 6.7 },
    { name: 'Sofia Ferreira', calls: 125, score: 6.7 },
  ];

  const agentCalls = [
    { name: 'Pedro Oliveira', initial: 'P', count: 26 },
    { name: 'João Santos', initial: 'J', count: 24 },
    { name: 'Ana Silva', initial: 'A', count: 19 },
    { name: 'Sofia Ferreira', initial: 'S', count: 17 },
  ];
  const maxCalls = Math.max(...agentCalls.map(a => a.count));

  const reasons = [
    { label: t('landing.mock.reasonPricing', 'Pedido de Orçamento'), count: 98 },
    { label: t('landing.mock.reasonSupport', 'Suporte Técnico'), count: 84 },
    { label: t('landing.mock.reasonCancel', 'Cancelamento'), count: 67 },
    { label: t('landing.mock.reasonUpgrade', 'Upgrade de Plano'), count: 52 },
    { label: t('landing.mock.reasonBilling', 'Faturação'), count: 41 },
  ];
  const maxReasons = Math.max(...reasons.map(r => r.count));

  const objections = [
    { label: t('landing.mock.objPrice', 'Preço'), count: 171 },
    { label: t('landing.mock.objFeatures', 'Funcionalidades'), count: 87 },
    { label: t('landing.mock.objDeadline', 'Prazo'), count: 77 },
    { label: t('landing.mock.objTrust', 'Confiança'), count: 66 },
  ];
  const maxObj = Math.max(...objections.map(o => o.count));

  const riskWords = [
    { label: t('landing.mock.riskCancel', 'Cancelar'), count: 8 },
    { label: t('landing.mock.riskUnsatisfied', 'Insatisfeito'), count: 2 },
    { label: t('landing.mock.riskCancellation', 'Cancelamento'), count: 0 },
    { label: t('landing.mock.riskComplaint', 'Reclamação'), count: 0 },
  ];
  const maxRisk = Math.max(...riskWords.map(r => r.count), 1);

  const chartPoints = [6.3, 6.5, 7.3, 6.8, 7.5, 7.2, 7.8, 7.5, 7.0, 7.3, 7.6, 7.2, 7.5, 7.0, 6.5];
  const chartDates = ['30/01', '02/02', '05/02', '08/02', '11/02', '14/02', '17/02', '20/02', '23/02', '26/02'];

  // Daily call volumes for bar chart
  const dailyCalls = [3, 5, 4, 7, 6, 3, 2, 4, 8, 5, 6, 7, 3, 2, 5, 4, 6, 3, 1, 2, 5, 7, 4, 3, 2, 4, 6, 5, 3, 4];
  const maxDaily = Math.max(...dailyCalls);

  const stats = [
    { label: t('dashboard.totalCalls', 'Total de Chamadas'), value: '100', icon: Phone, iconBg: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
    { label: t('reports.avgDuration', 'Duração Média'), value: '5:16', icon: Clock, iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: t('reports.nextStepRate', 'Taxa de Próximo Passo'), value: '100%', icon: CheckCircle, iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
    { label: t('dashboard.averageScore', 'Pontuação Média'), value: '6.9', icon: TrendingUp, iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
  ];

  return (
    <div className="h-full overflow-y-auto space-y-3 pr-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('nav.reports', 'Relatórios')}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('reports.subtitle', 'Analise o desempenho da equipa e tendências')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300">
            <Download className="w-4 h-4" />
            {t('reports.export', 'Exportar')}
          </button>
          <div className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300">
            <Filter className="w-4 h-4" />
            <span>{t('reports.allAgents', 'Todos os Utilizadores')}</span>
          </div>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {[t('dashboard.today', 'Hoje'), t('dashboard.7days', '7d'), t('dashboard.30days', '30d'), t('dashboard.90days', '90d'), t('dashboard.all', 'Todos')].map((r, i) => (
              <span key={i} className={`px-3 py-1.5 text-sm font-medium ${i === 2 ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>{r}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {stats.map((s, i) => (
          <div key={i} className="rounded-lg shadow-sm p-3" style={cardStyle}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{s.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
              </div>
              <div className={`p-1.5 rounded-full ${s.iconBg}`}>
                <s.icon className={`w-4 h-4 ${s.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Score by Agent + Score Evolution */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg shadow-sm" style={cardStyle}>
          <div className="py-1.5 px-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <h3 className="text-base font-semibold">{t('landing.mock.scoreByAgent', 'Pontuação por Utilizador')}</h3>
            </div>
            <span className="text-xs px-2 py-0.5 bg-green-600 text-white rounded-lg">{t('reports.best', 'Melhores')}</span>
          </div>
          <div className="px-3 pb-3 space-y-2">
            {agentScores.map((a, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium text-gray-300">{a.name}</span>
                  <span className="text-xs text-gray-500">{a.calls} {t('reports.calls', 'chamadas')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(a.score / 10) * 100}%` }} />
                    </div>
                  </div>
                  <span className="w-8 text-right text-sm font-bold text-green-400">{a.score.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg shadow-sm" style={cardStyle}>
          <div className="py-1.5 px-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <h3 className="text-base font-semibold">{t('dashboard.scoreEvolution', 'Evolução da Pontuação')}</h3>
          </div>
          <div className="p-3" style={{ height: 180 }}>
            <svg viewBox="0 0 500 220" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
              <line x1="50" y1="20" x2="480" y2="20" stroke="#4b5563" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="50" y1="56" x2="480" y2="56" stroke="#4b5563" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="50" y1="92" x2="480" y2="92" stroke="#4b5563" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="50" y1="128" x2="480" y2="128" stroke="#4b5563" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="50" y1="164" x2="480" y2="164" stroke="#4b5563" strokeWidth="0.5" strokeDasharray="4 4" />
              <text x="35" y="24" fontSize="10" fill="#9ca3af" textAnchor="end">10</text>
              <text x="35" y="60" fontSize="10" fill="#9ca3af" textAnchor="end">7</text>
              <text x="35" y="96" fontSize="10" fill="#9ca3af" textAnchor="end">5</text>
              <text x="35" y="132" fontSize="10" fill="#9ca3af" textAnchor="end">3</text>
              <text x="35" y="168" fontSize="10" fill="#9ca3af" textAnchor="end">0</text>
              <polyline
                fill="none"
                stroke="#16a34a"
                strokeWidth="2"
                strokeLinejoin="round"
                points={chartPoints.map((p, i) => `${50 + i * (430 / (chartPoints.length - 1))},${164 - (p / 10) * 144}`).join(' ')}
              />
              {chartPoints.map((p, i) => (
                <circle key={i} cx={50 + i * (430 / (chartPoints.length - 1))} cy={164 - (p / 10) * 144} r="3" fill="#16a34a" />
              ))}
              {chartDates.map((d, i) => (
                <text key={i} x={50 + i * (430 / (chartDates.length - 1))} y="195" fontSize="9" fill="#9ca3af" textAnchor="middle">{d}</text>
              ))}
            </svg>
          </div>
        </div>
      </div>

      {/* Calls by Period */}
      <div className="rounded-lg shadow-sm" style={cardStyle}>
        <div className="py-1.5 px-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <h3 className="text-base font-semibold">{t('reports.callsByPeriod', 'Chamadas por Período')}</h3>
        </div>
        <div className="px-3 pb-1" style={{ height: 110 }}>
          <svg viewBox={`0 0 ${dailyCalls.length * 16} 100`} className="w-full h-full" preserveAspectRatio="none">
            {dailyCalls.map((h, i) => {
              const barHeight = Math.max((h / maxDaily) * 80, 3);
              return (
                <rect
                  key={i}
                  x={i * 16 + 2}
                  y={90 - barHeight}
                  width={12}
                  height={barHeight}
                  rx={2}
                  fill="#3b82f6"
                />
              );
            })}
          </svg>
        </div>
        <div className="px-3 pb-1.5 flex justify-between">
          <span className="text-xs text-gray-500">28/01</span>
          <span className="text-xs text-gray-500">26/02</span>
        </div>
      </div>

      {/* Calls by Type */}
      <div className="rounded-lg shadow-sm" style={cardStyle}>
        <div className="py-2 px-4 flex items-center gap-2">
          <Phone className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold">{t('reports.callsByType', 'Chamadas por Tipo')}</h3>
        </div>
        <div className="p-4 grid grid-cols-3 gap-6">
          {[
            { icon: PhoneIncoming, label: t('reports.inbound', 'Recebidas'), count: 72, pct: '72%', color: 'bg-green-500' },
            { icon: PhoneOutgoing, label: t('reports.outbound', 'Efetuadas'), count: 28, pct: '28%', color: 'bg-blue-500' },
            { icon: Users, label: t('reports.meetings', 'Reuniões'), count: 0, pct: '0%', color: 'bg-gray-500' },
          ].map((ct, i) => (
            <div key={i} className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className={`p-2 rounded-full ${i === 0 ? 'bg-green-100 dark:bg-green-900/30' : i === 1 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  <ct.icon className={`w-5 h-5 ${i === 0 ? 'text-green-600' : i === 1 ? 'text-blue-600' : 'text-gray-500'}`} />
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-500">{ct.label}</p>
                  <p className="text-2xl font-bold text-gray-100">{ct.count}</p>
                </div>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full ${ct.color} rounded-full`} style={{ width: ct.pct }} />
              </div>
              <p className="text-xs text-gray-500 mt-1">{ct.pct}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Calls by User + Contact Reasons */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg shadow-sm" style={cardStyle}>
          <div className="py-2 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold">{t('reports.callsByUser', 'Chamadas por Utilizador')}</h3>
            </div>
            <span className="text-xs text-gray-500">5 {t('reports.usersLabel', 'Utilizadores')}</span>
          </div>
          <div className="p-4 space-y-4">
            {agentCalls.map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">{a.initial}</div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-300">{a.name}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(a.count / maxCalls) * 100}%` }} />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-gray-200">{a.count}</span>
                  <p className="text-xs text-gray-500">{t('reports.calls', 'chamadas')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg shadow-sm" style={cardStyle}>
          <div className="py-2 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold">{t('reports.topReasons', 'Principais Motivos de Contacto')}</h3>
            </div>
            <span className="text-xs text-green-600 dark:text-green-400">{t('common.viewAll', 'Ver Todos')}</span>
          </div>
          <div className="p-4 space-y-2.5">
            {reasons.map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-36 text-sm font-medium text-purple-400 truncate">{r.label}</div>
                <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(r.count / maxReasons) * 100}%` }} />
                </div>
                <span className="w-10 text-right text-sm font-bold text-gray-300">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Objections + Risk Words */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg shadow-sm" style={cardStyle}>
          <div className="py-2 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold">{t('reports.topObjections', 'Principais Objeções')}</h3>
            </div>
            <span className="text-xs text-green-600 dark:text-green-400">{t('common.viewAll', 'Ver Todos')}</span>
          </div>
          <div className="p-4 space-y-4">
            {objections.map((o, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-28 text-sm font-medium text-amber-400">{o.label}</div>
                <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(o.count / maxObj) * 100}%` }} />
                </div>
                <span className="w-10 text-right text-sm font-bold text-gray-300">{o.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg shadow-sm" style={cardStyle}>
          <div className="py-2 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold">{t('reports.riskWordFrequency', 'Frequência de Palavras de Risco')}</h3>
            </div>
            <span className="text-xs text-gray-500">14 {t('reports.words', 'palavras')}</span>
          </div>
          <div className="p-4 space-y-4">
            {riskWords.map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-28 text-sm font-medium text-red-400">{r.label}</div>
                <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                  {r.count > 0 && <div className="h-full bg-red-500 rounded-full" style={{ width: `${(r.count / maxRisk) * 100}%` }} />}
                </div>
                <span className="w-10 text-right text-sm font-bold text-gray-300">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── CRITERIA VIEW ── */
function CriteriaView() {
  const { t } = useTranslation();

  const categories = [
    { key: 'all', label: t('common.all', 'Todos'), color: '' },
    { key: 'communication', label: t('landing.mock.catCommunication', 'Comunicação'), color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
    { key: 'sales', label: t('landing.mock.catSales', 'Vendas'), color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    { key: 'compliance', label: t('landing.mock.catCompliance', 'Compliance'), color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  ];

  const criteria = [
    { name: t('landing.mock.criteriaGreeting', 'Saudação profissional'), cat: 'Comunicação', catColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', desc: t('landing.mock.criteriaGreetingDesc', 'Verifica se o agente cumprimenta o cliente de forma profissional'), weight: 3, active: true },
    { name: t('landing.mock.criteriaNeeds', 'Identificação de necessidades'), cat: 'Vendas', catColor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', desc: t('landing.mock.criteriaNeedsDesc', 'Avalia se o agente faz perguntas para entender as necessidades'), weight: 5, active: true },
    { name: t('landing.mock.criteriaObjHandling', 'Gestão de objeções'), cat: 'Vendas', catColor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', desc: t('landing.mock.criteriaObjHandlingDesc', 'Avalia como o agente responde a objeções do cliente'), weight: 4, active: true },
    { name: t('landing.mock.criteriaCompliance', 'Conformidade legal'), cat: 'Compliance', catColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', desc: t('landing.mock.criteriaComplianceDesc', 'Verifica conformidade com requisitos legais e regulamentares'), weight: 5, active: true },
    { name: t('landing.mock.criteriaClosing', 'Fecho da chamada'), cat: 'Comunicação', catColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', desc: t('landing.mock.criteriaClosingDesc', 'Avalia se o agente encerra a chamada de forma adequada'), weight: 2, active: true },
    { name: t('landing.mock.criteriaEmpathy', 'Empatia e tom'), cat: 'Comunicação', catColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', desc: t('landing.mock.criteriaEmpathyDesc', 'Avalia o tom e a empatia demonstrada pelo agente'), weight: 4, active: false },
  ];

  const getWeightColor = (w: number) => {
    if (w <= 1) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    if (w <= 2) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    if (w <= 3) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('criteria.title', 'Critérios de Avaliação')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('criteria.subtitle', 'Configure os critérios usados para avaliar chamadas')}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" />
          {t('criteria.addCriteria', 'Adicionar Critério')}
        </button>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2">
        {categories.map((cat, i) => (
          <button
            key={cat.key}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              i === 0
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg shadow-sm overflow-hidden" style={cardStyle}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('criteria.name', 'Nome')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('criteria.category', 'Categoria')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden xl:table-cell">{t('criteria.description', 'Descrição')}</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('criteria.weight', 'Peso')}</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('criteria.status', 'Estado')}</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: '#374151' }}>
            {criteria.map((c, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.catColor}`}>
                    <Tag className="w-3 h-3" />
                    {c.cat}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate hidden xl:table-cell">{c.desc}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${getWeightColor(c.weight)}`}>{c.weight}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {c.active ? t('criteria.active', 'Ativo') : t('criteria.inactive', 'Inativo')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Reusable user table ── */
function UserTable({ users, t }: { users: { name: string; initial: string; email: string; phone: string; date: string; cat?: string; catColor?: string }[]; t: (key: string, fallback: string) => string }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <th className="text-left px-4 py-2.5 font-medium text-gray-500 dark:text-gray-400">{t('users.username', 'Utilizador')}</th>
          <th className="text-left px-4 py-2.5 font-medium text-gray-500 dark:text-gray-400">{t('users.category', 'Categoria')}</th>
          <th className="text-left px-4 py-2.5 font-medium text-gray-500 dark:text-gray-400">{t('users.phone', 'Telefone')}</th>
          <th className="text-left px-4 py-2.5 font-medium text-gray-500 dark:text-gray-400">{t('users.created', 'Criado')}</th>
        </tr>
      </thead>
      <tbody className="divide-y" style={{ borderColor: '#374151' }}>
        {users.map((u, i) => (
          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {u.initial}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{u.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                </div>
              </div>
            </td>
            <td className="px-4 py-2.5">
              {u.cat ? (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${u.catColor}`}>
                  <Tag className="w-3 h-3" />
                  {u.cat}
                </span>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </td>
            <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{u.phone}</td>
            <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{u.date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── USERS VIEW ── */
function UsersView() {
  const { t } = useTranslation();

  const admins = [
    { name: 'Duarte Figueiras', initial: 'D', email: 'duarte@empresa.pt', phone: '+351 912 345 678', date: '01/01/2026' },
    { name: 'Sofia Mendes', initial: 'S', email: 'sofia@empresa.pt', phone: '+351 938 765 432', date: '05/01/2026' },
  ];

  const users = [
    { name: 'Maria Silva', initial: 'M', email: 'maria@empresa.pt', phone: '+351 965 432 109', date: '15/01/2026', cat: 'Vendas', catColor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    { name: 'João Santos', initial: 'J', email: 'joao@empresa.pt', phone: '+351 934 876 210', date: '20/01/2026', cat: 'Suporte', catColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
    { name: 'Ana Costa', initial: 'A', email: 'ana@empresa.pt', phone: '+351 918 654 321', date: '25/01/2026', cat: 'Vendas', catColor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    { name: 'Pedro Lopes', initial: 'P', email: 'pedro@empresa.pt', phone: '+351 927 111 222', date: '01/02/2026', cat: 'Compliance', catColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('nav.users', 'Utilizadores')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('users.subtitle', 'Gerir membros da equipa e os seus acessos')}</p>
      </div>

      {/* Administrators section */}
      <div className="rounded-lg shadow-sm overflow-hidden" style={cardStyle}>
        <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-semibold text-green-800 dark:text-green-300">{t('users.administrators', 'Administradores')}</span>
          <span className="text-xs text-green-600 dark:text-green-400 ml-1">({admins.length})</span>
        </div>
        <UserTable users={admins} t={t} />
      </div>

      {/* Users section */}
      <div className="rounded-lg shadow-sm overflow-hidden" style={cardStyle}>
        <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">{t('users.users', 'Utilizadores')}</span>
          <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">({users.length})</span>
        </div>
        <UserTable users={users} t={t} />
      </div>
    </div>
  );
}

/* ── Browser Chrome ── */
function BrowserChrome({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
      </div>
      <div className="flex-1 mx-8 px-4 py-1 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-400 text-center truncate">
        {url}
      </div>
    </div>
  );
}

const urlMap: Record<Tab, string> = {
  'dashboard-admin': 'aicoachcall.com/dashboard',
  'dashboard-user': 'aicoachcall.com/dashboard',
  analysis: 'aicoachcall.com/calls/1247',
  reports: 'aicoachcall.com/reports',
  criteria: 'aicoachcall.com/criteria',
  users: 'aicoachcall.com/users',
};

export default function ScreenshotPreview() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard-admin');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard-admin', label: t('landing.screenshots.dashboardAdmin', 'Dashboard Admin') },
    { key: 'dashboard-user', label: t('landing.screenshots.dashboardUser', 'Dashboard Utilizador') },
    { key: 'analysis', label: t('landing.screenshots.callAnalysis', 'Análise de Chamada') },
    { key: 'reports', label: t('landing.screenshots.reports', 'Relatórios') },
    { key: 'criteria', label: t('landing.screenshots.criteria', 'Critérios') },
    { key: 'users', label: t('landing.screenshots.users', 'Utilizadores') },
  ];

  return (
    <section className="pb-24 px-4 sm:px-6 lg:px-8 -mt-4">
      <div className="max-w-6xl mx-auto">
        {/* Tab Switcher */}
        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 text-sm font-medium rounded-full transition-all ${
                activeTab === tab.key
                  ? 'bg-green-600 text-white shadow-lg shadow-green-600/25'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Browser Frame */}
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-b from-green-500/10 to-transparent rounded-3xl blur-2xl pointer-events-none" />
          <div className="relative rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <BrowserChrome url={urlMap[activeTab]} />
            {/* Scaled container */}
            <div className="relative overflow-hidden" style={{ height: 'calc(780px * var(--preview-scale, 0.75))' }}>
              <div
                className="absolute top-0 left-0 flex dark bg-gray-900"
                style={{
                  width: '1440px',
                  height: '780px',
                  transform: 'scale(var(--preview-scale, 0.75))',
                  transformOrigin: 'top left',
                }}
              >
                <MockSidebar activeTab={activeTab} />
                <div className="flex-1 flex flex-col min-w-0">
                  <MockHeader />
                  <main className="flex-1 p-4 lg:p-6 overflow-hidden">
                    {activeTab === 'dashboard-admin' && <AdminDashboardView />}
                    {activeTab === 'dashboard-user' && <UserDashboardView />}
                    {activeTab === 'analysis' && <AnalysisView />}
                    {activeTab === 'reports' && <ReportsView />}
                    {activeTab === 'criteria' && <CriteriaView />}
                    {activeTab === 'users' && <UsersView />}
                  </main>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inject dynamic scale based on container width */}
      <style>{`
        @media (min-width: 1152px) { .max-w-6xl { --preview-scale: 0.75; } }
        @media (max-width: 1151px) and (min-width: 768px) { .max-w-6xl { --preview-scale: 0.6; } }
        @media (max-width: 767px) { .max-w-6xl { --preview-scale: 0.45; } }
      `}</style>
    </section>
  );
}
