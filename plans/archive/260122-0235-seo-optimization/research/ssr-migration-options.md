# Research: SSR/SSG Migration Options for React Vite Projects

**Date:** 2026-01-22
**Context:** Migration of existing React + Vite SPA (dashboard/email platform) to SSR/SSG for SEO and performance.

## Executive Summary
For a highly interactive SaaS dashboard, **React Router v7 (with Vite SSR)** or **Remix** offers the best balance of migration effort vs. capabilities. **Next.js** is powerful but requires a significant paradigm shift (RSC). **Astro** is likely unsuitable for a complex state-heavy dashboard.

## 1. React Router v7 (Vite SSR)
*Closest path to current architecture.*
- **Capabilities:** v7 introduces "Data Routers" (`loader`/`action`) enabling SSR. "Framework mode" allows file-system routing similar to Remix.
- **Migration Effort:** **Medium**.
  - Reuse existing components.
  - Must refactor data fetching to `loaders`.
  - Manual Vite SSR configuration required (complex) unless using the framework adapter.
- **Trade-offs:** High control, but high configuration maintenance.

## 2. Next.js (App Router)
*Industry standard, heavy migration.*
- **Capabilities:** React Server Components (RSC), automatic optimization (images, fonts), hybrid rendering (SSG/SSR/ISR).
- **Migration Effort:** **High**.
  - Structural overhaul (file-system routing).
  - Strict Client/Server component boundary ("use client").
  - Replacement of `react-router-dom` hooks.
- **Trade-offs:** Best performance potential & ecosystem, but steep learning curve and refactoring cost.

## 3. Remix
*Best for dynamic dashboards.*
- **Capabilities:** Built on Web Standards, nested routing (perfect for dashboards), unified data loading. Merging with React Router v7.
- **Migration Effort:** **Medium-High**.
  - Similar to RRv7 but opinionated structure.
  - Excellent for handling form mutations and pending UI states.
- **Trade-offs:** Smaller ecosystem than Next.js, but highly efficient for dynamic data.

## 4. Astro (with React Islands)
*Content-first approach.*
- **Capabilities:** Zero-JS by default, "Islands Architecture" for interactivity.
- **Migration Effort:** **Very High** (Architectural mismatch).
- **Trade-offs:** Excellent for static content, but **poor fit for complex dashboards** requiring shared global state and high interactivity across components.

## Complexity Comparison

| Feature | React Router v7 | Next.js (App Router) | Remix | Astro |
| :--- | :--- | :--- | :--- | :--- |
| **Migration Effort** | ⭐⭐ (Lowest) | ⭐⭐⭐⭐ (Highest) | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Dashboard Suitability** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **SEO Capabilities** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Learning Curve** | Low | High (RSC) | Medium | Medium |

## Recommendations
1. **Short-term (SEO focus):** Adopt **React Router v7** with SSR capabilities. It leverages existing code and improves SEO without a full rewrite.
2. **Long-term (Full Modernization):** **Next.js** if ecosystem/Vercel is priority, or **Remix** if staying close to React standards is preferred.

## Unresolved Questions
- Current dependency on browser-only libraries (e.g., specific rich text editors)?
- Need for "React Server Components" specifically, or just SEO (HTML generation)?

## Sources
- [Migrate Vite React SPA to Next.js](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGCirjNyJh6MRhkRGtqj0c7CZSSqqWpQ_rOj3V5i8atooRnzkmrJLMMmdTJegpAf540ebsQglo_73V5MsWLtj30o-zfGLnyCtkCz6mJDMBVOAxccUrF5LhrvwFLT_mhMJr4wU6W-1bi6opPLhjuZLMprzmj7kI=)
- [React Router v7 Migration](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGFY0Xiqj2tFF7j_wN6Z8Tjm3E0fmHwHRzjZhOQ9ow9OsJVvSv1WW_SCzvbNnSyUN8FzU_OD9qnA85FfkMdlrCLRo_HJ5XfE4n0Ba6Lprsu7lA_Qh1Z0W-5-ofB5m2hcBjT5cg0fufgkLk-tu9bc5fxwF58sW7D5CclTy2qQa55vDSjSkCFQaHr3db_JUDwne1cc1Xpj_lgoR6anqE=)
- [Framework Comparison](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGlDaL8ZPut9TEa6wnuftCRrm2x5nIyCfNyoN7enxqTyLBANjFf9t4A8F1DtUYL7HzeCt4ovTQUrv6tdvOFIRzCH2oKbq2G-5O6p4rtLikiq943z7sZhz9xXqFo09BTD5ok_fijpRY=)
