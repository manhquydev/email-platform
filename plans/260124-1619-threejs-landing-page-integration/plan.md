---
title: "Three.js Landing Page 3D Integration"
description: "Tích hợp 3D elements vào trang chủ email platform để tăng trải nghiệm người dùng"
status: pending
priority: P2
effort: 16h
branch: feat/threejs-landing-3d
tags: [frontend, 3d, threejs, landing-page]
created: 2026-01-24
---

# Three.js Landing Page 3D Integration

## Overview
Tích hợp React Three Fiber (R3F) vào landing page của Ephemera email platform, tạo 3D background với particles và geometric elements phù hợp với theme "ephemeral privacy".

## Research Summary
- **R3F v9 + drei v10** required cho React 19 compatibility
- **Performance targets**: 60 FPS, <5MB assets, pixel ratio capped at 2
- **Design concept**: Ephemeral particles + floating geometric shapes
- **Fallback**: Static CSS cho mobile low-end

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Setup & Dependencies | ✅ Done | 2h | [phase-01](./phase-01-setup-dependencies.md) |
| 2 | 3D Background Component | ✅ Done | 6h | [phase-02-3d-background-component.md](./phase-02-3d-background-component.md) |
| 3 | Performance & Fallbacks | Pending | 4h | [phase-03-performance-fallbacks.md](./phase-03-performance-fallbacks.md) |
| 4 | Integration & Testing | Pending | 4h | [phase-04-integration-testing.md](./phase-04-integration-testing.md) |

## Dependencies
- `three` + `@types/three`
- `@react-three/fiber@^9`
- `@react-three/drei@^10`

## Research Reports
- [R3F + React 19](./research/researcher-01-r3f-react19-260124-1619.md)
- [3D Performance](./research/researcher-02-3d-performance-260124-1619.md)
- [Design Patterns](./research/researcher-03-3d-design-patterns-260124-1619.md)

## Success Criteria
- [ ] 3D scene renders on landing page hero section
- [ ] 60 FPS on desktop, graceful fallback on mobile
- [ ] Bundle size increase < 200KB gzipped
- [ ] No accessibility regressions
