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
} from 'lucide-react';

type Tab = 'dashboard' | 'analysis' | 'reports';

/* ── Sidebar mockup (mirrors real Layout.tsx) ── */
function MockSidebar({ activeTab }: { activeTab: Tab }) {
  const { t } = useTranslation();
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: activeTab === 'dashboard' },
    { icon: Phone, label: t('nav.calls', 'Calls'), active: activeTab === 'analysis' },
    { icon: BarChart3, label: t('nav.reports', 'Reports'), active: activeTab === 'reports' },
    { icon: ClipboardCheck, label: t('nav.criteria', 'Criteria'), active: false },
    { icon: Users, label: t('nav.users', 'Users'), active: false },
    { icon: Settings, label: t('nav.settings', 'Settings'), active: false },
  ];

  return (
    <div className="hidden md:flex w-48 lg:w-52 flex-shrink-0 flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* Logo */}
      <div className="flex items-center gap-2.5 h-12 px-4 border-b border-gray-200 dark:border-gray-700">
        <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center">
          <Phone className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-bold text-green-600">AI CoachCall</span>
      </div>
      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium ${
              item.active
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
      {/* User */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xs font-bold text-green-600 dark:text-green-400">D</div>
          <div>
            <p className="text-xs font-medium text-gray-800 dark:text-gray-200">Duarte F.</p>
            <p className="text-[10px] text-gray-400">Admin</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 px-1">
          <LogOut className="w-3.5 h-3.5" />
          <span>{t('auth.logout', 'Logout')}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Top header bar (mirrors real Layout header) ── */
function MockHeader() {
  return (
    <div className="h-10 md:h-12 flex items-center justify-between px-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
      <div />
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-gray-400" />
        <Moon className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
}

/* ── DASHBOARD VIEW ── */
function DashboardView() {
  const { t } = useTranslation();

  const stats = [
    { label: t('dashboard.totalCalls', 'Total Calls'), value: '1,247', icon: Phone, iconBg: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
    { label: t('dashboard.averageScore', 'Average Score'), value: '7.8', icon: TrendingUp, iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: t('dashboard.alertsCount', 'Alerts'), value: '23', icon: AlertTriangle, iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
    { label: t('dashboard.callsWithNextStep', 'With Next Step'), value: '68%', icon: CheckCircle, iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
  ];

  const calls = [
    { phone: '912 345 678', agent: 'Maria S.', cat: 'Comercial', catColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', date: '10/02 14:32', dur: '8:32', score: 9.2 },
    { phone: '965 432 109', agent: 'João S.', cat: 'Suporte', catColor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', date: '10/02 13:15', dur: '12:15', score: 6.8 },
    { phone: '934 876 210', agent: 'Ana C.', cat: 'Comercial', catColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', date: '10/02 11:44', dur: '6:44', score: 8.5 },
    { phone: '918 654 321', agent: 'Pedro L.', cat: 'Técnico', catColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', date: '10/02 10:20', dur: '4:55', score: 5.1 },
  ];

  const alerts = [
    { type: 'low_score', icon: TrendingUp, iconColor: 'text-red-500', label: t('alerts.types.lowScore', 'Low Score'), msg: 'Score 4.2 — 918 654 321', unread: true },
    { type: 'risk_words', icon: AlertTriangle, iconColor: 'text-yellow-500', label: t('alerts.types.riskWords', 'Risk Words'), msg: '"cancelar" detected — 965 432 109', unread: true },
    { type: 'no_next_step', icon: CheckCircle, iconColor: 'text-purple-500', label: t('alerts.types.noNextStep', 'No Next Step'), msg: 'Call without next step — 934 876 210', unread: false },
  ];

  const chartPoints = [5.2, 6.1, 5.8, 7.0, 6.5, 7.2, 7.8, 7.5, 8.1, 7.9, 8.3, 7.8];

  const topReasons = [
    { label: t('landing.mock.pricingInquiry', 'Pricing'), count: 42 },
    { label: t('landing.mock.support', 'Support'), count: 31 },
    { label: t('landing.mock.demo', 'Demo Request'), count: 18 },
    { label: 'Upgrade', count: 12 },
  ];
  const maxCount = Math.max(...topReasons.map(r => r.count));

  const getScoreColor = (s: number) => s >= 8 ? 'text-green-600 dark:text-green-400' : s >= 6 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="flex flex-col gap-3">
      {/* Title + date range */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Dashboard</h2>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <div className="flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            {['Today', '7d', '30d', '90d', 'All'].map((r, i) => (
              <span key={i} className={`px-2 py-1 text-[10px] font-medium ${r === '30d' ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500'}`}>{r}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5">{s.value}</p>
              </div>
              <div className={`p-2 rounded-full ${s.iconBg}`}>
                <s.icon className={`w-4 h-4 ${s.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid: 2x2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Recent Calls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{t('dashboard.recentCalls', 'Recent Calls')}</p>
          </div>
          <div className="p-2 space-y-1.5">
            {calls.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-gray-900 dark:text-gray-100">{c.phone}</span>
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${c.catColor}`}>{c.agent}</span>
                  </div>
                  <p className="text-[9px] text-gray-400 mt-0.5">{c.date} &bull; {c.dur}</p>
                </div>
                <span className={`text-xs font-bold ${getScoreColor(c.score)}`}>{c.score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{t('alerts.title', 'Alerts')}</p>
          </div>
          <div className="p-2 space-y-1.5">
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-center gap-2 p-2 rounded-md ${a.unread ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                <a.icon className={`w-4 h-4 shrink-0 ${a.iconColor}`} />
                <div className="min-w-0">
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{a.label}</span>
                  <p className="text-[10px] text-gray-700 dark:text-gray-300 truncate mt-1">{a.msg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Score Evolution — SVG line chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{t('dashboard.scoreEvolution', 'Score Evolution')}</p>
          </div>
          <div className="p-3 h-32">
            <svg viewBox="0 0 220 90" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
              {[0, 22.5, 45, 67.5, 90].map(y => (
                <line key={y} x1="25" y1={y} x2="215" y2={y} stroke="currentColor" strokeWidth="0.3" className="text-gray-200 dark:text-gray-700" />
              ))}
              <text x="20" y="6" fontSize="6" fill="currentColor" textAnchor="end" className="text-gray-400">10</text>
              <text x="20" y="48" fontSize="6" fill="currentColor" textAnchor="end" className="text-gray-400">5</text>
              <text x="20" y="93" fontSize="6" fill="currentColor" textAnchor="end" className="text-gray-400">0</text>
              <polyline
                fill="none"
                stroke="#16a34a"
                strokeWidth="2"
                strokeLinejoin="round"
                points={chartPoints.map((p, i) => `${25 + i * (190 / (chartPoints.length - 1))},${90 - (p / 10) * 90}`).join(' ')}
              />
              {chartPoints.map((p, i) => (
                <circle key={i} cx={25 + i * (190 / (chartPoints.length - 1))} cy={90 - (p / 10) * 90} r="2.5" fill="#16a34a" />
              ))}
            </svg>
          </div>
        </div>

        {/* Top Reasons (purple bars) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{t('dashboard.topReasons', 'Top Reasons')}</p>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">{t('common.viewAll', 'View all')}</span>
          </div>
          <div className="p-3 space-y-3">
            {topReasons.map((r, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400 w-20 truncate">{r.label}</span>
                <div className="flex-1 h-3.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(r.count / maxCount) * 100}%` }} />
                </div>
                <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 w-7 text-right">{r.count}</span>
              </div>
            ))}
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
    { name: t('landing.mock.greeting', 'Greeting'), score: 9.5 },
    { name: t('landing.mock.objHandling', 'Objection Handling'), score: 6.8 },
    { name: t('landing.mock.closing', 'Closing'), score: 8.2 },
    { name: t('landing.mock.empathy', 'Empathy'), score: 9.0 },
  ];

  const getSkillColor = (s: number) => s >= 8 ? 'bg-green-500' : s >= 6 ? 'bg-yellow-500' : 'bg-red-500';
  const getSkillTextColor = (s: number) => s >= 8 ? 'text-green-600 dark:text-green-400' : s >= 6 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="flex flex-col gap-3">
      {/* Header: back + title */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 flex items-center justify-center rounded text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t('calls.detail', 'Call Detail')}</h2>
          <p className="text-[10px] text-gray-400">+351 912 345 678</p>
        </div>
      </div>

      {/* Metadata cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: t('calls.date', 'Date'), value: '10/02/2026 14:32' },
          { label: t('calls.duration', 'Duration'), value: '8:32' },
          { label: t('calls.agent', 'Agent'), value: 'Maria Silva' },
          { label: t('calls.score', 'Score'), value: '8.5', color: 'text-green-600 dark:text-green-400' },
        ].map((m, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-gray-200 dark:border-gray-700">
            <p className="text-[9px] text-gray-400 uppercase tracking-wider">{m.label}</p>
            <p className={`text-xs font-semibold ${m.color || 'text-gray-900 dark:text-white'} mt-1`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5">
        {[t('calls.summary', 'Summary'), t('calls.evaluation', 'Evaluation'), t('calls.feedback', 'Feedback')].map((tab, i) => (
          <span key={i} className={`px-3 py-1.5 text-[10px] font-medium rounded-md ${i === 0 ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>{tab}</span>
        ))}
      </div>

      {/* Content: Summary + Skills */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {/* Left: Summary content */}
        <div className="md:col-span-3 space-y-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <p className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t('calls.summaryTitle', 'Summary')}</p>
            <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('landing.mock.summaryText', 'Customer called to inquire about premium plans. Agent provided a clear explanation of available options and pricing. The client showed interest in the Pro plan and scheduled a follow-up call.')}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
              <p className="text-[10px] font-semibold text-green-700 dark:text-green-400 mb-1.5">{t('calls.whatWentWell', 'What Went Well')}</p>
              <ul className="text-[9px] text-green-600 dark:text-green-300 space-y-1">
                <li>- {t('landing.mock.well1', 'Warm and professional greeting')}</li>
                <li>- {t('landing.mock.well2', 'Clear product explanation')}</li>
              </ul>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
              <p className="text-[10px] font-semibold text-red-700 dark:text-red-400 mb-1.5">{t('calls.whatWentWrong', 'What Went Wrong')}</p>
              <ul className="text-[9px] text-red-600 dark:text-red-300 space-y-1">
                <li>- {t('landing.mock.wrong1', 'Did not ask discovery questions')}</li>
                <li>- {t('landing.mock.wrong2', 'Missed upsell opportunity')}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right: Skills + AI recommendation */}
        <div className="md:col-span-2 space-y-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <p className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('landing.mock.skills', 'Skill Scores')}</p>
            {skills.map((skill, i) => (
              <div key={i} className="mb-3 last:mb-0">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-gray-500 dark:text-gray-400">{skill.name}</span>
                  <span className={`font-bold ${getSkillTextColor(skill.score)}`}>{skill.score.toFixed(1)}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${getSkillColor(skill.score)}`} style={{ width: `${skill.score * 10}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
            <p className="text-[10px] font-semibold text-green-800 dark:text-green-400 mb-1">
              {t('landing.mock.aiRecommendation', 'AI Recommendation')}
            </p>
            <p className="text-[9px] text-green-700 dark:text-green-300 leading-relaxed">
              {t('landing.mock.recommendationText', 'Great call! Focus on asking more open-ended questions to better understand client needs.')}
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
    { label: t('landing.mock.pricingInquiry', 'Pricing'), count: 42, color: 'bg-purple-500' },
    { label: t('landing.mock.support', 'Support'), count: 31, color: 'bg-purple-400' },
    { label: t('landing.mock.demo', 'Demo Request'), count: 18, color: 'bg-purple-300' },
    { label: 'Upgrade', count: 12, color: 'bg-purple-200' },
  ];
  const maxR = Math.max(...reasons.map(r => r.count));

  return (
    <div className="flex flex-col gap-3">
      {/* Title + filters */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{t('nav.reports', 'Reports')}</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            {['7d', '30d', '90d', 'All'].map((r, i) => (
              <span key={i} className={`px-2 py-1 text-[10px] font-medium ${r === '30d' ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500'}`}>{r}</span>
            ))}
          </div>
          <span className="text-[10px] px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-500 dark:text-gray-400">{t('reports.allAgents', 'All agents')}</span>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Score by Agent */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{t('landing.mock.scoreByAgent', 'Score by Agent')}</p>
            <span className="text-[9px] px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">Best</span>
          </div>
          <div className="p-3 space-y-2.5">
            {agents.map((a, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 w-20 truncate">{a.name}</span>
                <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${a.score >= 8 ? 'bg-green-500' : a.score >= 6 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${a.score * 10}%` }} />
                </div>
                <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 w-7 text-right">{a.score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Score Evolution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{t('dashboard.scoreEvolution', 'Score Evolution')}</p>
          </div>
          <div className="p-3 h-36">
            <svg viewBox="0 0 220 90" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
              {[0, 22.5, 45, 67.5, 90].map(y => (
                <line key={y} x1="25" y1={y} x2="215" y2={y} stroke="currentColor" strokeWidth="0.3" className="text-gray-200 dark:text-gray-700" />
              ))}
              <polyline
                fill="none"
                stroke="#16a34a"
                strokeWidth="2"
                strokeLinejoin="round"
                points={chartPoints.map((p, i) => `${25 + i * (190 / (chartPoints.length - 1))},${90 - (p / 10) * 90}`).join(' ')}
              />
              {chartPoints.map((p, i) => (
                <circle key={i} cx={25 + i * (190 / (chartPoints.length - 1))} cy={90 - (p / 10) * 90} r="2.5" fill="#16a34a" />
              ))}
            </svg>
          </div>
        </div>

        {/* Contact Reasons */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{t('landing.mock.contactReasons', 'Contact Reasons')}</p>
          </div>
          <div className="p-3 space-y-2.5">
            {reasons.map((r, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400 w-20 truncate">{r.label}</span>
                <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full ${r.color} rounded-full`} style={{ width: `${(r.count / maxR) * 100}%` }} />
                </div>
                <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 w-6 text-right">{r.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Calls by Period */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{t('reports.callsByPeriod', 'Calls by Period')}</p>
          </div>
          <div className="p-3 h-32 flex items-end gap-1.5">
            {[18, 24, 31, 27, 35, 22, 29, 33, 28, 38, 25, 32].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-sm bg-green-500" style={{ height: `${(h / 40) * 100}%` }} />
                {i % 3 === 0 && <span className="text-[7px] text-gray-400">{['Jan', 'Apr', 'Jul', 'Oct'][i / 3]}</span>}
              </div>
            ))}
          </div>
        </div>
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
      <div className="flex-1 mx-6 px-4 py-1 rounded-md bg-white dark:bg-gray-900 text-[11px] text-gray-400 text-center truncate">
        {url}
      </div>
    </div>
  );
}

const urlMap: Record<Tab, string> = {
  dashboard: 'aicoachcall.com/dashboard',
  analysis: 'aicoachcall.com/calls/1247',
  reports: 'aicoachcall.com/reports',
};

export default function ScreenshotPreview() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: t('landing.screenshots.dashboard', 'Dashboard') },
    { key: 'analysis', label: t('landing.screenshots.callAnalysis', 'Call Analysis') },
    { key: 'reports', label: t('landing.screenshots.reports', 'Reports') },
  ];

  return (
    <section className="pb-24 px-4 sm:px-6 lg:px-8 -mt-4">
      <div className="max-w-6xl mx-auto">
        {/* Tab Switcher */}
        <div className="flex justify-center gap-2 mb-8">
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
            {/* App layout: sidebar + content */}
            <div className="flex bg-gray-50 dark:bg-gray-900">
              <MockSidebar activeTab={activeTab} />
              <div className="flex-1 flex flex-col min-w-0">
                <MockHeader />
                <div className="flex-1 p-3 md:p-4 overflow-y-auto max-h-[560px]">
                  {activeTab === 'dashboard' && <DashboardView />}
                  {activeTab === 'analysis' && <AnalysisView />}
                  {activeTab === 'reports' && <ReportsView />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
