import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import './styles/focus-stream.css'
import App from './App.tsx'

// Register Service Worker for PWA
registerSW({ immediate: true })

// --------------------------------------------------------------------------
// Mobile "Pull-to-Refresh" & Overscroll Prevention (Robust Fix v5 - Capture Phase)
// --------------------------------------------------------------------------

// 1. Force CSS-level blocking on all potential scroll roots
document.documentElement.style.overscrollBehavior = 'none';
document.body.style.overscrollBehavior = 'none';
const rootEl = document.getElementById('root');
if (rootEl) {
  rootEl.style.overscrollBehavior = 'none';
}

// 2. JavaScript Event Interception
// Using CAPTURE phase to intercept events BEFORE React or other libraries like Framer Motion see them.
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
}, { passive: false, capture: true });

document.addEventListener('touchmove', (e: TouchEvent) => {
  // Allow multi-touch via default behavior (zoom/pinch)
  if (e.touches.length > 1) return;

  const touchY = e.touches[0].clientY;
  const touchDiff = touchY - touchStartY; // > 0 = Swipe Down, < 0 = Swipe Up

  // Find scrollable target
  let target = e.target as HTMLElement;
  let scrollableParent: HTMLElement | null = null;

  while (target && target !== document.body && target !== document.documentElement) {
    const style = window.getComputedStyle(target);
    const overflowY = style.overflowY;
    const isScrollContainer = overflowY === 'auto' || overflowY === 'scroll';

    // Check if it's actually scrollable (content > height)
    // We strictly check this because if content fits, swiping should NOT cause scroll behavior
    const canScroll = target.scrollHeight > target.clientHeight;

    if (isScrollContainer && canScroll) {
      scrollableParent = target;
      break;
    }
    target = target.parentElement as HTMLElement;
  }

  if (scrollableParent) {
    // If we are inside a scrollable container, check specific boundaries
    const scrollTop = scrollableParent.scrollTop;
    const maxScroll = scrollableParent.scrollHeight - scrollableParent.clientHeight;

    // BLOCK SWIPE DOWN AT TOP (Prevent Refresh)
    if (scrollTop <= 1 && touchDiff > 0) { // Using <= 1 to handle potential subpixel weirdness
      if (e.cancelable) {
        e.preventDefault();
        e.stopPropagation(); // Stop bubbling to React/Library handlers
      }
    }
    // BLOCK SWIPE UP AT BOTTOM (Prevent Overscroll Nav)
    else if (scrollTop >= maxScroll - 1 && touchDiff < 0) {
      if (e.cancelable) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    // OTHERWISE: Allow normal scroll within container
  } else {
    // If NO scrollable ancestor found (e.g., header, static background),
    // PREVENT ALL Vertical Swipes to stop "rubber-banding" or browser reload.
    if (e.cancelable) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
}, { passive: false, capture: true }); // Capture phase is critical here

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
