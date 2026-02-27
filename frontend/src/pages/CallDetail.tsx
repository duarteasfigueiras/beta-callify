import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { isDeveloper, isAdminOrDeveloper } from '../types';
import toast from 'react-hot-toast';

interface TimestampedItem {
  text: string;
  timestamp: string;
}

interface CriterionResult {
  id: number;
  criterion_name: string;
  passed: boolean;
  justification: string;
  timestamp_reference?: string;
}

interface Feedback {
  id: number;
  content: string;
  author_username: string;
  created_at: string;
}

interface SkillScore {
  name: string;
  score: number;
  description?: string;
}

interface ResponseExample {
  before: string;
  after: string;
  context?: string;
}

interface TopPerformerComparison {
  agent_score: number;
  top_performer_score: number;
  gap: number;
  insights: string[];
}

interface HistoryComparison {
  chamadas_anteriores: number;
  media_anterior: number;
  tendencia: 'melhorou' | 'piorou' | 'estavel';
  areas_melhoradas: string[];
  areas_a_focar: string[];
}

interface CallData {
  id: number;
  phone_number: string;
  agent_name: string;
  direction: string;
  duration_seconds: number;
  call_date: string;
  final_score: number;
  score_justification: string;
  summary: string;
  transcription: string;
  transcription_timestamps: string;
  next_step_recommendation: string;
  what_went_well: string;
  what_went_wrong: string;
  risk_words_detected: string;
  audio_file_path: string;
  criteria_results: CriterionResult[];
  feedback: Feedback[];
  // New AI coaching fields
  phrases_to_avoid: string;
  recommended_phrases: string;
  response_improvement_example: string;
  top_performer_comparison: string;
  skill_scores: string;
  // Contact reasons, objections and history comparison
  contact_reasons: string;
  objections: string;
  history_comparison: string;
  // AI-detected category (when agent has multiple categories)
  detected_category?: string;
}

