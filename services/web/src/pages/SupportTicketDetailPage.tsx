/**
 * Support Ticket Detail Page Wrapper
 */

import { SupportTicketDetail } from "./support-modules";

export function SupportTicketDetailPage() {
  return (
    <div className="min-h-screen pt-24 pb-20 neo-mesh-bg text-white flex flex-col items-center px-4">
      <div className="max-w-4xl w-full animate-fade-in-up">
        <SupportTicketDetail />
      </div>
    </div>
  );
}
