# Feature Audit: Ephemera Browser Extension (v0.1.0)
**Date:** 2026-01-16
**Status:** High Completeness / Modern UI Lead

## 1. Current Feature Matrix
| Feature | Status | Implementation Details |
| :--- | :--- | :--- |
| **Inbox Management** | ✅ | List, create, delete, extend (+10m), and toggle Permanent (24h). |
| **Authentication** | ✅ | Hybrid: Standard (Email/Pass/2FA) + Anonymous (DeviceID). |
| **Email Viewing** | ✅ | HTML/Text support with DOMPurify sanitization. |
| **Auto-fill/Detection** | ✅ | Regex-based field detection + Shadow DOM isolated dropdown. |
| **Notifications** | ✅ | Real-time Push Notifications via background handler. |
| **Side Panel** | ✅ | Native Chrome Side Panel with "Context Intelligence" for active tab. |
| **UI/UX** | ✅ | Glassmorphism, Material 3, Dark/Light/System theme sync. |
| **Cross-Browser** | ✅ | WXT-based (Chrome MV3, Firefox MV2, Safari). |

## 2. Competitive Benchmarking
| Feature | Ephemera | Temp Mail | Guerrilla Mail | 10 Min Mail |
| :--- | :--- | :--- | :--- | :--- |
| **Side Panel** | **Yes** | No | No | No |
| **Custom Prefix** | No | Premium | Yes | No |
| **Domain Selection** | No | Premium | Yes | No |
| **Auto-Fill UI** | **Advanced** | Basic | No | Basic |
| **Modern UI (2026)**| **Yes** | Mid | Low | Mid |
| **Anonymous Mode** | Yes | Yes | Yes | Yes |

## 3. Unique Selling Points (USPs)
- **Side Panel Synergy:** Leveraging the native Side Panel for persistent access without losing focus on the main tab.
- **Context Intelligence:** Automatically suggesting "Generate for [current-domain.com]" based on active tab state.
- **2026 Design Language:** Glassmorphism and Material 3 provide a significant aesthetic lead over utilitarian competitors.
- **Style Isolation:** Using Shadow DOM for injected UI prevents host website CSS from breaking the extension's look.

## 4. Feature Gap Analysis
- **Customization Gap:** Currently lacks the ability to choose a specific local part (username) or domain, which is a core "Power User" feature in Guerrilla Mail.
- **Utility Gap:** No search functionality within messages or ability to "star/archive" temporary emails for the session.
- **Handoff Gap:** No QR code generation for scanning an address to a mobile device (common in "Temp Mail" app ecosystems).

## 5. Priority Recommendations
1. **High: Custom Prefix Creation:** Allow users to specify the `local-part` before generation.
2. **High: Domain Picker:** Integrate domain selection if the API supports multiple public domains.
3. **Medium: QR Code Handoff:** Add a "Show QR" button in the `InboxList` for quick mobile usage.
4. **Medium: Search/Filter:** Implement a local search for the message list in the Side Panel.
5. **Low: Scrambled Mode:** Option to generate a non-guessable alias for an existing inbox.

## Unresolved Questions
- Does the backend API currently support domain listing for the extension?
- Is there a rate limit for "Anonymous" creations that needs to be surfaced in the UI?

---
**Sources:**
- [10 Minute Mail Features](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG2vPwvcGAAM1LTeT6DE3Ba1FF0AA34RHL2a4_X6jTI9JNuRwmSM4AqfF0XCLR53mjsROWDXdESydHdtIuFRegsaGAqUeG-12V4s1yFQzTWrRMDXQXlc-yX8_wCvqP2edH0JbxHV2G15oExHru8NR7wkA0ERVCoBgkmWG1BfzjTBLBsvXPLESUynCjVSWjuCLFqXHzYNfNd1fEYk1z_xQ==)
- [Guerrilla Mail Raycast/Extension](https://raycast.com/guerrillamail)
- [Temp Mail Premium vs Free](https://temp-mail.io/en/premium)
