# Chrome Web Store Submission Guide

## Prerequisites
- Google Developer Account ($5 one-time fee)
- Extension zip build (`dist` folder)
- Promotional assets

## 1. Prepare the Build
Run the build command to generate the production artifacts:
```bash
cd services/extension
npm run build
```
This will create a `.output/chrome-mv3` directory. Alternatively, generate a production-ready zip file directly:
```bash
npm run zip
```
This will create a `.zip` file in the `.output` directory.

## 2. Store Assets
You need to prepare the following images:
- **Store Icon**: 128x128px PNG (use `services/extension/store-assets/icon128.png`)
- **Screenshot 1**: 1280x800px or 640x400px JPEG/PNG (Main Side Panel UI)
- **Screenshot 2**: 1280x800px (Auto-fill context menu feature)
- **Marquee Tile**: 440x280px (Promotional banner)

## 3. Developer Dashboard
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)
2. Click **"New Item"**
3. Upload the `extension.zip` file.

## 4. Store Listing
Fill in the required fields:
- **Description**: Use the text from `README.md` features section.
- **Category**: Productivity / Social & Communication
- **Language**: English
- **Privacy Policy**: Link to hosted version of `PRIVACY.md` (e.g., `https://manhquy.click/privacy`)

## 5. Privacy Practices
Complete the "Privacy" tab:
- **Host Permissions**: Explain why we need `https://api.manhquy.click/*` (API communication).
- **Scripting/ActiveTab**: Explain why we need access to page content (Auto-fill email fields).
  - *Justification*: "The extension detects email input fields on the user's current tab to provide a 1-click auto-fill button for disposable emails."
- **Data Usage**: Check "Personally identifiable information" (Email) and "Authentication information".

## 6. Submit for Review
Click **"Submit for Review"**. Reviews typically take 1-3 business days.

## 7. Post-Submission
- Monitor the dashboard for status updates.
- If rejected, check the email for specific policy violations (usually regarding permission justification).
