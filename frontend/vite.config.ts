/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-utils/setup.ts'],
    // Performance optimizations from PRP
    isolate: false, // Speed up tests by reusing contexts
    testTimeout: 10000,
    hookTimeout: 10000,
    // V8 coverage provider for better performance  
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test-utils/',
        'src/__mocks__/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        'src/vite-env.d.ts',
      ],
      // Critical components require 100% coverage
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Critical business components - 100% coverage requirement
        'src/components/quote-dashboard.tsx': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100
        },
        'src/pages/project-detail.tsx': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100
        },
        'src/components/materials-table.tsx': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100
        },
        'src/components/ifc-viewer.tsx': {
          branches: 95, // Slightly relaxed due to Three.js complexity
          functions: 100,
          lines: 95,
          statements: 95
        }
      }
    },
    // Pool configuration for parallel test execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 2
      }
    },
    // Enhanced error reporting
    outputFile: {
      json: './coverage/vitest-results.json',
      junit: './coverage/junit.xml'
    },
    // Better test file discovery - exclude E2E tests
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/__tests__/**/*.{ts,tsx}'
    ],
    exclude: [
      'node_modules/**',
      'src/__tests__/e2e/**',
      'src/**/*.e2e.{test,spec}.{ts,tsx}',
      'src/test-fixtures/**'
    ]
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './src/__tests__'),
      '@test-utils': path.resolve(__dirname, './src/test-utils')
    }
  }
})