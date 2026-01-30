import { useEffect, useState } from 'react';
import { Copy, X, KeyRound, Check } from 'lucide-react';
import { useOtpWatcher } from '../../hooks/useOtpWatcher';

export default function OtpBanner() {
  const { otp, clearOtp } = useOtpWatcher();
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (otp) {
      // Auto-dismiss when expired
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((otp.expiresAt - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          clearOtp();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [otp, clearOtp]);

  const handleCopy = async () => {
    if (!otp) return;
    await navigator.clipboard.writeText(otp.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!otp || timeLeft <= 0) return null;

  return (
    <div className="mx-4 mt-4 animate-in slide-in-from-top-4 duration-300">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-3 shadow-lg shadow-indigo-500/20 text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={clearOtp} className="p-1 hover:bg-white/10 rounded-full">
            <X className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <KeyRound className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium opacity-80 uppercase tracking-wider">
              Verification Code
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-mono font-bold tracking-widest">
                {otp.code}
              </span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                {timeLeft}s
              </span>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="p-2 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
