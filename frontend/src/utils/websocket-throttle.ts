/**
 * Performance utilities for WebSocket throttling and optimization.
 * 
 * This module provides utilities to handle high-frequency WebSocket updates
 * without overwhelming the UI with excessive re-renders.
 */

// Type definitions
interface ThrottleFunction<T extends any[]> {
  (...args: T): void
}

interface BatchUpdate<T> {
  id: string
  data: T
  timestamp: number
}

interface ThrottleOptions {
  leading?: boolean
  trailing?: boolean
}

/**
 * Throttle function execution to prevent excessive calls
 * @param func Function to throttle
 * @param delay Delay in milliseconds
 * @param options Throttle options
 */
export function throttle<T extends any[]>(
  func: (...args: T) => void,
  delay: number,
  options: ThrottleOptions = { leading: true, trailing: true }
): ThrottleFunction<T> {
  let timeoutId: NodeJS.Timeout | null = null
  let lastExecTime = 0
  let lastArgs: T | null = null

  return function throttledFunction(...args: T) {
    const now = Date.now()
    const timeSinceLastExec = now - lastExecTime

    // Store the latest arguments
    lastArgs = args

    // Leading edge execution
    if (options.leading && timeSinceLastExec >= delay) {
      lastExecTime = now
      func(...args)
      return
    }

    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    // Trailing edge execution
    if (options.trailing) {
      timeoutId = setTimeout(() => {
        if (lastArgs) {
          lastExecTime = Date.now()
          func(...lastArgs)
          lastArgs = null
        }
        timeoutId = null
      }, delay - timeSinceLastExec)
    }
  }
}

/**
 * Debounce function execution to wait for a pause in calls
 * @param func Function to debounce
 * @param delay Delay in milliseconds
 */
export function debounce<T extends any[]>(
  func: (...args: T) => void,
  delay: number
): ThrottleFunction<T> {
  let timeoutId: NodeJS.Timeout | null = null

  return function debouncedFunction(...args: T) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
      timeoutId = null
    }, delay)
  }
}

/**
 * Batch multiple updates and execute them together
 * @param batchWindow Time window in milliseconds to collect updates
 */
export class UpdateBatcher<T> {
  private updates: Map<string, BatchUpdate<T>> = new Map()
  private timeoutId: NodeJS.Timeout | null = null
  private batchWindow: number
  private onBatch: (updates: BatchUpdate<T>[]) => void

  constructor(batchWindow: number, onBatch: (updates: BatchUpdate<T>[]) => void) {
    this.batchWindow = batchWindow
    this.onBatch = onBatch
  }

  /**
   * Add an update to the batch
   * @param id Unique identifier for the update
   * @param data Update data
   */
  addUpdate(id: string, data: T): void {
    this.updates.set(id, {
      id,
      data,
      timestamp: Date.now()
    })

    // Reset the batch timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }

    this.timeoutId = setTimeout(() => {
      this.flush()
    }, this.batchWindow)
  }

  /**
   * Force flush all pending updates
   */
  flush(): void {
    if (this.updates.size > 0) {
      const updateArray = Array.from(this.updates.values())
      this.updates.clear()
      this.onBatch(updateArray)
    }

    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }

  /**
   * Clear all pending updates without executing
   */
  clear(): void {
    this.updates.clear()
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }

  /**
   * Get the number of pending updates
   */
  get pendingCount(): number {
    return this.updates.size
  }
}

/**
 * Memory-optimized array that maintains a maximum size
 */
export class CappedArray<T> {
  private items: T[] = []
  private maxSize: number

  constructor(maxSize: number) {
    this.maxSize = maxSize
  }

  /**
   * Add an item to the array, removing oldest if at capacity
   * @param item Item to add
   */
  add(item: T): void {
    this.items.unshift(item) // Add to beginning
    
    if (this.items.length > this.maxSize) {
      this.items = this.items.slice(0, this.maxSize)
    }
  }

  /**
   * Add multiple items at once
   * @param items Items to add
   */
  addMany(items: T[]): void {
    this.items = [...items, ...this.items].slice(0, this.maxSize)
  }

  /**
   * Get all items as an array
   */
  getItems(): T[] {
    return [...this.items]
  }

  /**
   * Get the latest N items
   * @param count Number of items to retrieve
   */
  getLatest(count: number): T[] {
    return this.items.slice(0, Math.min(count, this.items.length))
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.items = []
  }

  /**
   * Get current size
   */
  get size(): number {
    return this.items.length
  }

  /**
   * Get maximum size
   */
  get capacity(): number {
    return this.maxSize
  }

  /**
   * Check if array is at capacity
   */
  get isFull(): boolean {
    return this.items.length >= this.maxSize
  }
}

/**
 * Rate limiter for WebSocket message processing
 */
export class MessageRateLimiter {
  private messageCount: number = 0
  private windowStart: number = Date.now()
  private windowSize: number
  private maxMessages: number

