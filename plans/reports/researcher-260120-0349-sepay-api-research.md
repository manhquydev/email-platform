# SePay.vn Payment Integration Research Report

## 1. Authentication
- **Method**: API Token (Static) or OAuth2.
- **Header**: `Authorization: Bearer {YOUR_API_TOKEN}`.
- **Base URL**: `https://my.sepay.vn/userapi/`.

## 2. VietQR Code Generation
- **Endpoint**: `https://qr.sepay.vn/img?acc=ACC_NO&bank=BANK_ID&amount=VALUE&des=CONTENT`
- **Parameters**:
    - `acc`: Bank account number.
    - `bank`: Bank brand name (e.g., `Vietcombank`, `MBBank`).
    - `amount`: Transaction value (integer).
    - `des`: Transaction content/description (encoded string).
- **Usage**: Can be embedded directly in `<img>` tags.

## 3. Webhook Structure
Webhooks notify your server when a transaction is detected.
- **Payload Example**:
```json
{
    "id": "49682",
    "bank_brand_name": "Vietcombank",
    "account_number": "0071000888888",
    "transaction_date": "2023-05-05 19:59:48",
    "amount_in": "100000.00",
    "transaction_content": "PAY ORDER 123",
    "reference_number": "677760.050523.080001"
}
```

## 4. Transaction Verification Flow
1. **Initiation**: Generate QR with unique `des` (e.g., `PAY_12345`).
2. **Notification**: SePay triggers Webhook to your server.
3. **Processing**: Verify `amount_in` and parse `transaction_content` to find Order ID.
4. **Fallback**: Periodically poll `/userapi/transactions/list` to check for missed Webhooks.

## 5. Required Environment Variables
- `SEPAY_API_TOKEN`: Your API access token.
- `SEPAY_ACCOUNT_NUMBER`: Recipient bank account.
- `SEPAY_BANK_BRAND`: Recipient bank name.
- `SEPAY_WEBHOOK_SECRET`: (If applicable) for payload signature verification.

## 6. Best Practices for Vietnam Market
- **VA (Virtual Account)**: Use VA per order to avoid "wrong content" issues from users.
- **Content Parsing**: Use regex to extract IDs from transaction strings as banks often append extra text.
- **Real-time UI**: Use WebSockets to update the UI immediately upon receiving a Webhook.

## Unresolved Questions
- Specific signature algorithm for Webhook payload validation (HMAC-SHA256 is common but needs confirmation in dashboard settings).
- Rate limits for the Transaction List API.
