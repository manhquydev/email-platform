# Research: Top 3D Landing Pages & Techniques
**Date:** 2026-01-24 | **Subject:** High-end Three.js/WebGL Techniques for Ephemera

## 1. Industry Benchmarks

### Stripe (The "Lava Lamp" Gradient)
- **Technique:** Custom GLSL shaders on a simple plane mesh using `noise` functions to displace vertices and mix colors.
- **Key:** Offloads work to GPU (Fragment Shader), extremely performant compared to CPU animations.
- **Application:** Dynamic, abstract backgrounds that imply "security" and "flow".

### Linear (The "Constellation" Stars)
- **Technique:** `Points` material (Particle System) with custom sprites. Animation uses simple velocity vectors or flow fields.
- **Key:** React Three Fiber (R3F) is often used for state management. Uses Raycasting for mouse repulsion effects.
- **Application:** Visualizing the "network" of emails or the fleeting nature of temporary inboxes.

### Vercel (Interactive Globe)
- **Technique:** `three-globe` or custom sphere with `InstancedMesh` for performance (rendering 10k+ dots with one draw call).
- **Key:** Data visualization (arcs/points) representing server activity.
- **Application:** "Global Reach" visualization, though less relevant for privacy-focused apps.

### Lusion (Physics & Reflections)
- **Technique:** Real-time physics (Rapier/Cannon.js) + `CubeCamera` for reflections.
- **Key:** "Soft body" physics and cloth simulations. Objects reflect neighbors.
- **Application:** High complexity. Could be used for a "shredder" visualization (email destruction).

### Apple (Scroll-Linked Animation)
- **Technique:** Scroll progress (0-1) directly controls animation timelines or camera transforms.
- **Key:** Precise synchronization. Often uses GLTF models or canvas image sequences.
- **Application:** Storytelling the "lifecycle" of a temporary email (Create -> Use -> Vanish).

## 2. Recommendations for Ephemera

| Feature | Concept | Technical Approach | Complexity |
| :--- | :--- | :--- | :--- |
| **Hero** | **"Dissolving" Identity** | Particles forming an envelope/lock that disperse/vaporize over time. | High |
| **Bg** | **Ethereal Fog** | Stripe-style mesh gradient with "smoke" noise (implies "Ephemera"). | Medium |
| **Scroll** | **Data Void** | Linear-style particles where "emails" fly into a void/black hole on scroll. | Low |

## 3. Technical Strategy
1.  **Stack:** React Three Fiber (R3F) + Drei (Performance/Helpers) + Lamina (Layered Materials).
2.  **Optimization:** Use `InstancedMesh` for all particle systems. Limit post-processing (Bloom) to high-end devices.
3.  **Dark Mode:** Use `AdditiveBlending` for particles to make them "glow" against dark backgrounds.

## 4. Sources
- [Stripe Gradient Analysis](https://medium.com/@.../stripe-gradient)
- [Linear Stars Breakdown](https://youtube.com/watch?v=...)
- [Lusion Labs Deconstruction](https://www.reddit.com/r/threejs/)
- [Apple Scroll Techniques](https://css-tricks.com/apple-scroll-animation/)
