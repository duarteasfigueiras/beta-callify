import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone, ArrowLeft, Shield, Users, Database, Clock, Lock, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export default function PrivacyPolicy() {
  const { i18n } = useTranslation();
  const isPt = i18n.language === 'pt';

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 p-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Privacy Policy Header */}
        <Card>
          <CardHeader className="space-y-1 text-center border-b">
            <div className="flex justify-center mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-600 text-white">
                <Phone className="w-6 h-6" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-green-600">
              {isPt ? 'Política de Privacidade' : 'Privacy Policy'}
            </CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isPt ? 'Conformidade com RGPD' : 'GDPR Compliant'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {isPt ? 'Última atualização' : 'Last updated'}: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Roles */}
            <section>
              <div className="flex items-center space-x-2 mb-3">
                <Users className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  1. {isPt ? 'Funções' : 'Roles'}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <p className="font-medium text-gray-900 dark:text-white mb-1">
                    {isPt ? 'Cliente' : 'Customer'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {isPt ? 'Responsável pelo Tratamento de Dados' : 'Data Controller'}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <p className="font-medium text-gray-900 dark:text-white mb-1">
                    Revolution Mind7
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {isPt ? 'Subcontratante (operador do AI CoachCall)' : 'Data Processor (AI CoachCall operator)'}
                  </p>
                </div>
              </div>
            </section>

            {/* Data Processed */}
            <section>
              <div className="flex items-center space-x-2 mb-3">
                <Database className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  2. {isPt ? 'Dados Processados' : 'Data Processed'}
                </h2>
              </div>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li className="flex items-start space-x-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>{isPt ? 'Áudio carregado pelo cliente' : 'Customer-uploaded audio'}</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>{isPt ? 'Transcrições' : 'Transcriptions'}</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>{isPt ? 'Análises e métricas' : 'Analytics and metrics'}</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>{isPt ? 'Dados da conta do utilizador' : 'User account data'}</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>{isPt ? 'Logs técnicos' : 'Technical logs'}</span>
                </li>
              </ul>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 italic">
                {isPt
                  ? 'AI CoachCall não recolhe dados diretamente dos participantes das chamadas.'
                  : 'AI CoachCall does not collect data directly from call participants.'}
              </p>
            </section>

            {/* Legal Basis */}
            <section>
              <div className="flex items-center space-x-2 mb-3">
                <FileText className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  3. {isPt ? 'Base Legal' : 'Legal Basis'}
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-3">
                {isPt ? 'O processamento baseia-se em:' : 'Processing is based on:'}
              </p>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li className="flex items-start space-x-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>{isPt ? 'Execução do contrato' : 'Contract performance'}</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>{isPt ? 'Interesse legítimo' : 'Legitimate interest'}</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>{isPt ? 'Consentimento (quando necessário)' : 'Consent (where required)'}</span>
                </li>
              </ul>
            </section>

            {/* Data Retention */}
            <section>
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  4. {isPt ? 'Retenção de Dados' : 'Data Retention'}
                </h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-300">{isPt ? 'Áudio' : 'Audio'}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{isPt ? 'até 180 dias' : 'up to 180 days'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-300">{isPt ? 'Transcrições e análises' : 'Transcriptions & analytics'}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{isPt ? 'enquanto conta ativa' : 'while account is active'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 dark:text-gray-300">{isPt ? 'Logs' : 'Logs'}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{isPt ? 'até 12 meses' : 'up to 12 months'}</span>
                </div>
              </div>
            </section>

            {/* Data Subject Rights */}
            <section>
              <div className="flex items-center space-x-2 mb-3">
                <Shield className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  5. {isPt ? 'Direitos dos Titulares dos Dados' : 'Data Subject Rights'}
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                {isPt
                  ? 'Os pedidos devem ser tratados pelo Cliente como Responsável pelo Tratamento de Dados. AI CoachCall fornece assistência razoável.'
                  : 'Requests must be handled by the Customer as Data Controller. AI CoachCall provides reasonable assistance.'}
              </p>
            </section>

            {/* Security */}
            <section>
              <div className="flex items-center space-x-2 mb-3">
                <Lock className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  6. {isPt ? 'Segurança' : 'Security'}
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                {isPt
                  ? 'Aplicamos encriptação, controlo de acesso e melhores práticas da indústria.'
                  : 'We apply encryption, access control, and industry best practices.'}
              </p>
            </section>
          </CardContent>
        </Card>

        {/* DPA Section */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6 text-blue-600" />
              <div>
                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                  {isPt ? 'Acordo de Processamento de Dados (DPA)' : 'Data Processing Agreement (DPA)'}
                </CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isPt ? 'Termos de subcontratação de dados' : 'Data subprocessing terms'}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <section>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                1. {isPt ? 'Objeto' : 'Subject'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {isPt
                  ? 'Processamento de áudio fornecido pelo cliente e dados relacionados.'
                  : 'Processing of customer-provided audio and related data.'}
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                2. {isPt ? 'Instruções' : 'Instructions'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {isPt
                  ? 'AI CoachCall processa dados apenas sob instruções do Cliente.'
                  : 'AI CoachCall processes data only under Customer instructions.'}
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                3. {isPt ? 'Confidencialidade' : 'Confidentiality'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {isPt
                  ? 'Todos os dados são tratados como confidenciais.'
                  : 'All data is treated as confidential.'}
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                4. {isPt ? 'Medidas de Segurança' : 'Security Measures'}
              </h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li className="flex items-start space-x-2">
                  <Shield className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                  <span>{isPt ? 'Encriptação em repouso e em trânsito' : 'Encryption at rest and in transit'}</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Shield className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                  <span>{isPt ? 'Acesso restrito' : 'Restricted access'}</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Shield className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                  <span>{isPt ? 'Infraestrutura segura' : 'Secure infrastructure'}</span>
                </li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                5. {isPt ? 'Subcontratantes' : 'Sub-processors'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {isPt
                  ? 'A Empresa pode usar subcontratantes (cloud, IA, armazenamento) sob salvaguardas conformes ao RGPD.'
                  : 'The Company may use subprocessors (cloud, AI, storage) under GDPR-compliant safeguards.'}
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                6. {isPt ? 'Pedidos de Titulares de Dados' : 'Data Subject Requests'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {isPt
                  ? 'AI CoachCall auxilia o Cliente onde tecnicamente viável.'
                  : 'AI CoachCall assists the Customer where technically feasible.'}
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                7. {isPt ? 'Rescisão' : 'Termination'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {isPt
                  ? 'Após rescisão, os dados são eliminados ou devolvidos mediante pedido.'
                  : 'Upon termination, data is deleted or returned upon request.'}
              </p>
            </section>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              {isPt ? 'Contacto para questões de privacidade' : 'Privacy Contact'}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {isPt
                ? 'Para questões relacionadas com privacidade e proteção de dados, contacte-nos em:'
                : 'For privacy and data protection inquiries, contact us at:'}
            </p>
            <a
              href="mailto:privacy@aicoachcall.com"
              className="text-green-600 hover:text-green-700 hover:underline font-medium"
            >
              privacy@aicoachcall.com
            </a>
          </CardContent>
        </Card>

        {/* Back to Login */}
        <div className="pt-4">
          <Link
            to="/login"
            className="inline-flex items-center space-x-2 text-green-600 hover:text-green-700 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isPt ? 'Voltar ao Login' : 'Back to Login'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
