/**
 * Optimized Motion Exports
 *
 * Use these instead of importing directly from 'framer-motion'
 * to ensure tree-shaking and code-splitting work correctly.
 *
 * Usage:
 *   import { m, AnimatePresence } from '@/utils/motion';
 *   <m.div animate={{ opacity: 1 }} />
 */

// Re-export only what's needed (tree-shakeable)
export {
  m,
  AnimatePresence,
  useAnimation,
  useMotionValue,
  useTransform,
  useSpring,
  useInView,
} from 'framer-motion';

// Common animation variants
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const slideIn = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const scale = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// Default transition
export const defaultTransition = {
  duration: 0.2,
  ease: [0.4, 0, 0.2, 1],
};

// Spring transition for bouncy effects
export const springTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};
