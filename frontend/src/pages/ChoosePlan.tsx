import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Phone, Zap, Check, X, LogOut, Loader2, Clock } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { stripeApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY as string);

export default function ChoosePlan() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout, refreshSubscription, user } = useAuth();
  const [searchParams] = useSearchParams();

  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null);
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  // Check if returning from Stripe checkout (session_id in URL)
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      setIsActivating(true);
      // Poll subscription status until active
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const sub = await stripeApi.getSubscriptionStatus();
          if (sub.status === 'active') {
            clearInterval(poll);
            await refreshSubscription();
            toast.success(t('choosePlan.activated', 'Subscription activated!'));
            navigate('/dashboard', { replace: true });
          }
        } catch {
          // ignore polling errors
        }
        if (attempts >= 15) {
          clearInterval(poll);
          setIsActivating(false);
          toast.success(t('choosePlan.processing', 'Payment processing. Please refresh in a moment.'));
        }
      }, 2000);
      return () => clearInterval(poll);
    }
  }, [searchParams, refreshSubscription, navigate, t]);

  const handleSubscribe = async (plan: string) => {
    setSubscribingPlan(plan);
    try {
      const { clientSecret } = await stripeApi.createCheckoutSession(plan, '/choose-plan');
      if (clientSecret) {
        setCheckoutClientSecret(clientSecret);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('choosePlan.error', 'Failed to start checkout'));
    } finally {
      setSubscribingPlan(null);
    }
  };

  const handleCloseCheckout = useCallback(() => {
    setCheckoutClientSecret(null);
  }, []);

  const plans = [
    { name: 'starter', price: '25', color: 'green-600', minutes: t('settings.starterMin', '20 hours included'), features: [t('settings.feature1', 'AI call analysis & scoring'), t('settings.feature2', 'Real-time transcription')] },
    { name: 'medium', price: '50', color: 'blue-600', minutes: t('settings.mediumMin', '40 hours included'), features: [t('settings.feature3', 'Performance reports & analytics'), t('settings.feature4', 'Coaching recommendations')] },
    { name: 'pro', price: '75', color: 'purple-600', minutes: t('settings.proMin', '60 hours included'), features: [t('settings.feature5', 'Custom evaluation criteria'), t('settings.feature6', 'Team management')], popular: true },
    { name: 'master', price: '99', color: 'amber-500', minutes: t('settings.masterMin', 'Unlimited hours'), features: [t('settings.masterSupport', 'Priority support'), t('settings.masterAll', 'All features included')] },
  ];

  const colorClasses: Record<string, string> = {
    'green-600': 'text-green-600',
    'blue-600': 'text-blue-600',
    'purple-600': 'text-purple-600',
    'amber-500': 'text-amber-500',
  };

  const isAgent = user?.role === 'agent';

  if (isActivating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
        <p className="text-lg text-gray-700 dark:text-gray-300">
          {t('choosePlan.activating', 'Activating your subscription...')}
        </p>
      </div>
    );
  }

  // Agents don't handle payments — show a "waiting for admin" message
  if (isAgent) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-600 text-white">
                  <Phone className="w-5 h-5" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">AI CoachCall</span>
              </div>
              <Button
                variant="ghost"
                className="text-gray-700 dark:text-gray-300"
                onClick={() => logout()}
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('auth.logout', 'Logout')}
              </Button>
            </div>
          </div>
        </nav>
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <div className="flex justify-center mb-6">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30">
              <Clock className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            {t('choosePlan.waitingTitle', 'Account created successfully!')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('choosePlan.waitingDescription', 'Your administrator needs to activate the subscription before you can start using the platform.')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('choosePlan.waitingHint', 'Please contact your administrator and try again later.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-600 text-white">
                <Phone className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">AI CoachCall</span>
            </div>
            <Button
              variant="ghost"
              className="text-gray-700 dark:text-gray-300"
              onClick={() => logout()}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('auth.logout', 'Logout')}
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            {t('choosePlan.title', 'Choose your plan')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {t('choosePlan.subtitle', 'An active subscription is required to use AI CoachCall')}
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isSubscribing = subscribingPlan === plan.name;
            const checkColor = colorClasses[plan.color] || 'text-green-600';

            return (
              <div
                key={plan.name}
                className={`relative bg-white dark:bg-gray-800 rounded-xl border-2 p-6 transition-colors ${
                  plan.popular
                    ? 'border-green-500 dark:border-green-600'
                    : 'border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-600'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-600 text-white">
                      {t('settings.popular', 'Popular')}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <Zap className={`w-5 h-5 ${checkColor}`} />
                  <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{plan.name}</span>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {plan.price}€<span className="text-sm font-normal text-gray-500">{t('settings.perMonth', '/month')}</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('settings.perUser', 'per user')}</p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-5">
                  <li className="flex items-center gap-2"><Check className={`w-4 h-4 ${checkColor} flex-shrink-0`} />{plan.minutes}</li>
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2"><Check className={`w-4 h-4 ${checkColor} flex-shrink-0`} />{feature}</li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscribe(plan.name)}
                  disabled={!!subscribingPlan}
                  className="w-full py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubscribing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubscribing ? t('settings.redirecting', 'Processing...') : t('settings.subscribe', 'Subscribe')}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Embedded Checkout Modal */}
      {checkoutClientSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-xl shadow-2xl">
            <button
              onClick={handleCloseCheckout}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="p-1">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ clientSecret: checkoutClientSecret }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
