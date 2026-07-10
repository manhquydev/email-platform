import { defineConfig } from 'wxt';
import { resolve } from 'node:path';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  publicDir: resolve(__dirname, 'public'),
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
      'webRequest',
    ],
    host_permissions: [
      'https://api.manhquy.id.vn/*',
      'https://auth.openai.com/*',
      'https://chatgpt.com/*',
      'https://app.fireworks.ai/*',
      'http://localhost:1455/*',
    ],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; connect-src 'self' https://api.manhquy.id.vn; img-src 'self' https: data:",
    },
    action: {
      default_title: '__MSG_extName__',
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
      },
      "toggle-openai-flow1-loop": {
        "suggested_key": {
          "default": "Ctrl+Shift+8",
          "mac": "Command+Shift+8"
        },
        "description": "Toggle OpenAI Flow 1 loop automation"
      },
      "toggle-fireworks-flow3-loop": {
        "suggested_key": {
          "default": "Ctrl+Shift+9",
          "mac": "Command+Shift+9"
        },
        "description": "Toggle Fireworks Flow 3 loop automation"
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
