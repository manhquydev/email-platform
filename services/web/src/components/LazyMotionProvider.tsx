/**
 * LazyMotion Provider - Code-splits Framer Motion for smaller bundle
 *
 * Uses domAnimation (basic features, ~15KB) instead of full motion (~60KB)
 * Wrap your app with this provider and use 'm' instead of 'motion'
 */
import { LazyMotion, domAnimation } from 'framer-motion';
import type { ReactNode } from 'react';

interface LazyMotionProviderProps {
  children: ReactNode;
}

export function LazyMotionProvider({ children }: LazyMotionProviderProps) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

// Re-export m component for use instead of motion
// eslint-disable-next-line react-refresh/only-export-components
export { m } from 'framer-motion';
