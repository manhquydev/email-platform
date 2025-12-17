import { useState } from 'react';

interface SnoozePickerProps {
    onSnooze: (until: Date | null) => void;
    onClose: () => void;
    currentSnooze?: string | null;
}

const SNOOZE_OPTIONS = [
    { label: '1 giờ sau', hours: 1 },
    { label: '3 giờ sau', hours: 3 },
    { label: 'Tối nay (20:00)', hours: -1, time: '20:00' },
    { label: 'Ngày mai (8:00)', hours: -2, time: '08:00' },
    { label: '2 ngày sau', hours: 48 },
    { label: '1 tuần sau', hours: 168 },
];

export function SnoozePicker({ onSnooze, onClose, currentSnooze }: SnoozePickerProps) {
    const [customDate, setCustomDate] = useState('');
    const [customTime, setCustomTime] = useState('09:00');

    const handlePreset = (option: typeof SNOOZE_OPTIONS[0]) => {
        let until: Date;

        if (option.hours === -1) {
            // Tonight at 20:00
            until = new Date();
            until.setHours(20, 0, 0, 0);
            if (until <= new Date()) {
                until.setDate(until.getDate() + 1);
            }
        } else if (option.hours === -2) {
            // Tomorrow at 8:00
            until = new Date();
            until.setDate(until.getDate() + 1);
            until.setHours(8, 0, 0, 0);
        } else {
            until = new Date();
            until.setHours(until.getHours() + option.hours);
        }

        onSnooze(until);
    };

    const handleCustom = () => {
        if (!customDate) return;
        const [hours, minutes] = customTime.split(':').map(Number);
        const until = new Date(customDate);
        until.setHours(hours, minutes, 0, 0);
        onSnooze(until);
    };

    const handleClearSnooze = () => {
        onSnooze(null);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-surface rounded-xl shadow-2xl p-4 w-72 border border-border"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-text-main">Nhắc lại sau</h3>
                    <button onClick={onClose} className="text-muted hover:text-text-main">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                {currentSnooze && (
                    <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="text-xs text-yellow-700">
                            Đang snooze đến: {new Date(currentSnooze).toLocaleString('vi-VN')}
                        </div>
                        <button
                            onClick={handleClearSnooze}
                            className="text-xs text-red-600 hover:underline mt-1"
                        >
                            Xóa snooze
                        </button>
                    </div>
                )}

                <div className="space-y-1 mb-3">
                    {SNOOZE_OPTIONS.map(option => (
                        <button
                            key={option.label}
                            onClick={() => handlePreset(option)}
                            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-bg text-text-main transition-colors"
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                <div className="border-t border-border pt-3">
                    <div className="text-xs text-muted mb-2">Tùy chọn</div>
                    <div className="flex gap-2 mb-2">
                        <input
                            type="date"
                            value={customDate}
                            onChange={e => setCustomDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="flex-1 text-sm px-2 py-1.5 rounded border border-border"
                        />
                        <input
                            type="time"
                            value={customTime}
                            onChange={e => setCustomTime(e.target.value)}
                            className="w-20 text-sm px-2 py-1.5 rounded border border-border"
                        />
                    </div>
                    <button
                        onClick={handleCustom}
                        disabled={!customDate}
                        className="w-full py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Đặt snooze
                    </button>
                </div>
            </div>
        </div>
    );
}
