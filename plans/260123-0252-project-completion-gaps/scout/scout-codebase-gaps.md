# Scout Report: Sales & Admin Orders Codebase Gaps

## 1. Sales Page & Support
- **UI Component**: `services/web/src/pages/Support.tsx`
  - Contains `Sales` component (Lines 87-124).
  - Current status: Static UI implementation. Form inputs exist but lack state management and API integration.
  - Contains `Support` and `Contact` components.
- **Backend API**: `services/api/src/routes/support.ts`
  - Handles Support Ticket CRUD operations.
  - No dedicated endpoint found for Sales inquiries yet.

## 2. Admin Orders (Payments)
- **Frontend**: `services/web/src/components/admin/AdminOrders.tsx`
  - Likely the main UI for managing orders/payments.
- **Backend API**: 
  - `services/api/src/routes/admin/payments.ts` (Likely handles listing/managing payments).
  - `services/api/src/routes/sepay.ts` (SePay specific webhook/callback handling).
- **Services**:
  - `services/api/src/services/sepay.service.ts` (SePay integration logic).
  - `services/api/src/services/stripe.service.ts` (Stripe integration logic).

## 3. Database Schema
- **File**: `services/api/prisma/schema.prisma`
- **Key Models**:
  - `Payment`: Records successful transactions (Stripe/SePay).
  - `PendingPayment`: Acts as the **Order** record (contains `orderCode`, `status`, `packageId`).
  - `ServicePackage`: The products/plans being sold.
  - `RedemptionCode`: For managing promo codes.

## 4. Email Notifications
- **Templates**: 
  - `services/api/src/services/support-email-templates.ts` (Support ticket notifications).
  - `services/api/src/services/emailTemplates.ts` (General templates).
- **Service**: `services/api/src/services/emailFilters.ts` (found via glob, likely relevant for processing).

## Unresolved Questions / Gaps
1. **Sales Form Logic**: The Sales form in `Support.tsx` needs React state and an API endpoint (e.g., `/api/sales/inquiry`).
2. **Order Management**: Confirm if `AdminOrders.tsx` consumes `/api/admin/payments` or if a new route is needed for `PendingPayment` management specifically.
3. **Notification Coverage**: Verify if email templates exist specifically for "New Sales Inquiry" or "Order Confirmation" (beyond generic support).

