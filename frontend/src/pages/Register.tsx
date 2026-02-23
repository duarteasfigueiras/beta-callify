import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Phone, Eye, EyeOff, User, Mail } from 'lucide-react';
import { authApi, stripeApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import toast from 'react-hot-toast';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();

  // SECURITY: Read token from URL once, store in state, then clean URL
  // This prevents the token from staying in browser history, address bar, and referrer headers
  const [token] = useState(() => searchParams.get('token'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // SECURITY: Remove token from URL immediately to prevent exposure in history/referrer
    if (searchParams.has('token')) {
      window.history.replaceState({}, '', '/register');
    }
    if (!token) {
      setError(t('register.invalidToken', 'Invalid or missing invitation token'));
    }
  }, [token, t, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError(t('register.invalidToken', 'Invalid or missing invitation token'));
      return;
    }

    // Validate first name (required)
    if (!firstName.trim()) {
      setError(t('register.firstNameRequired', 'First name is required'));
      return;
    }

    // Validate last name (required)
    if (!lastName.trim()) {
      setError(t('register.lastNameRequired', 'Last name is required'));
      return;
    }

    // Validate phone number (required)
    if (!phoneNumber.trim()) {
      setError(t('register.phoneRequired', 'Phone number is required'));
      return;
    }

    // Validate phone number format (9 digits only)
    const cleanPhone = phoneNumber.replace(/[\s-]/g, '');
    const phoneRegex = /^[0-9]{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setError(t('register.invalidPhone', 'Phone number must have exactly 9 digits'));
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('register.invalidEmail', 'Please enter a valid email address'));
      return;
    }

    // Validate password strength
    const passwordErrors: string[] = [];
    if (password.length < 8) {
      passwordErrors.push(t('register.passwordMinLength', 'At least 8 characters'));
    }
    if (!/[A-Z]/.test(password)) {
      passwordErrors.push(t('register.passwordUppercase', 'At least one uppercase letter'));
    }
    if (!/[a-z]/.test(password)) {
      passwordErrors.push(t('register.passwordLowercase', 'At least one lowercase letter'));
    }
    if (!/[0-9]/.test(password)) {
      passwordErrors.push(t('register.passwordNumber', 'At least one number'));
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      passwordErrors.push(t('register.passwordSpecial', 'At least one special character (!@#$%^&*...)'));
    }
    if (passwordErrors.length > 0) {
      setError(t('register.passwordRequirements', 'Password requirements not met: ') + passwordErrors.join(', '));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('register.passwordMismatch', 'Passwords do not match'));
      return;
    }

    if (!acceptedTerms) {
      setError(t('register.mustAcceptTerms', 'You must accept the Terms of Service and Privacy Policy'));
      return;
    }

    setIsLoading(true);
    try {
      // Combine first and last name, add +351 prefix to phone
      const displayName = `${firstName.trim()} ${lastName.trim()}`;
      const fullPhoneNumber = `+351${cleanPhone}`;

      await authApi.register(token, email, password, displayName, fullPhoneNumber);
      toast.success(t('register.success', 'Registration successful!'));

      // Auto-login after registration
      try {
        await login({ email, password });
        // Check subscription status to decide where to redirect
        try {
          const sub = await stripeApi.getSubscriptionStatus();
          if (sub.status === 'active') {
            navigate('/settings?newUser=true');
          } else {
            navigate('/choose-plan');
          }
        } catch {
          navigate('/choose-plan');
        }
      } catch (loginError) {
        // If auto-login fails, redirect to login page
        console.error('Auto-login failed:', loginError);
        navigate('/login');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.response?.data?.error || t('register.error', 'Registration failed'));
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
          <CardTitle className="text-2xl font-bold text-green-600">AI CoachCall</CardTitle>
          <CardDescription>
            {t('register.subtitle', 'Complete your registration to join the team')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                {error}
              </div>
            )}

            {/* First and Last Name in a row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('auth.firstName', 'First Name')}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t('auth.firstNamePlaceholder', 'First name')}
                    disabled={isLoading || !token}
                    required
                    autoComplete="given-name"
                    className="w-full pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('auth.lastName', 'Last Name')}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t('auth.lastNamePlaceholder', 'Last name')}
                  disabled={isLoading || !token}
                  required
                  autoComplete="family-name"
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('auth.phoneNumber', 'Phone Number')}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">+351</span>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    // Only allow digits
                    const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                    setPhoneNumber(value);
                  }}
                  placeholder={t('auth.phoneNumberPlaceholder', '912 345 678')}
                  disabled={isLoading || !token}
                  required
                  autoComplete="tel"
                  className="w-full pl-14"
                  maxLength={9}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('auth.phoneNumberHint', 'Used to associate calls with your account')}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('auth.email', 'Email')}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder', 'your@email.com')}
                  disabled={isLoading || !token}
                  required
                  autoComplete="email"
                  className="w-full pl-10"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('register.emailHint', 'This will be used to log in to your account')}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('register.password', 'Password')}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('register.passwordPlaceholder', 'Enter your password')}
                  disabled={isLoading || !token}
                  required
                  autoComplete="new-password"
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                <p className={password.length >= 8 ? 'text-green-600' : ''}>{password.length >= 8 ? '✓' : '○'} {t('register.req8chars', 'Minimum 8 characters')}</p>
                <p className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>{/[A-Z]/.test(password) ? '✓' : '○'} {t('register.reqUppercase', 'One uppercase letter')}</p>
                <p className={/[a-z]/.test(password) ? 'text-green-600' : ''}>{/[a-z]/.test(password) ? '✓' : '○'} {t('register.reqLowercase', 'One lowercase letter')}</p>
                <p className={/[0-9]/.test(password) ? 'text-green-600' : ''}>{/[0-9]/.test(password) ? '✓' : '○'} {t('register.reqNumber', 'One number')}</p>
                <p className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'text-green-600' : ''}>{/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? '✓' : '○'} {t('register.reqSpecial', 'One special character')}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('register.confirmPassword', 'Confirm Password')}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('register.confirmPasswordPlaceholder', 'Confirm your password')}
                  disabled={isLoading || !token}
                  required
                  autoComplete="new-password"
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <input
                id="acceptTerms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                disabled={isLoading || !token}
                className="h-4 w-4 mt-1 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="acceptTerms" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                {t('register.acceptTerms', 'I accept the')}{' '}
                <Link to="/terms" target="_blank" className="text-green-600 hover:text-green-700 hover:underline">
                  {t('legal.termsOfService', 'Terms of Service')}
                </Link>{' '}
                {t('common.and', 'and')}{' '}
                <Link to="/privacy" target="_blank" className="text-green-600 hover:text-green-700 hover:underline">
                  {t('legal.privacyPolicy', 'Privacy Policy')}
                </Link>
                <span className="text-red-500 ml-1">*</span>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={isLoading || !token}
            >
              {isLoading ? t('register.registering', 'Creating account...') : t('register.submit', 'Create Account')}
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('register.alreadyHaveAccount', 'Already have an account?')}{' '}
                <Link to="/login" className="text-green-600 hover:text-green-700 hover:underline font-medium">
                  {t('register.login', 'Login')}
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
