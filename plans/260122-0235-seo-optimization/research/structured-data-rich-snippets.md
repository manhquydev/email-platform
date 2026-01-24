# Structured Data & Rich Snippets Research (2025)

## 1. SaaS & Web App Schema
For a browser-based email platform, use `WebApplication` (subtype of `SoftwareApplication`). This signals to Google that the "site" is a functional tool, not just content.

### Recommended JSON-LD Structure
```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "EmailPlatform Name",
  "url": "https://platform.com",
  "applicationCategory": "CommunicationApplication",
  "operatingSystem": "All",
  "browserRequirements": "Requires JavaScript. Works in Chrome, Firefox, Safari, Edge.",
  "softwareVersion": "2.0",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "120"
  }
}
```

## 2. Rich Snippets Opportunities
### Search Results (SERP)
- **FAQPage:** High impact for Pricing and Features pages. Questions/Answers must be visible text.
- **HowTo:** Ideal for Documentation/Help Center (e.g., "How to configure SMTP").
- **BreadcrumbList:** Essential for hierarchy visibility in search results.
- **Organization:** Use on homepage (Logo, Social Profiles, Contact Points).
- **Product:** Use for pricing pages to show price ranges/subscriptions.

### Email Client Features (Gmail)
Leverage schema *inside* emails sent by the platform to users (Welcome, Invoices):
- **ViewAction:** "Go-to" buttons in subject line (e.g., "Verify Email", "View Invoice").
- **Promotions Tab:** Annotations for "Deal Badges", discount codes, and expiration dates.

## 3. Google Search Console (GSC) Validation
- **Rich Results Test:** Use public tool to validate JSON-LD before deployment.
- **Enhancements Tab:** Monitor valid/invalid items specifically for FAQ, Breadcrumbs, Sitelinks.
- **URL Inspection:** Verify exactly what Google renders and detects.
- **Validation Flow:** Fix reported error -> Click "Validate Fix" -> Google recrawls (can take days).

## 4. Social Sharing (Open Graph & Twitter)
**Standards (2025):**
- **Image Size:** 1200x630px (1.91:1 ratio) is the universal standard for FB, LinkedIn, and X.
- **Twitter Card:** Always use `summary_large_image` for maximum visibility vs text-only cards.
- **Title/Desc:** Keep titles <60 chars, descriptions <155 chars to avoid truncation.

```html
<meta property="og:type" content="website" />
<meta property="og:title" content="Page Title" />
<meta property="og:description" content="Concise description." />
<meta property="og:image" content="https://example.com/og-image-1200x630.jpg" />
<meta name="twitter:card" content="summary_large_image" />
```

## 5. Hreflang Implementation
Essential for multi-language SaaS to serve correct language/currency.
- **Self-referencing:** Page A must link to Page A.
- **Bi-directional:** If EN links to ES, ES *must* link back to EN.
- **x-default:** Mandatory fallback for users with unmatched language settings.

```html
<link rel="alternate" hreflang="en" href="https://platform.com/en/" />
<link rel="alternate" hreflang="es" href="https://platform.com/es/" />
<link rel="alternate" hreflang="x-default" href="https://platform.com/en/" />
```

## Unresolved Questions
1. Does the platform send transactional emails that require Email Markup (ViewAction)?
2. Are there multiple pricing tiers that require complex `AggregateOffer` schema?
