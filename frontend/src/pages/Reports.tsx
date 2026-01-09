import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, TrendingUp, Users, Phone, MessageSquare, AlertTriangle, Calendar, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi, usersApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ScoreByAgent, ScoreEvolution, CallsByPeriod, TopReason, TopObjection, User } from '../types';

export default function Reports() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [scoreByAgent, setScoreByAgent] = useState<ScoreByAgent[]>([]);
  const [scoreEvolution, setScoreEvolution] = useState<ScoreEvolution[]>([]);
  const [callsByPeriod, setCallsByPeriod] = useState<CallsByPeriod[]>([]);
  const [topReasons, setTopReasons] = useState<TopReason[]>([]);
  const [topObjections, setTopObjections] = useState<TopObjection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [agents, setAgents] = useState<User[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | undefined>(undefined);

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
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 365;
    }
  };

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const [agentData, evolutionData, periodData, reasonsData, objectionsData] = await Promise.all([
        dashboardApi.getScoreByAgent(),
        dashboardApi.getScoreEvolution(getDays(), selectedAgentId),
        dashboardApi.getCallsByPeriod(getDays(), selectedAgentId),
        dashboardApi.getTopReasons(),
        dashboardApi.getTopObjections(),
      ]);

      setScoreByAgent(agentData);
      setScoreEvolution(evolutionData);
      setCallsByPeriod(periodData);
      setTopReasons(reasonsData);
      setTopObjections(objectionsData);
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
              {(['7d', '30d', '90d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    dateRange === range
                      ? 'bg-green-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {range === 'all' ? t('common.all') : range}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
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

        {/* Calls by Period */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
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

      {/* Top Objections - Full width */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {t('reports.topObjections', 'Top Objections')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topObjections.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-gray-500 dark:text-gray-400">
              {t('common.noResults', 'No results')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {topObjections.map((objection, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                    {objection.count}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
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
    </div>
  );
}
