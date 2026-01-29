# Phase: Outbound Security (DKIM/SPF)

## Context
Hardens the platform's outbound email capabilities to ensure high deliverability and prevent spoofing. Crucial for "Ephemera" to be trusted as a primary transactional or communication tool.

## Architecture
- **Encryption**: Store private DKIM keys in `DomainDkim` table encrypted with AES-256-GCM.
- **Dynamic Signing**: Configure `Nodemailer` to fetch and decrypt keys per-message based on the sender's domain.
- **DNS Validation**: Implement a check to ensure SPF/DKIM records are active before enabling signing.

## Implementation Steps
1. **Security: Key Management**
   - Implement `encryptKey` and `decryptKey` utilities using `appConfig.totpEncryptionKey`.
   - Update `DomainDkim` schema if necessary to store encrypted blobs and selectors.
2. **Service: Outbound Refactor**
   - Modify `outbound.ts` to check for DKIM keys when sending.
   - Inject `dkim` configuration into the `transporter.sendMail` call.
3. **API: Domain Management**
   - Create endpoints to generate DKIM key pairs (RSA-2048) and provide DNS TXT records to the user.
4. **Automation: Health Check**
   - Add a background job to periodically verify DNS alignment (SPF/DKIM/DMARC).

## Success Criteria
- Emails sent via the platform pass DKIM signature verification in Gmail/Outlook.
- Private keys are never stored in plain text in the database.
- System rejects sending from domains with missing or invalid SPF records.
