import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react({
      // Enable fast refresh
      fastRefresh: true,
      // Optimize JSX
      jsxRuntime: 'automatic',
      // Enable concurrent features
      babel: {
        plugins: [
          // Enable React concurrent features
          '@babel/plugin-syntax-jsx',
        ],
      },
    }),
    // Bundle analyzer
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
    }),
  ],

  // Build optimizations
  build: {
    // Enable source maps for production debugging
    sourcemap: false,
    // Minify
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
      mangle: {
        safari10: true,
      },
    },
    // Target modern browsers
    target: 'es2020',
    // Code splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting
        manualChunks: {
          // Vendor libraries
          vendor: ['react', 'react-dom', 'react-router-dom'],

          // UI libraries
          ui: ['@headlessui/react', '@heroicons/react', 'clsx', 'tailwindcss'],

          // GraphQL/Apollo
          graphql: ['@apollo/client', 'graphql'],

          // Utilities
          utils: ['date-fns', 'lodash-es'],

          // PDF handling
          pdf: ['jspdf', 'html2canvas'],

          // Charts
          charts: ['recharts'],
        },
        // Dynamic chunk naming
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()
            : 'chunk';
          return `assets/js/${facadeModuleId}-[hash].js`;
        },
        // Asset naming
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name.split('.').pop();
          if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)$/.test(assetInfo.name)) {
            return `assets/media/[name]-[hash][extname]`;
          }
          if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(assetInfo.name)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[ext]/[name]-[hash][extname]`;
        },
      },
      // External dependencies
      external: [],
    },
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting
    cssCodeSplit: true,
  },

  // Development server optimizations
  server: {
    port: 3000,
    host: true,
    // Enable HMR
    hmr: {
      overlay: true,
    },
    // Proxy API requests
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/graphql': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // Resolve optimizations
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@services': resolve(__dirname, 'src/services'),
      '@types': resolve(__dirname, 'src/types'),
      '@assets': resolve(__dirname, 'src/assets'),
    },
    // Optimize module resolution
    dedupe: ['react', 'react-dom'],
  },

  // CSS optimizations
  css: {
    devSourcemap: true,
    // PostCSS plugins
    postcss: {
      plugins: [
        // Autoprefixer
        'autoprefixer',
        // CSS nano for production
        ...(process.env.NODE_ENV === 'production'
          ? ['cssnano']
          : []),
      ],
    },
    // Enable CSS modules
    modules: {
      localsConvention: 'camelCase',
    },
  },

  // Optimizations
  optimizeDeps: {
    // Pre-bundle dependencies
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@apollo/client',
      'graphql',
      'date-fns',
      'clsx',
      'tailwindcss',
    ],
    // Exclude from pre-bundling
    exclude: [
      '@apollo/client',
      'jspdf',
      'html2canvas',
    ],
  },

  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },

  // Environment variables
  envPrefix: 'VITE_',

  // Experimental features
  experimental: {
    // Build as library
    renderBuiltUrl(filename, { hostType }) {
      // Custom CDN URL for assets
      if (hostType === 'js' || hostType === 'css') {
        return `https://cdn.tempmail.pro/assets/${filename}`;
      }
      return { filename };
    },
  },

  // Preview server
  preview: {
    port: 4173,
    host: true,
  },
});