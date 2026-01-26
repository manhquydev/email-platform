# Research Report: 3D Design Patterns for Ephemera

**Date:** 2026-01-24
**Subject:** 3D Visualization Patterns for Privacy-Focused Ephemeral Email
**Context:** Glassmorphism UI, Dark Mode, Violet/Purple Theme

## 1. Core 3D Metaphors

### A. The Crystalline Envelope (Hero Element)
Instead of flat icons, use a 3D glass envelope for the inbox zero state or unread messages.
- **Visuals:** High-transmission glass material (frosted), glowing violet edges.
- **Animation:** Floats gently. When opened, it doesn't fold—it *shatters* or *dissolves* into particles, symbolizing the ephemeral nature of the message.
- **Tech:** React Three Fiber (R3F) + `MeshTransmissionMaterial`.

### B. Ephemeral Data Particles (Background/Transition)
Visualizing the temporary nature of data.
- **Visuals:** Floating dust/motes in the background that drift and fade.
- **Interaction:** When a message is deleted or expires, it disintegrates into these particles rather than just disappearing.
- **Tech:** R3F `Points` or custom shader particles. Low poly count for performance.

### C. The Encryption Core (Status Indicator)
Abstract geometric representation of security.
- **Visuals:** An abstract, slowly rotating icosahedron or sphere with a "Privacy Glass" shader (high distortion, blur).
- **Usage:** Indicates secure connection or encryption in progress.
- **Tech:** IcosahedronGeometry + Custom ShaderMaterial.

## 2. Integration with Glassmorphism

Glassmorphism relies on blur and translucency. 3D elements should enhance this, not fight it.
- **Materiality:** Use "Frosted Glass" materials (high roughness, transmission) for 3D objects to match the 2D UI.
- **Lighting:** Use rim lighting (purple/cyan) to define edges against the dark background.
- **Depth:** Place 3D elements *behind* the 2D glass panels (UI) to emphasize depth, or have them float *through* the layers.

## 3. Implementation Complexity & Feasibility

| Feature | Complexity | Performance Risk | Recommendation |
| :--- | :--- | :--- | :--- |
| **Glass Envelopes** | High (Refraction) | High (GPU load) | Use `drei`'s `MeshTransmissionMaterial` with low resolution buffer. |
| **Particle Disintegration** | Medium | Low (if instanced) | Use for "Delete" actions. |
| **Background Orbs** | Low | Low | Use as "Screensaver" or Hero background. |

## 4. Key Libraries
- **@react-three/fiber**: Core definition.
- **@react-three/drei**: For `MeshTransmissionMaterial`, `Float`, `Stars`/`Sparkles`.
- **lamina**: For layer-based shaders (gradients).

## Unresolved Questions
- Performance impact of multiple glass materials on mobile devices?
- Fallback for low-power mode (static images vs simplified 3D)?
