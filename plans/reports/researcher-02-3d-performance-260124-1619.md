# Research: 3D Web Performance & Mobile Optimization

**Date:** 2026-01-24
**Subject:** 3D Landing Page Optimization (Mobile-First)

## 1. Performance Budgets & Targets
To ensure fluid UX on mobile devices (often shared memory, weak GPUs), strict budgets are required:
*   **FPS Target:** Consistent **60 FPS** (Drop to 30 FPS on low-power mode/interaction idle).
*   **Load Time:** < 2s for core interactive elements (TTI).
*   **Asset Size:** Total 3D assets < **2-5MB** (gzipped). Individual models < 500KB where possible.
*   **Draw Calls:** < 50-100 per frame on mobile.
*   **Triangle Count:** < 50k-80k visible triangles for mobile scenes.

## 2. Mobile GPU Limitations & Glassmorphism
Glassmorphism (`backdrop-filter: blur()`) + WebGL is extremely expensive on mobile due to overdraw and fill-rate limits.

### Glassmorphism Strategy
*   **High-End:** Full CSS backdrop-filter with hardware acceleration (`transform: translateZ(0)`).
*   **Mid-Range:** Reduced blur radius or static semi-transparent overlays.
*   **Low-End / Mobile:** **Disable real-time blur**. Use pre-blurred images or opaque fallbacks.
*   **Interaction:** Disable blur *during* scroll/animations if FPS drops.

### Fallback Strategies
*   **Tiered Rendering:** Detect GPU tier (using `getGPUTier` libraries) to toggle features.
*   **Canvas Fallback:** If WebGL fails or crashes (context lost), gracefully degrade to a static 2D image or CSS-only animation.

## 3. Pixel Ratio & Canvas Sizing
**Never** use raw `window.devicePixelRatio` on mobile (often 3x or higher). It kills fill-rate.

*   **Best Practice:** Clamp pixel ratio.
    ```javascript
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x
    ```
*   **Dynamic Scaling:** Reduce resolution during heavy camera movement, restore on idle.
    ```javascript
    // On touch move
    renderer.setPixelRatio(1);
    // On touch end
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    ```

## 4. Lazy Loading & LOD (Level of Detail)
*   **Lazy Load:** Do not block LCP. Load the 3D scene *after* critical DOM content. Use a lightweight placeholder image.
*   **Draco Compression:** MUST use Draco/Meshopt for GLTF models (reduces geometry size by ~70-90%).
*   **Texture Compression:** Use **KTX2** (Basis Universal) textures. GPU-ready formats, smaller VRAM footprint than JPEGs.
*   **LOD Implementation:**
    *   Use `THREE.LOD` to swap geometry based on camera distance.
    *   Mobile-specific geometry: Serve lower-poly models specifically for mobile user agents if significant difference exists.

## 5. Unresolved Questions
*   Does the current design rely on real-time refraction (glass shader) inside the 3D scene, or just CSS overlays? (3D glass shaders are much heavier).
*   What is the specific polycount of the hero 3D asset?
*   Do we need a fallback for devices with reduced motion preference (`prefers-reduced-motion`)?

## Sources
- [Three.js Optimization](https://threejs.org/docs/#manual/en/introduction/How-to-run-things-fast)
- [Mobile WebGL Performance](https://web.dev/articles/webgl-performance)
- [Google: 3D Performance Budgets](https://modelviewer.dev/)
