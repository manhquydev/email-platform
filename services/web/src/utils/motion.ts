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

// ============================================
// LIST ITEM ANIMATIONS - Phase 4 Micro-interactions
// ============================================

/**
 * Staggered list item animation for enter/exit
 * Usage: <m.div variants={listItem} initial="hidden" animate="visible" exit="exit">
 */
export const listItem = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
  },
  exit: {
    opacity: 0,
    x: -100,
    scale: 0.95,
    transition: { duration: 0.15, ease: [0.4, 0, 1, 1] }
  },
};

/**
 * Container for staggered children animations
 * Usage: <m.ul variants={staggerContainer} initial="hidden" animate="visible">
 */
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

/**
 * Swipe-out animation for list item deletion
 */
export const swipeOut = {
  exit: {
    x: '-100%',
    opacity: 0,
    height: 0,
    marginBottom: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
};

/**
 * Pop-in animation for new items
 */
export const popIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 25 }
  },
};

/**
 * Subtle pulse animation for highlights
 */
export const pulse = {
  animate: {
    scale: [1, 1.02, 1],
    transition: { duration: 0.3, ease: 'easeInOut' },
  },
};
