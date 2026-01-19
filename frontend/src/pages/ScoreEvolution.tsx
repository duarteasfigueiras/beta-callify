import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  TrendingUp,
  Search,
  Calendar,
  User
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi, usersApi, categoriesApi, Category } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { User as UserType } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface EvolutionByCategory {
  evolution: any[];
  categories: string[];
}

interface UserEvolution {
  date: string;
  average_score: number;
  total_calls: number;
}

export default function ScoreEvolution() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | '90d' | 'all'>('30d');

  // Category evolution
  const [evolutionByCategory, setEvolutionByCategory] = useState<EvolutionByCategory | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // General score evolution (fallback when no categories)
  const [generalEvolution, setGeneralEvolution] = useState<UserEvolution[]>([]);

  // Category filter
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // User search and selection
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<UserType[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(() => {
    const userId = searchParams.get('user');
    return userId ? parseInt(userId, 10) : null;
  });
  const [userEvolution, setUserEvolution] = useState<UserEvolution[]>([]);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  // Category colors mapping
  const getCategoryColor = (category: string): string => {
    // Try to find from loaded categories
    const matchedCategory = categories.find(c =>
      c.name.toLowerCase() === category.toLowerCase() ||
      c.key.toLowerCase() === category.toLowerCase()
    );

    if (matchedCategory) {
      // Extract hex color from color_id
      const colorMap: Record<string, string> = {
        'blue': '#3b82f6',
        'green': '#22c55e',
        'purple': '#a855f7',
        'orange': '#f97316',
        'pink': '#ec4899',
        'yellow': '#eab308',
        'red': '#ef4444',
        'indigo': '#6366f1',
        'teal': '#14b8a6',
        'cyan': '#06b6d4',
        'lime': '#84cc16',
        'amber': '#f59e0b',
        'violet': '#8b5cf6',
        'rose': '#f43f5e',
        'gray': '#6b7280',
      };
      return colorMap[matchedCategory.color_id] || '#6b7280';
    }

    // Fallback colors for common categories
    const fallbackColors: Record<string, string> = {
      'Comercial': '#3b82f6',
      'Suporte': '#22c55e',
      'Técnico': '#a855f7',
      'Supervisor': '#f97316',
      'Vendas': '#ec4899',
      'Atendimento': '#14b8a6',
      'Sem Categoria': '#6b7280',
      'No Category': '#6b7280',
    };

    if (fallbackColors[category]) {
      return fallbackColors[category];
    }

    // Generate a consistent color based on category name hash
    const colors = ['#3b82f6', '#22c55e', '#a855f7', '#f97316', '#ec4899', '#14b8a6', '#6366f1', '#f59e0b'];
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getDays = () => {
    switch (dateRange) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 365;
    }
  };

  // Fetch categories
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

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await usersApi.getAll();
        setUsers(data);
        setFilteredUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

  // Filter users by search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(u =>
        (u.display_name || u.username).toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  // Fetch category evolution data and general evolution
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const days = dateRange === 'today' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365;

        // Fetch both category evolution and general evolution in parallel
        const [categoryData, generalData] = await Promise.all([
          dashboardApi.getScoreEvolutionByCategory(days),
          dashboardApi.getScoreEvolution(days) // General evolution without agent_id
        ]);

        setEvolutionByCategory(categoryData);
        setGeneralEvolution(generalData);
      } catch (error) {
        console.error('Error fetching evolution data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [dateRange]);

  // Fetch user evolution when selected
  useEffect(() => {
    const fetchUserEvolution = async () => {
      if (!selectedUserId) {
        setUserEvolution([]);
        return;
      }

      setIsLoadingUser(true);
      try {
        const data = await dashboardApi.getScoreEvolution(getDays(), selectedUserId);
        setUserEvolution(data);
      } catch (error) {
        console.error('Error fetching user evolution:', error);
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchUserEvolution();
  }, [selectedUserId, dateRange]);

  // Update URL when user is selected
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedUserId) params.set('user', selectedUserId.toString());
    setSearchParams(params, { replace: true });
  }, [selectedUserId, setSearchParams]);

  const getScoreTextColor = (score: number) => {
    if (score >= 8) return 'text-green-600 dark:text-green-400';
    if (score >= 6) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

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
            <TrendingUp className="w-8 h-8 text-green-600" />
            {t('scoreEvolution.title', 'Score Evolution')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('scoreEvolution.subtitle', 'Track score trends by category and user')}
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
                    ? 'bg-green-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {range === 'all' ? t('common.all', 'All') : range === 'today' ? t('calls.today', 'Today') : range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Score Evolution Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {evolutionByCategory && evolutionByCategory.categories.length > 0
              ? t('scoreEvolution.byCategory', 'Evolution by Category')
              : t('dashboard.scoreEvolution', 'Score Evolution')
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Show category evolution if we have categories with data */}
          {evolutionByCategory &&
           evolutionByCategory.evolution.length > 0 &&
           evolutionByCategory.categories.length > 0 ? (
            <div className="space-y-4">
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => setSelectedCategories([])}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    selectedCategories.length === 0
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('common.all', 'Todas')}
                </button>
                {evolutionByCategory.categories.map((category) => {
                  const isSelected = selectedCategories.includes(category);
                  return (
                    <button
                      key={category}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedCategories(selectedCategories.filter(c => c !== category));
                        } else {
                          setSelectedCategories([...selectedCategories, category]);
                        }
                      }}
                      className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${
                        isSelected
                          ? 'text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                      style={isSelected ? { backgroundColor: getCategoryColor(category) } : {}}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: isSelected ? '#fff' : getCategoryColor(category) }}
                      />
                      {category}
                    </button>
                  );
                })}
              </div>

              {/* Chart */}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={evolutionByCategory.evolution.map(item => ({
                      ...item,
                      formattedDate: new Date(item.date).toLocaleDateString(user?.language_preference === 'pt' ? 'pt-PT' : 'en-US', {
                        day: '2-digit',
                        month: '2-digit',
                      }),
                    }))}
                    margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis
                      dataKey="formattedDate"
                      tick={{ fill: 'currentColor', fontSize: 11 }}
                      tickLine={{ stroke: 'currentColor' }}
                      className="text-gray-500 dark:text-gray-400"
                    />
                    <YAxis
                      domain={[0, 10]}
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
                      formatter={(value: any, name: string) => {
                        if (value === null || value === undefined) return ['-', name];
                        if (typeof value === 'number') return [value.toFixed(1), name];
                        return [String(value), name];
                      }}
                      labelFormatter={(label) => String(label)}
                    />
                    <Legend />
                    {(selectedCategories.length === 0 ? evolutionByCategory.categories : selectedCategories).map((category) => (
                      <Line
                        key={category}
                        type="monotone"
                        dataKey={category}
                        name={category}
                        stroke={getCategoryColor(category)}
                        strokeWidth={2}
                        dot={{ fill: getCategoryColor(category), strokeWidth: 2, r: 3 }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Category Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                {(selectedCategories.length === 0 ? evolutionByCategory.categories : selectedCategories).map((category) => {
                  const categoryScores = evolutionByCategory.evolution
                    .map(e => e[category])
                    .filter((s): s is number => s !== null);
                  const avgScore = categoryScores.length > 0
                    ? categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length
                    : 0;
                  const totalCalls = evolutionByCategory.evolution
                    .reduce((sum, e) => sum + (e[`${category}_calls`] || 0), 0);

                  return (
                    <div
                      key={category}
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getCategoryColor(category) }}
                        />
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                          {category}
                        </span>
                      </div>
                      <p className={`text-lg font-bold ${getScoreTextColor(avgScore)}`}>
                        {avgScore > 0 ? avgScore.toFixed(1) : '-'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {totalCalls} {t('reports.calls', 'calls')}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : generalEvolution.length > 0 || (evolutionByCategory && evolutionByCategory.evolution.length > 0) ? (
            // Fallback to general evolution if no categories
            (() => {
              // Use generalEvolution if available, otherwise compute from category data
              const evolutionData = generalEvolution.length > 0
                ? generalEvolution
                : (evolutionByCategory?.evolution || []).map(item => {
                    // Sum all category scores for this date to get average
                    const categories = evolutionByCategory?.categories || [];
                    const scores = categories
                      .map(cat => item[cat])
                      .filter((s): s is number => s !== null && s !== undefined);
                    const calls = categories
                      .reduce((sum, cat) => sum + (item[`${cat}_calls`] || 0), 0);
                    return {
                      date: item.date,
                      average_score: scores.length > 0
                        ? scores.reduce((a, b) => a + b, 0) / scores.length
                        : 0,
                      total_calls: calls
                    };
                  });

              if (evolutionData.length === 0) {
                return (
                  <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    {t('common.noResults', 'No results')}
                  </div>
                );
              }

              const avgScore = evolutionData.reduce((sum, e) => sum + e.average_score, 0) / evolutionData.length;
              const totalCalls = evolutionData.reduce((sum, e) => sum + e.total_calls, 0);

              return (
                <div className="space-y-4">
                  {/* General Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {t('scoreEvolution.avgScore', 'Avg. Score')}
                      </p>
                      <p className={`text-xl font-bold ${getScoreTextColor(avgScore)}`}>
                        {avgScore.toFixed(1)}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {t('scoreEvolution.totalCalls', 'Total Calls')}
                      </p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {totalCalls}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {t('scoreEvolution.activeDays', 'Active Days')}
                      </p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {evolutionData.length}
                      </p>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={evolutionData.map(item => ({
                          ...item,
                          average_score: Math.round(item.average_score * 10) / 10,
                          formattedDate: new Date(item.date).toLocaleDateString(user?.language_preference === 'pt' ? 'pt-PT' : 'en-US', {
                            day: '2-digit',
                            month: '2-digit',
                          }),
                        }))}
                        margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                        <XAxis
                          dataKey="formattedDate"
                          tick={{ fill: 'currentColor', fontSize: 11 }}
                          tickLine={{ stroke: 'currentColor' }}
                          className="text-gray-500 dark:text-gray-400"
                        />
                        <YAxis
                          domain={[0, 10]}
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
                          formatter={(value: any, name: string) => {
                            if (name === 'average_score') {
                              return [typeof value === 'number' ? value.toFixed(1) : value, t('dashboard.averageScore', 'Avg. Score')];
                            }
                            return [value, t('dashboard.totalCalls', 'Total Calls')];
                          }}
                          labelFormatter={(label) => String(label)}
                        />
                        <Line
                          type="monotone"
                          dataKey="average_score"
                          name={t('dashboard.averageScore', 'Average Score')}
                          stroke="#16a34a"
                          strokeWidth={2}
                          dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
              {t('common.noResults', 'No results')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Search and Evolution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {t('scoreEvolution.selectUser', 'Select User')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder={t('scoreEvolution.searchUser', 'Search by name...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* User List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {t('common.noResults', 'No results')}
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUserId(selectedUserId === u.id ? null : u.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      selectedUserId === u.id
                        ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500'
                        : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">
                        {(u.display_name || u.username).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                        {u.display_name || u.username}
                      </p>
                      {u.custom_role_name && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {u.custom_role_name}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Evolution Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {selectedUser
                ? t('scoreEvolution.userEvolution', '{{name}} Evolution', { name: selectedUser.display_name || selectedUser.username })
                : t('scoreEvolution.selectUserPrompt', 'Select a user to view evolution')
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedUserId ? (
              <div className="h-80 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                <User className="w-12 h-12 mb-3 opacity-50" />
                <p>{t('scoreEvolution.selectUserPrompt', 'Select a user to view their score evolution')}</p>
              </div>
            ) : isLoadingUser ? (
              <div className="h-80 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
              </div>
            ) : userEvolution.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
                {t('common.noResults', 'No results for this user')}
              </div>
            ) : (
              <div className="space-y-4">
                {/* User Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {t('scoreEvolution.avgScore', 'Avg. Score')}
                    </p>
                    <p className={`text-xl font-bold ${getScoreTextColor(
                      userEvolution.reduce((sum, e) => sum + e.average_score, 0) / userEvolution.length
                    )}`}>
                      {(userEvolution.reduce((sum, e) => sum + e.average_score, 0) / userEvolution.length).toFixed(1)}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {t('scoreEvolution.totalCalls', 'Total Calls')}
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {userEvolution.reduce((sum, e) => sum + e.total_calls, 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {t('scoreEvolution.activeDays', 'Active Days')}
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {userEvolution.length}
                    </p>
                  </div>
                </div>

                {/* Chart */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={userEvolution.map(item => ({
                        ...item,
                        average_score: Math.round(item.average_score * 10) / 10,
                        formattedDate: new Date(item.date).toLocaleDateString(user?.language_preference === 'pt' ? 'pt-PT' : 'en-US', {
                          day: '2-digit',
                          month: '2-digit',
                        }),
                      }))}
                      margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                      <XAxis
                        dataKey="formattedDate"
                        tick={{ fill: 'currentColor', fontSize: 11 }}
                        tickLine={{ stroke: 'currentColor' }}
                        className="text-gray-500 dark:text-gray-400"
                      />
                      <YAxis
                        domain={[0, 10]}
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
                        formatter={(value: number, name: string) => {
                          if (name === 'average_score') {
                            return [value.toFixed(1), t('reports.avgScore', 'Avg. Score')];
                          }
                          return [value, t('reports.totalCalls', 'Total Calls')];
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
