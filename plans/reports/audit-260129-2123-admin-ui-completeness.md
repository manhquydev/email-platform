# Admin UI Audit: Provider Management

**Date:** 2026-01-29
**Scope:** Admin UI for Provider Management (cPanel/WHMCS Integration)
**Status:** ⚠️ Partially Complete

## Executive Summary
The Provider Management UI implements core "Read" and "Create" flows but lacks critical "Update" and "Delete" capabilities. While visualization of usage and status management is good, the inability to edit provider details or manage specific tenants represents a significant gap for production readiness.

## Feature Verification Checklist

| Feature | Status | Notes |
| :--- | :---: | :--- |
| **Provider List** | ✅ | Search and pagination implemented. Missing filters (Status/Tier). |
| **Create Provider** | ✅ | Functional modal with all required fields. |
| **Edit Provider** | 🔴 | **MISSING**. No UI to update Name, Emails, Webhook, or Tier after creation. |
| **Delete Provider** | 🔴 | **MISSING**. Only Suspend/Activate is supported. `TERMINATED` status exists in types but has no UI trigger. |
| **View Details** | ✅ | Comprehensive drawer with contact info and quotas. |
| **Tenant Management** | ⚠️ | Shows tenant *count* but lists **no actual tenants**. Cannot drill down to see/manage provider's tenants. |
| **Usage Stats** | ✅ | Visual charts for tenants/mailboxes history and quota utilization. |
| **API Key Mgmt** | ✅ | Key regeneration with secure one-time display implemented. |
| **Status Toggle** | ✅ | Active/Suspended toggling fully supported. |

## UX & Functional Gaps

### 1. Missing CRUD Operations
- **Edit Capability:** Operators cannot correct typos in email addresses or update Webhook URLs without direct DB access.
- **Termination:** No flow to permanently offboard a provider (Delete/Terminate).

### 2. Navigation & Discovery
- **Tenant Visibility:** Admin cannot answer "Which tenants belong to Provider X?" from the UI.
- **Filters:** No way to view "All Suspended Providers" or "All Enterprise Tier Providers" without scrolling/searching.

### 3. Production Readiness
- **Webhook Management:** Webhook URL is collected at creation but cannot be updated or tested from the UI.
- **Billing:** Billing email is collected but no invoice/payment history view exists (Usage stats are present, but financial context is missing).

## Recommendations

1.  **High Priority:** Implement `ProviderEditModal` to allow updating Name, Emails, Webhook URL, and Tier.
2.  **High Priority:** Add a "Tenants" tab in `ProviderDetailDrawer` listing associated tenants with links to Tenant Management.
3.  **Medium:** Add "Terminate" action with red-zone confirmation modal.
4.  **Medium:** Add Status and Tier dropdown filters to `ProvidersPage` header.
