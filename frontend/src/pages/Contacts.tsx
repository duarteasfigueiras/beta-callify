import React from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export default function Contacts() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('contacts.title', 'Contacts')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('contacts.subtitle', 'Get in touch with us')}
        </p>
      </div>

      {/* Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              {t('contacts.support', 'Support')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('contacts.supportDescription', 'Need help with the platform? Our support team is here to assist you.')}
            </p>
            <div className="space-y-2">
              <a
                href="mailto:support@aicoachcall.com"
                className="flex items-center gap-2 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
              >
                <Mail className="w-4 h-4" />
                support@aicoachcall.com
              </a>
            </div>
          </CardContent>
        </Card>

        {/* General Inquiries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-600" />
              {t('contacts.general', 'General Inquiries')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('contacts.generalDescription', 'For general questions or feedback about Callify.')}
            </p>
            <div className="space-y-2">
              <a
                href="mailto:info@aicoachcall.com"
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
              >
                <Mail className="w-4 h-4" />
                info@aicoachcall.com
              </a>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
