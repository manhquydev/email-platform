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

// 2. JavaScript Event Interception & 1px Scroll Buffer Trick
// This ensures scrollable containers NEVER hit absolute 0 or maxScroll,
// which prevents the browser from triggering pull-to-refresh or back/forward gestures.
let touchStartY = 0;

document.addEventListener('touchstart', (e: TouchEvent) => {
  touchStartY = e.touches[0].clientY;

  // 1px Scroll Buffer Hack: Detect scrollable target and bump it 1px off the edge
  let target = e.target as HTMLElement;
  while (target && target !== document.body) {
    const style = window.getComputedStyle(target);
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
      if (target.scrollTop === 0) {
        target.scrollTop = 1;
      } else if (target.scrollTop + target.clientHeight === target.scrollHeight) {
        target.scrollTop = target.scrollTop - 1;
      }
      break;
    }
    target = target.parentElement as HTMLElement;
  }
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
    const canScroll = target.scrollHeight > target.clientHeight;

    if (isScrollContainer && canScroll) {
      scrollableParent = target;
      break;
    }
    target = target.parentElement as HTMLElement;
  }

  if (scrollableParent) {
    const scrollTop = scrollableParent.scrollTop;
    const maxScroll = scrollableParent.scrollHeight - scrollableParent.clientHeight;

    // If at strict boundaries (even with 1px hack as safety), block default
    if (scrollTop <= 0 && touchDiff > 0) {
      if (e.cancelable) e.preventDefault();
    } else if (scrollTop >= maxScroll && touchDiff < 0) {
      if (e.cancelable) e.preventDefault();
    }
    // Otherwise rely on the 1px buffer from touchstart to keep us away from the browser trigger edge.
  } else {
    // If NO scrollable ancestor found, PREVENT ALL Vertical Swipes
    if (e.cancelable) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
}, { passive: false, capture: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
