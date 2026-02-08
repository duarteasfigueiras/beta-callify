import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import { Settings as SettingsIcon, Globe, Moon, Sun, Save, User, Lock, Eye, EyeOff, PartyPopper, FileText, Shield, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { usersApi, authApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import toast from 'react-hot-toast';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const isNewUser = searchParams.get('newUser') === 'true';

  // Remove newUser param from URL after showing the welcome message
  useEffect(() => {
    if (isNewUser) {
      // Remove the param after a delay so the user sees the welcome message
      const timer = setTimeout(() => {
        setSearchParams({});
      }, 10000); // Remove after 10 seconds
      return () => clearTimeout(timer);
    }
  }, [isNewUser, setSearchParams]);

  const [languagePreference, setLanguagePreference] = useState<'pt' | 'en'>(
    user?.language_preference || 'pt'
  );
  const [themePreference, setThemePreference] = useState<'light' | 'dark'>(
    user?.theme_preference || 'light'
  );
  const [isSaving, setIsSaving] = useState(false);

  // Phone number state
  const [phoneNumber, setPhoneNumber] = useState<string>(user?.phone_number || '+351');
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  // Display name state
  const [displayName, setDisplayName] = useState<string>(user?.display_name || '');
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await usersApi.updatePreferences({
        language_preference: languagePreference,
        theme_preference: themePreference,
      });

      // Update i18n language and persist to localStorage
      i18n.changeLanguage(languagePreference);
      localStorage.setItem('language', languagePreference);

      // Update theme
      setTheme(themePreference);

      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }

      toast.success(t('settings.saveSuccess', 'Settings saved successfully'));
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error(t('settings.saveError', 'Failed to save settings'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePhone = async () => {
    setIsSavingPhone(true);
    try {
      await usersApi.updatePreferences({
        phone_number: phoneNumber || null,
      });

      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }

      toast.success(t('settings.phoneSaved', 'Phone number saved successfully'));
    } catch (error: any) {
      console.error('Error saving phone number:', error);
      const errorMessage = error.response?.data?.error || t('settings.phoneError', 'Failed to save phone number');
      toast.error(errorMessage);
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleSaveDisplayName = async () => {
    setIsSavingDisplayName(true);
    try {
      await usersApi.updatePreferences({
        display_name: displayName || null,
      });

      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }

      toast.success(t('settings.displayNameSaved', 'Name saved successfully'));
    } catch (error: any) {
      console.error('Error saving display name:', error);
      const errorMessage = error.response?.data?.error || t('settings.displayNameError', 'Failed to save name');
      toast.error(errorMessage);
    } finally {
      setIsSavingDisplayName(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t('settings.passwordFieldsRequired', 'All password fields are required'));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t('settings.passwordTooShort', 'New password must be at least 6 characters'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('settings.passwordsDoNotMatch', 'New passwords do not match'));
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      toast.success(t('settings.passwordChanged', 'Password changed successfully'));
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      const errorMessage = error.response?.data?.error || t('settings.passwordChangeError', 'Failed to change password');
      toast.error(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner for New Users */}
      {isNewUser && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <PartyPopper className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">
                {t('settings.welcomeTitle', 'Welcome to Callify!')}
              </h2>
              <p className="text-green-100 mb-4">
                {t('settings.welcomeMessage', 'Your account has been created successfully. Please complete your profile by adding your name and phone number below. This information will help us associate your calls automatically.')}
              </p>
              <div className="flex items-center gap-2 text-sm text-green-200">
                <span className="inline-block w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
                {t('settings.welcomeHint', 'Fill in the "Display Name" and "Phone Number" sections below')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('settings.title', 'Settings')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('settings.subtitle', 'Manage your preferences')}
        </p>
      </div>

      {/* Profile */}
      <Card className={isNewUser ? 'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-900' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t('settings.profile', 'Profile')}
            {isNewUser && (
              <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                {t('settings.completeProfile', 'Complete your profile')}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name and Email Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settings.displayNameLabel', 'Name')}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder={t('settings.displayNamePlaceholder', 'John Doe')}
                autoFocus={isNewUser}
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settings.email', 'Email')}
              </label>
              <input
                type="email"
                value={user?.username || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('settings.phoneLabel', 'Phone Number')}
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder={t('settings.phonePlaceholder', '+351 912 345 678')}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('settings.phoneHint', 'Enter your phone number with country code (e.g., +351912345678)')}
            </p>
          </div>

          {/* Save Profile Button */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={async () => {
                setIsSavingDisplayName(true);
                setIsSavingPhone(true);
                try {
                  await usersApi.updatePreferences({
                    display_name: displayName || null,
                    phone_number: phoneNumber || null,
                  });
                  if (refreshUser) {
                    await refreshUser();
                  }
                  toast.success(t('settings.profileSaved', 'Profile saved successfully'));
                } catch (error: any) {
                  console.error('Error saving profile:', error);
                  const errorMessage = error.response?.data?.error || t('settings.profileError', 'Failed to save profile');
                  toast.error(errorMessage);
                } finally {
                  setIsSavingDisplayName(false);
                  setIsSavingPhone(false);
                }
              }}
              disabled={isSavingDisplayName || isSavingPhone}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              <Save className="w-4 h-4" />
              {(isSavingDisplayName || isSavingPhone) ? t('settings.saving', 'Saving...') : t('settings.saveProfile', 'Save Profile')}
            </button>
          </div>

          {/* Change Password Section */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="flex items-center gap-2 text-base font-medium text-gray-900 dark:text-gray-100 mb-4">
              <Lock className="w-4 h-4" />
              {t('settings.changePassword', 'Change Password')}
            </h3>

            <div className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.currentPassword', 'Current Password')}
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder={t('settings.enterCurrentPassword', 'Enter current password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('settings.newPassword', 'New Password')}
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder={t('settings.enterNewPassword', 'Min. 6 characters')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('settings.confirmNewPassword', 'Confirm Password')}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder={t('settings.confirmNewPasswordPlaceholder', 'Confirm password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Change Password Button */}
              <div className="pt-2">
                <button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Lock className="w-4 h-4" />
                  {isChangingPassword ? t('settings.changingPassword', 'Changing...') : t('settings.changePasswordButton', 'Change Password')}
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            {t('settings.preferences', 'Preferences')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Language Preference */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <Globe className="w-4 h-4" />
              {t('settings.language', 'Language')}
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setLanguagePreference('pt')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                  languagePreference === 'pt'
                    ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="text-2xl mb-1">🇵🇹</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">Português</p>
              </button>
              <button
                onClick={() => setLanguagePreference('en')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                  languagePreference === 'en'
                    ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="text-2xl mb-1">🇬🇧</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">English</p>
              </button>
            </div>
          </div>

          {/* Theme Preference */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {themePreference === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {t('settings.theme', 'Theme')}
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setThemePreference('light')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                  themePreference === 'light'
                    ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Sun className="w-6 h-6 mx-auto mb-1 text-amber-500" />
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {t('settings.lightMode', 'Light')}
                </p>
              </button>
              <button
                onClick={() => setThemePreference('dark')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                  themePreference === 'dark'
                    ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Moon className="w-6 h-6 mx-auto mb-1 text-indigo-500" />
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {t('settings.darkMode', 'Dark')}
                </p>
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSaving ? t('settings.saving', 'Saving...') : t('settings.save', 'Save Changes')}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Legal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('settings.legal', 'Legal')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('settings.legalDescription', 'View our terms of service and privacy policy.')}
          </p>
          <Link
            to="/terms"
            target="_blank"
            className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-green-600" />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {t('legal.termsOfService', 'Terms of Service')}
              </span>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-colors" />
          </Link>
          <Link
            to="/privacy"
            target="_blank"
            className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {t('legal.privacyPolicy', 'Privacy Policy')}
              </span>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-colors" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
