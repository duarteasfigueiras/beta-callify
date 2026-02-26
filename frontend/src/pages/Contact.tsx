import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Phone, User, Mail, Building2, Users, Headphones, Send } from 'lucide-react';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import toast from 'react-hot-toast';

export default function Contact() {
  const { t } = useTranslation();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [company, setCompany] = useState('');
  const [numUsers, setNumUsers] = useState('');
  const [carrier, setCarrier] = useState('');
  const [usesCrm, setUsesCrm] = useState('no');
  const [whichCrm, setWhichCrm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!firstName.trim()) {
      setError(t('contact.required', 'This field is required'));
      return;
    }
    if (!lastName.trim()) {
      setError(t('contact.required', 'This field is required'));
      return;
    }
    if (!email.trim()) {
      setError(t('contact.required', 'This field is required'));
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('contact.invalidEmail', 'Please enter a valid email address'));
      return;
    }

    // Validate phone (9 digits PT)
    if (!phoneNumber.trim()) {
      setError(t('contact.required', 'This field is required'));
      return;
    }
    const cleanPhone = phoneNumber.replace(/[\s-]/g, '');
    if (!/^[0-9]{9}$/.test(cleanPhone)) {
      setError(t('contact.invalidPhone', 'Phone number must have exactly 9 digits'));
      return;
    }

    if (!company.trim()) {
      setError(t('contact.required', 'This field is required'));
      return;
    }
    if (!numUsers.trim() || parseInt(numUsers) < 1) {
      setError(t('contact.required', 'This field is required'));
      return;
    }
    if (!carrier.trim()) {
      setError(t('contact.required', 'This field is required'));
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/contact', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: `+351${cleanPhone}`,
        company: company.trim(),
        numUsers: parseInt(numUsers),
        carrier: carrier.trim(),
        usesCrm: usesCrm === 'yes',
        whichCrm: usesCrm === 'yes' ? whichCrm.trim() : null,
      });
      setSuccess(true);
      toast.success(t('contact.success', 'Request sent successfully!'));
    } catch (err: any) {
      setError(err.response?.data?.error || t('contact.error', 'Failed to send request. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600">
                <Send className="w-8 h-8" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-green-600">
              {t('contact.successTitle', 'Request Sent!')}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {t('contact.successMessage', 'Thank you for your interest! We will contact you shortly.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/">
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                {t('contact.backToHome', 'Back to Home')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 p-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-600 text-white">
              <Phone className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">
            {t('contact.title', 'Request a Demo')}
          </CardTitle>
          <CardDescription>
            {t('contact.subtitle', 'Fill in the form and we will contact you shortly.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                {error}
              </div>
            )}

            {/* First and Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('contact.firstName', 'First Name')}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t('contact.firstNamePlaceholder', 'First name')}
                    disabled={isLoading}
                    required
                    className="w-full pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('contact.lastName', 'Last Name')}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t('contact.lastNamePlaceholder', 'Last name')}
                  disabled={isLoading}
                  required
                  className="w-full"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('contact.email', 'Email')}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('contact.emailPlaceholder', 'your@email.com')}
                  disabled={isLoading}
                  required
                  className="w-full pl-10"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('contact.phone', 'Phone')}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">+351</span>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                    setPhoneNumber(value);
                  }}
                  placeholder="912 345 678"
                  disabled={isLoading}
                  required
                  className="w-full pl-14"
                  maxLength={9}
                />
              </div>
            </div>

            {/* Company */}
            <div className="space-y-2">
              <label htmlFor="company" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('contact.company', 'Company')}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder={t('contact.companyPlaceholder', 'Company name')}
                  disabled={isLoading}
                  required
                  className="w-full pl-10"
                />
              </div>
            </div>

            {/* Number of users */}
            <div className="space-y-2">
              <label htmlFor="numUsers" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('contact.numUsers', 'Number of users to integrate')}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="numUsers"
                  type="number"
                  min="1"
                  value={numUsers}
                  onChange={(e) => setNumUsers(e.target.value)}
                  placeholder={t('contact.numUsersPlaceholder', 'e.g. 10')}
                  disabled={isLoading}
                  required
                  className="w-full pl-10"
                />
              </div>
            </div>

            {/* Current carrier */}
            <div className="space-y-2">
              <label htmlFor="carrier" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('contact.carrier', 'Current carrier')}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <Headphones className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="carrier"
                  type="text"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder={t('contact.carrierPlaceholder', 'e.g. NOS, MEO, Vodafone')}
                  disabled={isLoading}
                  required
                  className="w-full pl-10"
                />
              </div>
            </div>

            {/* Uses CRM */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('contact.usesCrm', 'Do you use a CRM?')}
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="usesCrm"
                    value="no"
                    checked={usesCrm === 'no'}
                    onChange={() => { setUsesCrm('no'); setWhichCrm(''); }}
                    disabled={isLoading}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('contact.no', 'No')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="usesCrm"
                    value="yes"
                    checked={usesCrm === 'yes'}
                    onChange={() => setUsesCrm('yes')}
                    disabled={isLoading}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('contact.yes', 'Yes')}</span>
                </label>
              </div>
            </div>

            {/* Which CRM (conditional) */}
            {usesCrm === 'yes' && (
              <div className="space-y-2">
                <label htmlFor="whichCrm" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('contact.whichCrm', 'Which CRM?')}
                </label>
                <Input
                  id="whichCrm"
                  type="text"
                  value={whichCrm}
                  onChange={(e) => setWhichCrm(e.target.value)}
                  placeholder={t('contact.whichCrmPlaceholder', 'e.g. Salesforce, HubSpot')}
                  disabled={isLoading}
                  className="w-full"
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? t('contact.submitting', 'Submitting...') : t('contact.submit', 'Submit')}
            </Button>

            <div className="text-center">
              <Link to="/" className="text-sm text-green-600 hover:text-green-700 hover:underline font-medium">
                {t('contact.backToHome', 'Back to Home')}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
