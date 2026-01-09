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

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ username, password });
      // Redirect to the intended page or home
      navigate(from, { replace: true });
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError(t('auth.invalidCredentials'));
      setPassword(''); // Clear password on error
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
            {t('auth.login')}
          </CardDescription>
        </CardHeader>
        <CardContent>
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

            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={isLoading}
            >
              {isLoading ? t('auth.loggingIn') : t('auth.loginButton')}
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
