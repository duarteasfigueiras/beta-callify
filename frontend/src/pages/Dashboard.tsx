import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Phone, TrendingUp, AlertTriangle, CheckCircle, Calendar, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi, alertsApi, categoriesApi, Category } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { DashboardOverview, Call, Alert, isAdminOrDeveloper } from '../types';
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
  const isAdmin = user?.role ? isAdminOrDeveloper(user.role) : false;

  const [stats, setStats] = useState<DashboardOverview>({
    total_calls: 0,
    average_score: 0,
    alerts_count: 0,
    calls_with_next_step_percentage: 0,
  });
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [scoreEvolution, setScoreEvolution] = useState<{ date: string; average_score: number; total_calls: number }[]>([]);
  const [topReasons, setTopReasons] = useState<{ reason: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | '90d' | 'all'>('30d');
  const [categories, setCategories] = useState<Category[]>([]);

  const getDateRange = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    switch (dateRange) {
      case 'today':
        return { date_from: today, date_to: today };
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
      case 'today':
        return 1;
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
        // Base promises for all users
        const basePromises = [
          dashboardApi.getOverview(getDateRange()),
          dashboardApi.getRecentCalls(10),
          dashboardApi.getAlerts(10),
          dashboardApi.getScoreEvolution(getDaysFromRange()),
        ];

        // Add admin-only promises
        if (isAdmin) {
          basePromises.push(dashboardApi.getTopReasons(getDateRange()));
        }

        const results = await Promise.all(basePromises);

        setStats(results[0]);
        setRecentCalls(results[1]);
        setAlerts(results[2]);
        setScoreEvolution(results[3]);

        if (isAdmin && results[4]) {
          setTopReasons(results[4]);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [dateRange, isAdmin]);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoriesApi.getAll();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Built-in category colors fallback (when categories not yet loaded)
  const BUILTIN_CATEGORY_COLORS: Record<string, string> = {
    'comercial': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'suporte': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    'tecnico': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    'técnico': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    'supervisor': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  };

  // Get color classes for agent based on their category
  const getAgentCategoryColor = (customRoleName: string | null | undefined): string => {
    if (!customRoleName) {
      return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }

    const lowerName = customRoleName.toLowerCase();

    // First try to match from loaded categories
    if (categories.length > 0) {
      const matchedCategory = categories.find(c =>
        c.name.toLowerCase() === lowerName ||
        c.key.toLowerCase() === lowerName
      );
      if (matchedCategory) {
        return matchedCategory.color_classes;
      }
    }

    // Fallback to built-in colors
    if (BUILTIN_CATEGORY_COLORS[lowerName]) {
      return BUILTIN_CATEGORY_COLORS[lowerName];
    }

    return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  };

  // Get color classes for alert type badges (neutral gray, colors only on icons)
  const getAlertTypeColor = (_alertType: string): string => {
    return 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  };

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
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'long_duration':
        return <Phone className="w-4 h-4 text-blue-500" />;
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
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('dashboard.title')}
        </h1>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {(['today', '7d', '30d', '90d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1 text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-green-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {range === 'all' ? t('common.all') : range === 'today' ? t('calls.today', 'Today') : range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('dashboard.totalCalls')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.total_calls}
                </p>
              </div>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('dashboard.averageScore')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.average_score.toFixed(1)}
                </p>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('dashboard.alertsCount')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.alerts_count}
                </p>
              </div>
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('dashboard.callsWithNextStep')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.calls_with_next_step_percentage}%
                </p>
              </div>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content - fills remaining space */}
      <div className="flex-1 grid grid-rows-2 gap-3 min-h-0">
        {/* First row: Recent Calls + Alerts */}
        <div className="grid grid-cols-2 gap-3 min-h-0">
          <Card className="flex flex-col min-h-0">
            <CardHeader className="py-2 px-4 shrink-0">
              <CardTitle className="text-lg">{t('dashboard.recentCalls')}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto p-2 ">
              {recentCalls.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
                  {t('calls.noCallsFound')}
                </div>
              ) : (
                <div className="space-y-2 pb-4">
                  {recentCalls.map((call: any) => (
                    <div
                      key={call.id}
                      onClick={() => navigate(`/calls/${call.id}`)}
                      className="flex items-center justify-between p-2 h-[52px] bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {call.phone_number}
                          </p>
                          {call.agent_name && (
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getAgentCategoryColor(call.agent_custom_role_name)}`}>
                              {call.agent_name}
                            </span>
                          )}
                        </div>
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

          <Card className="flex flex-col min-h-0">
            <CardHeader className="py-2 px-4 shrink-0">
              <CardTitle className="text-lg">{t('alerts.title')}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto p-2 ">
              {alerts.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
                  {t('common.noResults')}
                </div>
              ) : (
                <div className="space-y-2 pb-4">
                  {alerts.map((alert: any) => (
                    <div
                      key={alert.id}
                      onClick={() => handleAlertClick(alert)}
                      className={`flex items-center gap-2 p-2 h-[52px] rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
                        alert.is_read
                          ? 'bg-gray-50 dark:bg-gray-800'
                          : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {getAlertIcon(alert.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {getAlertTypeLabel(alert.type)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-900 dark:text-gray-100 line-clamp-1">
                          {alert.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Second row: Charts */}
        <div className="grid grid-cols-2 gap-3 min-h-0">
          <Card className="flex flex-col min-h-0 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/score-evolution')}>
            <CardHeader className="py-2 px-4 shrink-0">
              <CardTitle className="text-lg">{t('dashboard.scoreEvolution')}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-2 min-h-0">
              {scoreEvolution.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
                  {t('common.noResults')}
                </div>
              ) : (
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
                    margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis
                      dataKey="formattedDate"
                      tick={{ fill: 'currentColor', fontSize: 10 }}
                      tickLine={{ stroke: 'currentColor' }}
                      className="text-gray-500 dark:text-gray-400"
                    />
                    <YAxis
                      domain={[0, 10]}
                      tick={{ fill: 'currentColor', fontSize: 10 }}
                      tickLine={{ stroke: 'currentColor' }}
                      className="text-gray-500 dark:text-gray-400"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--tooltip-bg, #fff)',
                        border: '1px solid var(--tooltip-border, #e5e7eb)',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'average_score') {
                          return [value.toFixed(1), t('dashboard.averageScore')];
                        }
                        return [value, t('dashboard.totalCalls')];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="average_score"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={{ fill: '#16a34a', strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5, fill: '#16a34a' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="flex flex-col min-h-0 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/reports')}>
            <CardHeader className="py-2 px-4 shrink-0">
              <CardTitle className="text-lg">{t('dashboard.topReasons')}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-2 min-h-0">
              {topReasons.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
                  {t('common.noResults')}
                </div>
              ) : (
                <div className="space-y-2">
                  {topReasons.map((reason, index) => {
                    const maxCount = Math.max(...topReasons.map(r => r.count), 1);
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-28 text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                          {reason.reason}
                        </div>
                        <div className="flex-1">
                          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 transition-all duration-500"
                              style={{ width: `${(reason.count / maxCount) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-6 text-right text-xs font-bold text-gray-700 dark:text-gray-300">
                          {reason.count}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
