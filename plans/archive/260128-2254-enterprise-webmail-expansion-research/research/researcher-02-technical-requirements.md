# Enterprise Webmail Technical Requirements

## Executive Summary
*   **Transformation Scope**: Transitioning Ephemera from a disposable inbox platform to a persistent enterprise email suite requires significant architectural expansion, particularly in protocol support and data persistence.
*   **Critical Gaps**: Lack of standard mail protocols (IMAP/POP3), directory integration (LDAP/AD), and productivity features (Calendar/Contacts) are the primary barriers to enterprise adoption.
*   **Security Posture**: Current disposable-focused security must evolve to support long-term retention, encryption at rest, and compliance auditing (GDPR/HIPAA).
*   **Identity Management**: Enterprise SSO (SAML/OIDC) and automated provisioning (SCIM) are prerequisites for corporate deployment.

## Core Features Required
*   **Multi-Tenancy Architecture**:
    *   Strict logical separation of data per organization.
    *   Organization-level configuration overrides (retention policies, quotas).
*   **Identity & Provisioning**:
    *   **LDAP/Active Directory Integration**: Real-time user sync and authentication.
    *   **SCIM 2.0**: Automated user provisioning/deprovisioning from IDPs (Okta, Azure AD).
*   **Custom Domains**:
    *   Automated DNS verification (DKIM, SPF, DMARC, MTA-STS).
    *   Branding customization (Logo, colors) per tenant.

## Security & Compliance
*   **Data Protection**:
    *   **Encryption at Rest**: AES-256 for message bodies and attachments in Object Storage/DB.
    *   **End-to-End Encryption**: PGP/GPG support for sensitive communications.
*   **Compliance Tools**:
    *   **Audit Logging**: Immutable logs for all admin and user actions (login, read, delete).
    *   **Legal Hold**: Prevent deletion of data for specific users during litigation.
    *   **eDiscovery**: Advanced search across all mailboxes for compliance officers.
    *   **DLP (Data Loss Prevention)**: Outbound filters for sensitive data (PII, credit cards).
    *   **Retention Policies**: Automated archival and deletion schedules.

## Protocol Support
*   **Mail Access (Must-Have)**:
    *   **IMAP4rev1**: Support for folders, flags, and IDLE (push).
    *   **POP3**: For legacy offline access.
    *   **JMAP**: Modern, mobile-friendly JSON-based state syncing.
*   **Mail Submission**:
    *   **SMTP Submission (587/465)**: Authenticated outbound sending for users.
*   **Productivity (Must-Have)**:
    *   **CalDAV**: Calendar syncing, scheduling, and sharing.
    *   **CardDAV**: Contact syncing and Global Address List (GAL).
    *   **ActiveSync (EAS)**: Optional high-value target for native mobile push support.

## Administration Features
*   **Admin Panel**:
    *   **Granular RBAC**: Roles for Super Admin, Org Admin, Helpdesk, Compliance Officer.
    *   **Dashboard**: Real-time traffic, storage usage, and threat monitoring.
*   **Resource Management**:
    *   **Quotas**: Hard/Soft limits on storage and message counts per user/domain.
    *   **Migration Tools**: Importers for PST, MBOX, or IMAP sync from other providers.

## Integration Requirements
*   **Authentication**:
    *   **SSO**: SAML 2.0 and OIDC support for enterprise IDPs.
    *   **MFA enforcement**: Enforce 2FA at the organization level.
*   **API & Webhooks**:
    *   Management API for all admin functions.
    *   Webhooks for incoming mail, delivery status, and user events.
*   **Mobile**: Native iOS/Android apps or PWA with background sync/push capabilities.

## Key Technical Gaps in Current Ephemera
1.  **Protocol Deficit**: Current architecture is HTTP/REST-only. No IMAP/POP3 server implementation exists.
2.  **Storage Model**: Designed for ephemeral/soft-delete. Needs robust archival, hierarchy (folders), and reliable long-term storage logic.
3.  **Identity**: Currently local JWT/OAuth. Lacks Federation (SAML) and Directory Sync (LDAP).
4.  **Productivity**: Zero implementation of Calendar/Contacts data structures or protocols.
5.  **Outbound**: Currently hybrid/relay focused. Needs full MSA (Mail Submission Agent) capabilities for user-initiated sending.
