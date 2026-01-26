# 3D Landing Page Upgrade - Scout Report

**Date:** 2026-01-24
**Subject:** File Discovery for 3D Homepage Upgrade

## Executive Summary
The scan identified 9 core files directly responsible for the current 3D landing page implementation. The system currently uses a basic heuristic for GPU detection and standard React Three Fiber components for visuals.

## 1. Core 3D Components
Located in `services/web/src/components/three-d/`:

- **`landing-hero-3d-scene.tsx`**: Main entry point for the 3D canvas. Sets up lighting, camera, and suspends child components.
  - *Modification needed:* Update performance settings, integrate new post-processing effects.
- **`ephemeral-particles.tsx`**: Handles the particle system animation.
  - *Modification needed:* Optimization for lower tiers, visual enhancements.
- **`floating-orbs.tsx`**: Renders floating geometric elements.
  - *Modification needed:* Update geometry/materials for new visual design.
- **`css-fallback-background.tsx`**: Rendered when GPU tier is 'low'.
  - *Modification needed:* Ensure visual consistency with new 3D design.
- **`lazy-landing-scene.tsx`**: Handles code-splitting for the heavy 3D bundle.
- **`index.ts`**: Exports components.

## 2. Infrastructure & Hooks
- **`services/web/src/hooks/use-gpu-tier.ts`**:
  - *Current state:* Uses basic user-agent and WebGL2 context check.
  - *Modification needed:* Replace heuristic with robust `detect-gpu` library integration for accurate tiering (Tier 0-3).

## 3. Page Integration
- **`services/web/src/pages/landing-page-modules/hero-section.tsx`**:
  - The UI container that holds the 3D background.
  - *Modification needed:* Ensure proper z-indexing and layout integration with new 3D elements.
- **`services/web/src/pages/LandingPage.tsx`**:
  - Parent page component.

## 4. Dependencies (`package.json`)
- **Current:** `three`, `@react-three/fiber`, `@react-three/drei`
- **Missing/Required:** `detect-gpu` (for accurate benchmarking), `postprocessing` (if adding bloom/effects).

## Unresolved Questions
1. Do we need to introduce custom GLSL shaders, or will `@react-three/drei` abstractions suffice?
2. Should we implement a "Tier 0" that completely disables WebGL in favor of CSS for battery saving on laptops?
