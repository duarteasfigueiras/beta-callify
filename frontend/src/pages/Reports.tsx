import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  TrendingUp,
  Users,
  Phone,
  MessageSquare,
  AlertTriangle,
  Calendar,
  Filter,
  Clock,
  CheckCircle,
  PhoneIncoming,
  PhoneOutgoing,
  Award,
  XCircle,
  Download,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi, usersApi, callsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ScoreByAgent, ScoreEvolution, CallsByPeriod, TopReason, TopObjection, User, Call } from '../types';

interface CriteriaStats {
  criterion_name: string;
  passed: number;
  failed: number;
  total: number;
  pass_rate: number;
}

interface AlertStats {
  type: string;
  count: number;
}

export default function Reports() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [scoreByAgent, setScoreByAgent] = useState<ScoreByAgent[]>([]);
  const [scoreEvolution, setScoreEvolution] = useState<ScoreEvolution[]>([]);
  const [callsByPeriod, setCallsByPeriod] = useState<CallsByPeriod[]>([]);
  const [topReasons, setTopReasons] = useState<TopReason[]>([]);
  const [topObjections, setTopObjections] = useState<TopObjection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | '90d' | 'all'>('30d');
  const [agents, setAgents] = useState<User[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | undefined>(undefined);

  // New states for additional reports
  const [calls, setCalls] = useState<Call[]>([]);
  const [avgDuration, setAvgDuration] = useState(0);
  const [callsByType, setCallsByType] = useState({ inbound: 0, outbound: 0, meeting: 0 });
  const [callsByAgent, setCallsByAgent] = useState<{ agent: string; count: number }[]>([]);
  const [nextStepRate, setNextStepRate] = useState(0);
  const [riskWordsCount, setRiskWordsCount] = useState<{ word: string; count: number }[]>([]);
  const [alertsByType, setAlertsByType] = useState<AlertStats[]>([]);
  const [alertsByAgent, setAlertsByAgent] = useState<{ agent: string; count: number }[]>([]);

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [dateRange, selectedAgentId]);

  const fetchAgents = async () => {
    try {
      const data = await usersApi.getAll();
      setAgents(data);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const getDays = () => {
    switch (dateRange) {
      case 'today': return 1;
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 365;
    }
  };

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const [agentData, evolutionData, periodData, reasonsData, objectionsData, callsData] = await Promise.all([
        dashboardApi.getScoreByAgent(),
        dashboardApi.getScoreEvolution(getDays(), selectedAgentId),
        dashboardApi.getCallsByPeriod(getDays(), selectedAgentId),
        dashboardApi.getTopReasons(),
        dashboardApi.getTopObjections(),
        callsApi.getAll({ limit: 1000 }),
      ]);

      setScoreByAgent(agentData);
      setScoreEvolution(evolutionData);
      setCallsByPeriod(periodData);
      setTopReasons(reasonsData);
      setTopObjections(objectionsData);

      // Process calls data for additional reports
      const allCalls = callsData.data || [];
      setCalls(allCalls);

      // Calculate average duration
      if (allCalls.length > 0) {
        const totalDuration = allCalls.reduce((sum: number, call: Call) => sum + (call.duration_seconds || 0), 0);
        setAvgDuration(Math.round(totalDuration / allCalls.length));
      }

      // Calculate calls by type
      const typeCount = { inbound: 0, outbound: 0, meeting: 0 };
      allCalls.forEach((call: Call) => {
        if (call.direction === 'inbound') typeCount.inbound++;
        else if (call.direction === 'outbound') typeCount.outbound++;
        else if (call.direction === 'meeting') typeCount.meeting++;
      });
      setCallsByType(typeCount);

      // Calculate calls by agent
      const agentCounts: Record<string, number> = {};
      allCalls.forEach((call: Call) => {
        const agentName = call.agent_username || 'Unknown';
        agentCounts[agentName] = (agentCounts[agentName] || 0) + 1;
      });
      setCallsByAgent(
        Object.entries(agentCounts)
          .map(([agent, count]) => ({ agent, count }))
          .sort((a, b) => b.count - a.count)
      );

      // Calculate next step rate
      const withNextStep = allCalls.filter((call: Call) => call.next_step_recommendation).length;
      setNextStepRate(allCalls.length > 0 ? Math.round((withNextStep / allCalls.length) * 100) : 0);

      // Calculate risk words frequency
      const riskWords: Record<string, number> = {};
      allCalls.forEach((call: Call) => {
        if (call.risk_words_detected && Array.isArray(call.risk_words_detected)) {
          call.risk_words_detected.forEach((word: string) => {
            riskWords[word] = (riskWords[word] || 0) + 1;
          });
        }
      });
      setRiskWordsCount(
        Object.entries(riskWords)
          .map(([word, count]) => ({ word, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      );

    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(user?.language_preference === 'pt' ? 'pt-PT' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 8) return 'text-green-600 dark:text-green-400';
    if (score >= 6) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const [showExportMenu, setShowExportMenu] = useState(false);

  const exportToCSV = () => {
    const avgScore = scoreEvolution.length > 0
      ? (scoreEvolution.reduce((sum, s) => sum + s.average_score, 0) / scoreEvolution.length).toFixed(1)
      : '0';

    let csvContent = 'data:text/csv;charset=utf-8,';

    // Summary section
    csvContent += `${t('reports.title', 'Reports')} - ${new Date().toLocaleDateString()}\n\n`;
    csvContent += `${t('reports.totalCalls', 'Total Calls')},${calls.length}\n`;
    csvContent += `${t('reports.avgDuration', 'Avg. Duration')},${formatDuration(avgDuration)}\n`;
    csvContent += `${t('reports.nextStepRate', 'Next Step Rate')},${nextStepRate}%\n`;
    csvContent += `${t('reports.avgScore', 'Avg. Score')},${avgScore}\n\n`;

    // Score by Agent
    csvContent += `${t('reports.scoreByAgent', 'Score by Agent')}\n`;
    csvContent += `${t('calls.agent', 'Agent')},${t('reports.avgScore', 'Avg. Score')},${t('reports.totalCalls', 'Total Calls')}\n`;
    scoreByAgent.forEach(agent => {
      csvContent += `${agent.agent_username},${agent.average_score},${agent.total_calls}\n`;
    });
    csvContent += '\n';

    // Calls by Type
    csvContent += `${t('reports.callsByType', 'Calls by Type')}\n`;
    csvContent += `${t('calls.inbound', 'Inbound')},${callsByType.inbound}\n`;
    csvContent += `${t('calls.outbound', 'Outbound')},${callsByType.outbound}\n`;
    csvContent += `${t('calls.meetings', 'Meetings')},${callsByType.meeting}\n\n`;

    // Calls by Agent
    csvContent += `${t('reports.callsByAgent', 'Calls by Agent')}\n`;
    csvContent += `${t('calls.agent', 'Agent')},${t('reports.totalCalls', 'Total Calls')}\n`;
    callsByAgent.forEach(item => {
      csvContent += `${item.agent},${item.count}\n`;
    });
    csvContent += '\n';

    // Top Reasons
    csvContent += `${t('reports.topReasons', 'Top Contact Reasons')}\n`;
    csvContent += `${t('common.reason', 'Reason')},${t('common.count', 'Count')}\n`;
    topReasons.forEach(reason => {
      csvContent += `"${reason.reason}",${reason.count}\n`;
    });
    csvContent += '\n';

    // Top Objections
    csvContent += `${t('reports.topObjections', 'Top Objections')}\n`;
    csvContent += `${t('common.objection', 'Objection')},${t('common.count', 'Count')}\n`;
    topObjections.forEach(objection => {
      csvContent += `"${objection.objection}",${objection.count}\n`;
    });
    csvContent += '\n';

    // Risk Words
    csvContent += `${t('reports.riskWordsFrequency', 'Risk Words Frequency')}\n`;
    csvContent += `${t('common.word', 'Word')},${t('common.count', 'Count')}\n`;
    riskWordsCount.forEach(item => {
      csvContent += `"${item.word}",${item.count}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `callify-reports-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const exportToPDF = () => {
    const avgScore = scoreEvolution.length > 0
      ? (scoreEvolution.reduce((sum, s) => sum + s.average_score, 0) / scoreEvolution.length).toFixed(1)
      : '0';

    // Create a printable HTML content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t('reports.title', 'Reports')} - Callify</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { color: #16a34a; border-bottom: 2px solid #16a34a; padding-bottom: 10px; }
          h2 { color: #374151; margin-top: 30px; }
          .summary { display: flex; gap: 20px; margin: 20px 0; flex-wrap: wrap; }
          .summary-card { background: #f3f4f6; padding: 15px 25px; border-radius: 8px; min-width: 150px; }
          .summary-card .label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
          .summary-card .value { font-size: 24px; font-weight: bold; color: #111827; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background: #f9fafb; font-weight: 600; }
          .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>${t('reports.title', 'Reports')} - Callify</h1>
        <p style="color: #6b7280;">${t('reports.subtitle', 'Analyze team performance and trends')} | ${new Date().toLocaleDateString()}</p>

        <div class="summary">
          <div class="summary-card">
            <div class="label">${t('reports.totalCalls', 'Total Calls')}</div>
            <div class="value">${calls.length}</div>
          </div>
          <div class="summary-card">
            <div class="label">${t('reports.avgDuration', 'Avg. Duration')}</div>
            <div class="value">${formatDuration(avgDuration)}</div>
          </div>
          <div class="summary-card">
            <div class="label">${t('reports.nextStepRate', 'Next Step Rate')}</div>
            <div class="value">${nextStepRate}%</div>
          </div>
          <div class="summary-card">
            <div class="label">${t('reports.avgScore', 'Avg. Score')}</div>
            <div class="value">${avgScore}</div>
          </div>
        </div>

        <h2>${t('reports.scoreByAgent', 'Score by Agent')}</h2>
        <table>
          <thead>
            <tr>
              <th>${t('calls.agent', 'Agent')}</th>
              <th>${t('reports.avgScore', 'Avg. Score')}</th>
              <th>${t('reports.totalCalls', 'Total Calls')}</th>
            </tr>
          </thead>
          <tbody>
            ${scoreByAgent.map(agent => `
              <tr>
                <td>${agent.agent_username}</td>
                <td>${agent.average_score}</td>
                <td>${agent.total_calls}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>${t('reports.callsByType', 'Calls by Type')}</h2>
        <table>
          <thead>
            <tr>
              <th>${t('common.type', 'Type')}</th>
              <th>${t('common.count', 'Count')}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>${t('calls.inbound', 'Inbound')}</td><td>${callsByType.inbound}</td></tr>
            <tr><td>${t('calls.outbound', 'Outbound')}</td><td>${callsByType.outbound}</td></tr>
            <tr><td>${t('calls.meetings', 'Meetings')}</td><td>${callsByType.meeting}</td></tr>
          </tbody>
        </table>

        <h2>${t('reports.callsByAgent', 'Calls by Agent')}</h2>
        <table>
          <thead>
            <tr>
              <th>${t('calls.agent', 'Agent')}</th>
              <th>${t('reports.totalCalls', 'Total Calls')}</th>
            </tr>
          </thead>
          <tbody>
            ${callsByAgent.map(item => `
              <tr>
                <td>${item.agent}</td>
                <td>${item.count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>${t('reports.topReasons', 'Top Contact Reasons')}</h2>
        <table>
          <thead>
            <tr>
              <th>${t('common.reason', 'Reason')}</th>
              <th>${t('common.count', 'Count')}</th>
            </tr>
          </thead>
          <tbody>
            ${topReasons.map(reason => `
              <tr>
                <td>${reason.reason}</td>
                <td>${reason.count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>${t('reports.topObjections', 'Top Objections')}</h2>
        <table>
          <thead>
            <tr>
              <th>${t('common.objection', 'Objection')}</th>
              <th>${t('common.count', 'Count')}</th>
            </tr>
          </thead>
          <tbody>
            ${topObjections.map(objection => `
              <tr>
                <td>${objection.objection}</td>
                <td>${objection.count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>${t('reports.riskWordsFrequency', 'Risk Words Frequency')}</h2>
        <table>
          <thead>
            <tr>
              <th>${t('common.word', 'Word')}</th>
              <th>${t('common.count', 'Count')}</th>
            </tr>
          </thead>
          <tbody>
            ${riskWordsCount.map(item => `
              <tr>
                <td style="color: #dc2626;">${item.word}</td>
                <td>${item.count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          ${t('reports.generatedBy', 'Generated by Callify')} - ${new Date().toLocaleString()}
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    setShowExportMenu(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const maxCalls = Math.max(...callsByPeriod.map(d => d.count), 1);
  const maxReasonCount = Math.max(...topReasons.map(r => r.count), 1);
  const maxObjectionCount = Math.max(...topObjections.map(o => o.count), 1);
  const maxAgentCalls = Math.max(...callsByAgent.map(a => a.count), 1);
  const maxRiskWordCount = Math.max(...riskWordsCount.map(r => r.count), 1);
  const totalCallsByType = callsByType.inbound + callsByType.outbound + callsByType.meeting;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('reports.title', 'Reports')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('reports.subtitle', 'Analyze team performance and trends')}
          </p>
        </div>

        {/* Filters and Export */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Export dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {t('reports.export', 'Export')}
            </Button>
            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                  <button
                    onClick={exportToCSV}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    {t('reports.exportCSV', 'Export to CSV')}
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
                  >
                    <FileText className="w-4 h-4 text-red-600" />
                    {t('reports.exportPDF', 'Export to PDF')}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Agent filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={selectedAgentId ?? ''}
              onChange={(e) => setSelectedAgentId(e.target.value ? Number(e.target.value) : undefined)}
              className="px-3 py-1.5 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">{t('reports.allAgents', 'All Agents')}</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.username}
                </option>
              ))}
            </select>
          </div>

          {/* Date range selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {(['today', '7d', '30d', '90d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    dateRange === range
                      ? 'bg-green-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {range === 'today' ? t('dashboard.today', 'Today') : range === 'all' ? t('common.all') : range}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('reports.totalCalls', 'Total Calls')}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {calls.length}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Phone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('reports.avgDuration', 'Avg. Duration')}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {formatDuration(avgDuration)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('reports.nextStepRate', 'Next Step Rate')}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {nextStepRate}%
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('reports.avgScore', 'Avg. Score')}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {scoreEvolution.length > 0
                    ? (scoreEvolution.reduce((sum, s) => sum + s.average_score, 0) / scoreEvolution.length).toFixed(1)
                    : '-'}
                </p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score by Agent */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t('reports.scoreByAgent', 'Score by Agent')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scoreByAgent.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
                {t('common.noResults', 'No results')}
              </div>
            ) : (
              <div className="space-y-4">
                {scoreByAgent.map((agent) => (
                  <div key={agent.agent_id} className="flex items-center gap-4">
                    <div className="w-24 truncate font-medium text-gray-900 dark:text-gray-100">
                      {agent.agent_username}
                    </div>
                    <div className="flex-1">
                      <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getScoreColor(agent.average_score)} transition-all duration-500`}
                          style={{ width: `${(agent.average_score / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className={`w-12 text-right font-bold ${getScoreTextColor(agent.average_score)}`}>
                      {agent.average_score}
                    </div>
                    <div className="w-16 text-right text-sm text-gray-500 dark:text-gray-400">
                      {agent.total_calls} {t('reports.calls', 'calls')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Score Evolution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {t('reports.scoreEvolution', 'Score Evolution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scoreEvolution.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
                {t('common.noResults', 'No results')}
              </div>
            ) : (
              <div className="h-48">
                <div className="flex items-end gap-1 h-36">
                  {scoreEvolution.map((point, index) => (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center justify-end"
                    >
                      <div
                        className={`w-full ${getScoreColor(point.average_score)} rounded-t transition-all duration-500`}
                        style={{ height: `${(point.average_score / 10) * 100}%` }}
                        title={`${formatDate(point.date)}: ${point.average_score.toFixed(1)}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {scoreEvolution.length > 0 && (
                    <>
                      <span>{formatDate(scoreEvolution[0].date)}</span>
                      <span>{formatDate(scoreEvolution[scoreEvolution.length - 1].date)}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calls by Period */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {t('reports.callsByPeriod', 'Calls by Period')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {callsByPeriod.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
                {t('common.noResults', 'No results')}
              </div>
            ) : (
              <div className="h-48">
                <div className="flex items-end gap-1 h-36">
                  {callsByPeriod.map((point, index) => (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center justify-end"
                    >
                      <div
                        className="w-full bg-blue-500 rounded-t transition-all duration-500"
                        style={{ height: `${(point.count / maxCalls) * 100}%` }}
                        title={`${formatDate(point.period)}: ${point.count} calls`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {callsByPeriod.length > 0 && (
                    <>
                      <span>{formatDate(callsByPeriod[0].period)}</span>
                      <span>{formatDate(callsByPeriod[callsByPeriod.length - 1].period)}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calls by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              {t('reports.callsByType', 'Calls by Type')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-28">
                  <PhoneIncoming className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('calls.inbound', 'Inbound')}</span>
                </div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{ width: totalCallsByType > 0 ? `${(callsByType.inbound / totalCallsByType) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
                <div className="w-16 text-right font-medium text-gray-900 dark:text-gray-100">
                  {callsByType.inbound}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-28">
                  <PhoneOutgoing className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('calls.outbound', 'Outbound')}</span>
                </div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: totalCallsByType > 0 ? `${(callsByType.outbound / totalCallsByType) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
                <div className="w-16 text-right font-medium text-gray-900 dark:text-gray-100">
                  {callsByType.outbound}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-28">
                  <Users className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('calls.meetings', 'Meetings')}</span>
                </div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 transition-all duration-500"
                      style={{ width: totalCallsByType > 0 ? `${(callsByType.meeting / totalCallsByType) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
                <div className="w-16 text-right font-medium text-gray-900 dark:text-gray-100">
                  {callsByType.meeting}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid - Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calls by Agent */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t('reports.callsByAgent', 'Calls by Agent')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {callsByAgent.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
                {t('common.noResults', 'No results')}
              </div>
            ) : (
              <div className="space-y-3">
                {callsByAgent.slice(0, 6).map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-24 truncate font-medium text-gray-900 dark:text-gray-100">
                      {item.agent}
                    </div>
                    <div className="flex-1">
                      <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 transition-all duration-500"
                          style={{ width: `${(item.count / maxAgentCalls) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-12 text-right font-medium text-gray-900 dark:text-gray-100">
                      {item.count}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Reasons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {t('reports.topReasons', 'Top Contact Reasons')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topReasons.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
                {t('common.noResults', 'No results')}
              </div>
            ) : (
              <div className="space-y-3">
                {topReasons.map((reason, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-32 truncate text-sm text-gray-900 dark:text-gray-100">
                      {reason.reason}
                    </div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all duration-500"
                          style={{ width: `${(reason.count / maxReasonCount) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-8 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                      {reason.count}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid - Row 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Objections */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              {t('reports.topObjections', 'Top Objections')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topObjections.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
                {t('common.noResults', 'No results')}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {topObjections.slice(0, 6).map((objection, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                      {objection.count}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {objection.objection}
                    </div>
                    <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 transition-all duration-500"
                        style={{ width: `${(objection.count / maxObjectionCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Words Detected */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {t('reports.riskWordsFrequency', 'Risk Words Frequency')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {riskWordsCount.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
                {t('common.noResults', 'No results')}
              </div>
            ) : (
              <div className="space-y-3">
                {riskWordsCount.slice(0, 6).map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-28 truncate text-sm font-medium text-red-600 dark:text-red-400">
                      {item.word}
                    </div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 transition-all duration-500"
                          style={{ width: `${(item.count / maxRiskWordCount) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-8 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                      {item.count}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
