# Project Overview
**Name**: Ephemera
**Type**: Premium Disposable & Private Email Platform
**Core Value**: Secure, anonymous, and professional temporary email service with custom domain support and developer APIs.

# Visual Identity (Current & Desired)
- **Theme Name**: Nebula Glass
- **Style**: Modern, dark mode dominant, glassmorphism effects (transparency, blurs), vibrant "Nebula" gradients (purples, blues, teals), sleek and high-tech feel.
- **Components**: Rounded corners, thin borders, glow effects, responsive layouts, smooth transitions.

# Existing Pages & Features
The project is a full-stack web application. The redesign should cover the following key areas:

## 1. Public Pages (Marketing & Legal)
- **Landing Page (`/`)**: Main marketing page introducing features, pricing tiers, and immediate "Get Started" call to action.
- **Legal Pages**:
    - Terms of Service (`/terms`)
    - Privacy Policy (`/privacy`)
    - Acceptable Use Policy (`/acceptable-use`)
- **Email Verification (`/verify-email`)**: Landing page for users clicking verification links.

## 2. Authentication (Auth Layout)
- **Login (`/login`)**: Secure login form with email/password and Passkey support.
- **Register (`/register`)**: New user signup flow.

## 3. Core Application (Main Layout)
- **Inbox Manager (`/app`)**: The heart of the application.
    - **Tabbed Interface**: Switch between different inboxes.
    - **Inbox List**: View received emails.
    - **Message View**: Read email content (HTML/Text).
    - **Toolbar**: Actions like Refresh, Delete, Mark Read.
- **Focus Dashboard (`/app/stream`)**: A simplified, distraction-free view for reading emails.
- **Classic Dashboard (`/app/classic`)**: Alternative traditional dashboard view.

## 4. User Features (Protected Routes)
- **My Domains (`/my-domains`)**:
    - Add/Verify custom domains (DNS records display).
    - Manage domain settings (Public/Private).
- **Forwarding (`/forwarding`)**:
    - Setup email forwarding rules.
    - Manage masking/alias configurations.
- **Plans & Billing (`/plans`)**:
    - View current subscription.
    - Upgrade/Downgrade tiers (Free, Starter, Pro, Enterprise).
    - Payment history/invoices.
- **Settings (`/settings`)**:
    - **General**: Profile management, preferences.
    - **Security**: Password change, 2FA setup (TOTP), Passkey management (WebAuthn).
    - **API Keys**: Developer settings.
- **Authenticator (`/authenticator`)**: Internal tool for managing 2FA/TOTP codes (if applicable feature).

## 5. Admin Panel (`/admin/*`)
Comprehensive management suite for system administrators:
- **Dashboard**: High-level statistics (Users, Emails, Storage).
- **Users**: User management table (Ban, Delete, Edit Roles/Tiers).
- **Packages**: Manage subscription plans and pricing.
- **Codes/Coupons**: Manage invite codes or promo codes.
- **Rules**: Global system rules or abuse filters.
- **Notifications**: System-wide announcements.
- **Settings**: System configuration (SMTP limits, Branding).
- **Logs**: Audit logs viewer.

# Design Requirements
- **Goal**: Create a cohesive, premium "Nebula Glass" UI refresh for all the above pages.
- **Key Constraints**:
    - Must maintain the dark mode aesthetic.
    - Improve mobile responsiveness (especially for the Inbox Manager).
    - Enhance visual hierarchy in complex tables (Admin/Settings).
    - Ensure accessibility despite the "glass" aesthetic (contrast checks).
