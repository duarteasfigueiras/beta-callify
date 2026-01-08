import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone, ArrowLeft } from 'lucide-react';
import { authApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';

export default function ForgotPassword() {
  const { t } = useTranslation();

  const [username, setUsername] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authApi.recoverPassword(username);
      setSuccess(true);
    } catch (err: unknown) {
      console.error('Password recovery error:', err);
      setError(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-600 text-white">
              <Phone className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">Callify</CardTitle>
          <CardDescription>
            {t('auth.recoverPassword')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-md">
                {t('auth.recoveryEmailSent') || 'If the username exists, password reset instructions will be sent. Check the server console for the reset link.'}
              </div>
              <Link
                to="/login"
                className="flex items-center justify-center space-x-2 text-green-600 hover:text-green-700 hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('auth.backToLogin')}</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('auth.username')}
                </label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('auth.username')}
                  required
                  autoComplete="username"
                  className="w-full"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isLoading}
              >
                {isLoading ? t('common.loading') : t('auth.sendResetLink')}
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="flex items-center justify-center space-x-2 text-sm text-green-600 hover:text-green-700 hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t('auth.backToLogin')}</span>
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
