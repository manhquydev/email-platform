/**
 * Empty Detail State component
 * Shown when no message is selected
 */

export function EmptyDetailState() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-nebula-text-secondary">
            <div className="w-20 h-20 rounded-3xl bg-nebula-elevated border border-nebula-border flex items-center justify-center mb-6 shadow-xl">
                <svg className="w-10 h-10 text-nebula-text-muted" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
            </div>
            <h3 className="text-lg font-medium text-nebula-text mb-2">Chưa chọn tin nhắn</h3>
            <p className="max-w-xs mx-auto">Chọn một email từ danh sách để xem nội dung.</p>
        </div>
    );
}