  constructor(maxMessages: number, windowSizeMs: number) {
    this.maxMessages = maxMessages
    this.windowSize = windowSizeMs
  }

  /**
   * Check if a message can be processed
   * @returns true if message should be processed, false if rate limited
   */
  canProcess(): boolean {
    const now = Date.now()
    
    // Reset window if expired
    if (now - this.windowStart >= this.windowSize) {
      this.messageCount = 0
      this.windowStart = now
    }

    // Check if under limit
    if (this.messageCount < this.maxMessages) {
      this.messageCount++
      return true
    }

    return false
  }

  /**
   * Get current rate limit status
   */
  getStatus(): {
    messagesProcessed: number
    maxMessages: number
    windowTimeRemaining: number
    isLimited: boolean
  } {
    const now = Date.now()
    const timeRemaining = Math.max(0, this.windowSize - (now - this.windowStart))
    
    return {
      messagesProcessed: this.messageCount,
      maxMessages: this.maxMessages,
      windowTimeRemaining: timeRemaining,
      isLimited: this.messageCount >= this.maxMessages
    }
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.messageCount = 0
    this.windowStart = Date.now()
  }
}

/**
 * WebSocket message queue with prioritization
 */
export class PriorityMessageQueue<T> {
  private highPriorityQueue: T[] = []
  private normalPriorityQueue: T[] = []
  private lowPriorityQueue: T[] = []
  private processing = false

  constructor(private processor: (message: T) => Promise<void> | void) {}

  /**
   * Add a message to the queue
   * @param message Message to process
   * @param priority Message priority
   */
  enqueue(message: T, priority: 'high' | 'normal' | 'low' = 'normal'): void {
    switch (priority) {
      case 'high':
        this.highPriorityQueue.push(message)
        break
      case 'low':
        this.lowPriorityQueue.push(message)
        break
      default:
        this.normalPriorityQueue.push(message)
    }

    this.processNext()
  }

  /**
   * Process the next message in queue
   */
  private async processNext(): Promise<void> {
    if (this.processing) return

    const message = this.dequeue()
    if (!message) return

    this.processing = true

    try {
      await this.processor(message)
    } catch (error) {
      console.error('Error processing queued message:', error)
    } finally {
      this.processing = false
      
      // Process next message if queue not empty
      if (this.size > 0) {
        setTimeout(() => this.processNext(), 0)
      }
    }
  }

  /**
   * Get the next message from queue (highest priority first)
   */
  private dequeue(): T | undefined {
    if (this.highPriorityQueue.length > 0) {
      return this.highPriorityQueue.shift()
    }
    if (this.normalPriorityQueue.length > 0) {
      return this.normalPriorityQueue.shift()
    }
    if (this.lowPriorityQueue.length > 0) {
      return this.lowPriorityQueue.shift()
    }
    return undefined
  }

  /**
   * Get total queue size
   */
  get size(): number {
    return this.highPriorityQueue.length + this.normalPriorityQueue.length + this.lowPriorityQueue.length
  }

  /**
   * Clear all queues
   */
  clear(): void {
    this.highPriorityQueue = []
    this.normalPriorityQueue = []
    this.lowPriorityQueue = []
  }
}

/**
 * Performance monitor for WebSocket operations
 */
export class WebSocketPerformanceMonitor {
  private metrics: {
    messagesReceived: number
    messagesProcessed: number
    averageProcessingTime: number
    totalProcessingTime: number
    errors: number
    lastActivity: number
  } = {
    messagesReceived: 0,
    messagesProcessed: 0,
    averageProcessingTime: 0,
    totalProcessingTime: 0,
    errors: 0,
    lastActivity: Date.now()
  }

  /**
   * Record a message received
   */
  recordMessageReceived(): void {
    this.metrics.messagesReceived++
    this.metrics.lastActivity = Date.now()
  }

  /**
   * Record message processing start and return a function to end timing
   */
  startProcessing(): () => void {
    const startTime = performance.now()

    return () => {
      const processingTime = performance.now() - startTime
      this.metrics.messagesProcessed++
      this.metrics.totalProcessingTime += processingTime
      this.metrics.averageProcessingTime = 
        this.metrics.totalProcessingTime / this.metrics.messagesProcessed
    }
  }

  /**
   * Record an error
   */
  recordError(): void {
    this.metrics.errors++
  }

  /**
   * Get current performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      processingRate: this.metrics.messagesProcessed / Math.max(1, this.metrics.messagesReceived),
      errorRate: this.metrics.errors / Math.max(1, this.metrics.messagesReceived),
      timeSinceLastActivity: Date.now() - this.metrics.lastActivity
    }
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = {
      messagesReceived: 0,
      messagesProcessed: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0,
      errors: 0,
      lastActivity: Date.now()
    }
  }
}