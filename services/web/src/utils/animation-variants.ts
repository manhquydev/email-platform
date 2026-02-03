/**
 * Shared framer-motion animation variants
 * Used across PageLayout, EmailStream, MobileNav
 */
import type { Variants, Transition } from 'framer-motion';

// Page transition variants (slide + fade)
export const pageVariants: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export const pageTransition: Transition = {
  duration: 0.2,
  ease: 'easeOut' as const,
};

// List item stagger variants
export const listItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.03, duration: 0.15 },
  }),
};

// Mobile nav slide-up variants
export const slideUpVariants: Variants = {
  hidden: { y: '100%' },
  visible: {
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 300 },
  },
  exit: {
    y: '100%',
    transition: { duration: 0.15 },
  },
};

// Fade variants for overlays
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

// Reduced motion versions (instant transitions)
export const reducedMotionVariants: Variants = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit: { opacity: 1 },
};

// Helper to get variants based on reduced motion preference
export function getPageVariants(reducedMotion: boolean): Variants {
  return reducedMotion ? reducedMotionVariants : pageVariants;
}
