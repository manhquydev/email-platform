import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import './styles/focus-stream.css'
import App from './App.tsx'

// Register Service Worker for PWA
registerSW({ immediate: true })

// Prevent pull-to-refresh and overscroll on mobile
document.addEventListener('touchmove', (e: TouchEvent) => {
  // Find if the target or its parents are scrollable
  let target = e.target as HTMLElement;
  let isScrollable = false;

  while (target && target !== document.body) {
    if (target.scrollHeight > target.clientHeight) {
      const style = window.getComputedStyle(target);
      const overflowY = style.overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        const isAtTop = target.scrollTop === 0;
        const isAtBottom = target.scrollHeight - target.scrollTop === target.clientHeight;

        // If we're not at the edges, it's safe to scroll
        if (!isAtTop && !isAtBottom) {
          isScrollable = true;
          break;
        }

        // Note: Logic to detect swipe direction would be needed for edge cases,
        // but generally, if we match a scrollable container, we let browser handle it
        // unless it enters overscroll territory. 
        // For simple "pull-to-refresh" blocking, preventing default on root is key.
        isScrollable = true;
        break;
      }
    }
    target = target.parentElement as HTMLElement;
  }

  // If no scrollable parent found, or if we want to strictly block overscroll:
  if (!isScrollable) {
    // Check if it's likely a pull-to-refresh gesture (at top of page)
    if (window.scrollY === 0) {
      // e.preventDefault(); // CAUTION: e.preventDefault() is often ignored on modern browsers if passive: true
    }
  }
}, { passive: false });

// Specific fix for "pull-to-refresh" reload behavior
// We'll use a CSS-like JS enforced approach for the root
document.documentElement.style.overscrollBehavior = 'none';
document.body.style.overscrollBehavior = 'none';

// Add a more aggressive handler specifically for the root pull-down
let touchStartY = 0;
document.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
}, { passive: false });

document.addEventListener('touchmove', (e) => {
  const touchY = e.touches[0].clientY;
  const touchDiff = touchY - touchStartY;

  // If dragging down at the very top of the page
  if (window.scrollY === 0 && touchDiff > 0) {
    // Only prevent if we are NOT inside a scrollable container that is NOT at its top
    // But since we use App-Shell, window.scrollY should always be 0.
    // We check if the event target is inside our scrollable #root
    const root = document.getElementById('root');
    if (root && root.contains(e.target as Node)) {
      // If #root is at scrollTop 0, prevents refresh
      if (root.scrollTop <= 0) {
        if (e.cancelable) e.preventDefault();
      }
    } else {
      if (e.cancelable) e.preventDefault();
    }
  }
}, { passive: false });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
