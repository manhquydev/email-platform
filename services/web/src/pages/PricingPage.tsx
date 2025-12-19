import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

const plans = [
  {
    name: 'Free',
    id: 'free',
    price: 0,
    currency: 'USD',
    period: 'month',
    description: 'Perfect for personal use and testing',
    features: {
      '1 custom domain': true,
      '10 temporary inboxes': true,
      '100 emails per month': true,
      '24-hour email retention': true,
      'Basic email forwarding': true,
      'API access (100 calls/day)': true,
      'Community support': true,
      'Custom branding': false,
      'Advanced filters': false,
      'Email automation': false,
      'Priority support': false,
      'Team collaboration': false
    },
    cta: 'Get Started',
    ctaLink: '/signup',
    popular: false
  },
  {
    name: 'Premium',
    id: 'premium',
    price: 9.99,
    currency: 'USD',
    period: 'month',
    description: 'Best for power users and small businesses',
    features: {
      '10 custom domains': true,
      '100 temporary inboxes': true,
      '10,000 emails per month': true,
      '1-week email retention': true,
      'Advanced email forwarding': true,
      'API access (1,000 calls/day)': true,
      'Email support': true,
      'Custom branding': true,
      'Advanced filters': true,
      'Email automation': true,
      'Priority support': false,
      'Team collaboration': false
    },
    cta: 'Start Free Trial',
    ctaLink: '/signup?tier=premium&trial=true',
    popular: true
  },
  {
    name: 'Business',
    id: 'business',
    price: 49.99,
    currency: 'USD',
    period: 'month',
    description: 'Perfect for growing businesses',
    features: {
      '100 custom domains': true,
      '1,000 temporary inboxes': true,
      '100,000 emails per month': true,
      '30-day email retention': true,
      'Advanced email forwarding': true,
      'Unlimited API access': true,
      'Priority email support': true,
      'Custom branding': true,
      'Advanced filters': true,
      'Email automation': true,
      'Priority support': true,
      'Team collaboration (10 users)': true
    },
    cta: 'Start Free Trial',
    ctaLink: '/signup?tier=business&trial=true',
    popular: false
  },
  {
    name: 'Enterprise',
    id: 'enterprise',
    price: null,
    currency: 'USD',
    period: 'month',
    description: 'Custom solutions for large organizations',
    features: {
      'Unlimited custom domains': true,
      'Unlimited temporary inboxes': true,
      'Unlimited emails': true,
      'Unlimited email retention': true,
      'Advanced email forwarding': true,
      'Unlimited API access': true,
      'Dedicated support': true,
      'Custom branding': true,
      'Advanced filters': true,
      'Email automation': true,
      'Priority support': true,
      'Unlimited team members': true
    },
    cta: 'Contact Sales',
    ctaLink: '/contact-sales',
    popular: false
  }
];

export default function PricingPage() {
  const [searchParams] = useSearchParams();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const selectedTier = searchParams.get('tier');

  // Fetch tier comparison data
  const { data: comparison } = useQuery({
    queryKey: ['quota-comparison'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/public/quota/comparison`);
      return response.json();
    }
  });

  // Scroll to selected plan if specified in URL
  useEffect(() => {
    if (selectedTier) {
      const element = document.getElementById(selectedTier);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedTier]);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link to="/" className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">TempMail Pro</span>
            </Link>
            <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium">
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="py-16 bg-gradient-to-br from-indigo-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Choose the perfect plan for your needs. Start free and upgrade anytime.
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 flex justify-center">
            <div className="bg-white rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingPeriod === 'monthly'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingPeriod === 'yearly'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Yearly (Save 20%)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => {
              const yearlyPrice = plan.price ? plan.price * 12 * 0.8 : null;
              const displayPrice = billingPeriod === 'yearly' ? yearlyPrice : plan.price;

              return (
                <div
                  key={plan.id}
                  id={plan.id}
                  className={`relative rounded-2xl bg-white shadow-xl overflow-hidden transform transition-all duration-200 hover:scale-105 ${
                    plan.popular ? 'ring-2 ring-indigo-600 scale-105' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 inset-x-0">
                      <div className="bg-indigo-600 text-white text-center py-2 text-sm font-medium">
                        Most Popular
                      </div>
                    </div>
                  )}

                  <div className={`p-8 ${plan.popular ? 'pt-12' : ''}`}>
                    <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                    <p className="mt-2 text-sm text-gray-600">{plan.description}</p>

                    <div className="mt-8">
                      {plan.price !== null ? (
                        <div>
                          <span className="text-4xl font-bold text-gray-900">
                            ${displayPrice?.toFixed(2)}
                          </span>
                          <span className="text-gray-600 ml-2">/{billingPeriod.slice(0, -2)}</span>
                        </div>
                      ) : (
                        <span className="text-4xl font-bold text-gray-900">Custom</span>
                      )}
                    </div>

                    <div className="mt-8 space-y-4">
                      {Object.entries(plan.features).map(([feature, included]) => (
                        <div key={feature} className="flex items-start">
                          {included ? (
                            <CheckIcon className="h-6 w-6 text-green-500 flex-shrink-0" />
                          ) : (
                            <XMarkIcon className="h-6 w-6 text-gray-400 flex-shrink-0" />
                          )}
                          <span className={`ml-3 text-sm ${included ? 'text-gray-700' : 'text-gray-400'}`}>
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    <Link
                      to={plan.ctaLink}
                      className={`mt-8 block w-full py-3 px-6 rounded-lg font-semibold text-center transition-colors ${
                        plan.popular
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                      }`}
                    >
                      {plan.cta}
                    </Link>

                    {billingPeriod === 'yearly' && plan.price !== null && (
                      <p className="mt-4 text-center text-sm text-gray-600">
                        Save ${((plan.price * 12 - yearlyPrice!).toFixed(2))} per year
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Can I change plans anytime?</h3>
                <p className="mt-2 text-gray-600">
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">What happens if I exceed my limits?</h3>
                <p className="mt-2 text-gray-600">
                  You'll receive notifications when approaching your limits. To continue using the service, you'll need to upgrade to a higher tier.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Do you offer a free trial?</h3>
                <p className="mt-2 text-gray-600">
                  Yes! Premium and Business plans come with a 14-day free trial. No credit card required to start.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">What payment methods do you accept?</h3>
                <p className="mt-2 text-gray-600">
                  We accept all major credit cards, PayPal, and wire transfers for Enterprise plans.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Is my data secure?</h3>
                <p className="mt-2 text-gray-600">
                  Absolutely. We use end-to-end encryption and never sell your data to third parties. Your privacy is our priority.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Can I cancel anytime?</h3>
                <p className="mt-2 text-gray-600">
                  Yes, you can cancel your subscription at any time. Your service will continue until the end of your billing period.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gradient-to-br from-indigo-600 to-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to get started?
          </h2>
          <p className="mt-4 text-xl text-indigo-200">
            Join thousands of users protecting their privacy with TempMail Pro
          </p>
          <div className="mt-8">
            <Link
              to="/signup"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-700 hover:bg-indigo-800 transition-colors"
            >
              Start Free Today
              <svg
                className="ml-2 h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}