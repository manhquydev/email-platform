import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
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
    commands: {
      "create-inbox": {
        "suggested_key": {
          "default": "Ctrl+Shift+E",
          "mac": "Command+Shift+E"
        },
        "description": "Create a new random inbox"
      },
      "copy-current": {
        "suggested_key": {
          "default": "Ctrl+Shift+C",
          "mac": "Command+Shift+C"
        },
        "description": "Copy the most recent inbox address"
      }
    },
    browser_specific_settings: {
      gecko: {
        id: 'extension@ephemera.io',
        strict_min_version: '109.0',
      },
    },
    side_panel: {
      default_path: 'entrypoints/sidepanel/index.html',
    },
  },
  vite: () => ({
    build: {
      chunkSizeWarningLimit: 600,
    },
  }),
});
