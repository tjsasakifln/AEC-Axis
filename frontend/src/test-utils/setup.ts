import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// ============================================================================
// GLOBAL TEST SETUP WITH COMPREHENSIVE MOCKING
// Based on PRP requirements for WebSocket, File API, WebGL, and Three.js mocking
// ============================================================================

// ============================================================================
// CLEANUP CONFIGURATION
// ============================================================================
afterEach(() => {
  // Critical: Cleanup after each test to prevent memory leaks
  cleanup()
  vi.clearAllMocks()
  // Additional cleanup for WebSocket mocks (will be added when jest-websocket-mock is installed)
})

// ============================================================================
// WEBSOCKET MOCKING
// ============================================================================
// Mock WebSocket globally for components that use it
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  url: string
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(url: string) {
    this.url = url
    // Simulate connection opening after a microtask
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 0)
  }

  send(data: string) {
    // Mock send method - can be spy tracked in tests
    console.log(`MockWebSocket sending: ${data}`)
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close'))
    }
  }

  // Mock methods for testing
  mockReceiveMessage(data: any) {
    if (this.onmessage && this.readyState === MockWebSocket.OPEN) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }))
    }
  }

  mockError() {
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }
}

// Install WebSocket mock globally
global.WebSocket = MockWebSocket as any

// ============================================================================
// THREE.JS AND WEBGL MOCKING
// Critical for ifc-viewer.tsx testing - Three.js requires WebGL context
// ============================================================================

// Mock WebGL contexts that Three.js requires
const mockWebGLContext = {
  canvas: {
    width: 800,
    height: 600,
    style: {},
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    clientWidth: 800,
    clientHeight: 600,
    getContext: vi.fn(() => mockWebGLContext),
  },
  getParameter: vi.fn(),
  getExtension: vi.fn(),
  getShaderParameter: vi.fn(() => true),
  getProgramParameter: vi.fn(() => true),
  createShader: vi.fn(() => ({})),
  createProgram: vi.fn(() => ({})),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  useProgram: vi.fn(),
  createBuffer: vi.fn(() => ({})),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  createTexture: vi.fn(() => ({})),
  bindTexture: vi.fn(),
  texImage2D: vi.fn(),
  texParameteri: vi.fn(),
  createFramebuffer: vi.fn(() => ({})),
  bindFramebuffer: vi.fn(),
  viewport: vi.fn(),
  clear: vi.fn(),
  clearColor: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  depthFunc: vi.fn(),
  blendFunc: vi.fn(),
  drawElements: vi.fn(),
  drawArrays: vi.fn(),
  getUniformLocation: vi.fn(() => ({})),
  getAttribLocation: vi.fn(() => 0),
  uniform1f: vi.fn(),
  uniform1i: vi.fn(),
  uniform2f: vi.fn(),
  uniform3f: vi.fn(),
  uniform4f: vi.fn(),
  uniformMatrix4fv: vi.fn(),
  vertexAttribPointer: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  activeTexture: vi.fn(),
  pixelStorei: vi.fn(),
  generateMipmap: vi.fn(),
  // WebGL constants
  TRIANGLES: 4,
  UNSIGNED_INT: 5125,
  FLOAT: 5126,
  RGBA: 6408,
  TEXTURE_2D: 3553,
  COLOR_BUFFER_BIT: 16384,
  DEPTH_BUFFER_BIT: 256,
  DEPTH_TEST: 2929,
  BLEND: 3042,
  SRC_ALPHA: 770,
  ONE_MINUS_SRC_ALPHA: 771,
}

// Mock WebGL context creation
global.WebGLRenderingContext = vi.fn().mockImplementation(() => mockWebGLContext)
global.WebGL2RenderingContext = vi.fn().mockImplementation(() => mockWebGLContext)

// Mock HTMLCanvasElement.getContext to return our mock WebGL context
HTMLCanvasElement.prototype.getContext = vi.fn((contextType) => {
  if (contextType === 'webgl' || contextType === 'webgl2' || contextType === 'experimental-webgl') {
    return mockWebGLContext
  }
  return null
}) as any

// ============================================================================
// INTERSECTION OBSERVER MOCKING
// Required for components that use viewport detection
// ============================================================================
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}))

