import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, Clock, LogOut, AlertTriangle } from 'lucide-react';
import { stripeApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

export default function MinutesExceeded() {
  const { t } = useTranslation();
  const { logout, user } = useAuth();
  const [usage, setUsage] = useState<{
    used_minutes: number;
    limit_minutes: number | null;
    plan: string | null;
  } | null>(null);

  useEffect(() => {
    stripeApi.getUsage()
      .then(setUsage)
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-600 text-white">
                <Phone className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">AI CoachCall</span>
            </div>
            <Button
              variant="ghost"
              className="text-gray-700 dark:text-gray-300"
              onClick={() => logout()}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('auth.logout', 'Logout')}
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="flex justify-center mb-6">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
          {t('minutesExceeded.title', 'Monthly minutes exceeded')}
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t('minutesExceeded.description', 'You have used all your allocated minutes for this month. Contact your administrator to upgrade the plan.')}
        </p>

        {usage && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {t('minutesExceeded.usage', 'Your usage')}
              </span>
            </div>
            <p className="text-3xl font-bold text-red-500 mb-1">
              {usage.used_minutes} / {usage.limit_minutes ?? '—'} {t('minutesExceeded.minutes', 'min')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
              {t('minutesExceeded.plan', 'Plan')}: {usage.plan || '—'}
            </p>
          </div>
        )}

        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('minutesExceeded.resetInfo', 'Minutes reset at the beginning of each month.')}
        </p>
      </div>
    </div>
  );
}
