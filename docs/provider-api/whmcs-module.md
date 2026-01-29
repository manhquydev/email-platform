# WHMCS Module Integration

We provide an official WHMCS module to easily sell and manage Ephemera Email services directly from your WHMCS installation.

## Requirements
- WHMCS 8.0 or higher
- PHP 7.4 or higher
- cURL PHP extension enabled

## Installation

1. **Download** the module from the [Partner Portal](https://provider.ephemera.email/downloads).
2. **Upload** the files to your WHMCS directory:
   ```
   /modules/servers/ephemera_email/
   ```
3. **Login** to your WHMCS Admin Area.

## Configuration

1. Go to **System Settings > Products/Services > Servers**.
2. Click **Add New Server**.
3. Select **Ephemera Email** from the module type dropdown.
4. Enter your **Provider API Key** in the API Key field.
5. Click **Test Connection** to verify.

## Creating Products

1. Go to **System Settings > Products/Services > Products/Services**.
2. Create a new product group (e.g., "Email Services").
3. Create a new product.
4. In the **Module Settings** tab:
   - **Module Name:** Ephemera Email
   - **Plan:** Select `LITE`, `PRO`, or `BUSINESS`
   - **Quota per Mailbox:** Default quota (MB)
5. Configure pricing and other standard WHMCS settings.

## Client Area Features
When a client purchases the service, they will see a dedicated management panel where they can:
- Add and verify domains
- Create and manage email accounts
- One-click login to webmail (SSO)
- View usage statistics

## Troubleshooting
- **Module Command Error:** Check `Utilities > Logs > Module Log` in WHMCS for detailed error responses.
- **Connection Failed:** Ensure your server can connect to `api.ephemera.email` on port 443.
