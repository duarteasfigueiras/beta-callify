import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Phone, Search, Filter, ChevronLeft, ChevronRight, Calendar, X, User, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { callsApi, usersApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Call, PaginatedResponse, User as UserType } from '../types';

export default function Calls() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin_manager';

  const [calls, setCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [agents, setAgents] = useState<UserType[]>([]);

  // Initialize state from URL params
  const [page, setPage] = useState(() => {
    const p = searchParams.get('page');
    return p ? parseInt(p, 10) : 1;
  });
  const [dateFrom, setDateFrom] = useState(() => searchParams.get('date_from') || '');
  const [dateTo, setDateTo] = useState(() => searchParams.get('date_to') || '');
  const [selectedAgentId, setSelectedAgentId] = useState(() => searchParams.get('agent') || '');
  const [scoreMin, setScoreMin] = useState(() => searchParams.get('score_min') || '');
  const [scoreMax, setScoreMax] = useState(() => searchParams.get('score_max') || '');
  const [sortBy, setSortBy] = useState(() => searchParams.get('sort_by') || 'call_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() =>
    (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc'
  );

  // Update URL when filters change
  const updateURLParams = useCallback(() => {
    const params = new URLSearchParams();

    if (page > 1) params.set('page', page.toString());
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (selectedAgentId) params.set('agent', selectedAgentId);
    if (scoreMin) params.set('score_min', scoreMin);
    if (scoreMax) params.set('score_max', scoreMax);
    if (sortBy !== 'call_date') params.set('sort_by', sortBy);
    if (sortOrder !== 'desc') params.set('sort_order', sortOrder);

    setSearchParams(params, { replace: true });
  }, [page, dateFrom, dateTo, selectedAgentId, scoreMin, scoreMax, sortBy, sortOrder, setSearchParams]);

  // Sync URL params when filters change
  useEffect(() => {
    updateURLParams();
  }, [updateURLParams]);

  // Show filters panel if there are active filters in URL
  useEffect(() => {
    if (dateFrom || dateTo || selectedAgentId || scoreMin || scoreMax) {
      setShowFilters(true);
    }
  }, []);

  // Fetch agents list for admin filter
  useEffect(() => {
    const fetchAgents = async () => {
      if (!isAdmin) return;
      try {
        const allUsers = await usersApi.getAll();
        // Filter to only show agents
        const agentUsers = allUsers.filter((u: UserType) => u.role === 'agent');
        setAgents(agentUsers);
      } catch (error) {
        console.error('Error fetching agents:', error);
      }
    };

    fetchAgents();
  }, [isAdmin]);

  useEffect(() => {
    const fetchCalls = async () => {
      setIsLoading(true);
      try {
        const params: {
          page: number;
          limit: number;
          date_from?: string;
          date_to?: string;
          agent_id?: number;
          score_min?: number;
          score_max?: number;
          sort_by?: string;
          sort_order?: string;
        } = {
          page,
          limit: 10,
          sort_by: sortBy,
          sort_order: sortOrder,
        };

        if (dateFrom) {
          params.date_from = dateFrom;
        }
        if (dateTo) {
          params.date_to = dateTo;
        }
        if (selectedAgentId) {
          params.agent_id = Number(selectedAgentId);
        }
        if (scoreMin) {
          params.score_min = Number(scoreMin);
        }
        if (scoreMax) {
          params.score_max = Number(scoreMax);
        }

        const response: PaginatedResponse<Call> = await callsApi.getAll(params);

        setCalls(response.data);
        setTotalPages(response.totalPages);
        setTotal(response.total);
      } catch (error) {
        console.error('Error fetching calls:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalls();
  }, [page, dateFrom, dateTo, selectedAgentId, scoreMin, scoreMax, sortBy, sortOrder]);

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

  const getScoreBgColor = (score: number | null) => {
    if (score === null) return 'bg-gray-100 dark:bg-gray-800';
    if (score >= 8) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 6) return 'bg-amber-100 dark:bg-amber-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedAgentId('');
    setScoreMin('');
    setScoreMax('');
    setPage(1);
    // URL will be updated automatically via the useEffect
  };

  const hasActiveFilters = dateFrom || dateTo || selectedAgentId || scoreMin || scoreMax;

  // Quick date filter helpers
  const setTodayFilter = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setDateFrom(todayStr);
    setDateTo(todayStr);
    setPage(1);
  };

  const setThisWeekFilter = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    // Get Monday of this week (Sunday = 0, Monday = 1, etc.)
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const mondayStr = monday.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    setDateFrom(mondayStr);
    setDateTo(todayStr);
    setPage(1);
  };

  // Check if current filter matches "Today" or "This Week"
  const isToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return dateFrom === today && dateTo === today;
  };

  const isThisWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const mondayStr = monday.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    return dateFrom === mondayStr && dateTo === todayStr;
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    return sortOrder === 'asc'
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const filteredCalls = calls.filter(call =>
    call.phone_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (call.agent_username && call.agent_username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
            {isAdmin ? t('calls.title') : t('calls.myTitle')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {total} {t('dashboard.totalCalls').toLowerCase()}
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder={t('calls.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button
            variant={showFilters || hasActiveFilters ? "default" : "outline"}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={hasActiveFilters ? "bg-green-600 hover:bg-green-700" : ""}
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            {/* Quick Date Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant={isToday() ? "default" : "outline"}
                size="sm"
                onClick={setTodayFilter}
                className={isToday() ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {t('calls.today')}
              </Button>
              <Button
                variant={isThisWeek() ? "default" : "outline"}
                size="sm"
                onClick={setThisWeekFilter}
                className={isThisWeek() ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {t('calls.thisWeek')}
              </Button>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('calls.dateFrom')}
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="w-full"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('calls.dateTo')}
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="w-full"
                />
              </div>
              {isAdmin && agents.length > 0 && (
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('calls.agent')}
                  </label>
                  <select
                    value={selectedAgentId}
                    onChange={(e) => {
                      setSelectedAgentId(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">{t('calls.allAgents')}</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.username}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('calls.scoreMin')}
                </label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  placeholder="0"
                  value={scoreMin}
                  onChange={(e) => {
                    setScoreMin(e.target.value);
                    setPage(1);
                  }}
                  className="w-full"
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('calls.scoreMax')}
                </label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  placeholder="10"
                  value={scoreMax}
                  onChange={(e) => {
                    setScoreMax(e.target.value);
                    setPage(1);
                  }}
                  className="w-full"
                />
              </div>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  {t('calls.clearFilters')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calls Table */}
      <Card>
        <CardContent className="p-0">
          {filteredCalls.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('calls.noCallsFound')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleSort('call_date')}
                    >
                      <div className="flex items-center">
                        {t('common.date')}
                        {getSortIcon('call_date')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('common.phone')}
                    </th>
                    {isAdmin && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('calls.agent')}
                      </th>
                    )}
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleSort('duration_seconds')}
                    >
                      <div className="flex items-center">
                        {t('common.duration')}
                        {getSortIcon('duration_seconds')}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleSort('final_score')}
                    >
                      <div className="flex items-center">
                        {t('calls.score')}
                        {getSortIcon('final_score')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('calls.viewDetails')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredCalls.map((call) => (
                    <tr
                      key={call.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                      onClick={() => navigate(`/calls/${call.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(call.call_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {call.phone_number}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {call.agent_username || '-'}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatDuration(call.duration_seconds)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getScoreBgColor(call.final_score)} ${getScoreColor(call.final_score)}`}>
                          {call.final_score !== null ? call.final_score.toFixed(1) : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Button variant="ghost" size="sm">
                          {t('calls.viewDetails')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('common.from')} {(page - 1) * 10 + 1} {t('common.to')} {Math.min(page * 10, total)} de {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
