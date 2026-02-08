import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import { Settings as SettingsIcon, Globe, Moon, Sun, Save, User, Lock, Eye, EyeOff, PartyPopper, FileText, Shield, ExternalLink, CreditCard, Zap, Crown, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { usersApi, authApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import toast from 'react-hot-toast';

// Tab type
type SettingsTab = 'profile' | 'payment' | 'legal';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { setTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const isNewUser = searchParams.get('newUser') === 'true';
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

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

  // Phone number state - split country code and number
  const parsePhone = (phone: string) => {
    const countryCodes = ['+351', '+55', '+1', '+44', '+34', '+33', '+49', '+39', '+31', '+32', '+41', '+43', '+48', '+46', '+47', '+45', '+358', '+353', '+352', '+356', '+357', '+30', '+90', '+7', '+86', '+81', '+82', '+91', '+61', '+64', '+52', '+54', '+56', '+57', '+58', '+507', '+506', '+505', '+504', '+503', '+502', '+244', '+258', '+238'];
    for (const code of countryCodes.sort((a, b) => b.length - a.length)) {
      if (phone.startsWith(code)) {
        return { code, number: phone.slice(code.length).trim() };
      }
    }
    return { code: '+351', number: phone.replace(/^\+\d+\s*/, '') };
  };
  const parsed = parsePhone(user?.phone_number || '');
  const [countryCode, setCountryCode] = useState<string>(parsed.code);
  const [phoneNumber, setPhoneNumber] = useState<string>(parsed.number);
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  const countryCodes = [
    { code: '+351', country: 'PT', flag: '\u{1F1F5}\u{1F1F9}' },
    { code: '+55', country: 'BR', flag: '\u{1F1E7}\u{1F1F7}' },
    { code: '+244', country: 'AO', flag: '\u{1F1E6}\u{1F1F4}' },
    { code: '+258', country: 'MZ', flag: '\u{1F1F2}\u{1F1FF}' },
    { code: '+238', country: 'CV', flag: '\u{1F1E8}\u{1F1FB}' },
    { code: '+1', country: 'US', flag: '\u{1F1FA}\u{1F1F8}' },
    { code: '+44', country: 'GB', flag: '\u{1F1EC}\u{1F1E7}' },
    { code: '+34', country: 'ES', flag: '\u{1F1EA}\u{1F1F8}' },
    { code: '+33', country: 'FR', flag: '\u{1F1EB}\u{1F1F7}' },
    { code: '+49', country: 'DE', flag: '\u{1F1E9}\u{1F1EA}' },
    { code: '+39', country: 'IT', flag: '\u{1F1EE}\u{1F1F9}' },
    { code: '+31', country: 'NL', flag: '\u{1F1F3}\u{1F1F1}' },
    { code: '+32', country: 'BE', flag: '\u{1F1E7}\u{1F1EA}' },
    { code: '+41', country: 'CH', flag: '\u{1F1E8}\u{1F1ED}' },
    { code: '+43', country: 'AT', flag: '\u{1F1E6}\u{1F1F9}' },
    { code: '+48', country: 'PL', flag: '\u{1F1F5}\u{1F1F1}' },
    { code: '+46', country: 'SE', flag: '\u{1F1F8}\u{1F1EA}' },
    { code: '+47', country: 'NO', flag: '\u{1F1F3}\u{1F1F4}' },
    { code: '+45', country: 'DK', flag: '\u{1F1E9}\u{1F1F0}' },
    { code: '+358', country: 'FI', flag: '\u{1F1EB}\u{1F1EE}' },
    { code: '+353', country: 'IE', flag: '\u{1F1EE}\u{1F1EA}' },
    { code: '+30', country: 'GR', flag: '\u{1F1EC}\u{1F1F7}' },
    { code: '+90', country: 'TR', flag: '\u{1F1F9}\u{1F1F7}' },
    { code: '+7', country: 'RU', flag: '\u{1F1F7}\u{1F1FA}' },
    { code: '+86', country: 'CN', flag: '\u{1F1E8}\u{1F1F3}' },
    { code: '+81', country: 'JP', flag: '\u{1F1EF}\u{1F1F5}' },
    { code: '+82', country: 'KR', flag: '\u{1F1F0}\u{1F1F7}' },
    { code: '+91', country: 'IN', flag: '\u{1F1EE}\u{1F1F3}' },
    { code: '+61', country: 'AU', flag: '\u{1F1E6}\u{1F1FA}' },
    { code: '+64', country: 'NZ', flag: '\u{1F1F3}\u{1F1FF}' },
    { code: '+52', country: 'MX', flag: '\u{1F1F2}\u{1F1FD}' },
    { code: '+54', country: 'AR', flag: '\u{1F1E6}\u{1F1F7}' },
    { code: '+56', country: 'CL', flag: '\u{1F1E8}\u{1F1F1}' },
    { code: '+57', country: 'CO', flag: '\u{1F1E8}\u{1F1F4}' },
  ];

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

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-4">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <User className="w-4 h-4" />
            {t('settings.tabProfile', 'Perfil')}
          </button>
          <button
            onClick={() => setActiveTab('payment')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'payment'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            {t('settings.tabPayment', 'Pagamento')}
          </button>
          <button
            onClick={() => setActiveTab('legal')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'legal'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            {t('settings.tabLegal', 'Termos e Condições')}
          </button>
        </nav>
      </div>

      {/* PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
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
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-28 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  >
                    {countryCodes.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder={t('settings.phonePlaceholder', '912 345 678')}
                  />
                </div>
              </div>

              {/* Save Profile Button */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={async () => {
                    setIsSavingDisplayName(true);
                    setIsSavingPhone(true);
                    try {
                      const fullPhone = phoneNumber ? `${countryCode}${phoneNumber}` : null;
                      await usersApi.updatePreferences({
                        display_name: displayName || null,
                        phone_number: fullPhone,
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Language */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Globe className="w-4 h-4" />
                    {t('settings.language', 'Language')}
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLanguagePreference('pt')}
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
                        languagePreference === 'pt'
                          ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      🇵🇹 Português
                    </button>
                    <button
                      onClick={() => setLanguagePreference('en')}
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
                        languagePreference === 'en'
                          ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      🇬🇧 English
                    </button>
                  </div>
                </div>

                {/* Theme */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {themePreference === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    {t('settings.theme', 'Theme')}
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setThemePreference('light')}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                        themePreference === 'light'
                          ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <Sun className="w-4 h-4 text-amber-500" />
                      {t('settings.lightMode', 'Light')}
                    </button>
                    <button
                      onClick={() => setThemePreference('dark')}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                        themePreference === 'dark'
                          ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <Moon className="w-4 h-4 text-indigo-500" />
                      {t('settings.darkMode', 'Dark')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? t('settings.saving', 'Saving...') : t('settings.save', 'Save Changes')}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PAYMENT TAB */}
      {activeTab === 'payment' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {t('settings.subscription', 'Subscription')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Current Plan */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('settings.currentPlan', 'Current Plan')}
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Free</p>
              </div>
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                {t('settings.active', 'Active')}
              </span>
            </div>

            {/* Plans */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('settings.availablePlans', 'Available Plans')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Free Plan */}
                <div className="relative p-4 rounded-lg border-2 border-green-600 bg-green-50/50 dark:bg-green-900/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Free</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">0€<span className="text-sm font-normal text-gray-500">/mês</span></p>
                  <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-600 flex-shrink-0" />{t('settings.planFeature1Free', '50 calls/month')}</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-600 flex-shrink-0" />{t('settings.planFeature2Free', 'Basic analytics')}</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-600 flex-shrink-0" />{t('settings.planFeature3Free', '1 user')}</li>
                  </ul>
                  <div className="mt-3">
                    <span className="block w-full text-center py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      {t('settings.currentPlanLabel', 'Current Plan')}
                    </span>
                  </div>
                </div>

                {/* Pro Plan */}
                <div className="relative p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-600 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Pro</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                      {t('settings.popular', 'Popular')}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">--€<span className="text-sm font-normal text-gray-500">/mês</span></p>
                  <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-blue-600 flex-shrink-0" />{t('settings.planFeature1Pro', 'Unlimited calls')}</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-blue-600 flex-shrink-0" />{t('settings.planFeature2Pro', 'Advanced analytics')}</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-blue-600 flex-shrink-0" />{t('settings.planFeature3Pro', 'Up to 10 users')}</li>
                  </ul>
                  <div className="mt-3">
                    <button className="w-full py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
                      {t('settings.upgrade', 'Upgrade')}
                    </button>
                  </div>
                </div>

                {/* Enterprise Plan */}
                <div className="relative p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-600 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-amber-500" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Enterprise</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t('settings.custom', 'Custom')}</p>
                  <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-amber-500 flex-shrink-0" />{t('settings.planFeature1Ent', 'Everything in Pro')}</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-amber-500 flex-shrink-0" />{t('settings.planFeature2Ent', 'Dedicated support')}</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-amber-500 flex-shrink-0" />{t('settings.planFeature3Ent', 'Unlimited users')}</li>
                  </ul>
                  <div className="mt-3">
                    <button className="w-full py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                      {t('settings.contactSales', 'Contact Sales')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('settings.paymentMethod', 'Payment Method')}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t('settings.noPaymentMethod', 'No payment method added')}
                  </p>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 border border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors">
                  <CreditCard className="w-3.5 h-3.5" />
                  {t('settings.addPayment', 'Add')}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LEGAL TAB */}
      {activeTab === 'legal' && (
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
      )}
    </div>
  );
}
