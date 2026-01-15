import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Ephemera - Temporary Email',
    description: 'Create disposable email addresses instantly. Protect your privacy and avoid spam.',
    version: '0.1.0',
    permissions: [
      'storage',
      'alarms',
      'clipboardWrite',
      'activeTab',
      'notifications',
      'sidePanel',
      'contextMenus',
      'scripting',
    ],
    host_permissions: ['https://api.manhquy.click/*'],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; connect-src 'self' https://api.manhquy.click",
    },
    action: {
      default_title: 'Ephemera',
    },
    side_panel: {
      default_path: 'entrypoints/sidepanel/index.html',
    },
  },
});
