import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings as SettingsIcon, Globe, Moon, Sun, Save, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { usersApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import toast from 'react-hot-toast';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const [languagePreference, setLanguagePreference] = useState<'pt' | 'en'>(
    user?.language_preference || 'pt'
  );
  const [themePreference, setThemePreference] = useState<'light' | 'dark'>(
    user?.theme_preference || 'light'
  );
  const [isSaving, setIsSaving] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('settings.title', 'Settings')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('settings.subtitle', 'Manage your preferences')}
        </p>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t('settings.userInfo', 'User Information')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('settings.username', 'Username')}
              </label>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {user?.username}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('settings.role', 'Role')}
              </label>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {user?.role === 'admin_manager' ? t('common.admin', 'Admin') : t('common.agent', 'Agent')}
              </p>
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
    </div>
  );
}
