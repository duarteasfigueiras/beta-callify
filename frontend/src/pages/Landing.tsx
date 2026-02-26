import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Phone,
  BarChart3,
  Brain,
  Shield,
  Users,
  Zap,
  CheckCircle2,
  ArrowRight,
  Star,
  Headphones,
  FileText,
  TrendingUp,
  LayoutDashboard,
  LogOut,
  Globe,
  X,
  Check,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import ScreenshotPreview from '../components/ScreenshotPreview';
import { useAuth } from '../contexts/AuthContext';

export default function Landing() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, logout } = useAuth();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'pt' ? 'en' : 'pt';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const features = [
    {
      icon: Brain,
      title: t('landing.features.ai.title', 'AI CoachCall Analysis'),
      description: t('landing.features.ai.description', 'Every call is automatically analyzed by AI CoachCall, which evaluates performance, identifies patterns, and suggests improvements.'),
    },
    {
      icon: FileText,
      title: t('landing.features.transcription.title', 'Real-Time Transcription'),
      description: t('landing.features.transcription.description', 'Get full call transcriptions with speaker identification, timestamps, and keyword highlighting.'),
    },
    {
      icon: BarChart3,
      title: t('landing.features.reports.title', 'Detailed Reports'),
      description: t('landing.features.reports.description', 'Dashboards with performance metrics, score evolution, contact reasons, and team comparisons.'),
    },
    {
      icon: Shield,
      title: t('landing.features.criteria.title', 'Custom Criteria'),
      description: t('landing.features.criteria.description', 'Define your own evaluation criteria and scoring rules to match your business standards.'),
    },
    {
      icon: Users,
      title: t('landing.features.team.title', 'Team Management'),
      description: t('landing.features.team.description', 'Manage users, track individual performance, and identify coaching opportunities across your team.'),
    },
    {
      icon: Zap,
      title: t('landing.features.alerts.title', 'Smart Alerts'),
      description: t('landing.features.alerts.description', 'Automatic alerts for low scores, risk words, and compliance issues so nothing goes unnoticed.'),
    },
  ];

  const steps = [
    {
      number: '01',
      icon: Headphones,
      title: t('landing.steps.connect.title', 'Connect Your Calls'),
      description: t('landing.steps.connect.description', 'Integrate with your telephony provider or upload call recordings. Setup takes minutes.'),
    },
    {
      number: '02',
      icon: Brain,
      title: t('landing.steps.analyze.title', 'AI CoachCall Analyzes Everything'),
      description: t('landing.steps.analyze.description', 'AI CoachCall transcribes, scores, and extracts insights from every conversation automatically.'),
    },
    {
      number: '03',
      icon: TrendingUp,
      title: t('landing.steps.improve.title', 'Improve Performance'),
      description: t('landing.steps.improve.description', 'Use actionable insights and coaching recommendations to boost your team\'s results.'),
    },
  ];

  const [billingAnnual, setBillingAnnual] = useState(false);
  const discount = 5;

  const planColumns = [
    { name: 'Basic Call Analysis', monthly: 30, popular: false },
    { name: 'Pro Performance Control', monthly: 40, popular: true },
    { name: 'Business', monthly: 50, popular: false },
  ].map(p => ({
    ...p,
    price: billingAnnual ? p.monthly - discount : p.monthly,
  }));

  const comparisonFeatures: { label: string; basic: boolean; pro: boolean; business: boolean }[] = [
    { label: t('landing.pricing.grid.coreAnalysis', 'Transcription, AI analysis & summary'), basic: true, pro: true, business: true },
    { label: t('landing.pricing.grid.callTracking', 'Call history, type & flow detection'), basic: true, pro: true, business: true },
    { label: t('landing.pricing.grid.detailedFeedback', 'Detailed scoring & feedback per criterion'), basic: false, pro: true, business: true },
    { label: t('landing.pricing.grid.reports', 'Reports, filters & PDF export'), basic: false, pro: true, business: true },
    { label: t('landing.pricing.grid.alerts', 'Automatic alerts & risk words'), basic: false, pro: true, business: true },
    { label: t('landing.pricing.grid.coaching', 'Metrics, goals & coaching'), basic: false, pro: true, business: true },
    { label: t('landing.pricing.grid.teamInsights', 'Team comparison, ranking & evolution'), basic: false, pro: false, business: true },
    { label: t('landing.pricing.grid.prioritySupport', 'Priority support'), basic: false, pro: false, business: true },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-50 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-600 text-white">
                <Phone className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">AI CoachCall</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-sm text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                {t('landing.nav.features', 'Features')}
              </a>
              <a href="#how-it-works" className="text-sm text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                {t('landing.nav.howItWorks', 'How it Works')}
              </a>
              <a href="#pricing" className="text-sm text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                {t('landing.nav.pricing', 'Pricing')}
              </a>
            </div>
            <div className="flex items-center space-x-3">
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard">
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    className="text-gray-700 dark:text-gray-300"
                    onClick={() => logout()}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('auth.logout', 'Logout')}
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" className="text-gray-700 dark:text-gray-300">
                      {t('auth.login', 'Login')}
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      {t('landing.nav.getStarted', 'Get Started')}
                    </Button>
                  </Link>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleLanguage}
                title={i18n.language === 'pt' ? 'English' : 'Português'}
                className="text-gray-600 dark:text-gray-300"
              >
                <Globe className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-1.5 mb-6 rounded-full bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
            <Star className="w-4 h-4 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              {t('landing.hero.badge', 'AI CoachCall — Call Analysis Platform')}
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
            {t('landing.hero.title', 'Transform Every Call Into a')}
            <br />
            <span className="text-green-600">{t('landing.hero.titleHighlight', 'Coaching Opportunity')}</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-10">
            {t('landing.hero.subtitle', 'AI CoachCall analyzes your team\'s calls in real-time, providing scores, transcriptions, and actionable coaching recommendations to improve performance.')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg h-auto">
                {t('landing.hero.cta', 'Start Free Trial')}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" className="px-8 py-3 text-lg h-auto border-gray-300 dark:border-gray-600">
                {t('landing.hero.secondary', 'See How It Works')}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Platform Preview — Interactive Screenshots */}
      <ScreenshotPreview />

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('landing.features.title', 'Everything You Need to Coach Your Team')}
            </h2>
            <p className="max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400">
              {t('landing.features.subtitle', 'Powerful tools to monitor, analyze, and improve call quality across your entire organization.')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-4">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('landing.howItWorks.title', 'How It Works')}
            </h2>
            <p className="max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400">
              {t('landing.howItWorks.subtitle', 'Get started in three simple steps and see results from day one.')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-600 text-white mb-6">
                  <step.icon className="w-7 h-7" />
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-green-800 text-white text-xs font-bold flex items-center justify-center">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('landing.pricing.title', 'Simple, Transparent Pricing')}
            </h2>
            <p className="max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400">
              {t('landing.pricing.subtitle', 'Choose the plan that fits your team. All plans include core AI analysis features.')}
            </p>
          </div>

          {/* Billing toggle — segmented control */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 p-1">
              <button
                onClick={() => setBillingAnnual(false)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  !billingAnnual
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {t('landing.pricing.monthly', 'Monthly')}
              </button>
              <button
                onClick={() => setBillingAnnual(true)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  billingAnnual
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {t('landing.pricing.annual', 'Annual')}
                <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-[11px] font-semibold whitespace-nowrap">
                  -{discount}€/{t('landing.pricing.month', 'month')}
                </span>
              </button>
            </div>
          </div>

          {/* Plan headers */}
          <div className="max-w-5xl mx-auto bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="grid grid-cols-4">
              {/* Empty top-left cell */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700" />
              {/* Plan columns */}
              {planColumns.map((plan, index) => (
                <div
                  key={index}
                  className={`relative p-4 text-center border-b border-l border-gray-200 dark:border-gray-700 ${
                    plan.popular ? 'bg-green-50 dark:bg-green-900/20' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-0 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-green-600 text-white text-[10px] font-bold rounded-b-lg">
                      {t('landing.pricing.popular', 'Most Popular')}
                    </div>
                  )}
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mt-2 mb-1">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1">
                    {billingAnnual && (
                      <span className="text-base text-gray-400 dark:text-gray-500 line-through">€{plan.monthly}</span>
                    )}
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">€{plan.price}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">/{t('landing.pricing.month', 'month')}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t('landing.pricing.perUser', 'per user')}
                  </p>
                </div>
              ))}
            </div>

            {/* Feature rows */}
            {comparisonFeatures.map((feature, index) => (
              <div key={index} className={`grid grid-cols-4 ${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'}`}>
                <div className="p-3 pl-5 flex items-center">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{feature.label}</span>
                </div>
                {[feature.basic, feature.pro, feature.business].map((included, colIdx) => (
                  <div
                    key={colIdx}
                    className={`p-3 flex items-center justify-center border-l border-gray-200 dark:border-gray-700 ${
                      colIdx === 1 ? 'bg-green-50/50 dark:bg-green-900/10' : ''
                    }`}
                  >
                    {included ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                    )}
                  </div>
                ))}
              </div>
            ))}

            {/* CTA buttons row */}
            <div className="grid grid-cols-4 border-t border-gray-200 dark:border-gray-700">
              <div className="p-4" />
              {planColumns.map((plan, index) => (
                <div key={index} className={`p-4 border-l border-gray-200 dark:border-gray-700 ${index === 1 ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                  <Link to="/register">
                    <Button
                      className={`w-full ${
                        plan.popular
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                      }`}
                    >
                      {t('landing.pricing.choosePlan', 'Choose Plan')}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t('landing.cta.title', 'Ready to Transform Your Call Quality?')}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            {t('landing.cta.subtitle', 'Join teams that are already using AI to coach and improve their call performance every day.')}
          </p>
          <Link to="/register">
            <Button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg h-auto">
              {t('landing.cta.button', 'Get Started Now')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-600 text-white">
                <Phone className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">AI CoachCall</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
              <Link to="/terms" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">
                {t('landing.footer.terms', 'Terms of Service')}
              </Link>
              <Link to="/privacy" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">
                {t('landing.footer.privacy', 'Privacy Policy')}
              </Link>
              <a href="mailto:support@aicoachcall.com" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">
                {t('landing.footer.contact', 'Contact')}
              </a>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              © {new Date().getFullYear()} AI CoachCall
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
