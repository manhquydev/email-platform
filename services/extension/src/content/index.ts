// Ephemera Content Script
console.log('Ephemera Content Script Loaded');

// SVG Icon for the button
const ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect width="20" height="16" x="2" y="4" rx="2"/>
  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
</svg>
`;

function injectControl(input: HTMLInputElement) {
  if (input.dataset.ephemeraInjected) return;
  input.dataset.ephemeraInjected = 'true';

  // Create wrapper if needed, or just position absolute
  // Positioning absolute relative to the input's parent is risky if parent isn't relative.
  // A safer bet for a simple icon is to wrap the input, but that breaks layout often.
  // Best approach: Measure input position and overlay a floating button, updating on scroll/resize.
  // OR: Insert an element right after the input and use negative margin/absolute positioning?

  // Let's try inserting a wrapper container for our shadow root specifically positioned over the input right side.
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.justifyContent = 'center';
  wrapper.style.cursor = 'pointer';
  wrapper.style.zIndex = '9999';
  wrapper.style.pointerEvents = 'auto';

  // Shadow DOM to isolate styles
  const shadow = wrapper.attachShadow({ mode: 'open' });
  const button = document.createElement('div');
  button.innerHTML = ICON_SVG;
  button.style.backgroundColor = '#0ea5e9'; // Primary blue
  button.style.color = 'white';
  button.style.borderRadius = '4px';
  button.style.padding = '4px';
  button.style.display = 'flex';
  button.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
  button.style.transition = 'opacity 0.2s';
  button.style.opacity = '0.5';

  button.onmouseenter = () => button.style.opacity = '1';
  button.onmouseleave = () => button.style.opacity = '0.5';

  shadow.appendChild(button);
  document.body.appendChild(wrapper);

  // Position logic
  const updatePosition = () => {
    const rect = input.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || input.type === 'hidden') {
      wrapper.style.display = 'none';
      return;
    }

    wrapper.style.display = 'flex';
    // Position inside the right edge of the input
    const top = rect.top + window.scrollY + (rect.height - 24) / 2; // Center vertically
    const left = rect.left + window.scrollX + rect.width - 30; // 30px from right

    wrapper.style.top = `${top}px`;
    wrapper.style.left = `${left}px`;
    wrapper.style.width = '24px';
    wrapper.style.height = '24px';
  };

  updatePosition();

  // Update on events
  window.addEventListener('resize', updatePosition);
  window.addEventListener('scroll', updatePosition, true);

  // Also observe the input for size changes
  const resizeObserver = new ResizeObserver(updatePosition);
  resizeObserver.observe(input);

  // Click handler
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Show loading state
    button.style.opacity = '0.7';
    button.style.cursor = 'wait';

    try {
      // Send message to background
      const response = await chrome.runtime.sendMessage({ type: 'CREATE_INBOX' });

      if (response && response.success && response.inbox) {
        const email = response.inbox.address || `${response.inbox.localPart}@${response.inbox.domain.name}`;

        // Fill input
        input.value = email;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        // Flash success color
        button.style.backgroundColor = '#22c55e'; // Green
        setTimeout(() => {
          button.style.backgroundColor = '#0ea5e9';
        }, 1500);
      } else {
        console.error('Ephemera: Failed to create inbox', response);
        button.style.backgroundColor = '#ef4444'; // Red
      }
    } catch (err) {
      console.error('Ephemera error:', err);
      button.style.backgroundColor = '#ef4444';
    } finally {
      button.style.cursor = 'pointer';
      button.style.opacity = '1';
    }
  });
}

function scan() {
  const inputs = document.querySelectorAll('input[type="email"]');
  inputs.forEach(input => {
    injectControl(input as HTMLInputElement);
  });
}

// Initial scan
scan();

// Observer for dynamic content
const observer = new MutationObserver((mutations) => {
  let shouldScan = false;
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      shouldScan = true;
      break;
    }
  }
  if (shouldScan) scan();
});

observer.observe(document.body, { childList: true, subtree: true });
