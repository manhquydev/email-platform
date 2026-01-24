# Phase 01: Setup & Dependencies

## Overview
- **Priority:** P1
- **Status:** ✅ Done (2026-01-24)
- **Effort:** 2h

Install Three.js ecosystem với React 19 compatibility.

## Requirements
- Install R3F v9 compatible với React 19
- Configure Vite cho Three.js optimization
- Setup type definitions

## Implementation Steps

### 1. Install Dependencies
```bash
cd services/web
npm install three @types/three
npm install @react-three/fiber@latest @react-three/drei@latest
```

### 2. Verify Versions
Ensure installed versions:
- `@react-three/fiber` >= 9.0.0
- `@react-three/drei` >= 10.0.0

### 3. Vite Config (if needed)
```ts
// vite.config.ts - add if tree-shaking issues
optimizeDeps: {
  include: ['three']
}
```

## Todo List
- [ ] Install core Three.js packages
- [ ] Install R3F v9 + drei v10
- [ ] Verify React 19 compatibility
- [ ] Test basic Canvas render

## Success Criteria
- No dependency conflicts
- `<Canvas>` renders without errors
- TypeScript types work correctly

## Files to Modify
- `services/web/package.json`
- `services/web/vite.config.ts` (optional)