// ============================================================================
// RESIZE OBSERVER MOCKING
// Three.js and other libraries often use ResizeObserver
// ============================================================================
global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// ============================================================================
// FILE API MOCKING
// Critical for file upload testing in project-detail.tsx
// ============================================================================

// Mock FileReader for file upload tests
global.FileReader = vi.fn().mockImplementation(() => ({
  readAsArrayBuffer: vi.fn(),
  readAsDataURL: vi.fn(),
  readAsText: vi.fn(),
  result: null,
  error: null,
  onload: null,
  onerror: null,
  onabort: null,
  onloadstart: null,
  onloadend: null,
  onprogress: null,
  readyState: 0,
  abort: vi.fn(),
  EMPTY: 0,
  LOADING: 1,
  DONE: 2,
}))

// Mock URL.createObjectURL and revokeObjectURL for file handling
global.URL.createObjectURL = vi.fn(() => 'mock-object-url')
global.URL.revokeObjectURL = vi.fn()

// ============================================================================
// LOCAL STORAGE MOCKING
// Required for authentication token persistence
// ============================================================================
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// ============================================================================
// WINDOW METHODS MOCKING
// ============================================================================

// Mock window.confirm for delete confirmations in materials-table
global.confirm = vi.fn(() => true)

// Mock window.alert
global.alert = vi.fn()

// Mock scrollTo and scroll behavior
global.scrollTo = vi.fn()
Element.prototype.scrollIntoView = vi.fn()

// ============================================================================
// CONSOLE MOCKING FOR CLEANER TEST OUTPUT
// ============================================================================

// Suppress console.error and console.warn in tests unless needed for debugging
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = vi.fn()
  console.warn = vi.fn()
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})

// ============================================================================
// CUSTOM MATCHERS AND UTILITIES
// ============================================================================

// Extend expect with custom matchers for better testing
expect.extend({
  toBeInLoadingState(element: HTMLElement) {
    const pass = element.textContent?.includes('Carregando') || 
                 element.textContent?.includes('Loading') ||
                 element.querySelector('.loading-spinner') !== null
    
    return {
      message: () => pass 
        ? `Expected element not to be in loading state`
        : `Expected element to be in loading state`,
      pass,
    }
  },

  toHaveErrorMessage(element: HTMLElement, message?: string) {
    const errorElements = element.querySelectorAll('.error-message, [role="alert"]')
    const hasErrorMessage = errorElements.length > 0
    
    if (message) {
      const hasSpecificMessage = Array.from(errorElements)
        .some(el => el.textContent?.includes(message))
      return {
        message: () => hasSpecificMessage
          ? `Expected element not to have error message: ${message}`
          : `Expected element to have error message: ${message}`,
        pass: hasSpecificMessage,
      }
    }

    return {
      message: () => hasErrorMessage
        ? `Expected element not to have any error message`
        : `Expected element to have an error message`,
      pass: hasErrorMessage,
    }
  }
})

// ============================================================================
// TYPE DECLARATIONS FOR CUSTOM MATCHERS
// ============================================================================
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeInLoadingState(): T
    toHaveErrorMessage(message?: string): T
  }
  interface AsymmetricMatchersContaining {
    toBeInLoadingState(): any
    toHaveErrorMessage(message?: string): any
  }
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

// Track memory usage and test performance
let testStartTime: number
let testMemoryUsage: number

beforeAll(() => {
  testStartTime = performance.now()
  if ((global as any).gc) {
    (global as any).gc()
  }
  testMemoryUsage = (performance as any).memory?.usedJSHeapSize || 0
})

afterAll(() => {
  const testEndTime = performance.now()
  const testDuration = testEndTime - testStartTime
  const currentMemory = (performance as any).memory?.usedJSHeapSize || 0
  const memoryDelta = currentMemory - testMemoryUsage

  // Log performance metrics for monitoring
  if (process.env.NODE_ENV === 'test' && process.env.VITEST_LOG_PERFORMANCE) {
    console.log(`\n📊 Test Performance Metrics:`)
    console.log(`   Duration: ${testDuration.toFixed(2)}ms`)
    console.log(`   Memory Delta: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`)
  }
})

// ============================================================================
// EXPORT UTILITIES FOR TESTS
// ============================================================================
export {
  MockWebSocket,
  mockWebGLContext,
  localStorageMock,
}

// Success indicator for setup completion
console.log('🧪 AEC Axis test environment initialized with comprehensive mocks')