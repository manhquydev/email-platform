import { useState, useEffect } from 'react';
import browser from 'webextension-polyfill';
import { OtpData } from '../shared/types';

export function useOtpWatcher() {
  const [otp, setOtp] = useState<OtpData | null>(null);

  useEffect(() => {
    // Check initial state
    browser.storage.session.get('latest_otp').then((res) => {
      if (res.latest_otp) {
        setOtp(res.latest_otp as OtpData);
      }
    });

    // Listen for changes
    const listener = (changes: any, area: string) => {
      if (area === 'session' && changes.latest_otp) {
        setOtp(changes.latest_otp.newValue);
      }
    };

    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);

  const clearOtp = async () => {
    await browser.storage.session.remove('latest_otp');
    setOtp(null);
  };

  return { otp, clearOtp };
}
