import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Phone, TrendingUp, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi, alertsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { DashboardOverview, Call, Alert } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin_manager';

  const [stats, setStats] = useState<DashboardOverview>({
    total_calls: 0,
    average_score: 0,
    alerts_count: 0,
    calls_with_next_step_percentage: 0,
  });
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [scoreEvolution, setScoreEvolution] = useState<{ date: string; average_score: number; total_calls: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case '7d':
        return { date_from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] };
      case '30d':
        return { date_from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] };
      case '90d':
        return { date_from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] };
      default:
        return {};
    }
  };

  const getDaysFromRange = () => {
    switch (dateRange) {
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '90d':
        return 90;
      default:
        return 365; // For 'all', get last year
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [overviewData, recentCallsData, alertsData, scoreEvolutionData] = await Promise.all([
          dashboardApi.getOverview(getDateRange()),
          dashboardApi.getRecentCalls(5),
          dashboardApi.getAlerts(5),
          dashboardApi.getScoreEvolution(getDaysFromRange()),
        ]);

        setStats(overviewData);
        setRecentCalls(recentCallsData);
        setAlerts(alertsData);
        setScoreEvolution(scoreEvolutionData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [dateRange]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(user?.language_preference === 'pt' ? 'pt-PT' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-500';
    if (score >= 8) return 'text-green-600 dark:text-green-400';
    if (score >= 6) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'low_score':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'risk_words':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'long_duration':
        return <Phone className="w-4 h-4 text-orange-500" />;
      case 'no_next_step':
        return <CheckCircle className="w-4 h-4 text-purple-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'low_score':
        return t('alerts.types.lowScore', 'Low Score');
      case 'risk_words':
        return t('alerts.types.riskWords', 'Risk Words');
      case 'long_duration':
        return t('alerts.types.longDuration', 'Long Duration');
      case 'no_next_step':
        return t('alerts.types.noNextStep', 'No Next Step');
      default:
        return type;
    }
  };

  const handleAlertClick = async (alert: Alert) => {
    // Mark alert as read if not already
    if (!alert.is_read) {
      try {
        await alertsApi.markAsRead(alert.id);
        // Update local state to reflect the change
        setAlerts(prevAlerts =>
          prevAlerts.map(a =>
            a.id === alert.id ? { ...a, is_read: 1 } : a
          )
        );
        // Update stats count
        setStats(prevStats => ({
          ...prevStats,
          alerts_count: Math.max(0, prevStats.alerts_count - 1)
        }));
      } catch (error) {
        console.error('Error marking alert as read:', error);
      }
    }
    // Navigate to the related call
    navigate(`/calls/${alert.call_id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('dashboard.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isAdmin
              ? 'Overview of all team performance'
              : 'Your personal performance overview'}
          </p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('dashboard.totalCalls')}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {stats.total_calls}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Phone className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('dashboard.averageScore')}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {stats.average_score.toFixed(1)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('dashboard.alertsCount')}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {stats.alerts_count}
                </p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('dashboard.callsWithNextStep')}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {stats.calls_with_next_step_percentage}%
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Calls */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.recentCalls')}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentCalls.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {t('calls.noCallsFound')}
              </div>
            ) : (
              <div className="space-y-3">
                {recentCalls.map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {call.phone_number}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(call.call_date)} • {formatDuration(call.duration_seconds)}
                      </p>
                    </div>
                    <div className={`text-lg font-bold ${getScoreColor(call.final_score)}`}>
                      {call.final_score !== null ? call.final_score.toFixed(1) : '-'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>{t('alerts.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {t('common.noResults')}
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
                      alert.is_read
                        ? 'bg-gray-50 dark:bg-gray-800'
                        : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {getAlertIcon(alert.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {getAlertTypeLabel(alert.type)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {alert.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatDate(alert.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Evolution */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.scoreEvolution')}</CardTitle>
          </CardHeader>
          <CardContent>
            {scoreEvolution.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                {t('common.noResults')}
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={scoreEvolution.map(item => ({
                      ...item,
                      average_score: Math.round(item.average_score * 10) / 10,
                      formattedDate: new Date(item.date).toLocaleDateString(user?.language_preference === 'pt' ? 'pt-PT' : 'en-US', {
                        day: '2-digit',
                        month: '2-digit',
                      }),
                    }))}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis
                      dataKey="formattedDate"
                      tick={{ fill: 'currentColor', fontSize: 12 }}
                      tickLine={{ stroke: 'currentColor' }}
                      className="text-gray-500 dark:text-gray-400"
                    />
                    <YAxis
                      domain={[0, 10]}
                      tick={{ fill: 'currentColor', fontSize: 12 }}
                      tickLine={{ stroke: 'currentColor' }}
                      className="text-gray-500 dark:text-gray-400"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--tooltip-bg, #fff)',
                        border: '1px solid var(--tooltip-border, #e5e7eb)',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                      labelStyle={{ color: 'var(--tooltip-text, #374151)', fontWeight: 600 }}
                      formatter={(value: number, name: string) => {
                        if (name === 'average_score') {
                          return [value.toFixed(1), t('dashboard.averageScore')];
                        }
                        return [value, t('dashboard.totalCalls')];
                      }}
                      labelFormatter={(label) => label}
                    />
                    <Line
                      type="monotone"
                      dataKey="average_score"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#16a34a' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Reasons */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.topReasons')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              {t('common.noResults')}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
