import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Phone,
  Calendar,
  ArrowLeft,
  Clock,
  User,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { callsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Call } from '../types';

export default function RiskWordsCalls() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const riskWord = searchParams.get('word') || '';

  const [isLoading, setIsLoading] = useState(true);
  const [calls, setCalls] = useState<Call[]>([]);
  const [totalCalls, setTotalCalls] = useState(0);

  useEffect(() => {
    const fetchCalls = async () => {
      if (!riskWord) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await callsApi.getByRiskWord(riskWord);
        setCalls(response.data || []);
        setTotalCalls(response.total || 0);
      } catch (error) {
        console.error('Error fetching calls with risk word:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCalls();
  }, [riskWord]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(user?.language_preference === 'pt' ? 'pt-PT' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-500';
    if (score >= 8) return 'text-green-600 dark:text-green-400';
    if (score >= 6) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBgColor = (score: number | null) => {
    if (score === null) return 'bg-gray-100 dark:bg-gray-700';
    if (score >= 8) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 6) return 'bg-amber-100 dark:bg-amber-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back', 'Back')}
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            {t('riskWordsCalls.title', 'Calls with Risk Word')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
            {t('riskWordsCalls.subtitle', 'Calls containing the word:')}
            <span className="font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded capitalize">
              "{riskWord}"
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-red-100 dark:bg-red-900/30 px-4 py-2 rounded-lg">
            <span className="text-red-600 dark:text-red-400 font-bold text-lg">
              {totalCalls}
            </span>
            <span className="text-red-600 dark:text-red-400 text-sm ml-2">
              {t('riskWordsCalls.callsFound', 'calls found')}
            </span>
          </div>
        </div>
      </div>

      {/* Calls List */}
      {calls.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">
                {t('riskWordsCalls.noCalls', 'No calls found with this risk word')}
              </p>
              <p className="text-sm mt-2">
                {t('riskWordsCalls.noCallsHint', 'Try selecting a different risk word from the reports')}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {calls.map((call) => (
            <Card
              key={call.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/calls/${call.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${getScoreBgColor(call.final_score)}`}>
                      <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {call.phone_number}
                        </span>
                        {call.agent_name && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {call.agent_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(call.call_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDuration(call.duration_seconds)}
                        </span>
                      </div>
                      {call.summary && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                          {call.summary}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getScoreColor(call.final_score)}`}>
                      {call.final_score !== null ? call.final_score.toFixed(1) : '-'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {t('common.score', 'Score')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