export default function CallDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [call, setCall] = useState<CallData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'evaluation' | 'feedback'>('summary');
  const audioRef = useRef<HTMLAudioElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCall();
  }, [id]);

  const fetchCall = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/calls/${id}`);
      setCall(response.data);
    } catch (error: any) {
      console.error('Error fetching call:', error);
      if (error.response?.status === 404) {
        setError(t('calls.notFound', 'Call not found'));
      } else {
        setError(error.response?.data?.error || error.message || t('common.error', 'An error occurred'));
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-red-600 bg-red-100 dark:bg-red-900/30';
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim()) return;

    try {
      setSubmittingFeedback(true);
      await api.post(`/calls/${id}/feedback`, { content: feedbackText });
      toast.success(t('calls.feedbackAdded', 'Feedback added successfully'));
      setFeedbackText('');
      fetchCall(); // Refresh to get updated feedback
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error(t('common.error', 'Failed to submit feedback'));
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const deleteCall = async () => {
    try {
      setDeleting(true);
      await api.delete(`/calls/${id}`);
      toast.success(t('calls.deleted', 'Call deleted successfully'));
      navigate('/calls');
    } catch (error) {
      console.error('Error deleting call:', error);
      toast.error(t('common.error', 'Failed to delete call'));
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const parseJSON = (str: string | null | undefined): any => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  };

  // Convert timestamp string (MM:SS) to seconds
  const parseTimestamp = (timestamp: string): number => {
    const parts = timestamp.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    if (parts.length === 3) {
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
    return 0;
  };

  // Navigate to transcription page at specific timestamp
  const goToTranscription = (timestamp: string) => {
    navigate(`/calls/${id}/transcription?t=${encodeURIComponent(timestamp)}`);
  };

  // Helper to check if items have timestamps
  const isTimestampedArray = (arr: any[]): arr is TimestampedItem[] => {
    return arr.length > 0 && typeof arr[0] === 'object' && 'text' in arr[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 max-w-md w-full text-center">
          <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {error || t('calls.notFound', 'Call not found')}
          </p>
          <button
            onClick={() => navigate('/calls')}
            className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            {t('calls.backToList', 'Back to Calls')}
          </button>
        </div>
      </div>
    );
  }

  const whatWentWell = parseJSON(call.what_went_well);
  const whatWentWrong = parseJSON(call.what_went_wrong);
  const riskWords = parseJSON(call.risk_words_detected);
  const phrasesToAvoid = parseJSON(call.phrases_to_avoid);
  const recommendedPhrases = parseJSON(call.recommended_phrases);
  const responseExample = parseJSON(call.response_improvement_example) as ResponseExample | null;
  const topPerformerComparison = parseJSON(call.top_performer_comparison) as TopPerformerComparison | null;
  const skillScores = parseJSON(call.skill_scores) as SkillScore[] | null;
  // New fields
  const contactReasons = parseJSON(call.contact_reasons);
  const objections = parseJSON(call.objections);
  const historyComparison = parseJSON(call.history_comparison) as HistoryComparison | null;

  // Helper to get skill color based on score
  const getSkillColor = (score: number) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Helper to get skill text color
  const getSkillTextColor = (score: number) => {
    if (score >= 8) return 'text-green-600 dark:text-green-400';
    if (score >= 6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('calls.deleteConfirmTitle', 'Delete Call')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('calls.deleteConfirmMessage', 'Are you sure you want to delete this call? This action cannot be undone.')}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={deleteCall}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors"
              >
                {deleting ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('calls.detail', 'Call Detail')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {call.phone_number}
            </p>
          </div>
        </div>
        {user?.role && isDeveloper(user.role) && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t('calls.delete', 'Delete')}
          </button>
        )}
      </div>

      {/* Call metadata cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {t('calls.date', 'Date')}
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
            {formatDate(call.call_date)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {t('calls.duration', 'Duration')}
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
            {call.duration_seconds ? formatDuration(call.duration_seconds) : '-'}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {t('calls.user', 'User')}
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
            {call.agent_name}
          </p>
          {call.detected_category && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                {call.detected_category}
              </span>
            </p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {t('calls.score', 'Score')}
          </p>
          <p className={`text-2xl font-bold mt-1 ${call.final_score >= 8 ? 'text-green-600' : call.final_score >= 6 ? 'text-yellow-600' : 'text-red-600'}`}>
            {call.final_score?.toFixed(1) || '-'}
          </p>
        </div>
      </div>

      {/* Audio Player */}
      {call.audio_file_path && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            {t('calls.audioPlayer', 'Audio Recording')}
          </h3>
          <audio ref={audioRef} controls className="w-full">
            <source src={`/api/calls/${id}/audio`} type="audio/mpeg" />
            {t('calls.audioNotSupported', 'Your browser does not support the audio element.')}
          </audio>
        </div>
      )}

      {/* Main Score Badge */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('calls.overallScore', 'Overall Score')}
          </h3>
          <div className={`text-4xl font-bold px-6 py-3 rounded-xl ${getScoreColor(call.final_score || 0)}`}>
            {call.final_score?.toFixed(1) || '-'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          {(['summary', 'evaluation', 'feedback'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab === 'summary' && t('calls.summary', 'Summary')}
              {tab === 'evaluation' && t('calls.evaluation', 'Evaluation')}
              {tab === 'feedback' && t('calls.feedback', 'Feedback')}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {activeTab === 'summary' && (
          <div className="p-6 space-y-6">
            {/* Summary */}
            {call.summary && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {t('calls.summary', 'Summary')}
                </h4>
                <p className="text-gray-900 dark:text-white">{call.summary}</p>
              </div>
            )}

            {/* Next Step */}
            {call.next_step_recommendation && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {t('calls.nextStep', 'Recommended Next Step')}
                </h4>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-green-800 dark:text-green-200">{call.next_step_recommendation}</p>
                </div>
              </div>
            )}

            {/* What Went Well */}
            {whatWentWell && (
              <div>
                <h4 className="text-sm font-medium text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">
                  {t('calls.whatWentWell', 'What Went Well')}
                </h4>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  {Array.isArray(whatWentWell) ? (
                    <ul className="space-y-3">
                      {isTimestampedArray(whatWentWell) ? (
                        whatWentWell.map((item: TimestampedItem, i: number) => (
                          <li key={i} className="flex items-start gap-3 text-green-800 dark:text-green-200">
                            <span className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            <span className="flex-1">{item.text}</span>
                            <button
                              onClick={() => goToTranscription(item.timestamp)}
                              className="text-xs bg-green-200 dark:bg-green-800 hover:bg-green-300 dark:hover:bg-green-700 px-2 py-1 rounded cursor-pointer transition-colors flex-shrink-0 ml-2"
                              title={t('calls.goToTranscription', 'Click to seek to this moment')}
                            >
                              {item.timestamp}
                            </button>
                          </li>
                        ))
                      ) : (
                        whatWentWell.map((item: string, i: number) => (
                          <li key={i} className="flex items-start gap-3 text-green-800 dark:text-green-200">
                            <span className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            <span>{item}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  ) : (
                    <p className="text-green-800 dark:text-green-200">{whatWentWell}</p>
                  )}
                </div>
              </div>
            )}

            {/* What Went Wrong */}
            {whatWentWrong && (
              <div>
                <h4 className="text-sm font-medium text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">
                  {t('calls.whatWentWrong', 'Areas for Improvement')}
                </h4>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  {Array.isArray(whatWentWrong) ? (
                    <ul className="space-y-3">
                      {isTimestampedArray(whatWentWrong) ? (
                        whatWentWrong.map((item: TimestampedItem, i: number) => (
                          <li key={i} className="flex items-start gap-3 text-red-800 dark:text-red-200">
                            <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            <span className="flex-1">{item.text}</span>
                            <button
                              onClick={() => goToTranscription(item.timestamp)}
                              className="text-xs bg-red-200 dark:bg-red-800 hover:bg-red-300 dark:hover:bg-red-700 px-2 py-1 rounded cursor-pointer transition-colors flex-shrink-0 ml-2"
                              title={t('calls.goToTranscription', 'Click to seek to this moment')}
                            >
                              {item.timestamp}
                            </button>
                          </li>
                        ))
                      ) : (
                        whatWentWrong.map((item: string, i: number) => (
                          <li key={i} className="flex items-start gap-3 text-red-800 dark:text-red-200">
                            <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            <span>{item}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  ) : (
                    <p className="text-red-800 dark:text-red-200">{whatWentWrong}</p>
                  )}
                </div>
              </div>
            )}

            {/* Risk Words */}
            {riskWords && Array.isArray(riskWords) && riskWords.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
                  {t('calls.riskWords', 'Risk Words Detected')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {riskWords.map((word: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-full text-sm">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Phrases to Avoid */}
            {phrasesToAvoid && Array.isArray(phrasesToAvoid) && phrasesToAvoid.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">
                  {t('calls.phrasesToAvoid', 'Frases a Evitar')}
                </h4>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <ul className="space-y-2">
                    {phrasesToAvoid.map((phrase: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-red-800 dark:text-red-200">
                        <span className="mt-1.5 w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></span>
                        <span className="italic">"{phrase}"</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Recommended Phrases */}
            {recommendedPhrases && Array.isArray(recommendedPhrases) && recommendedPhrases.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
                  {t('calls.recommendedPhrases', 'Frases Recomendadas')}
                </h4>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <ul className="space-y-2">
                    {recommendedPhrases.map((phrase: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-blue-800 dark:text-blue-200">
                        <span className="mt-1.5 w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                        <span className="italic">"{phrase}"</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Response Improvement Example */}
            {responseExample && responseExample.before && responseExample.after && (
              <div>
                <h4 className="text-sm font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">
                  {t('calls.responseImprovement', 'Exemplo de Resposta a Melhorar')}
                </h4>
                <div className="space-y-3">
                  {responseExample.context && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                      {responseExample.context}
                    </p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">
                        {t('calls.before', 'Antes')}
                      </p>
                      <p className="text-red-800 dark:text-red-200 italic">"{responseExample.before}"</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">
                        {t('calls.after', 'Depois')}
                      </p>
                      <p className="text-green-800 dark:text-green-200 italic">"{responseExample.after}"</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Skill Scores */}
            {skillScores && Array.isArray(skillScores) && skillScores.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">
                  {t('calls.skillEvolution', 'Evolução por Skill')}
                </h4>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                  <div className="space-y-4">
                    {skillScores.map((skill: SkillScore, i: number) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {skill.name}
                          </span>
                          <span className={`text-sm font-bold ${getSkillTextColor(skill.score)}`}>
                            {skill.score.toFixed(1)}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getSkillColor(skill.score)} transition-all duration-500`}
                            style={{ width: `${(skill.score / 10) * 100}%` }}
                          />
                        </div>
                        {skill.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {skill.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Top Performer Comparison */}
            {topPerformerComparison && (
              <div>
                <h4 className="text-sm font-medium text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-2">
                  {t('calls.topPerformerComparison', 'Comparação com Top Performer')}
                </h4>
                <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-8 mb-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        {t('calls.yourScore', 'A Tua Pontuação')}
                      </p>
                      <p className={`text-3xl font-bold ${getSkillTextColor(topPerformerComparison.agent_score)}`}>
                        {topPerformerComparison.agent_score.toFixed(1)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        {t('calls.gap', 'Diferença')}
                      </p>
                      <p className={`text-2xl font-bold ${topPerformerComparison.gap >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {topPerformerComparison.gap >= 0 ? '+' : ''}{topPerformerComparison.gap.toFixed(1)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        {t('calls.topPerformer', 'Top Performer')}
                      </p>
                      <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                        {topPerformerComparison.top_performer_score.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  {topPerformerComparison.insights && topPerformerComparison.insights.length > 0 && (
                    <div className="border-t border-cyan-200 dark:border-cyan-800 pt-3 mt-3">
                      <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-2">
                        {t('calls.insights', 'Insights')}
                      </p>
                      <ul className="space-y-1">
                        {topPerformerComparison.insights.map((insight: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-cyan-800 dark:text-cyan-200">
                            <span className="mt-1 w-1.5 h-1.5 bg-cyan-500 rounded-full flex-shrink-0"></span>
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact Reasons (Motivos de Contacto) */}
            {contactReasons && Array.isArray(contactReasons) && contactReasons.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-2">
                  {t('calls.contactReasons', 'Motivos de Contacto')}
                </h4>
                <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
                  <ul className="space-y-2">
                    {contactReasons.map((reason: string | { text: string; timestamp?: string }, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-teal-800 dark:text-teal-200">
                        <span className="mt-1.5 w-2 h-2 bg-teal-500 rounded-full flex-shrink-0"></span>
                        <span>{typeof reason === 'string' ? reason : reason.text}</span>
                        {typeof reason !== 'string' && reason.timestamp && (
                          <button
                            onClick={() => goToTranscription(reason.timestamp!)}
                            className="text-xs bg-teal-200 dark:bg-teal-800 hover:bg-teal-300 dark:hover:bg-teal-700 px-2 py-1 rounded cursor-pointer transition-colors ml-auto"
                          >
                            {reason.timestamp}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Objections (Objeções) */}
            {objections && Array.isArray(objections) && objections.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2">
                  {t('calls.objections', 'Objeções do Cliente')}
                </h4>
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <ul className="space-y-2">
                    {objections.map((objection: string | { text: string; timestamp?: string }, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-orange-800 dark:text-orange-200">
                        <span className="mt-1.5 w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></span>
                        <span>{typeof objection === 'string' ? objection : objection.text}</span>
                        {typeof objection !== 'string' && objection.timestamp && (
                          <button
                            onClick={() => goToTranscription(objection.timestamp!)}
                            className="text-xs bg-orange-200 dark:bg-orange-800 hover:bg-orange-300 dark:hover:bg-orange-700 px-2 py-1 rounded cursor-pointer transition-colors ml-auto"
                          >
                            {objection.timestamp}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* History Comparison (Comparação com Histórico) */}
            {historyComparison && (
              <div>
                <h4 className="text-sm font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2">
                  {t('calls.historyComparison', 'Comparação com Histórico')}
                </h4>
                <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        {t('calls.previousCalls', 'Chamadas Anteriores')}
                      </p>
                      <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                        {historyComparison.chamadas_anteriores}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        {t('calls.previousAverage', 'Média Anterior')}
                      </p>
                      <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                        {historyComparison.media_anterior?.toFixed(1) || '-'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        {t('calls.trend', 'Tendência')}
                      </p>
                      <p className={`text-lg font-bold ${
                        historyComparison.tendencia === 'melhorou'
                          ? 'text-green-600 dark:text-green-400'
                          : historyComparison.tendencia === 'piorou'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {historyComparison.tendencia === 'melhorou' && '↑ Melhorou'}
                        {historyComparison.tendencia === 'piorou' && '↓ Piorou'}
                        {historyComparison.tendencia === 'estavel' && '→ Estável'}
                      </p>
                    </div>
                  </div>

                  {historyComparison.areas_melhoradas && historyComparison.areas_melhoradas.length > 0 && (
                    <div className="border-t border-violet-200 dark:border-violet-800 pt-3 mt-3">
                      <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">
                        {t('calls.improvedAreas', 'Áreas Melhoradas')}
                      </p>
                      <ul className="space-y-1">
                        {historyComparison.areas_melhoradas.map((area: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-green-800 dark:text-green-200">
                            <span className="mt-1 w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></span>
                            {area}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {historyComparison.areas_a_focar && historyComparison.areas_a_focar.length > 0 && (
                    <div className="border-t border-violet-200 dark:border-violet-800 pt-3 mt-3">
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
                        {t('calls.areasToFocus', 'Áreas a Focar')}
                      </p>
                      <ul className="space-y-1">
                        {historyComparison.areas_a_focar.map((area: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
                            <span className="mt-1 w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0"></span>
                            {area}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* No data message */}
            {!call.summary && !call.next_step_recommendation && !whatWentWell && !whatWentWrong && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                {t('calls.noSummary', 'No AI analysis available for this call')}
              </p>
            )}
          </div>
        )}

        {activeTab === 'evaluation' && (
          <div className="p-6">
            {call.criteria_results && call.criteria_results.length > 0 ? (
              <div className="space-y-4">
                {call.criteria_results.map((criterion) => (
                  <div
                    key={criterion.id}
                    className={`p-4 rounded-lg border ${
                      criterion.passed
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {criterion.criterion_name}
                      </h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        criterion.passed
                          ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200'
                          : 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
                      }`}>
                        {criterion.passed ? t('common.passed', 'Passed') : t('common.failed', 'Failed')}
                      </span>
                    </div>
                    {criterion.justification && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {criterion.justification}
                      </p>
                    )}
                    {criterion.timestamp_reference && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        {t('calls.timestamp', 'Timestamp')}: {criterion.timestamp_reference}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                {t('calls.noEvaluation', 'No evaluation criteria results available')}
              </p>
            )}
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="p-6 space-y-6">
            {/* Existing Feedback */}
            {call.feedback && call.feedback.length > 0 ? (
              <div className="space-y-4">
                {call.feedback.map((fb) => (
                  <div key={fb.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {fb.author_username}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(fb.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{fb.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                {t('calls.noFeedback', 'No feedback yet')}
              </p>
            )}

            {/* Add Feedback Form (Admin and Developer) */}
            {user?.role && isAdminOrDeveloper(user.role) && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  {t('calls.addFeedback', 'Add Feedback')}
                </h4>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder={t('calls.feedbackPlaceholder', 'Write your feedback here...')}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={4}
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={submitFeedback}
                    disabled={!feedbackText.trim() || submittingFeedback}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                  >
                    {submittingFeedback ? t('common.submitting', 'Submitting...') : t('common.submit', 'Submit')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
