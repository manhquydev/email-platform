import { useState, useEffect, useRef } from 'react';
import { X, Download, Copy, Check } from 'lucide-react';
import { cn } from '../../utils/cn';
import { analytics } from '../../shared/analytics';
import qrcode from 'qrcode-generator';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

/**
 * Modal component for displaying and downloading QR codes.
 * Uses qrcode-generator for minimal bundle size (~3KB).
 */
export default function QRCodeModal({ isOpen, onClose, email }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen && email) {
      generateQRCode();
      analytics.track('qr_code_generated', { email });
    }
  }, [isOpen, email]);

  const generateQRCode = () => {
    try {
      // Create QR code with error correction level M
      const qr = qrcode(0, 'M');
      qr.addData(`mailto:${email}`);
      qr.make();

      // Get the QR code as an image
      const size = 8; // Cell size in pixels
      const margin = 4; // Margin in cells
      const moduleCount = qr.getModuleCount();
      const totalSize = (moduleCount + margin * 2) * size;

      // Draw to canvas for high quality
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = totalSize;
        canvas.height = totalSize;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // White background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, totalSize, totalSize);

          // Draw QR modules
          ctx.fillStyle = '#1e293b'; // slate-800
          for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
              if (qr.isDark(row, col)) {
                ctx.fillRect(
                  (col + margin) * size,
                  (row + margin) * size,
                  size,
                  size
                );
              }
            }
          }

          // Get data URL
          setQrDataUrl(canvas.toDataURL('image/png'));
        }
      }
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.download = `ephemera-${email.split('@')[0]}-qr.png`;
    link.href = qrDataUrl;
    link.click();

    analytics.track('qr_code_downloaded', { email });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy email');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-w-xs mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              QR Code
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* QR Code Display */}
          <div className="p-6 flex flex-col items-center">
            {/* Hidden canvas for generation */}
            <canvas ref={canvasRef} className="hidden" />

            {/* QR Code Image */}
            <div className="bg-white p-4 rounded-2xl shadow-inner border border-slate-100 mb-4">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${email}`}
                  className="w-40 h-40"
                />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center text-slate-400">
                  Generating...
                </div>
              )}
            </div>

            {/* Email display */}
            <p className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg mb-4 max-w-full truncate">
              {email}
            </p>

            {/* Action buttons */}
            <div className="flex gap-2 w-full">
              <button
                onClick={handleCopy}
                className={cn(
                  'flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5',
                  copied
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Email
                  </>
                )}
              </button>
              <button
                onClick={handleDownload}
                disabled={!qrDataUrl}
                className="flex-1 py-2.5 px-3 text-xs font-bold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary-500/20 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </div>
          </div>

          {/* Footer hint */}
          <div className="px-4 pb-4">
            <p className="text-[10px] text-center text-slate-400">
              Scan this QR code with your phone to quickly access this email address
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
