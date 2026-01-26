---
title: "3D Homepage Upgrade V3"
description: "Eye-comfort optimization: reduce visual strain, softer effects, calmer animations"
status: completed
priority: P1
effort: 4h
branch: main
tags: [frontend, 3d, threejs, ux, accessibility]
created: 2026-01-24
---

# 3D Homepage Upgrade V3 - Eye Comfort

## Context Links
- [V2 Plan](../260124-1959-3d-homepage-upgrade-v2/plan.md)
- [Current Postprocessing](../../services/web/src/components/three-d/postprocessing-effects.tsx)
- [Current Particles](../../services/web/src/components/three-d/instanced-particles.tsx)
- [Current Orbs](../../services/web/src/components/three-d/floating-orbs.tsx)

## Problem Statement
V2 gây mỏi mắt do:
1. **Bloom quá sáng** - intensity 1.2 gây chói
2. **Chromatic Aberration** - hiệu ứng lệch màu gây nhức đầu
3. **Noise overlay** - grain liên tục gây mệt mắt
4. **Emissive quá cao** - orbs & particles sáng chói (1.0-1.2)
5. **Chuyển động liên tục** - không có điểm nghỉ mắt

## Target State
- Hiệu ứng mềm mại, dễ chịu hơn cho mắt
- Giảm độ sáng emissive 50%
- Loại bỏ chromatic aberration
- Giảm/loại bỏ noise
- Animation chậm hơn, ít hơn
- Dark mode friendly

---

## Phases Overview

| Phase | Description | Effort | Status |
|-------|-------------|--------|--------|
| [Phase 1](./phase-01-reduce-postprocessing.md) | Giảm/tắt hiệu ứng gây mỏi mắt | 1h | pending |
| [Phase 2](./phase-02-softer-colors.md) | Giảm emissive, màu dịu hơn | 1.5h | pending |
| [Phase 3](./phase-03-calmer-animations.md) | Animation chậm, ít chuyển động | 1.5h | pending |

---

## Key Changes Summary

### Phase 1: Reduce Postprocessing
| Setting | V2 | V3 |
|---------|----|----|
| Bloom intensity | 1.2 | 0.4 |
| Chromatic Aberration | ON | OFF |
| Noise | 0.04 | 0 (remove) |
| luminanceThreshold | 0.9 | 0.95 |

### Phase 2: Softer Colors
| Element | V2 emissive | V3 emissive |
|---------|-------------|-------------|
| Particles | 1.2 | 0.4 |
| Primary Orb | 1.2 | 0.5 |
| Secondary Orb | 1.0 | 0.4 |
| Tertiary Orb | 0.8 | 0.3 |
| Opacity | 0.4-0.7 | 0.3-0.5 |

### Phase 3: Calmer Animations
| Animation | V2 | V3 |
|-----------|----|----|
| Float speed | 1-2 | 0.5-1 |
| Mouse repulsion force | 0.015 | 0.008 |
| Particle drift speed | 0.2-0.5 | 0.1-0.2 |
| Scroll parallax | 3 units | 1.5 units |

---

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Scene quá nhạt | A/B test với users |
| Mất visual impact | Giữ subtle bloom cho depth |

## Success Criteria
- Người dùng có thể nhìn 5+ phút không mỏi mắt
- Dark mode: contrast ratio < 10:1 (không chói)
- Animation smooth, không jerky
- Vẫn giữ được aesthetic 3D premium
