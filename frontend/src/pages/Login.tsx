import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';

interface LocationState {
  from?: {
    pathname: string;
  };
}

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Get the intended destination from location state (set by ProtectedRoute)
  const state = location.state as LocationState;
  const from = state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRemainingAttempts(null);
    setIsLoading(true);

    try {
      await login({ email, password }, rememberMe);
      // Redirect to the intended page or home
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      const response = err?.response?.data;

      if (err?.response?.status === 429) {
        // Rate limited
        const retryAfter = response?.retryAfterSeconds || 900;
        setBlockedUntil(Date.now() + retryAfter * 1000);
        setError(t('auth.tooManyAttempts', 'Too many login attempts. Please try again in {{minutes}} minutes.').replace('{{minutes}}', Math.ceil(retryAfter / 60).toString()));
      } else {
        setError(t('auth.invalidCredentials'));
        if (response?.remainingAttempts !== undefined) {
          setRemainingAttempts(response.remainingAttempts);
        }
      }
      setPassword(''); // Clear password on error
    } finally {
      setIsLoading(false);
    }
  };

  // Check if still blocked
  const isBlocked = blockedUntil && Date.now() < blockedUntil;

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
            {t('auth.login')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                {error}
                {remainingAttempts !== null && remainingAttempts > 0 && (
                  <p className="mt-1 text-xs">
                    {t('auth.remainingAttempts', '{{count}} attempts remaining').replace('{{count}}', remainingAttempts.toString())}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('auth.email')}
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                required
                autoComplete="email"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('auth.password')}
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.password')}
                required
                autoComplete="current-password"
                className="w-full"
              />
            </div>

            <div className="flex items-center">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                {t('auth.rememberMe', 'Manter sessão iniciada')}
              </label>
            </div>

            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={isLoading || isBlocked}
            >
              {isLoading ? t('auth.loggingIn') : isBlocked ? t('auth.blocked', 'Account temporarily blocked') : t('auth.loginButton')}
            </Button>

            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-green-600 hover:text-green-700 hover:underline"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
