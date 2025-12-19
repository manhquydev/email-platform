import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { docsPlugin } from './vite.docs.config'

// @ts-ignore
const docs = docsPlugin()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), docs],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
  },
})
