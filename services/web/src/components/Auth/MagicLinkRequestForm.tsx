import React, { useState } from 'react';
import { api } from '../../utils/api';
import toast from 'react-hot-toast';

interface MagicLinkRequestFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

export const MagicLinkRequestForm: React.FC<MagicLinkRequestFormProps> = ({ onSuccess, onCancel }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api('/auth/magic-link/request', { method: 'POST', body: { email } });
            setSent(true);
            toast.success('Login link sent! Please check your email.');
            if (onSuccess) onSuccess();
        } catch {
            toast.error('Failed to send login link.');
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="text-center">
                <div className="mb-4 text-green-500">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Check your email</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    We've sent a login link to <strong>{email}</strong>.
                </p>
                <button
                    onClick={() => setSent(false)}
                    className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                    Try another email
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="magic-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email address
                </label>
                <input
                    id="magic-email"
                    type="email"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-3 border"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                />
            </div>

            <div className="flex flex-col gap-3">
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {loading ? 'Sending...' : 'Send Login Link'}
                </button>

                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
};
