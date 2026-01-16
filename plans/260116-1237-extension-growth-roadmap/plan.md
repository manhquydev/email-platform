---
title: "Ephemera Extension Growth Roadmap"
description: "Strategic 4-phase plan to evolve extension from MVP to enterprise-ready product"
status: pending
priority: P1
effort: 40h
branch: main
tags: [extension, roadmap, growth, accessibility, enterprise]
created: 2026-01-16
---

# Ephemera Extension Growth Roadmap

## Executive Summary

Extension scores 7.5/10 architecture, 62/100 accessibility. Core strengths: Side Panel USP, Shadow DOM isolation, modern UI. Critical gaps: error boundaries, ARIA labels, keyboard nav, no testing. Roadmap prioritizes stability before features, then power-user tools, analytics, and enterprise readiness.

## Phase Overview

| Phase | Focus | Effort | Priority |
|-------|-------|--------|----------|
| [Phase 1](./phase-01-stability-and-quality.md) | Stability & Quality | 12h | P0 |
| [Phase 2](./phase-02-power-user-features.md) | Power User Features | 10h | P1 |
| [Phase 3](./phase-03-growth-and-analytics.md) | Growth & Analytics | 10h | P2 |
| [Phase 4](./phase-04-enterprise-ready.md) | Enterprise Ready | 8h | P3 |

## Success Metrics

| Metric | Current | Phase 1 | Phase 4 |
|--------|---------|---------|---------|
| Architecture Score | 7.5/10 | 8.5/10 | 9/10 |
| Accessibility Score | 62/100 | 85/100 | 95/100 |
| Test Coverage | 0% | 60% | 80% |
| Error Rate | Unknown | <1% | <0.1% |
| User Retention (7d) | Unknown | Baseline | +30% |

## Dependencies

- Backend API: Domain listing endpoint (Phase 2)
- Backend API: Analytics endpoint (Phase 3)
- i18n strings file from product team (Phase 4)

## Risk Summary

- **High:** Analytics endpoint not implemented - blocks Phase 3 metrics
- **Medium:** Bundle size growth with new features - monitor 600KB limit
- **Low:** Breaking changes in WXT framework updates

## Audit Sources

- Architecture: 7.5/10 - [code-reviewer-260116-1239-extension-architecture.md](../reports/code-reviewer-260116-1239-extension-architecture.md)
- Features: High completeness - [audit-260116-1237-extension-features.md](../reports/audit-260116-1237-extension-features.md)
- UX/Perf: 62/100 accessibility - [audit-260116-1237-extension-ux-performance.md](../reports/audit-260116-1237-extension-ux-performance.md)

## Unresolved Questions

1. Analytics endpoint timeline - required for Phase 3
2. Domain listing API availability - required for Phase 2 domain picker
3. i18n priority languages beyond English/Vietnamese
