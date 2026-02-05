import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone, ArrowLeft, CheckCircle } from 'lucide-react';
import { authApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch') || 'Passwords do not match');
      return;
    }

    // Validate password strength
    const passwordErrors: string[] = [];
    if (newPassword.length < 8) {
      passwordErrors.push(t('auth.passwordMinLength', 'At least 8 characters'));
    }
    if (!/[A-Z]/.test(newPassword)) {
      passwordErrors.push(t('auth.passwordUppercase', 'At least one uppercase letter'));
    }
    if (!/[a-z]/.test(newPassword)) {
      passwordErrors.push(t('auth.passwordLowercase', 'At least one lowercase letter'));
    }
    if (!/[0-9]/.test(newPassword)) {
      passwordErrors.push(t('auth.passwordNumber', 'At least one number'));
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      passwordErrors.push(t('auth.passwordSpecial', 'At least one special character'));
    }
    if (passwordErrors.length > 0) {
      setError(t('auth.passwordRequirements', 'Password requirements not met: ') + passwordErrors.join(', '));
      return;
    }

    if (!token) {
      setError(t('auth.invalidToken') || 'Invalid or missing reset token');
      return;
    }

    setIsLoading(true);

    try {
      await authApi.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err: unknown) {
      console.error('Password reset error:', err);
      setError(t('auth.resetFailed') || 'Failed to reset password. The token may be expired or invalid.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-600 text-white">
                <Phone className="w-8 h-8" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-green-600">AI CoachCall</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                {t('auth.invalidToken') || 'Invalid or missing reset token'}
              </div>
              <Link
                to="/login"
                className="flex items-center justify-center space-x-2 text-green-600 hover:text-green-700 hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('auth.backToLogin')}</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-600 text-white">
              <Phone className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">AI CoachCall</CardTitle>
          <CardDescription>
            {t('auth.resetPassword')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-md flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>{t('auth.passwordResetSuccess') || 'Password reset successfully! You can now login with your new password.'}</span>
              </div>
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {t('auth.backToLogin')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('auth.newPassword')}
                </label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('auth.newPassword')}
                  required
                  autoComplete="new-password"
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                  <p className={newPassword.length >= 8 ? 'text-green-600' : ''}>{newPassword.length >= 8 ? '✓' : '○'} {t('auth.req8chars', 'Minimum 8 characters')}</p>
                  <p className={/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}>{/[A-Z]/.test(newPassword) ? '✓' : '○'} {t('auth.reqUppercase', 'One uppercase letter')}</p>
                  <p className={/[a-z]/.test(newPassword) ? 'text-green-600' : ''}>{/[a-z]/.test(newPassword) ? '✓' : '○'} {t('auth.reqLowercase', 'One lowercase letter')}</p>
                  <p className={/[0-9]/.test(newPassword) ? 'text-green-600' : ''}>{/[0-9]/.test(newPassword) ? '✓' : '○'} {t('auth.reqNumber', 'One number')}</p>
                  <p className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) ? 'text-green-600' : ''}>{/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) ? '✓' : '○'} {t('auth.reqSpecial', 'One special character')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('auth.confirmPassword')}
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('auth.confirmPassword')}
                  required
                  autoComplete="new-password"
                  className="w-full"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isLoading}
              >
                {isLoading ? t('common.loading') : t('auth.resetPassword')}
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
