# Research Report: SEO Best Practices for React SPA (2025-2026)

## Executive Summary
For React SPAs in 2025, relying solely on Client-Side Rendering (CSR) is risky for SEO. While Google can crawl JS, the "rendering tax" delays indexing. The industry standard has shifted toward **hybrid rendering** or **Static Site Generation (SSG)** using Vite plugins, alongside strict Core Web Vitals optimization (specifically INP).

## 1. Pre-rendering Solutions for Vite
The deprecated `react-snap` is no longer recommended. Modern Vite ecosystems favor:

*   **vite-ssg**: Best for pure static site generation. It uses a similar API to standard Vite but exports static HTML at build time. Ideal for marketing pages/blogs.
*   **Vike (formerly vite-plugin-ssr)**: Offers full control over SSR/SSG. It fits well if you need granular control over rendering strategies per page.
*   **Prerender.io**: A middleware service that detects crawlers and serves a cached static HTML version. Good fallback if architectural changes to SSR/SSG are too costly.

**Recommendation:** Use **vite-ssg** for static content (blogs, landing pages) and keep the app dashboard CSR.

## 2. Dynamic Meta Tags
Dynamic head management is mandatory for social sharing and indexing.
*   **Standard:** `react-helmet-async`.
    *   *Why async?* The original `react-helmet` is not thread-safe for server-side operations and has issues with React's concurrent mode.
    *   *Implementation:* Wrap the app root in `<HelmetProvider>` and use `<Helmet>` components in pages.

## 3. Sitemap Generation
*   **vite-plugin-sitemap**: Automates `sitemap.xml` and `robots.txt` generation based on static routes.
*   **Dynamic Routes:** For dynamic IDs (e.g., `/blog/:id`), a custom script is required to fetch database IDs and generate the XML during the build process, or use a server-side endpoint.

## 4. Google's Stance on JS Rendering (2025)
*   **Capability:** Googlebot *can* render JavaScript.
*   **The Catch:** It happens in a second wave (queued).
*   **Impact:** Content might not appear in search results for days after crawling if it relies heavily on JS.
*   **Crawler Budget:** Heavy JS consumes more crawl budget, leading to fewer pages being indexed.
*   **Consensus:** Server-rendered HTML is still King for reliable, immediate indexing.

## 5. Core Web Vitals & INP
Google replaced FID (First Input Delay) with **INP (Interaction to Next Paint)** in 2024.
*   **LCP (Loading):** Pre-load hero images; avoid lazy-loading above-the-fold content.
*   **CLS (Stability):** Reserve space for images/embeds with explicit width/height.
*   **INP (Interactivity):** Break up long tasks. Avoid heavy hydration blocking the main thread.
*   **Optimization:** Use `vite-plugin-pwa` for caching and `vite-plugin-imagemin` for assets.

## Unresolved Questions
*   Does the current hosting infrastructure support Node.js (required for true SSR) or is it static-only (S3/CDN)?
*   Are there public-facing dynamic routes that need SEO (e.g., public email archives), or is SEO only for the marketing/landing pages?
