/**
 * SchedulePicker - Date/time picker for scheduling notifications
 */
import { useState } from 'react';

interface Props {
  isScheduled: boolean;
  scheduledFor: string;
  onToggle: (enabled: boolean) => void;
  onChange: (datetime: string) => void;
}

export function SchedulePicker({ isScheduled, scheduledFor, onToggle, onChange }: Props) {
  const [minDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5); // Minimum 5 minutes from now
    return now.toISOString().slice(0, 16);
  });

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isScheduled}
          onChange={e => onToggle(e.target.checked)}
          className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
        />
        <span className="font-medium">🕐 Lên lịch gửi</span>
      </label>

      {/* DateTime picker */}
      {isScheduled && (
        <div className="pl-8 space-y-2">
          <div className="flex gap-2 items-center">
            <input
              type="datetime-local"
              value={scheduledFor}
              min={minDate}
              onChange={e => onChange(e.target.value)}
              className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Múi giờ: {timezone} • Tối thiểu 5 phút từ bây giờ
          </p>
        </div>
      )}
    </div>
  );
}
