import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Phone,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { ScoreByAgent } from '../types';

export default function UserScores() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [scores, setScores] = useState<ScoreByAgent[]>([]);
  const [filteredScores, setFilteredScores] = useState<ScoreByAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [page, setPage] = useState(() => {
    const p = searchParams.get('page');
    const parsed = p ? parseInt(p, 10) : 1;
    return isNaN(parsed) || parsed < 1 ? 1 : parsed;
  });
  const itemsPerPage = 10;

  // Sorting
  const [sortBy, setSortBy] = useState<'username' | 'score' | 'calls'>(() =>
    (searchParams.get('sort_by') as 'username' | 'score' | 'calls') || 'score'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() =>
    (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc'
  );

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', page.toString());
    if (sortBy !== 'score') params.set('sort_by', sortBy);
    if (sortOrder !== 'desc') params.set('sort_order', sortOrder);
    setSearchParams(params, { replace: true });
  }, [page, sortBy, sortOrder, setSearchParams]);

  // Fetch scores
  useEffect(() => {
    const fetchScores = async () => {
      setIsLoading(true);
      try {
        const data = await dashboardApi.getScoreByAgent();
        setScores(data);
        setFilteredScores(data);
      } catch (error) {
        console.error('Error fetching scores:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchScores();
  }, []);

  // Filter and sort scores
  useEffect(() => {
    let result = [...scores];

    // Filter by search term (search by name)
    if (searchTerm) {
      result = result.filter(s =>
        (s.agent_name || s.agent_username).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'username':
          comparison = (a.agent_name || a.agent_username).localeCompare(b.agent_name || b.agent_username);
          break;
        case 'score':
          comparison = a.average_score - b.average_score;
          break;
        case 'calls':
          comparison = a.total_calls - b.total_calls;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredScores(result);
    // Reset to page 1 when filters change
    if (searchTerm) {
      setPage(1);
    }
  }, [scores, searchTerm, sortBy, sortOrder]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredScores.length / itemsPerPage);
  const paginatedScores = filteredScores.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Calculate stats
  const avgScore = scores.length > 0
    ? (scores.reduce((sum, s) => sum + s.average_score, 0) / scores.length).toFixed(1)
    : '0.0';
  const totalCalls = scores.reduce((sum, s) => sum + s.total_calls, 0);
  const bestScore = scores.length > 0
    ? Math.max(...scores.map(s => s.average_score)).toFixed(1)
    : '0.0';
  const worstScore = scores.length > 0
    ? Math.min(...scores.map(s => s.average_score)).toFixed(1)
    : '0.0';

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-yellow-500';
    if (score >= 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 8) return 'text-green-600 dark:text-green-400';
    if (score >= 6) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 4) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const handleSort = (column: 'username' | 'score' | 'calls') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ column }: { column: 'username' | 'score' | 'calls' }) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === 'asc'
      ? <ArrowUp className="w-4 h-4 text-green-600" />
      : <ArrowDown className="w-4 h-4 text-green-600" />;
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Users className="w-8 h-8 text-green-600" />
            {t('userScores.title', 'User Scores')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('userScores.subtitle', 'View and compare performance scores for all users')}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('userScores.totalUsers', 'Total Users')}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{scores.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('userScores.avgScore', 'Avg. Score')}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{avgScore}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('userScores.bestScore', 'Best Score')}</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{bestScore}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('userScores.worstScore', 'Worst Score')}</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">{worstScore}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder={t('userScores.searchPlaceholder', 'Search by name...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('username')}
                      className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      {t('userScores.user', 'User')}
                      <SortIcon column="username" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('score')}
                      className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      {t('userScores.score', 'Score')}
                      <SortIcon column="score" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('calls')}
                      className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      {t('userScores.calls', 'Calls')}
                      <SortIcon column="calls" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('userScores.performance', 'Performance')}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedScores.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      {t('common.noResults', 'No results found')}
                    </td>
                  </tr>
                ) : (
                  paginatedScores.map((agent, index) => (
                    <tr
                      key={agent.agent_id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                      onClick={() => navigate(`/calls?agent=${agent.agent_id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">
                              {(agent.agent_name || agent.agent_username).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {agent.agent_name || agent.agent_username}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-lg font-bold ${getScoreTextColor(agent.average_score)}`}>
                          {agent.average_score.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {agent.total_calls}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-full max-w-xs">
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getScoreColor(agent.average_score)} transition-all duration-500`}
                              style={{ width: `${(agent.average_score / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('common.showing', 'Showing')} {((page - 1) * itemsPerPage) + 1} - {Math.min(page * itemsPerPage, filteredScores.length)} {t('common.of', 'of')} {filteredScores.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
