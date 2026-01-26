# Research Report: Temp Mail Monetization Strategies

## Executive Summary
Temporary email services primarily monetize through a hybrid model: ad-supported free tiers for casual users and feature-rich premium subscriptions for power users. High-growth revenue streams now include API access for QA/security automation and B2B white-labeling.

## 1. Revenue Models

### A. Ad-Based (Free Tier)
*   **Mechanism**: Display ads (banner, skyscraper), video interstitials before inbox access, and native content.
*   **Revenue Potential**: $0.50 - $5.00 RPM (Revenue Per Mille/1k views).
*   **Networks**: Google AdSense, specialized ad networks for tech/utilities.
*   **Pros/Cons**: High volume scalability but degrades UX and privacy perception.

### B. Premium Subscriptions (B2C)
*   **Pricing**: $1 - $4/month (billed annually) or $3 - $10/month (monthly).
*   **Key Features**:
    *   **Custom Domains**: Bring Your Own Domain (BYOD).
    *   **Permanent/Extended Inbox**: 30-day retention or "permanent" until deleted.
    *   **Alias Management**: Unlimited aliases, custom usernames (`user@ephemera.com` vs random string).
    *   **Privacy**: PGP encryption, disable catch-all, removal of logs.
    *   **UX**: Ad-free interface, priority support.

### C. API & Developer Access (B2B)
*   **Target**: QA testing (Selenium/Cypress integration), security researchers, marketing automation.
*   **Pricing Models**:
    *   **Tiered Subscription**: $29 - $499/month based on call volume/concurrency.
    *   **Pay-Per-Use**: Charges per 1k emails generated or received.
    *   **Enterprise**: $500 - $5,000/mo for high volume, SLA support, and dedicated IPs.

### D. Affiliate Partnerships
*   **Verticals**: VPNs (NordVPN, ProtonVPN), Password Managers (1Password, Bitwarden), Anti-virus.
*   **Implementation**: "Protect your real IP" banners, "Secure your passwords" integration.
*   **Revenue**: CPA (Cost Per Action) or revenue share (20-40%).

## 2. Competitive Benchmarks

| Service | Model | Premium Price | Key Premium Features |
| :--- | :--- | :--- | :--- |
| **SimpleLogin** | Freemium | $30/yr | Unlimited aliases, PGP, custom domains, subdomains. |
| **AnonAddy** | Freemium | $12/yr (Lite), $36/yr (Pro) | Bandwidth limits, shared domain aliases, recipient limits. |
| **Temp Mail** | Ad-Heavy | ~$10/mo | Ad-free, premium domains, extended storage. |

## 3. Recommendations for Ephemera

Based on Ephemera's architecture (Web, Mobile, CLI, Extension):

1.  **Hybrid "Privacy-First" Freemium**:
    *   Avoid aggressive display ads to maintain trust.
    *   Use **Affiliate Partnerships** (VPN/Security) for free tier monetization instead of tracking ads.

2.  **Developer-Centric API Tiers**:
    *   Leverage the CLI/SDK architecture.
    *   Offer a "Tester Plan": $29/mo for 5,000 daily emails via API, specifically targeting QA engineers.

3.  **Pro Power-User Plan ($3/mo)**:
    *   **Custom Domain Support**: Essential for professional users.
    *   **"Ephemera+" Extension**: Unlock persistent aliases directly in the browser extension.
    *   **Webhook Access**: Allow users to forward incoming temp mail to webhooks (great for devs).

4.  **Privacy Upsell**:
    *   Offer "Private Instance" hosting (Docker container) as a high-tier Enterprise offering for companies needing complete data sovereignty.

## Unresolved Questions
*   What are the storage costs per GB for retaining emails > 24 hours?
*   Can the current postfix/dovecot setup handle multi-tenant custom domains securely?
