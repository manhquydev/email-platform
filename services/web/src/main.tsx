import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import './styles/focus-stream.css'
import App from './App.tsx'

// Register Service Worker for PWA
registerSW({ immediate: true })

// --------------------------------------------------------------------------
// Mobile "Pull-to-Refresh" & Overscroll Prevention (Robust Fix v4)
// --------------------------------------------------------------------------

// 1. Force CSS-level blocking on root elements
document.documentElement.style.overscrollBehavior = 'none';
document.body.style.overscrollBehavior = 'none';

// 2. JavaScript Event Interception
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
}, { passive: false });

document.addEventListener('touchmove', (e: TouchEvent) => {
  // If multiple touches (zoom/pinch), normally we'd ignore, but to be safe for "reload":
  // allow default behavior for multi-touch gestures usually, but here we focus on single touch swipe.
  if (e.touches.length > 1) return;

  const touchY = e.touches[0].clientY;
  const touchDiff = touchY - touchStartY; // > 0 = Swipe Down, < 0 = Swipe Up

  // Find the closest scrollable ancestor
  let target = e.target as HTMLElement;
  let scrollableParent: HTMLElement | null = null;

  while (target && target !== document.body && target !== document.documentElement) {
    const style = window.getComputedStyle(target);
    const overflowY = style.overflowY;
    const isScrollContainer = overflowY === 'auto' || overflowY === 'scroll';

    // Check if it's actually scrollable (content > height)
    const canScroll = target.scrollHeight > target.clientHeight;

    if (isScrollContainer) {
      // Even if currently not scrollable (content fits), checking 'isScrollContainer' 
      // is important because it MIGHT become scrollable or is intended to be the scroll target.
      // But typically we only care if it *can* scroll.
      if (canScroll) {
        scrollableParent = target;
        break;
      }
    }
    target = target.parentElement as HTMLElement;
  }

  if (scrollableParent) {
    // If we are inside a scrollable container, check boundaries
    const scrollTop = scrollableParent.scrollTop;
    const maxScroll = scrollableParent.scrollHeight - scrollableParent.clientHeight;

    // AT TOP: If pulling DOWN (diff > 0), prevent refresh
    if (scrollTop <= 0 && touchDiff > 0) {
      if (e.cancelable) e.preventDefault();
    }
    // AT BOTTOM: If pulling UP (diff < 0), prevent overscroll navigation
    else if (scrollTop >= maxScroll && touchDiff < 0) {
      if (e.cancelable) e.preventDefault();
    }
    // OTHERWISE: Allow normal scroll
  } else {
    // If NO scrollable ancestor found (e.g., header, static background),
    // PREVENT ALL Vertical Swipes to stop "rubber-banding" or browser reload.
    if (e.cancelable) e.preventDefault();
  }
}, { passive: false });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
