# Phase 3: Admin Orders UI Fix

## Overview
- **Priority:** HIGH
- **Status:** Pending
- **Effort:** 30min (A) / 1h (B)

Update Admin Orders table to display SePay transaction IDs instead of legacy Stripe fields.

## Context Links
- [Payment Admin Research](./research/researcher-payment-admin-patterns.md)
- [Current AdminOrders](../../services/web/src/components/admin/AdminOrders.tsx)
- [SePay Service](../../services/api/src/services/sepay.service.ts)

## Current State Analysis

`AdminOrders.tsx` issues:
- Line 17: Interface has `stripePaymentId: string`
- Line 119-121: Displays `order.stripePaymentId || "—"`
- Line 178: Confirm modal uses `stripePaymentId`

Backend context:
- `Payment` model has both `stripePaymentId` and `sepayTransactionId`
- SePay webhook saves to `sepayTransactionId` (line 209 in sepay.service.ts)

## Approach A: Minimal MVP

### Files to Modify
- `services/web/src/components/admin/AdminOrders.tsx`

### Implementation Steps

1. **Update Payment interface** (line 11-23)
   ```typescript
   interface Payment {
     id: string;
     userId: string;
     amount: string;
     currency: string;
     status: string;
     stripePaymentId?: string;      // Optional now
     sepayTransactionId?: string;   // Add this
     packageId?: string;
     createdAt: string;
     user: { email: string; }
   }
   ```

2. **Create helper function for display**
   ```typescript
   const getTransactionId = (order: Payment) => {
     return order.sepayTransactionId || order.stripePaymentId || "—";
   };
   ```

3. **Update table cell** (line 118-122)
   ```tsx
   <TableCell>
     <div className="font-mono text-xs text-nebula-text-muted truncate w-32"
          title={getTransactionId(order)}>
       {getTransactionId(order)}
     </div>
   </TableCell>
   ```

4. **Update confirm modal message** (line 178)
   ```tsx
   message={`Bạn có chắc chắn muốn hoàn tiền cho giao dịch "${getTransactionId(refundTarget!)}"? ...`}
   ```

### Success Criteria
- [ ] Interface includes `sepayTransactionId`
- [ ] Table displays SePay ID when available
- [ ] Falls back to Stripe ID for legacy orders
- [ ] Modal shows correct transaction ID

---

## Approach B: Full Implementation

### Additional Features
- Dual ID display (Internal + Provider)
- Copy-to-clipboard button
- Provider badge (SePay/Stripe)

### Files to Modify
- `services/web/src/components/admin/AdminOrders.tsx`

### Implementation Steps

1. **All steps from Approach A**

2. **Enhanced transaction cell with copy button**
   ```tsx
   <TableCell>
     <div className="flex items-center gap-1">
       <div className="font-mono text-xs truncate w-28" title={getTransactionId(order)}>
         {getTransactionId(order)}
       </div>
       <button
         onClick={() => navigator.clipboard.writeText(getTransactionId(order))}
         className="text-nebula-text-muted hover:text-white p-1"
         title="Copy ID"
       >
         <span className="material-symbols-outlined text-sm">content_copy</span>
       </button>
     </div>
     <div className="text-[10px] text-nebula-text-muted mt-0.5">
       {order.sepayTransactionId ? "SePay" : order.stripePaymentId ? "Stripe" : "—"}
     </div>
   </TableCell>
   ```

3. **Add internal order ID display**
   - Show system ID (first column) alongside provider ID
   - Helps with debugging and support tickets

4. **Update refund logic awareness**
   - Add tooltip/note if order is SePay (manual refund required)
   ```tsx
   {order.sepayTransactionId && (
     <span className="text-[10px] text-yellow-400 ml-2">(Thủ công)</span>
   )}
   ```

### Success Criteria
- [ ] All Approach A criteria
- [ ] Copy button functional
- [ ] Provider badge shown
- [ ] SePay orders show manual refund note

---

## Risk Assessment
- **Low:** API returns old field names - Backend already returns `sepayTransactionId`, just need to use it.
- **None:** No breaking changes to existing functionality.

## Security Considerations
- Transaction IDs are not sensitive, safe to display and copy
- Refund action already requires admin authentication
