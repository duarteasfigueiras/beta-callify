import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type Tab = 'dashboard' | 'analysis' | 'reports';

function BrowserChrome({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
      </div>
      <div className="flex-1 mx-8 px-4 py-1 rounded-md bg-white dark:bg-gray-900 text-xs text-gray-400 text-center truncate">
        {url}
      </div>
    </div>
  );
}

function DashboardView() {
  const { t } = useTranslation();
  const stats = [
    { label: t('landing.mock.totalCalls', 'Total Calls'), value: '1,247', color: 'text-blue-600 dark:text-blue-400' },
    { label: t('landing.mock.avgScore', 'Avg Score'), value: '78.5', color: 'text-green-600 dark:text-green-400' },
    { label: t('landing.mock.totalHours', 'Total Hours'), value: '156h', color: 'text-purple-600 dark:text-purple-400' },
    { label: t('landing.mock.agents', 'Active Agents'), value: '12', color: 'text-amber-600 dark:text-amber-400' },
  ];
  const calls = [
    { name: 'Maria Silva', score: 92 },
    { name: 'João Santos', score: 78 },
    { name: 'Ana Costa', score: 85 },
    { name: 'Pedro Lopes', score: 71 },
    { name: 'Sofia Mendes', score: 88 },
  ];
  const bars = [40, 55, 45, 60, 70, 65, 75, 80, 72, 85, 78, 90];

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {stats.map((s, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
            <p className={`text-lg sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            {t('landing.mock.scoreEvolution', 'Score Evolution')}
          </p>
          <div className="flex items-end gap-1 sm:gap-2 h-28 sm:h-36">
            {bars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t transition-all"
                style={{ height: `${h}%`, background: 'linear-gradient(to top, #16a34a, #4ade80)' }}
              />
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('landing.mock.recentCalls', 'Recent Calls')}
            </p>
          </div>
          {calls.map((c, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-green-700 dark:text-green-400">
                    {c.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <span className="text-xs text-gray-700 dark:text-gray-300">{c.name}</span>
              </div>
              <span className={`text-xs font-bold ${c.score >= 80 ? 'text-green-600' : 'text-amber-500'}`}>
                {c.score}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalysisView() {
  const { t } = useTranslation();
  const messages = [
    { speaker: 'agent', text: t('landing.mock.agentLine1', 'Good morning! Thank you for calling. How can I help you today?'), time: '0:00' },
    { speaker: 'client', text: t('landing.mock.clientLine1', 'Hi, I would like to know more about your premium plans.'), time: '0:05' },
    { speaker: 'agent', text: t('landing.mock.agentLine2', 'Of course! We have three options. Let me explain each one...'), time: '0:12' },
    { speaker: 'client', text: t('landing.mock.clientLine2', 'That sounds great. What is the price difference?'), time: '0:28' },
  ];
  const skills = [
    { name: t('landing.mock.greeting', 'Greeting'), score: 95 },
    { name: t('landing.mock.objHandling', 'Objection Handling'), score: 78 },
    { name: t('landing.mock.closing', 'Closing'), score: 82 },
    { name: t('landing.mock.empathy', 'Empathy'), score: 90 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Transcription */}
      <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('landing.mock.transcription', 'Transcription')}
          </p>
          <span className="text-xs text-gray-400">12:34</span>
        </div>
        <div className="p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.speaker === 'client' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${
                msg.speaker === 'agent'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              }`}>
                {msg.speaker === 'agent' ? 'A' : 'C'}
              </div>
              <div className={`max-w-[80%] ${msg.speaker === 'client' ? 'text-right' : ''}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 capitalize">{
                    msg.speaker === 'agent' ? t('landing.mock.agent', 'Agent') : t('landing.mock.client', 'Client')
                  }</span>
                  <span className="text-[9px] text-gray-400">{msg.time}</span>
                </div>
                <p className={`text-xs text-gray-700 dark:text-gray-300 rounded-lg p-2.5 ${
                  msg.speaker === 'agent' ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-blue-50 dark:bg-blue-900/20'
                }`}>
                  {msg.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div className="lg:col-span-2 space-y-4">
        {/* Score */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {t('landing.mock.overallScore', 'Overall Score')}
          </p>
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 border-green-500">
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">85</span>
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('landing.mock.skills', 'Skill Scores')}
          </p>
          {skills.map((skill, i) => (
            <div key={i} className="mb-2.5 last:mb-0">
              <div className="flex justify-between text-[10px] sm:text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">{skill.name}</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{skill.score}</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${skill.score}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* AI Recommendation */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
          <p className="text-[10px] sm:text-xs font-medium text-green-800 dark:text-green-400 mb-1">
            {t('landing.mock.aiRecommendation', 'AI Recommendation')}
          </p>
          <p className="text-[10px] sm:text-xs text-green-700 dark:text-green-300 leading-relaxed">
            {t('landing.mock.recommendationText', 'Great call! Focus on asking more open-ended questions to better understand client needs.')}
          </p>
        </div>
      </div>
    </div>
  );
}

function ReportsView() {
  const { t } = useTranslation();
  const metrics = [
    { label: t('landing.mock.avgTeamScore', 'Team Avg Score'), value: '82.3', change: '+5.2%', up: true },
    { label: t('landing.mock.totalCallsMonth', 'Calls This Month'), value: '347', change: '+12%', up: true },
    { label: t('landing.mock.schedulingRate', 'Scheduling Rate'), value: '19%', change: '+2.1%', up: true },
    { label: t('landing.mock.avgDuration', 'Avg Duration'), value: '8m 42s', change: '-0.5m', up: false },
  ];
  const agents = [
    { name: 'Maria Silva', score: 92 },
    { name: 'Sofia Mendes', score: 88 },
    { name: 'Ana Costa', score: 85 },
    { name: 'João Santos', score: 78 },
    { name: 'Pedro Lopes', score: 71 },
  ];
  const reasons = [
    { label: t('landing.mock.pricingInquiry', 'Pricing'), color: 'bg-green-500', pct: '35%' },
    { label: t('landing.mock.support', 'Support'), color: 'bg-blue-500', pct: '25%' },
    { label: t('landing.mock.demo', 'Demo Request'), color: 'bg-amber-500', pct: '20%' },
    { label: t('landing.mock.otherReason', 'Other'), color: 'bg-purple-500', pct: '20%' },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {metrics.map((m, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1">{m.label}</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{m.value}</p>
            <p className={`text-[10px] sm:text-xs font-medium ${m.up ? 'text-green-600' : 'text-red-500'}`}>
              {m.change}
            </p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Score by Agent */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            {t('landing.mock.scoreByAgent', 'Score by Agent')}
          </p>
          <div className="space-y-3">
            {agents.map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 dark:text-gray-400 w-24 truncate">{a.name}</span>
                <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${a.score >= 80 ? 'bg-green-500' : 'bg-amber-500'}`}
                    style={{ width: `${a.score}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-8 text-right">{a.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Reasons */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            {t('landing.mock.contactReasons', 'Contact Reasons')}
          </p>
          <div className="flex items-center justify-center h-40">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-200 dark:text-gray-700" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#16a34a" strokeWidth="3" strokeDasharray="35 65" strokeDashoffset="0" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="25 75" strokeDashoffset="-35" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="20 80" strokeDashoffset="-60" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#8b5cf6" strokeWidth="3" strokeDasharray="20 80" strokeDashoffset="-80" />
              </svg>
            </div>
            <div className="ml-4 space-y-2">
              {reasons.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${r.color}`} />
                  <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">{r.label}</span>
                  <span className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300">{r.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const urlMap: Record<Tab, string> = {
  dashboard: 'aicoachcall.com/dashboard',
  analysis: 'aicoachcall.com/calls/detail',
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
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
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
            <div className="bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 min-h-[420px]">
              {activeTab === 'dashboard' && <DashboardView />}
              {activeTab === 'analysis' && <AnalysisView />}
              {activeTab === 'reports' && <ReportsView />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
