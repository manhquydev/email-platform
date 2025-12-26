import React, { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { api } from '../../utils/api';
import toast from 'react-hot-toast';

interface PasskeyLoginProps {
    onSuccess: (token: string, user: any) => void;
}

export const PasskeyLogin: React.FC<PasskeyLoginProps> = ({ onSuccess }) => {
    const [loading, setLoading] = useState(false);

    const handlePasskeyLogin = async () => {
        setLoading(true);
        try {
            const optionsResp = await api<any>('/auth/webauthn/login/options', { method: 'POST', body: {} });
            const options = optionsResp; // api returns T directly based on usage seen in Settings.tsx

            // 2. Pass options to browser authenticator
            let asseResp;
            try {
                // Fix: Pass as named object { optionsJSON } for v13+
                asseResp = await startAuthentication({ optionsJSON: options });
            } catch (error) {
                toast.error("Passkey cancelled or not available.");
                setLoading(false);
                return;
            }

            // 3. Send response to server to verify
            const verifyResp = await api<any>('/auth/webauthn/login/verify', {
                method: 'POST',
                body: {
                    ...asseResp,
                    challengeId: options.challenge
                }
            });

            const { token, user } = verifyResp;
            toast.success("Logged in with Passkey!");
            onSuccess(token, user);
        } catch (error) {
            toast.error("Passkey login failed. Please try again or use password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handlePasskeyLogin}
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
            {loading ? (
                <>Logging in...</>
            ) : (
                <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.2-2.858.59-4.17M5.38 2.61A8.1 8.1 0 0112 0a8.1 8.1 0 018.12 4.06" />
                    </svg>
                    Sign in with Passkey
                </>
            )}
        </button>
    );
};
