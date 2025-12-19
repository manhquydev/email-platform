import { useState } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';

interface UpgradePromptProps {
  onClose: () => void;
  reason?: 'quota_exceeded' | 'feature_locked' | 'trial_ending';
  resource?: string;
  currentUsage?: number;
  limit?: number;
}

export function UpgradePrompt({ onClose, reason = 'quota_exceeded', resource, currentUsage, limit }: UpgradePromptProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Fetch quota info
  const { data: quotaInfo } = useQuery({
    queryKey: ['user-quota'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/public/quota`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.json();
    }
  });

  // Fetch tier comparison
  const { data: comparison } = useQuery({
    queryKey: ['quota-comparison'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/public/quota/comparison`);
      return response.json();
    }
  });

  const handleUpgrade = async (tier: 'premium' | 'business') => {
    setIsUpgrading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/public/auth/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ tier })
      });

      if (response.ok) {
        window.location.href = '/billing?upgrade=success';
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to upgrade');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setIsUpgrading(false);
    }
  };

  const getPromptContent = () => {
    switch (reason) {
      case 'quota_exceeded':
        return {
          title: `Your ${resource || 'resource'} quota has been exceeded`,
          description: `You've reached your limit of ${limit} ${resource}s. Upgrade to continue using this feature.`,
          icon: (
            <svg className="h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )
        };
      case 'feature_locked':
        return {
          title: 'Premium Feature',
          description: 'This feature is available on Premium and Business plans. Upgrade to unlock it.',
          icon: (
            <svg className="h-12 w-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )
        };
      case 'trial_ending':
        return {
          title: 'Your trial is ending soon',
          description: 'Upgrade now to keep using Premium features and avoid service interruption.',
          icon: (
            <svg className="h-12 w-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
      default:
        return {
          title: 'Upgrade Your Plan',
          description: 'Get more features and higher limits with our Premium plans.',
          icon: (
            <svg className="h-12 w-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )
        };
    }
  };

  const content = getPromptContent();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              {content.icon}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{content.title}</h2>
                <p className="mt-1 text-gray-600">{content.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Current Usage */}
          {quotaInfo && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Your Current Usage</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Plan:</span>
                  <span className="text-sm font-medium capitalize">{quotaInfo.tier}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Domains:</span>
                  <span className="text-sm font-medium">{quotaInfo.usage.domains}/{quotaInfo.limits.maxDomains}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Inboxes:</span>
                  <span className="text-sm font-medium">{quotaInfo.usage.inboxes}/{quotaInfo.limits.maxInboxes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Emails this month:</span>
                  <span className="text-sm font-medium">{quotaInfo.usage.emailsReceived}/{quotaInfo.limits.maxEmailsPerMonth}</span>
                </div>
              </div>
            </div>
          )}

          {/* Upgrade Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Premium Plan */}
            <div className="border-2 border-indigo-500 rounded-lg p-6 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-indigo-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                RECOMMENDED
              </div>
              <h3 className="text-xl font-bold text-gray-900">Premium</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold">$9.99</span>
                <span className="text-gray-600">/month</span>
              </div>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                  <span className="text-sm text-gray-700">10 custom domains</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                  <span className="text-sm text-gray-700">100 temporary inboxes</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                  <span className="text-sm text-gray-700">10,000 emails/month</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                  <span className="text-sm text-gray-700">1-week email retention</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                  <span className="text-sm text-gray-700">Custom branding</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                  <span className="text-sm text-gray-700">Priority support</span>
                </li>
              </ul>
              <button
                onClick={() => handleUpgrade('premium')}
                disabled={isUpgrading}
                className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {isUpgrading ? 'Processing...' : 'Upgrade to Premium'}
              </button>
            </div>

            {/* Business Plan */}
            <div className="border border-gray-300 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900">Business</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold">$49.99</span>
                <span className="text-gray-600">/month</span>
              </div>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                  <span className="text-sm text-gray-700">100 custom domains</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                  <span className="text-sm text-gray-700">1,000 temporary inboxes</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                  <span className="text-sm text-gray-700">100,000 emails/month</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                  <span className="text-sm text-gray-700">30-day email retention</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                  <span className="text-sm text-gray-700">Team collaboration</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                  <span className="text-sm text-gray-700">API access</span>
                </li>
              </ul>
              <button
                onClick={() => handleUpgrade('business')}
                disabled={isUpgrading}
                className="mt-6 w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {isUpgrading ? 'Processing...' : 'Upgrade to Business'}
              </button>
            </div>
          </div>

          {/* Benefits */}
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">✨ Upgrade Benefits:</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Instant activation - no waiting</li>
              <li>• Cancel anytime - no commitment</li>
              <li>• 30-day money-back guarantee</li>
              <li>• Priority customer support</li>
            </ul>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Have questions? <a href="/contact" className="text-indigo-600 hover:text-indigo-700">Contact our support team</a>
            </p>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}