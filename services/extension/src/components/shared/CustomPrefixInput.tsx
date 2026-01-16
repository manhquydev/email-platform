import { useState, useEffect } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface CustomPrefixInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

// Validation: alphanumeric, dots, hyphens, 3-32 chars
const PREFIX_REGEX = /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/i;
const MIN_LENGTH = 3;
const MAX_LENGTH = 32;

/**
 * Input component for custom email prefix with validation.
 * Validates: alphanumeric, dots, hyphens, 3-32 characters.
 */
export default function CustomPrefixInput({
  value,
  onChange,
  disabled = false,
  className,
}: CustomPrefixInputProps) {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setIsValid(null);
      setError(null);
      return;
    }

    // Validate prefix
    if (value.length < MIN_LENGTH) {
      setIsValid(false);
      setError(`Min ${MIN_LENGTH} characters`);
    } else if (value.length > MAX_LENGTH) {
      setIsValid(false);
      setError(`Max ${MAX_LENGTH} characters`);
    } else if (!PREFIX_REGEX.test(value)) {
      setIsValid(false);
      setError('Letters, numbers, dots, hyphens only');
    } else {
      setIsValid(true);
      setError(null);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow valid characters while typing
    const newValue = e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, '');
    onChange(newValue);
  };

  return (
    <div className={cn('space-y-1', className)}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder="custom-prefix"
          maxLength={MAX_LENGTH}
          className={cn(
            'w-full px-3 py-2 pr-8 text-xs',
            'bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm',
            'border rounded-xl',
            'text-slate-700 dark:text-slate-200',
            'placeholder:text-slate-400 dark:placeholder:text-slate-500',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/20',
            'transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isValid === true && 'border-green-500 focus:border-green-500',
            isValid === false && 'border-red-400 focus:border-red-400',
            isValid === null && 'border-slate-200 dark:border-slate-700 focus:border-primary-500'
          )}
          aria-label="Custom email prefix"
          aria-invalid={isValid === false}
          aria-describedby={error ? 'prefix-error' : undefined}
        />
        {value && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {isValid === true && (
              <Check className="w-4 h-4 text-green-500" />
            )}
            {isValid === false && (
              <X className="w-4 h-4 text-red-400" />
            )}
          </div>
        )}
      </div>
      {error && (
        <p id="prefix-error" className="text-[10px] text-red-500 font-medium px-1">
          {error}
        </p>
      )}
      {!error && value && isValid && (
        <p className="text-[10px] text-green-600 dark:text-green-400 font-medium px-1">
          Valid prefix
        </p>
      )}
    </div>
  );
}
