---
title: "3D Homepage Upgrade V2"
description: "Advanced 3D effects: postprocessing, mouse interaction, scroll animations, instanced particles"
status: completed
priority: P2
effort: 12h
branch: main
tags: [frontend, 3d, threejs, postprocessing, r3f]
created: 2026-01-24
---

# 3D Homepage Upgrade V2

## Context Links
- [Top 3D Sites Research](../reports/researcher-01-top-3d-sites-260124-1945.md)
- [3D Techniques for SaaS](../reports/researcher-02-3d-techniques-saas-260124-1945.md)
- [R3F Advanced Patterns](../reports/researcher-03-r3f-advanced-260124-1945.md)
- [Scout Report](./scout-report.md)
- [Previous Plan](../260124-1619-threejs-landing-page-integration/)

## Current State
- Basic particle system using `Points` with slow rotation
- 3 floating orbs with `Float` from drei
- Simple GPU tier detection (mobile/desktop heuristic)
- No postprocessing, no mouse interaction, no scroll sync

## Target State
- Postprocessing: Bloom, ChromaticAberration, Noise
- Mouse interaction: particle repulsion/attraction
- Scroll-linked animations
- InstancedMesh for 1000+ particles at 60fps
- GPU-tier adaptive rendering

---

## Two Approaches

### Approach A: Incremental Enhancement (RECOMMENDED)
Add features one-by-one to existing codebase.

| Pros | Cons |
|------|------|
| Lower risk, easy rollback | May accumulate tech debt |
| Test each feature in isolation | Harder to optimize holistically |
| Faster time-to-value | Shader reuse less elegant |
| Preserves working code | Multiple refactors possible |

### Approach B: Full Shader-First Rewrite
Rebuild with custom GLSL shaders as foundation.

| Pros | Cons |
|------|------|
| Maximum visual quality | Higher risk, all-or-nothing |
| Optimal GPU performance | Longer dev time (~20h) |
| Clean architecture | Requires GLSL expertise |
| Unified dissolve/glow effects | Harder to debug |

**Decision:** Approach A - incremental is safer, delivers value faster, allows A/B testing each feature.

---

## Phases Overview

| Phase | Description | Effort | Status |
|-------|-------------|--------|--------|
| [Phase 1](./phase-01-postprocessing.md) | Add EffectComposer, Bloom, ChromaticAberration | 2h | ✅ Done |
| [Phase 2](./phase-02-mouse-interaction.md) | Mouse repulsion/attraction for particles | 3h | ✅ Done |
| [Phase 3](./phase-03-scroll-animations.md) | ScrollControls + parallax | 2.5h | ✅ Done |
| [Phase 4](./phase-04-instanced-particles.md) | Convert Points to InstancedMesh | 2.5h | ✅ Done |
| [Phase 5](./phase-05-testing-optimization.md) | Performance testing, GPU tier polish | 2h | ✅ Done |

---

## Key Dependencies
- `@react-three/postprocessing` (add to package.json)
- `detect-gpu` (replace heuristic in use-gpu-tier.ts)
- Existing: `three`, `@react-three/fiber`, `@react-three/drei`

## Risk Assessment
- **Mobile performance**: Bloom is GPU-heavy; disable on tier < 2
- **Bundle size**: postprocessing adds ~50KB gzipped
- **Scroll hijack**: ScrollControls may conflict with page scroll

## Unresolved Questions
1. Should we implement custom dissolve shader in Phase 4 or defer to V3?
2. Tier 0 (full CSS fallback for battery saver) - scope creep?
