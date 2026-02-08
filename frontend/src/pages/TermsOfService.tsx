import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone, ArrowLeft, AlertTriangle, Shield, Bot, Ban, Scale, Lock, Trash2, Plug, Beaker } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export default function TermsOfService() {
  const { t, i18n } = useTranslation();
  const isPt = i18n.language === 'pt';

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 p-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Terms & Conditions */}
        <Card>
          <CardHeader className="space-y-1 text-center border-b">
            <div className="flex justify-center mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-600 text-white">
                <Phone className="w-6 h-6" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-green-600">
              {isPt ? 'Termos e Condições' : 'Terms & Conditions'}
            </CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              AI CoachCall – {isPt ? 'Termos de Serviço' : 'Terms of Service'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {isPt ? 'Última atualização' : 'Last updated'}: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                1. {isPt ? 'Introdução' : 'Introduction'}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {isPt
                  ? 'Estes Termos regem o acesso e utilização da plataforma AI CoachCall ("Serviço"), operada pela Revolution Mind7 ("Empresa"). Ao utilizar o Serviço, o Cliente concorda com estes Termos.'
                  : 'These Terms govern access to and use of the AI CoachCall platform ("Service"), operated by Revolution Mind7 ("Company"). By using the Service, the Customer agrees to these Terms.'}
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                2. {isPt ? 'Descrição do Serviço' : 'Description of the Service'}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-3">
                {isPt
                  ? 'AI CoachCall é uma plataforma SaaS que permite aos Clientes:'
                  : 'AI CoachCall is a SaaS platform that allows Customers to:'}
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1 mb-4">
                <li>{isPt ? 'Carregar ou conectar áudio de chamadas fornecido pelo cliente' : 'Upload or connect customer-provided call audio'}</li>
                <li>{isPt ? 'Gerar transcrições' : 'Generate transcriptions'}</li>
                <li>{isPt ? 'Analisar conversas usando inteligência artificial' : 'Analyze conversations using artificial intelligence'}</li>
                <li>{isPt ? 'Receber métricas, insights e sugestões de coaching' : 'Receive metrics, insights, and coaching suggestions'}</li>
              </ul>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>{isPt ? 'Importante:' : 'Important:'}</strong> {isPt
                      ? 'AI CoachCall não grava, inicia ou interceta chamadas. Todo o conteúdo de áudio é fornecido pelo Cliente.'
                      : 'AI CoachCall does not record, initiate, or intercept calls. All audio content is provided by the Customer.'}
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                3. {isPt ? 'Elegibilidade' : 'Eligibility'}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {isPt
                  ? 'O Serviço destina-se exclusivamente a uso empresarial e profissional (B2B).'
                  : 'The Service is intended exclusively for business and professional use (B2B).'}
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                4. {isPt ? 'Responsabilidades do Cliente' : 'Customer Responsibilities'}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-3">
                {isPt ? 'O Cliente declara e garante que:' : 'The Customer represents and warrants that:'}
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1 mb-3">
                <li>{isPt ? 'Todo o áudio carregado foi obtido legalmente' : 'All uploaded audio was lawfully obtained'}</li>
                <li>{isPt ? 'Todos os consentimentos necessários foram obtidos' : 'All required consents were obtained'}</li>
                <li>{isPt ? 'O Cliente tem direitos legais para processar os dados' : 'The Customer has legal rights to process the data'}</li>
              </ul>
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                {isPt
                  ? 'AI CoachCall não verifica o consentimento ou legalidade do conteúdo carregado.'
                  : 'AI CoachCall does not verify consent or legality of uploaded content.'}
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                5. {isPt ? 'Uso Aceitável' : 'Acceptable Use'}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-3">
                {isPt ? 'O Cliente não deve:' : 'The Customer shall not:'}
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
                <li>{isPt ? 'Carregar conteúdo gravado ilegalmente' : 'Upload illegally recorded content'}</li>
                <li>{isPt ? 'Carregar conteúdo sem base legal adequada' : 'Upload content without proper legal basis'}</li>
                <li>{isPt ? 'Usar o Serviço para fins ilegais, abusivos ou fraudulentos' : 'Use the Service for unlawful, abusive, or fraudulent purposes'}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                6. {isPt ? 'Aviso sobre IA' : 'AI Disclaimer'}
              </h2>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1 mb-3">
                <li>{isPt ? 'Os resultados da IA são probabilísticos e podem conter erros' : 'AI outputs are probabilistic and may contain errors'}</li>
                <li>{isPt ? 'Os insights são apenas consultivos' : 'Insights are advisory only'}</li>
                <li>{isPt ? 'É necessária supervisão humana' : 'Human supervision is required'}</li>
              </ul>
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                {isPt
                  ? 'AI CoachCall não toma decisões juridicamente vinculativas ou automatizadas.'
                  : 'AI CoachCall does not make legally binding or automated decisions.'}
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                7. {isPt ? 'Taxas e Limites de Uso' : 'Fees & Usage Limits'}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {isPt
                  ? 'O acesso está sujeito aos planos e limites subscritos. A Empresa pode limitar, suspender ou bloquear o uso que exceda os limites justos ou contratuais.'
                  : 'Access is subject to subscribed plans and limits. The Company may limit, suspend, or block usage exceeding fair or contractual limits.'}
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                8. {isPt ? 'Suspensão e Rescisão' : 'Suspension & Termination'}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-3">
                {isPt ? 'A Empresa pode suspender ou rescindir o acesso em caso de:' : 'The Company may suspend or terminate access in case of:'}
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
                <li>{isPt ? 'Violação destes Termos' : 'Breach of these Terms'}</li>
                <li>{isPt ? 'Uso ilegal' : 'Illegal use'}</li>
                <li>{isPt ? 'Falha de pagamento' : 'Payment failure'}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                9. {isPt ? 'Propriedade Intelectual' : 'Intellectual Property'}
              </h2>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
                <li>{isPt ? 'A plataforma e software permanecem propriedade da Empresa' : 'The platform and software remain Company property'}</li>
                <li>{isPt ? 'O Cliente mantém a propriedade dos dados carregados' : 'The Customer retains ownership of uploaded data'}</li>
                <li>{isPt ? 'Dados agregados e anonimizados podem ser usados para melhorar o Serviço' : 'Aggregated and anonymized data may be used to improve the Service'}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                10. {isPt ? 'Limitação de Responsabilidade' : 'Limitation of Liability'}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {isPt
                  ? 'Na máxima extensão permitida por lei, a Empresa não será responsável por danos indiretos ou consequenciais. A responsabilidade total é limitada às taxas pagas nos últimos 12 meses.'
                  : 'To the maximum extent permitted by law, the Company shall not be liable for indirect or consequential damages. Total liability is limited to fees paid in the last 12 months.'}
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                11. {isPt ? 'Lei Aplicável' : 'Governing Law'}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {isPt
                  ? 'Estes Termos são regidos pela lei portuguesa. Jurisdição: Lisboa, Portugal.'
                  : 'These Terms are governed by Portuguese law. Jurisdiction: Lisbon, Portugal.'}
              </p>
            </section>
          </CardContent>
        </Card>

        {/* AI Transparency */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center space-x-3">
              <Bot className="w-6 h-6 text-green-600" />
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                {isPt ? 'Transparência e Aviso sobre IA' : 'AI Transparency & Disclaimer'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li className="flex items-start space-x-2">
                <span className="text-green-600 mt-1">•</span>
                <span>{isPt ? 'AI CoachCall usa modelos de machine learning' : 'AI CoachCall uses machine learning models'}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-600 mt-1">•</span>
                <span>{isPt ? 'Os resultados podem ser imprecisos ou incompletos' : 'Outputs may be inaccurate or incomplete'}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-600 mt-1">•</span>
                <span>{isPt ? 'Os resultados são não vinculativos e consultivos' : 'Results are non-binding and advisory'}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-600 mt-1">•</span>
                <span>{isPt ? 'É necessária supervisão humana' : 'Human oversight is required'}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-600 mt-1">•</span>
                <span>{isPt ? 'AI CoachCall não substitui o julgamento profissional' : 'AI CoachCall does not replace professional judgment'}</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Acceptable Use */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center space-x-3">
              <Ban className="w-6 h-6 text-red-600" />
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                {isPt ? 'Uso Aceitável e Política de Conteúdo' : 'Acceptable Use & Content Policy'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {isPt ? 'Os Clientes não podem carregar:' : 'Customers may not upload:'}
            </p>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300 mb-4">
              <li className="flex items-start space-x-2">
                <span className="text-red-600 mt-1">✕</span>
                <span>{isPt ? 'Gravações obtidas ilegalmente' : 'Illegally obtained recordings'}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-red-600 mt-1">✕</span>
                <span>{isPt ? 'Conteúdo envolvendo menores' : 'Content involving minors'}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-red-600 mt-1">✕</span>
                <span>{isPt ? 'Dados sensíveis sem base legal' : 'Sensitive data without legal basis'}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-red-600 mt-1">✕</span>
                <span>{isPt ? 'Conteúdo que viole a lei aplicável' : 'Content violating applicable law'}</span>
              </li>
            </ul>
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              {isPt ? 'Violações podem resultar em suspensão.' : 'Violations may result in suspension.'}
            </p>
          </CardContent>
        </Card>

        {/* Fair Use */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center space-x-3">
              <Scale className="w-6 h-6 text-blue-600" />
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                {isPt ? 'Uso Justo e Limitações do Serviço' : 'Fair Use & Service Limitations'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {isPt ? 'Para garantir a estabilidade da plataforma:' : 'To ensure platform stability:'}
            </p>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>{isPt ? 'Limites de uso aplicam-se por plano' : 'Usage limits apply per plan'}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>{isPt ? 'Uso excessivo ou abusivo pode ser limitado' : 'Excessive or abusive usage may be limited'}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>{isPt ? 'Velocidade de processamento ou acesso pode ser restringido' : 'Processing speed or access may be restricted'}</span>
              </li>
            </ul>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 italic">
              {isPt
                ? 'A Empresa reserva-se o direito de proteger a integridade do sistema.'
                : 'The Company reserves the right to protect system integrity.'}
            </p>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center space-x-3">
              <Lock className="w-6 h-6 text-green-600" />
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                {isPt ? 'Política de Segurança' : 'Security Policy'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {isPt ? 'AI CoachCall aplica:' : 'AI CoachCall applies:'}
            </p>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300 mb-4">
              <li className="flex items-start space-x-2">
                <Shield className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                <span>{isPt ? 'Encriptação (em trânsito e em repouso)' : 'Encryption (in transit & at rest)'}</span>
              </li>
              <li className="flex items-start space-x-2">
                <Shield className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                <span>{isPt ? 'Controlo de acesso baseado em funções' : 'Role-based access control'}</span>
              </li>
              <li className="flex items-start space-x-2">
                <Shield className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                <span>{isPt ? 'Infraestrutura cloud segura' : 'Secure cloud infrastructure'}</span>
              </li>
              <li className="flex items-start space-x-2">
                <Shield className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                <span>{isPt ? 'Monitorização regular' : 'Regular monitoring'}</span>
              </li>
            </ul>
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              {isPt ? 'Nenhum sistema é 100% seguro.' : 'No system is 100% secure.'}
            </p>
          </CardContent>
        </Card>

        {/* Data Retention */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center space-x-3">
              <Trash2 className="w-6 h-6 text-orange-600" />
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                {isPt ? 'Política de Retenção e Eliminação de Dados' : 'Data Retention & Deletion Policy'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li className="flex items-start space-x-2">
                <span className="text-orange-600 mt-1">•</span>
                <span>{isPt ? 'Os dados são retidos apenas pelo tempo necessário' : 'Data is retained only as necessary'}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-orange-600 mt-1">•</span>
                <span>{isPt ? 'Os Clientes podem solicitar eliminação' : 'Customers may request deletion'}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-orange-600 mt-1">•</span>
                <span>{isPt ? 'Eliminação automática aplica-se após o período de retenção' : 'Automatic deletion applies after retention period'}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-orange-600 mt-1">•</span>
                <span>{isPt ? 'Opções de exportação podem estar disponíveis antes da eliminação' : 'Export options may be available before deletion'}</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Third-Party */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center space-x-3">
              <Plug className="w-6 h-6 text-purple-600" />
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                {isPt ? 'Aviso sobre Serviços de Terceiros' : 'Third-Party Services Disclaimer'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-600 dark:text-gray-300">
              {isPt
                ? 'O Serviço depende de fornecedores terceiros (cloud, IA, infraestrutura). AI CoachCall não é responsável por interrupções ou falhas fora do seu controlo.'
                : 'The Service relies on third-party providers (cloud, AI, infrastructure). AI CoachCall is not responsible for outages or failures beyond its control.'}
            </p>
          </CardContent>
        </Card>

        {/* Beta Features */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center space-x-3">
              <Beaker className="w-6 h-6 text-cyan-600" />
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                {isPt ? 'Aviso sobre Funcionalidades Beta' : 'Beta Features Disclaimer'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {isPt ? 'Algumas funcionalidades podem estar identificadas como "Beta":' : 'Some features may be labeled "Beta":'}
            </p>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li className="flex items-start space-x-2">
                <span className="text-cyan-600 mt-1">•</span>
                <span>{isPt ? 'Fornecidas "tal como estão"' : 'Provided "as is"'}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-cyan-600 mt-1">•</span>
                <span>{isPt ? 'Podem mudar ou ser descontinuadas' : 'May change or be discontinued'}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-cyan-600 mt-1">•</span>
                <span>{isPt ? 'Sem garantias de disponibilidade ou precisão' : 'No guarantees of availability or accuracy'}</span>
              </li>
            </ul>
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
