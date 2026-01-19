import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  Calendar,
  TrendingUp,
  TrendingDown,
  Phone,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface CallsByPeriodData {
  period: string;
  count: number;
}

export default function CallsByPeriod() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | '90d' | 'all'>('30d');
  const [callsByPeriod, setCallsByPeriod] = useState<CallsByPeriodData[]>([]);

  const getDays = () => {
    switch (dateRange) {
      case 'today': return 1;
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 365;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await dashboardApi.getCallsByPeriod(getDays());
        setCallsByPeriod(data);
      } catch (error) {
        console.error('Error fetching calls by period:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [dateRange]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(user?.language_preference === 'pt' ? 'pt-PT' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(user?.language_preference === 'pt' ? 'pt-PT' : 'en-US', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  // Calculate statistics
  const totalCalls = callsByPeriod.reduce((sum, d) => sum + d.count, 0);
  const avgCallsPerDay = callsByPeriod.length > 0 ? totalCalls / callsByPeriod.length : 0;
  const maxCalls = Math.max(...callsByPeriod.map(d => d.count), 0);
  const minCalls = Math.min(...callsByPeriod.map(d => d.count), 0);
  const maxDay = callsByPeriod.find(d => d.count === maxCalls);
  const minDay = callsByPeriod.find(d => d.count === minCalls);

  // Calculate trend (comparing first half vs second half)
  const midPoint = Math.floor(callsByPeriod.length / 2);
  const firstHalf = callsByPeriod.slice(0, midPoint);
  const secondHalf = callsByPeriod.slice(midPoint);
  const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, d) => sum + d.count, 0) / firstHalf.length : 0;
  const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, d) => sum + d.count, 0) / secondHalf.length : 0;
  const trendPercent = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
  const isPositiveTrend = trendPercent > 0;

  // Days with activity
  const daysWithCalls = callsByPeriod.filter(d => d.count > 0).length;
  const activityRate = callsByPeriod.length > 0 ? (daysWithCalls / callsByPeriod.length) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            {t('callsByPeriod.title', 'Calls by Period')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('callsByPeriod.subtitle', 'Analyze call volume trends and patterns')}
          </p>
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
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {range === 'all' ? t('common.all', 'All') : range === 'today' ? t('calls.today', 'Today') : range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t('callsByPeriod.totalCalls', 'Total Calls')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {totalCalls}
                </p>
              </div>
              <Phone className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t('callsByPeriod.avgPerDay', 'Avg. per Day')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {avgCallsPerDay.toFixed(1)}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t('callsByPeriod.trend', 'Trend')}
                </p>
                <p className={`text-2xl font-bold flex items-center gap-1 ${isPositiveTrend ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositiveTrend ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
                  {Math.abs(trendPercent).toFixed(0)}%
                </p>
              </div>
              {isPositiveTrend ? (
                <TrendingUp className="w-8 h-8 text-green-500 opacity-50" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-500 opacity-50" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t('callsByPeriod.activeDays', 'Active Days')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {activityRate.toFixed(0)}%
                </p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {t('callsByPeriod.dailyDistribution', 'Daily Distribution')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {callsByPeriod.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
              {t('common.noResults', 'No results')}
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={callsByPeriod.map(item => ({
                    ...item,
                    formattedDate: formatDate(item.period),
                  }))}
                  margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis
                    dataKey="formattedDate"
                    tick={{ fill: 'currentColor', fontSize: 10 }}
                    tickLine={{ stroke: 'currentColor' }}
                    className="text-gray-500 dark:text-gray-400"
                    interval={Math.floor(callsByPeriod.length / 10)}
                  />
                  <YAxis
                    tick={{ fill: 'currentColor', fontSize: 11 }}
                    tickLine={{ stroke: 'currentColor' }}
                    className="text-gray-500 dark:text-gray-400"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--tooltip-bg, #1f2937)',
                      border: '1px solid var(--tooltip-border, #374151)',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      fontSize: '12px',
                      color: '#f9fafb',
                    }}
                    formatter={(value: number) => [value, t('reports.calls', 'Calls')]}
                    labelFormatter={(label) => String(label)}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {callsByPeriod.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.count === maxCalls ? '#22c55e' : entry.count === minCalls ? '#ef4444' : '#3b82f6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Best and Worst Days */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <TrendingUp className="w-5 h-5" />
              {t('callsByPeriod.bestDay', 'Best Day')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {maxDay ? (
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-4xl font-bold text-green-600">{maxDay.count}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('reports.calls', 'calls')}</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {formatFullDate(maxDay.period)}
                  </p>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400">
                {t('common.noResults', 'No results')}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <TrendingDown className="w-5 h-5" />
              {t('callsByPeriod.worstDay', 'Worst Day')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {minDay ? (
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-4xl font-bold text-red-600">{minDay.count}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('reports.calls', 'calls')}</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {formatFullDate(minDay.period)}
                  </p>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${maxCalls > 0 ? (minDay.count / maxCalls) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400">
                {t('common.noResults', 'No results')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t('callsByPeriod.dailyBreakdown', 'Daily Breakdown')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-white dark:bg-gray-900">
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t('common.date', 'Date')}
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t('reports.calls', 'Calls')}
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                    {t('callsByPeriod.vsAvg', 'vs Avg')}
                  </th>
                  <th className="py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 w-32">
                    {/* Progress bar column */}
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...callsByPeriod].reverse().map((day, index) => {
                  const vsAvg = avgCallsPerDay > 0 ? ((day.count - avgCallsPerDay) / avgCallsPerDay) * 100 : 0;
                  const isAboveAvg = vsAvg > 0;
                  return (
                    <tr
                      key={index}
                      className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                        day.count === maxCalls ? 'bg-green-50 dark:bg-green-900/20' :
                        day.count === minCalls ? 'bg-red-50 dark:bg-red-900/20' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-sm text-gray-900 dark:text-gray-100">
                        {formatFullDate(day.period)}
                      </td>
                      <td className="py-2 px-3 text-sm font-medium text-right text-gray-900 dark:text-gray-100">
                        {day.count}
                      </td>
                      <td className={`py-2 px-3 text-sm text-right hidden sm:table-cell ${isAboveAvg ? 'text-green-600' : 'text-red-600'}`}>
                        {isAboveAvg ? '+' : ''}{vsAvg.toFixed(0)}%
                      </td>
                      <td className="py-2 px-3">
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              day.count === maxCalls ? 'bg-green-500' :
                              day.count === minCalls ? 'bg-red-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${maxCalls > 0 ? (day.count / maxCalls) * 100 : 0}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
