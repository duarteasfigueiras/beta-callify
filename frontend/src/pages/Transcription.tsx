import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import toast from 'react-hot-toast';

interface TranscriptionSegment {
  timestamp: string;
  speaker: string;
  text: string;
}

interface CallData {
  id: number;
  phone_number: string;
  agent_name: string;
  transcription: string;
  transcription_timestamps: string;
  call_date: string;
}

export default function Transcription() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [call, setCall] = useState<CallData | null>(null);
  const [loading, setLoading] = useState(true);
  const highlightedRef = useRef<HTMLDivElement>(null);
  const targetTimestamp = searchParams.get('t');

  useEffect(() => {
    fetchCall();
  }, [id]);

  useEffect(() => {
    // Scroll to highlighted timestamp when loaded
    if (!loading && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [loading, targetTimestamp]);

  const fetchCall = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/calls/${id}`);
      setCall(response.data);
    } catch (error: any) {
      console.error('Error fetching call:', error);
      if (error.response?.status === 404) {
        toast.error(t('calls.notFound', 'Call not found'));
        navigate('/calls');
      } else {
        toast.error(t('common.error', 'An error occurred'));
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Parse transcription into segments with timestamps
  const parseTranscription = (transcription: string, timestamps: string | null): TranscriptionSegment[] => {
    if (!transcription) return [];

    // Try to parse timestamps if available
    let parsedTimestamps: any[] = [];
    if (timestamps) {
      try {
        parsedTimestamps = JSON.parse(timestamps);
      } catch {
        // If timestamps not valid JSON, continue without them
      }
    }

    // If we have structured timestamps, use them
    if (parsedTimestamps.length > 0 && typeof parsedTimestamps[0] === 'object') {
      return parsedTimestamps.map((item: any) => ({
        timestamp: item.timestamp || item.time || '00:00',
        speaker: item.speaker || 'Unknown',
        text: item.text || item.content || ''
      }));
    }

    // Otherwise, try to parse the transcription text
    // Look for patterns like "[00:00] Speaker: text" or "00:00 - Speaker: text"
    const lines = transcription.split('\n').filter(line => line.trim());
    const segments: TranscriptionSegment[] = [];

    const timestampPattern = /^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-–]?\s*([^:]+):\s*(.+)$/;
    const simplePattern = /^([^:]+):\s*(.+)$/;

    for (const line of lines) {
      const timestampMatch = line.match(timestampPattern);
      if (timestampMatch) {
        segments.push({
          timestamp: timestampMatch[1],
          speaker: timestampMatch[2].trim(),
          text: timestampMatch[3].trim()
        });
      } else {
        const simpleMatch = line.match(simplePattern);
        if (simpleMatch) {
          segments.push({
            timestamp: '',
            speaker: simpleMatch[1].trim(),
            text: simpleMatch[2].trim()
          });
        } else if (line.trim() && segments.length > 0) {
          // Append to previous segment
          segments[segments.length - 1].text += ' ' + line.trim();
        } else if (line.trim()) {
          segments.push({
            timestamp: '',
            speaker: 'Unknown',
            text: line.trim()
          });
        }
      }
    }

    return segments;
  };

  // Check if a segment matches the target timestamp
  const isHighlighted = (segment: TranscriptionSegment): boolean => {
    if (!targetTimestamp || !segment.timestamp) return false;
    return segment.timestamp === targetTimestamp;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">{t('calls.notFound', 'Call not found')}</p>
      </div>
    );
  }

  const segments = parseTranscription(call.transcription, call.transcription_timestamps);

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/calls/${id}`)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('calls.transcription', 'Transcrição')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {call.phone_number} - {call.agent_name} - {formatDate(call.call_date)}
          </p>
        </div>
      </div>

      {/* Transcription Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {segments.length > 0 ? (
          <div className="space-y-4">
            {segments.map((segment, index) => {
              const highlighted = isHighlighted(segment);
              return (
                <div
                  key={index}
                  ref={highlighted ? highlightedRef : null}
                  className={`p-4 rounded-lg transition-all ${
                    highlighted
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-400 dark:border-yellow-600'
                      : 'bg-gray-50 dark:bg-gray-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {segment.timestamp && (
                      <span className={`text-xs font-mono px-2 py-1 rounded ${
                        highlighted
                          ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {segment.timestamp}
                      </span>
                    )}
                    <span className={`text-sm font-semibold ${
                      segment.speaker.toLowerCase().includes('agent') || segment.speaker.toLowerCase().includes('agente')
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {segment.speaker}
                    </span>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                    {segment.text}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            {call.transcription ? (
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {call.transcription}
                </p>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                {t('calls.noTranscription', 'Sem transcrição disponível para esta chamada')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => navigate(`/calls/${id}`)}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
        >
          {t('common.back', 'Voltar')}
        </button>
      </div>
    </div>
  );
}
