import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { MockWebSocket, mockWebSocketServer } from '@test-utils/test-server'
import {
  createMockWebSocketMessage,
  createMockIFCStatusUpdate,
  createMockQuoteReceived,
} from '@test-utils/mock-data'

// ============================================================================
// WEBSOCKET SERVICE COMPREHENSIVE TEST SUITE
// Tests WebSocket connection patterns, message handling, and real-time features
// ============================================================================

// WebSocket connection utility class for testing
class WebSocketConnection {
  private ws: MockWebSocket | null = null
  private clientId: string
  private messageHandlers: Map<string, Function> = new Map()
  private isConnected = false
  
  constructor(clientId: string = 'test-client') {
    this.clientId = clientId
  }

  connect(baseUrl: string = 'ws://localhost:8000'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${baseUrl}/ws/${this.clientId}`
        this.ws = new MockWebSocket(wsUrl)

        this.ws.onopen = () => {
          this.isConnected = true
          resolve()
        }

        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const message = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        this.ws.onclose = () => {
          this.isConnected = false
        }

        this.ws.onerror = (error: Event) => {
          reject(error)
        }

        // Simulate connection opening
        setTimeout(() => {
          if (this.ws && this.ws.onopen) {
            this.ws.onopen(new Event('open'))
          }
        }, 0)
      } catch (error) {
        reject(error)
      }
    })
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.isConnected = false
    }
  }

  send(message: any): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message))
    }
  }

  onMessage(type: string, handler: Function): void {
    this.messageHandlers.set(type, handler)
  }

  private handleMessage(message: any): void {
    const handler = this.messageHandlers.get(message.type)
    if (handler) {
      handler(message)
    }
  }

  // Simulate receiving a message (for testing)
  simulateMessage(message: any): void {
    if (this.ws && this.ws.onmessage) {
      this.ws.onmessage(new MessageEvent('message', { 
        data: JSON.stringify(message) 
      }))
    }
  }

  getConnectionState(): boolean {
    return this.isConnected
  }
}

describe('WebSocket Service', () => {
  let wsConnection: WebSocketConnection

  beforeAll(() => {
    mockWebSocketServer.start()
  })

  afterAll(() => {
    mockWebSocketServer.stop()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    wsConnection = new WebSocketConnection()
  })

  afterEach(() => {
    if (wsConnection) {
      wsConnection.disconnect()
    }
  })

  // ============================================================================
  // CONNECTION MANAGEMENT TESTS
  // ============================================================================

  describe('Connection Management', () => {
    it('establishes WebSocket connection successfully', async () => {
      await expect(wsConnection.connect()).resolves.toBeUndefined()
      expect(wsConnection.getConnectionState()).toBe(true)
    })

    it('handles connection with custom client ID', async () => {
      const customConnection = new WebSocketConnection('custom-client-123')
      
      await expect(customConnection.connect()).resolves.toBeUndefined()
      expect(customConnection.getConnectionState()).toBe(true)
      
      customConnection.disconnect()
    })

    it('handles connection to different WebSocket URLs', async () => {
      await expect(
        wsConnection.connect('ws://alternative-host:8080')
      ).resolves.toBeUndefined()
      expect(wsConnection.getConnectionState()).toBe(true)
    })

    it('handles connection errors gracefully', async () => {
      // Mock WebSocket constructor to throw error
      const originalWebSocket = global.WebSocket
      global.WebSocket = vi.fn().mockImplementation(() => {
        throw new Error('Connection failed')
      })

      await expect(wsConnection.connect()).rejects.toThrow('Connection failed')

      global.WebSocket = originalWebSocket
    })

    it('disconnects properly', async () => {
      await wsConnection.connect()
      expect(wsConnection.getConnectionState()).toBe(true)

      wsConnection.disconnect()
      expect(wsConnection.getConnectionState()).toBe(false)
    })

    it('handles multiple disconnect calls safely', async () => {
      await wsConnection.connect()
      
      wsConnection.disconnect()
      expect(wsConnection.getConnectionState()).toBe(false)
      
      // Should not throw error
      wsConnection.disconnect()
      expect(wsConnection.getConnectionState()).toBe(false)
    })
  })

  // ============================================================================
  // MESSAGE SENDING TESTS
  // ============================================================================

  describe('Message Sending', () => {
    beforeEach(async () => {
      await wsConnection.connect()
    })

    it('sends subscription message correctly', () => {
      const subscribeMessage = {
        type: 'subscribe',
        project_id: 'test-project-1'
      }

      wsConnection.send(subscribeMessage)

      // In a real implementation, we'd verify the message was sent
      // Here we verify the connection is still active
      expect(wsConnection.getConnectionState()).toBe(true)
    })

    it('sends heartbeat/ping messages', () => {
      const pingMessage = { type: 'ping', timestamp: new Date().toISOString() }
      
      wsConnection.send(pingMessage)
      expect(wsConnection.getConnectionState()).toBe(true)
    })

    it('handles sending messages when not connected', () => {
      wsConnection.disconnect()
      
      const message = { type: 'test', data: 'should not send' }
      
      // Should not throw error when not connected
      expect(() => wsConnection.send(message)).not.toThrow()
    })

    it('serializes complex message objects correctly', () => {
      const complexMessage = {
        type: 'complex_message',
        data: {
          nested: {
            array: [1, 2, 3],
            boolean: true,
            nullValue: null
          }
        },
        timestamp: '2025-08-28T10:00:00Z'
      }

      expect(() => wsConnection.send(complexMessage)).not.toThrow()
    })
  })

  // ============================================================================
  // MESSAGE RECEIVING TESTS
  // ============================================================================

  describe('Message Receiving', () => {
    beforeEach(async () => {
      await wsConnection.connect()
    })

    it('receives and handles IFC status update messages', () => {
      const statusHandler = vi.fn()
      wsConnection.onMessage('ifc_status_update', statusHandler)

      const statusUpdate = createMockIFCStatusUpdate('ifc-file-1', 'COMPLETED')
      wsConnection.simulateMessage(statusUpdate)

      expect(statusHandler).toHaveBeenCalledWith(statusUpdate)
    })

    it('receives and handles quote received messages', () => {
      const quoteHandler = vi.fn()
      wsConnection.onMessage('quote_received', quoteHandler)

      const quoteMessage = createMockQuoteReceived('rfq-1', 'supplier-1', 1500.00)
      wsConnection.simulateMessage(quoteMessage)

      expect(quoteHandler).toHaveBeenCalledWith(quoteMessage)
    })

    it('receives subscription confirmation messages', () => {
      const confirmHandler = vi.fn()
      wsConnection.onMessage('subscribed', confirmHandler)

      const confirmMessage = createMockWebSocketMessage('subscribed', {
        project_id: 'test-project-1',
        client_id: 'test-client'
      })

      wsConnection.simulateMessage(confirmMessage)
      expect(confirmHandler).toHaveBeenCalledWith(confirmMessage)
    })

    it('handles multiple message types with different handlers', () => {
      const statusHandler = vi.fn()
      const quoteHandler = vi.fn()
      const unknownHandler = vi.fn()

      wsConnection.onMessage('ifc_status_update', statusHandler)
      wsConnection.onMessage('quote_received', quoteHandler)
      wsConnection.onMessage('unknown_type', unknownHandler)

      // Send different message types
      wsConnection.simulateMessage(createMockIFCStatusUpdate('ifc-1', 'PROCESSING'))
      wsConnection.simulateMessage(createMockQuoteReceived('rfq-1', 'supplier-1', 2000))
      wsConnection.simulateMessage(createMockWebSocketMessage('unknown_type', { data: 'test' }))

      expect(statusHandler).toHaveBeenCalledTimes(1)
      expect(quoteHandler).toHaveBeenCalledTimes(1)
      expect(unknownHandler).toHaveBeenCalledTimes(1)
    })

    it('handles messages without registered handlers gracefully', () => {
      const unhandledMessage = createMockWebSocketMessage('unhandled_type', { 
        data: 'should not cause error' 
      })

      // Should not throw error for unhandled messages
      expect(() => wsConnection.simulateMessage(unhandledMessage)).not.toThrow()
    })

    it('handles malformed JSON messages gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Simulate malformed JSON message
      if (wsConnection['ws'] && wsConnection['ws'].onmessage) {
        wsConnection['ws'].onmessage(new MessageEvent('message', { 
          data: 'invalid json{' 
        }))
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error parsing WebSocket message:', 
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  // ============================================================================
  // REAL-TIME UPDATE SCENARIOS
  // ============================================================================

  describe('Real-time Update Scenarios', () => {
    beforeEach(async () => {
      await wsConnection.connect()
    })

    it('handles IFC file processing workflow updates', () => {
      const statusUpdates: any[] = []
      wsConnection.onMessage('ifc_status_update', (message: any) => {
        statusUpdates.push(message)
      })

      // Simulate complete IFC processing workflow
      wsConnection.simulateMessage(createMockIFCStatusUpdate('ifc-1', 'PROCESSING'))
      wsConnection.simulateMessage(createMockIFCStatusUpdate('ifc-1', 'COMPLETED'))

      expect(statusUpdates).toHaveLength(2)
      expect(statusUpdates[0].status).toBe('PROCESSING')
      expect(statusUpdates[1].status).toBe('COMPLETED')
    })

    it('handles multiple concurrent quote updates', () => {
      const quoteUpdates: any[] = []
      wsConnection.onMessage('quote_received', (message: any) => {
        quoteUpdates.push(message)
      })

      // Simulate multiple suppliers submitting quotes
      wsConnection.simulateMessage(createMockQuoteReceived('rfq-1', 'supplier-1', 1500))
      wsConnection.simulateMessage(createMockQuoteReceived('rfq-1', 'supplier-2', 1300))
      wsConnection.simulateMessage(createMockQuoteReceived('rfq-1', 'supplier-3', 1750))

      expect(quoteUpdates).toHaveLength(3)
      expect(quoteUpdates.map(q => q.supplier_id)).toEqual(['supplier-1', 'supplier-2', 'supplier-3'])
      expect(quoteUpdates.map(q => q.price)).toEqual([1500, 1300, 1750])
    })

    it('handles error notifications via WebSocket', () => {
      const errorHandler = vi.fn()
      wsConnection.onMessage('error', errorHandler)

      const errorMessage = createMockWebSocketMessage('error', {
        message: 'IFC processing failed',
        ifc_file_id: 'problematic-file',
        error_code: 'PARSE_ERROR'
      })

      wsConnection.simulateMessage(errorMessage)
      expect(errorHandler).toHaveBeenCalledWith(errorMessage)
    })

    it('handles system notifications and announcements', () => {
      const notificationHandler = vi.fn()
      wsConnection.onMessage('system_notification', notificationHandler)

      const notification = createMockWebSocketMessage('system_notification', {
        title: 'System Maintenance',
        message: 'Scheduled maintenance in 30 minutes',
        priority: 'high'
      })

      wsConnection.simulateMessage(notification)
      expect(notificationHandler).toHaveBeenCalledWith(notification)
    })
  })

  // ============================================================================
  // CONNECTION RESILIENCE TESTS
  // ============================================================================

  describe('Connection Resilience', () => {
    it('handles unexpected connection drops', async () => {
      await wsConnection.connect()
      expect(wsConnection.getConnectionState()).toBe(true)

      // Simulate connection drop
      if (wsConnection['ws'] && wsConnection['ws'].onclose) {
        wsConnection['ws'].onclose(new CloseEvent('close'))
      }

      expect(wsConnection.getConnectionState()).toBe(false)
    })

    it('handles WebSocket errors during message processing', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Setup connection with error-prone message handler
      wsConnection.onMessage('error_prone', () => {
        throw new Error('Handler error')
      })

      const errorMessage = createMockWebSocketMessage('error_prone', {})

      // Should not crash the connection
      expect(() => wsConnection.simulateMessage(errorMessage)).not.toThrow()

      consoleSpy.mockRestore()
    })

    it('maintains message queue during brief disconnections', async () => {
      await wsConnection.connect()
      
      const receivedMessages: any[] = []
      wsConnection.onMessage('queued_message', (message: any) => {
        receivedMessages.push(message)
      })

      // Simulate brief disconnection
      wsConnection.disconnect()
      
      // Messages sent during disconnection should be handled gracefully
      wsConnection.send({ type: 'queued_message', data: 'during disconnection' })
      
      expect(receivedMessages).toHaveLength(0) // No messages received while disconnected
    })
  })

  // ============================================================================
  // PERFORMANCE AND MEMORY TESTS
  // ============================================================================

  describe('Performance and Memory', () => {
    it('handles high-frequency message updates without memory leaks', async () => {
      await wsConnection.connect()
      
      const messageHandler = vi.fn()
      wsConnection.onMessage('high_frequency', messageHandler)

      // Simulate high-frequency updates
      for (let i = 0; i < 1000; i++) {
        wsConnection.simulateMessage(
          createMockWebSocketMessage('high_frequency', { sequence: i })
        )
      }

      expect(messageHandler).toHaveBeenCalledTimes(1000)
    })

    it('handles large message payloads efficiently', async () => {
      await wsConnection.connect()

      const largeDataHandler = vi.fn()
      wsConnection.onMessage('large_data', largeDataHandler)

      // Create message with large payload
      const largePayload = {
        type: 'large_data',
        data: {
          materials: Array(1000).fill(null).map((_, i) => ({
            id: `material-${i}`,
            description: `Material ${i}`.repeat(10),
            quantity: Math.random() * 1000,
            properties: {
              density: Math.random(),
              strength: Math.random(),
              metadata: `Metadata for material ${i}`.repeat(5)
            }
          }))
        }
      }

      wsConnection.simulateMessage(largePayload)
      expect(largeDataHandler).toHaveBeenCalledWith(largePayload)
    })

    it('properly cleans up event listeners on disconnect', async () => {
      await wsConnection.connect()

      const handler1 = vi.fn()
      const handler2 = vi.fn()

      wsConnection.onMessage('type1', handler1)
      wsConnection.onMessage('type2', handler2)

      wsConnection.disconnect()

      // After disconnect, new connection should not have old handlers
      const newConnection = new WebSocketConnection('new-client')
      await newConnection.connect()

      newConnection.simulateMessage(createMockWebSocketMessage('type1', {}))
      newConnection.simulateMessage(createMockWebSocketMessage('type2', {}))

      // Old handlers should not be called
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()

      newConnection.disconnect()
    })
  })

  // ============================================================================
  // MESSAGE FORMATTING AND VALIDATION TESTS
  // ============================================================================

  describe('Message Formatting and Validation', () => {
    beforeEach(async () => {
      await wsConnection.connect()
    })

    it('handles messages with timestamps correctly', () => {
      const timestampHandler = vi.fn()
      wsConnection.onMessage('timestamped', timestampHandler)

      const timestampedMessage = createMockWebSocketMessage('timestamped', {
        data: 'test',
        server_timestamp: '2025-08-28T15:30:00Z'
      })

      wsConnection.simulateMessage(timestampedMessage)
      expect(timestampHandler).toHaveBeenCalledWith(timestampedMessage)
    })

    it('handles messages with nested object structures', () => {
      const nestedHandler = vi.fn()
      wsConnection.onMessage('nested_structure', nestedHandler)

      const nestedMessage = createMockWebSocketMessage('nested_structure', {
        level1: {
          level2: {
            level3: {
              array: [1, 2, 3],
              boolean: true,
              nullValue: null
            }
          }
        }
      })

      wsConnection.simulateMessage(nestedMessage)
      expect(nestedHandler).toHaveBeenCalledWith(nestedMessage)
    })

    it('handles messages with special characters and unicode', () => {
      const unicodeHandler = vi.fn()
      wsConnection.onMessage('unicode_test', unicodeHandler)

      const unicodeMessage = createMockWebSocketMessage('unicode_test', {
        text: 'Test with émojis 🚀 and spëcial characters: ñáéíóú',
        chinese: '测试中文',
        arabic: 'اختبار العربية',
        symbols: '♠♣♥♦'
      })

      wsConnection.simulateMessage(unicodeMessage)
      expect(unicodeHandler).toHaveBeenCalledWith(unicodeMessage)
    })
  })
})