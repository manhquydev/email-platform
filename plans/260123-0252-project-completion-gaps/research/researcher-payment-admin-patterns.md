# Research Report: Payment Admin Dashboard & SePay Patterns

**Date:** 2026-01-23
**Focus:** Payment admin UI patterns, Transaction ID display, Refund workflows, SePay integration.

## 1. Executive Summary
Effective payment dashboards prioritize real-time visibility, clear status indicators, and streamlined reconciliation workflows. For SePay specifically, integration revolves around the **Transaction API** for data synchronization and **Webhooks** for status updates. Automatic programmatic refunds via SePay are not explicitly documented as a public standard API endpoint, suggesting a pattern of "Manual Refund / Record Refund" or specific "E-Wallet" configurations.

## 2. Payment Admin Dashboard Best Practices

### Layout & Navigation
- **Centralized Hub:** Consolidate all financial data (invoices, transactions, payouts) into a single view.
- **Visual KPIs:** Top-level metrics for "Total Revenue," "Pending Payouts," "Refund Rate," and "Failed Transactions."
- **Filters:** Robust filtering by Date Range, Status (Success, Failed, Refunded), Amount, and Payment Method.

### Transaction ID Display Patterns
- **Dual ID Strategy:** Display both the **Internal System ID** (e.g., `ORD-123`) and the **Provider Reference ID** (e.g., SePay's `reference_number` or bank transaction code).
- **Formatting:**
  - Use monospace font for IDs to improve readability.
  - Truncate long IDs with a copy-to-clipboard icon (e.g., `txn_59...2a [copy]`).
- **Searchability:** Users must be able to search by either ID type.

### Order Status Management
- **Status States:** `Pending` → `Paid` → `Processing` → `Completed` OR `Cancelled` / `Refunded`.
- **Visibility:** Highlight "In-Progress" states (e.g., returns initiated but not complete).
- **Actions:** Context-sensitive actions (e.g., "Refund" only available on "Paid" orders).

## 3. SePay Integration Capabilities

### Transaction API
- **Endpoint:** `GET /transactions` (requires `transaction:read` scope).
- **Key Fields:** `id`, `bank_account_id`, `reference_number` (critical for matching), `amount_in`, `transaction_date`.
- **Usage:** Used to sync bank transfers to system orders.

### Refund Capabilities
- **Status:** **No direct public "Refund API" endpoint** found in standard documentation.
- **Pattern:** SePay functions primarily as a bank transfer gateway. Refunds typically involve:
  1.  **Manual Transfer:** Admin manually transfers funds back to the user's bank account via their banking app.
  2.  **Record Keeping:** Admin marks the transaction as "Refunded" in the dashboard.
  3.  **E-Wallet Exception:** Integrated E-Wallet solutions may support "Automatic Refund Credits," but this likely applies to internal wallet balances, not bank reversals.

### Webhooks
- **Events:** `transaction.created`, `transaction.failed` (inferred).
- **Usage:** Real-time status updates. Dashboard should listen for these to auto-update UI.

## 4. Recommended UI/UX Patterns

### Transaction List Table
| Column | Content Pattern |
| :--- | :--- |
| **Status** | Color-coded Badge (Green=Paid, Red=Failed, Gray=Refunded) |
| **Amount** | Currency formatted, right-aligned |
| **Date** | `DD MMM YYYY HH:mm` |
| **Reference** | Stacked: Internal ID (top) + SePay Ref (bottom, muted, monospace) |
| **Customer** | Name + Email (linked to profile) |
| **Actions** | "View Details", "Sync Status" |

### Detail View
- **Timeline:** Visual history of the transaction (Created -> Webhook Received -> Matched -> Paid).
- **Raw Data:** Collapsible section showing raw JSON from SePay (useful for debugging).
- **Refund Action:**
  - Since programmatic refund is unlikely, use a "Record Refund" modal.
  - Inputs: Refund Amount (Partial/Full), Date, Reason, "Refunded via" (e.g., Manual Bank Transfer).

## 5. Unresolved Questions
- Does SePay offer a hidden/partner-level API for initiating bank reversals, or is it strictly read-only for incoming transfers?
- Confirmation of exact webhook event payloads for "Cancelled" transactions if supported.

## Sources
- [SePay Developer Docs - Transaction API](https://sepay.vn)
- [Payment Dashboard UI Best Practices](https://mokkup.ai)
- [SePay E-Wallet Integration Refund Notes](https://sepay.vn)
