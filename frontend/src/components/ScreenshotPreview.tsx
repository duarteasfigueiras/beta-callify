import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Phone,
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
  Mail,
  Search,
  Plus,
  ArrowUpDown,
} from 'lucide-react';

type Tab = 'dashboard' | 'analysis' | 'reports' | 'criteria' | 'users';

/* ── Sidebar (exact copy of real Layout.tsx) ── */
function MockSidebar({ activeTab }: { activeTab: Tab }) {
  const { t } = useTranslation();

  const sidebarMap: Record<Tab, string> = {
    dashboard: 'dashboard',
    analysis: 'calls',
    reports: 'reports',
    criteria: 'criteria',
    users: 'users',
  };
  const activeKey = sidebarMap[activeTab];

  const navItems = [
    { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { key: 'calls', icon: Phone, label: t('nav.calls', 'Chamadas') },
    { key: 'reports', icon: BarChart3, label: t('nav.reports', 'Relatórios') },
    { key: 'criteria', icon: ClipboardCheck, label: t('nav.criteria', 'Critérios') },
    { key: 'users', icon: Users, label: t('nav.users', 'Utilizadores') },
    { key: 'settings', icon: Settings, label: t('nav.settings', 'Definições') },
  ];

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
            D
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">Duarte F.</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Admin</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg">
          <LogOut className="w-4 h-4" />
          <span>{t('auth.logout', 'Logout')}</span>
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

/* ── DASHBOARD VIEW ── */
function DashboardView() {
  const { t } = useTranslation();

  const stats = [
    { label: t('dashboard.totalCalls', 'Total de Chamadas'), value: '1,247', icon: Phone, iconBg: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
    { label: t('dashboard.averageScore', 'Pontuação Média'), value: '7.8', icon: TrendingUp, iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: t('dashboard.alertsCount', 'Alertas'), value: '23', icon: AlertTriangle, iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
    { label: t('dashboard.callsWithNextStep', 'Com Próximo Passo'), value: '68%', icon: CheckCircle, iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
  ];

  const calls = [
    { phone: '912 345 678', agent: 'Maria S.', catColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', date: '10/02/2026 14:32', dur: '8:32', score: 9.2 },
    { phone: '965 432 109', agent: 'João S.', catColor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', date: '10/02/2026 13:15', dur: '12:15', score: 6.8 },
    { phone: '934 876 210', agent: 'Ana C.', catColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', date: '10/02/2026 11:44', dur: '6:44', score: 8.5 },
    { phone: '918 654 321', agent: 'Pedro L.', catColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', date: '10/02/2026 10:20', dur: '4:55', score: 5.1 },
  ];

  const alerts = [
    { icon: TrendingUp, iconColor: 'text-red-500', label: t('alerts.types.lowScore', 'Pontuação Baixa'), msg: 'Score 4.2 — Chamada com 918 654 321', unread: true },
    { icon: AlertTriangle, iconColor: 'text-yellow-500', label: t('alerts.types.riskWords', 'Palavras de Risco'), msg: '"cancelar" detectado — 965 432 109', unread: true },
    { icon: CheckCircle, iconColor: 'text-purple-500', label: t('alerts.types.noNextStep', 'Sem Próximo Passo'), msg: 'Chamada sem próximo passo — 934 876 210', unread: false },
  ];

  const chartPoints = [5.2, 6.1, 5.8, 7.0, 6.5, 7.2, 7.8, 7.5, 8.1, 7.9, 8.3, 7.8];

  const topReasons = [
    { label: t('landing.mock.pricingInquiry', 'Preços'), count: 42 },
    { label: t('landing.mock.support', 'Suporte'), count: 31 },
    { label: t('landing.mock.demo', 'Pedido de Demo'), count: 18 },
    { label: 'Upgrade', count: 12 },
  ];
  const maxCount = Math.max(...topReasons.map(r => r.count));

  const getScoreColor = (s: number) => s >= 8 ? 'text-green-600 dark:text-green-400' : s >= 6 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {(['Today', '7d', '30d', '90d', 'All'] as const).map((r) => (
              <span key={r} className={`px-3 py-1 text-sm font-medium ${r === '30d' ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>{r}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        {stats.map((s, i) => (
          <div key={i} className="rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm p-4">
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
          <div className="rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm flex flex-col min-h-0">
            <div className="py-2 px-4 shrink-0">
              <h3 className="text-2xl font-semibold leading-none tracking-tight">{t('dashboard.recentCalls', 'Chamadas Recentes')}</h3>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-2">
              <div className="space-y-2">
                {calls.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-2 h-[52px] bg-gray-50 dark:bg-gray-800 rounded-lg">
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
          <div className="rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm flex flex-col min-h-0">
            <div className="py-2 px-4 shrink-0">
              <h3 className="text-2xl font-semibold leading-none tracking-tight">{t('alerts.title', 'Alertas')}</h3>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-2">
              <div className="space-y-2">
                {alerts.map((a, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2 h-[52px] rounded-lg ${a.unread ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' : 'bg-gray-50 dark:bg-gray-800'}`}>
                    <a.icon className={`w-4 h-4 shrink-0 ${a.iconColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{a.label}</span>
                      </div>
                      <p className="text-xs text-gray-900 dark:text-gray-100 line-clamp-1">{a.msg}</p>
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
          <div className="rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm flex flex-col min-h-0">
            <div className="py-2 px-4 shrink-0">
              <h3 className="text-2xl font-semibold leading-none tracking-tight">{t('dashboard.scoreEvolution', 'Evolução da Pontuação')}</h3>
            </div>
            <div className="flex-1 p-2 min-h-0">
              <svg viewBox="0 0 500 200" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-gray-200 dark:text-gray-700" strokeDasharray="3 3" />
                  </pattern>
                </defs>
                <rect x="40" y="10" width="450" height="170" fill="url(#grid)" />
                <text x="35" y="15" fontSize="11" fill="currentColor" textAnchor="end" className="text-gray-500 dark:text-gray-400">10</text>
                <text x="35" y="100" fontSize="11" fill="currentColor" textAnchor="end" className="text-gray-500 dark:text-gray-400">5</text>
                <text x="35" y="185" fontSize="11" fill="currentColor" textAnchor="end" className="text-gray-500 dark:text-gray-400">0</text>
                <polyline
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  points={chartPoints.map((p, i) => `${45 + i * (440 / (chartPoints.length - 1))},${180 - (p / 10) * 170}`).join(' ')}
                />
                {chartPoints.map((p, i) => (
                  <circle key={i} cx={45 + i * (440 / (chartPoints.length - 1))} cy={180 - (p / 10) * 170} r="3" fill="#16a34a" strokeWidth="2" stroke="#16a34a" />
                ))}
              </svg>
            </div>
          </div>

          {/* Top Reasons */}
          <div className="rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm flex flex-col min-h-0">
            <div className="py-2 px-4 shrink-0 flex items-center justify-between">
              <h3 className="text-2xl font-semibold leading-none tracking-tight">{t('dashboard.topReasons', 'Principais Razões')}</h3>
              <span className="text-xs text-purple-600 dark:text-purple-400 hover:underline">{t('common.viewAll', 'Ver todos')}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 min-h-0">
              <div className="space-y-4 px-4">
                {topReasons.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                    <div className="w-32 truncate text-sm font-medium text-purple-600 dark:text-purple-400 text-left">{r.label}</div>
                    <div className="flex-1">
                      <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500" style={{ width: `${(r.count / maxCount) * 100}%` }} />
                      </div>
                    </div>
                    <div className="w-10 text-right text-sm font-bold text-gray-700 dark:text-gray-300">{r.count}</div>
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
    { name: t('landing.mock.greeting', 'Saudação'), score: 9.5 },
    { name: t('landing.mock.objHandling', 'Gestão de Objeções'), score: 6.8 },
    { name: t('landing.mock.closing', 'Fecho'), score: 8.2 },
    { name: t('landing.mock.empathy', 'Empatia'), score: 9.0 },
  ];

  const getSkillColor = (s: number) => s >= 8 ? 'bg-green-500' : s >= 6 ? 'bg-yellow-500' : 'bg-red-500';
  const getSkillTextColor = (s: number) => s >= 8 ? 'text-green-600 dark:text-green-400' : s >= 6 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-lg text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('calls.detail', 'Detalhe da Chamada')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">+351 912 345 678</p>
        </div>
      </div>

      {/* Metadata cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: t('calls.date', 'Data'), value: '10/02/2026 14:32' },
          { label: t('calls.duration', 'Duração'), value: '8:32' },
          { label: t('calls.agent', 'Utilizador'), value: 'Maria Silva' },
          { label: t('calls.score', 'Pontuação'), value: '8.5', color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
        ].map((m, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{m.label}</p>
            <p className={`text-lg font-semibold mt-1 ${m.color ? m.color.split(' ')[0] : 'text-gray-900 dark:text-white'}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {[t('calls.summary', 'Resumo'), t('calls.evaluation', 'Avaliação'), t('calls.feedback', 'Feedback')].map((tab, i) => (
          <button key={i} className={`px-4 py-2 text-sm font-medium border-b-2 ${i === 0 ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>{tab}</button>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-5 gap-6">
        {/* Left — summary */}
        <div className="col-span-3 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('calls.summaryTitle', 'Resumo')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('landing.mock.summaryText', 'O cliente ligou para saber mais sobre os planos premium. O utilizador explicou claramente as opções e preços disponíveis. O cliente mostrou interesse no plano Pro e agendou uma chamada de follow-up.')}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">{t('calls.whatWentWell', 'O Que Correu Bem')}</h4>
              <ul className="text-sm text-green-600 dark:text-green-300 space-y-1.5">
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>{t('landing.mock.well1', 'Saudação profissional e calorosa')}</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>{t('landing.mock.well2', 'Explicação clara do produto')}</li>
              </ul>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
              <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">{t('calls.whatWentWrong', 'O Que Pode Melhorar')}</h4>
              <ul className="text-sm text-red-600 dark:text-red-300 space-y-1.5">
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">✗</span>{t('landing.mock.wrong1', 'Não fez perguntas de descoberta')}</li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">✗</span>{t('landing.mock.wrong2', 'Oportunidade de upsell perdida')}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right — skills */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('landing.mock.skills', 'Pontuação por Competência')}</h3>
            {skills.map((skill, i) => (
              <div key={i} className="mb-4 last:mb-0">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-600 dark:text-gray-400">{skill.name}</span>
                  <span className={`font-bold ${getSkillTextColor(skill.score)}`}>{skill.score.toFixed(1)}</span>
                </div>
                <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${getSkillColor(skill.score)}`} style={{ width: `${skill.score * 10}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <h4 className="text-sm font-semibold text-green-800 dark:text-green-400 mb-1">
              {t('landing.mock.aiRecommendation', 'Recomendação da IA')}
            </h4>
            <p className="text-sm text-green-700 dark:text-green-300 leading-relaxed">
              {t('landing.mock.recommendationText', 'Ótima chamada! Foque-se em fazer perguntas mais abertas para entender melhor as necessidades do cliente.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── REPORTS VIEW ── */
function ReportsView() {
  const { t } = useTranslation();

  const agents = [
    { name: 'Maria Silva', score: 9.2 },
    { name: 'Sofia Mendes', score: 8.8 },
    { name: 'Ana Costa', score: 8.5 },
    { name: 'João Santos', score: 7.1 },
    { name: 'Pedro Lopes', score: 5.8 },
  ];

  const chartPoints = [5.2, 6.1, 5.8, 7.0, 6.5, 7.2, 7.8, 7.5, 8.1, 7.9, 8.3, 7.8];

  const reasons = [
    { label: t('landing.mock.pricingInquiry', 'Preços'), count: 42 },
    { label: t('landing.mock.support', 'Suporte'), count: 31 },
    { label: t('landing.mock.demo', 'Pedido de Demo'), count: 18 },
    { label: 'Upgrade', count: 12 },
  ];
  const maxR = Math.max(...reasons.map(r => r.count));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('nav.reports', 'Relatórios')}</h1>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {['7d', '30d', '90d', 'All'].map((r) => (
              <span key={r} className={`px-3 py-1 text-sm font-medium ${r === '30d' ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>{r}</span>
            ))}
          </div>
          <span className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400">{t('reports.allAgents', 'Todos os utilizadores')}</span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Score by Agent */}
        <div className="rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="py-2 px-4 flex items-center justify-between">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">{t('landing.mock.scoreByAgent', 'Pontuação por Utilizador')}</h3>
          </div>
          <div className="p-4 space-y-4">
            {agents.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                <div className="w-32 truncate text-sm font-medium text-gray-600 dark:text-gray-400">{a.name}</div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${a.score >= 8 ? 'bg-green-500' : a.score >= 6 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${a.score * 10}%` }} />
                  </div>
                </div>
                <div className="w-10 text-right text-sm font-bold text-gray-700 dark:text-gray-300">{a.score.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Score Evolution */}
        <div className="rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="py-2 px-4">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">{t('dashboard.scoreEvolution', 'Evolução da Pontuação')}</h3>
          </div>
          <div className="p-4 h-56">
            <svg viewBox="0 0 500 200" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
              <defs>
                <pattern id="grid2" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-gray-200 dark:text-gray-700" strokeDasharray="3 3" />
                </pattern>
              </defs>
              <rect x="40" y="10" width="450" height="170" fill="url(#grid2)" />
              <polyline
                fill="none"
                stroke="#16a34a"
                strokeWidth="2"
                strokeLinejoin="round"
                points={chartPoints.map((p, i) => `${45 + i * (440 / (chartPoints.length - 1))},${180 - (p / 10) * 170}`).join(' ')}
              />
              {chartPoints.map((p, i) => (
                <circle key={i} cx={45 + i * (440 / (chartPoints.length - 1))} cy={180 - (p / 10) * 170} r="3" fill="#16a34a" />
              ))}
            </svg>
          </div>
        </div>

        {/* Contact Reasons */}
        <div className="rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="py-2 px-4">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">{t('landing.mock.contactReasons', 'Motivos de Contacto')}</h3>
          </div>
          <div className="p-4 space-y-4">
            {reasons.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                <div className="w-32 truncate text-sm font-medium text-purple-600 dark:text-purple-400">{r.label}</div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(r.count / maxR) * 100}%` }} />
                  </div>
                </div>
                <div className="w-10 text-right text-sm font-bold text-gray-600 dark:text-gray-300">{r.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Calls by Period */}
        <div className="rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="py-2 px-4">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">{t('reports.callsByPeriod', 'Chamadas por Período')}</h3>
          </div>
          <div className="p-4 h-48 flex items-end gap-2">
            {[18, 24, 31, 27, 35, 22, 29, 33, 28, 38, 25, 32].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t bg-green-500" style={{ height: `${(h / 40) * 100}%` }} />
                {i % 3 === 0 && <span className="text-xs text-gray-400">{['Jan', 'Abr', 'Jul', 'Out'][i / 3]}</span>}
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
      <div className="rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
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
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
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
function UserTable({ users, t }: { users: { name: string; initial: string; email: string; phone: string; minutes: number; calls: number; date: string; cat?: string; catColor?: string }[]; t: (key: string, fallback: string) => string }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <th className="text-left px-4 py-2.5 font-medium text-gray-500 dark:text-gray-400">{t('users.username', 'Utilizador')}</th>
          <th className="text-left px-4 py-2.5 font-medium text-gray-500 dark:text-gray-400">{t('users.category', 'Categoria')}</th>
          <th className="text-left px-4 py-2.5 font-medium text-gray-500 dark:text-gray-400">{t('users.phone', 'Telefone')}</th>
          <th className="text-center px-4 py-2.5 font-medium text-gray-500 dark:text-gray-400">
            <div className="flex items-center justify-center gap-1">
              {t('users.minutesUsed', 'Minutos')}
              <ArrowUpDown className="w-3 h-3" />
            </div>
          </th>
          <th className="text-center px-4 py-2.5 font-medium text-gray-500 dark:text-gray-400">
            <div className="flex items-center justify-center gap-1">
              {t('users.calls', 'Chamadas')}
              <ArrowUpDown className="w-3 h-3" />
            </div>
          </th>
          <th className="text-left px-4 py-2.5 font-medium text-gray-500 dark:text-gray-400">{t('users.created', 'Criado')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
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
            <td className="px-4 py-2.5 text-center text-gray-900 dark:text-gray-100 font-medium">{u.minutes}</td>
            <td className="px-4 py-2.5 text-center text-gray-900 dark:text-gray-100 font-medium">{u.calls}</td>
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
    { name: 'Duarte Figueiras', initial: 'D', email: 'duarte@empresa.pt', phone: '+351 912 345 678', minutes: 245, calls: 89, date: '01/01/2026' },
    { name: 'Sofia Mendes', initial: 'S', email: 'sofia@empresa.pt', phone: '+351 938 765 432', minutes: 178, calls: 62, date: '05/01/2026' },
  ];

  const users = [
    { name: 'Maria Silva', initial: 'M', email: 'maria@empresa.pt', phone: '+351 965 432 109', minutes: 312, calls: 124, date: '15/01/2026', cat: 'Vendas', catColor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    { name: 'João Santos', initial: 'J', email: 'joao@empresa.pt', phone: '+351 934 876 210', minutes: 187, calls: 67, date: '20/01/2026', cat: 'Suporte', catColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
    { name: 'Ana Costa', initial: 'A', email: 'ana@empresa.pt', phone: '+351 918 654 321', minutes: 298, calls: 102, date: '25/01/2026', cat: 'Vendas', catColor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    { name: 'Pedro Lopes', initial: 'P', email: 'pedro@empresa.pt', phone: '+351 927 111 222', minutes: 156, calls: 53, date: '01/02/2026', cat: 'Compliance', catColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('nav.users', 'Utilizadores')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('users.subtitle', 'Gerir membros da equipa e os seus acessos')}</p>
      </div>

      {/* Administrators section */}
      <div className="rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-semibold text-green-800 dark:text-green-300">{t('users.administrators', 'Administradores')}</span>
          <span className="text-xs text-green-600 dark:text-green-400 ml-1">({admins.length})</span>
        </div>
        <UserTable users={admins} t={t} />
      </div>

      {/* Users section */}
      <div className="rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
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
  dashboard: 'aicoachcall.com/dashboard',
  analysis: 'aicoachcall.com/calls/1247',
  reports: 'aicoachcall.com/reports',
  criteria: 'aicoachcall.com/criteria',
  users: 'aicoachcall.com/users',
};

export default function ScreenshotPreview() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: t('landing.screenshots.dashboard', 'Dashboard') },
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
            <div className="relative overflow-hidden" style={{ height: '520px' }}>
              <div
                className="absolute top-0 left-0 flex bg-gray-50 dark:bg-gray-900"
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
                    {activeTab === 'dashboard' && <DashboardView />}
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
