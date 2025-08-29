import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useRealtimeQuotes } from '../../hooks/useRealtimeQuotes'
import { MockWebSocket, mockWebSocketServer } from '../../test-utils/test-server'
import {
  createMockWebSocketMessage,
  createMockQuoteReceived,
  createMockPriceUpdate,
  createMockSupplierOnline,
  createMockNotification
} from '../../test-utils/mock-data'

// ============================================================================
// REALTIME QUOTES HOOK COMPREHENSIVE TEST SUITE  
// Tests WebSocket real-time features, state management, and performance
// ============================================================================

// Mock global WebSocket
global.WebSocket = MockWebSocket as any

// Test constants
const TEST_RFQ_ID = 'test-rfq-123'
const TEST_CLIENT_ID = 'test-client-456'
const TEST_SUPPLIER_ID = 'supplier-789'
const TEST_MATERIAL_ID = 'material-abc'

describe('useRealtimeQuotes Hook', () => {
  let mockServer: any

  beforeAll(() => {
    mockServer = mockWebSocketServer.listen()
  })

  afterAll(() => {
    mockServer.close()
  })

  beforeEach(() => {
    // Reset any previous WebSocket state
    vi.clearAllMocks()
    
    // Mock Math.random for consistent client ID
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Hook Functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useRealtimeQuotes(TEST_RFQ_ID))
      
      expect(result.current.priceHistory.size).toBe(0)
      expect(result.current.onlineSuppliers.size).toBe(0)
      expect(result.current.notifications).toHaveLength(0)
      expect(result.current.connectionStatus).toBe('connecting')
      expect(result.current.autoRefreshEnabled).toBe(true)
    })

    it('should establish WebSocket connection', async () => {
      const { result } = renderHook(() => useRealtimeQuotes(TEST_RFQ_ID))
      
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      }, { timeout: 3000 })
    })

    it('should subscribe to RFQ updates on connection', async () => {
      const { result } = renderHook(() => useRealtimeQuotes(TEST_RFQ_ID))
      
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      })

      // Verify subscription message was sent
      await waitFor(() => {
        const sentMessages = mockWebSocketServer.getSentMessages()
        expect(sentMessages).toContainEqual(
          expect.objectContaining({
            type: 'subscribe_rfq',
            rfq_id: TEST_RFQ_ID
          })
        )
      })
    })
  })

  describe('Message Handling', () => {
    it('should handle quote_received message', async () => {
      const { result } = renderHook(() => useRealtimeQuotes(TEST_RFQ_ID))
      
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      })

      // Send quote received message
      const quoteMessage = createMockQuoteReceived({
        rfq_id: TEST_RFQ_ID,
        supplier_id: TEST_SUPPLIER_ID,
        data: {
          items_count: 3,
          total_items: 3
        }
      })

      act(() => {
        mockWebSocketServer.sendMessage(quoteMessage)
      })

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1)
        expect(result.current.notifications[0].type).toBe('success')
        expect(result.current.notifications[0].title).toBe('Nova Cotação Recebida')
      })
    })

    it('should handle price_update message', async () => {
      const { result } = renderHook(() => useRealtimeQuotes(TEST_RFQ_ID))
      
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      })

      // Send price update message
      const priceUpdateMessage = createMockPriceUpdate({
        rfq_id: TEST_RFQ_ID,
        data: {
          material_id: TEST_MATERIAL_ID,
          supplier_id: TEST_SUPPLIER_ID,
          old_price: 100,
          new_price: 85
        }
      })

      act(() => {
        mockWebSocketServer.sendMessage(priceUpdateMessage)
      })

      await waitFor(() => {
        expect(result.current.priceHistory.has(TEST_MATERIAL_ID)).toBe(true)
        expect(result.current.notifications).toHaveLength(2) // Price update + confirmation
      })

      // Verify price history entry
      const materialHistory = result.current.priceHistory.get(TEST_MATERIAL_ID)
      expect(materialHistory).toHaveLength(1)
      expect(materialHistory![0].price).toBe(85)
      expect(materialHistory![0].supplier_id).toBe(TEST_SUPPLIER_ID)
    })

    it('should handle supplier_online message', async () => {
      const { result } = renderHook(() => useRealtimeQuotes(TEST_RFQ_ID))
      
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      })

      // Send supplier online message
      const supplierOnlineMessage = createMockSupplierOnline({
        data: {
          supplier_id: TEST_SUPPLIER_ID
        }
      })

      act(() => {
        mockWebSocketServer.sendMessage(supplierOnlineMessage)
      })

      await waitFor(() => {
        expect(result.current.onlineSuppliers.has(TEST_SUPPLIER_ID)).toBe(true)
      })
    })

    it('should handle supplier_offline message', async () => {
      const { result } = renderHook(() => useRealtimeQuotes(TEST_RFQ_ID))
      
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      })

      // First set supplier as online
      act(() => {
        mockWebSocketServer.sendMessage(createMockSupplierOnline({
          data: { supplier_id: TEST_SUPPLIER_ID }
        }))
      })

      await waitFor(() => {
        expect(result.current.onlineSuppliers.has(TEST_SUPPLIER_ID)).toBe(true)
      })

      // Then set supplier as offline
      act(() => {
        mockWebSocketServer.sendMessage({
          type: 'supplier_offline',
          rfq_id: TEST_RFQ_ID,
          timestamp: new Date().toISOString(),
          data: { supplier_id: TEST_SUPPLIER_ID }
        })
      })

      await waitFor(() => {
        expect(result.current.onlineSuppliers.has(TEST_SUPPLIER_ID)).toBe(false)
      })
    })

    it('should handle deadline_warning message', async () => {
      const { result } = renderHook(() => useRealtimeQuotes(TEST_RFQ_ID))
      
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      })

      // Send critical deadline warning
      const deadlineMessage = {
        type: 'deadline_warning',
        rfq_id: TEST_RFQ_ID,
        timestamp: new Date().toISOString(),
        data: {
          hours_remaining: 1,
          urgency_level: 'critical'
        }
      }

      act(() => {
        mockWebSocketServer.sendMessage(deadlineMessage)
      })

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1)
        expect(result.current.notifications[0].type).toBe('error')
        expect(result.current.notifications[0].title).toBe('Prazo de Cotação')
      })
    })

    it('should handle notification message', async () => {
      const { result } = renderHook(() => useRealtimeQuotes(TEST_RFQ_ID))
      
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      })

      // Send notification message
      const notificationMessage = createMockNotification({
        rfq_id: TEST_RFQ_ID,
        data: {
          type: 'info',
          title: 'Custom Notification',
          message: 'This is a test notification',
          duration: 3000
        }
      })

      act(() => {
        mockWebSocketServer.sendMessage(notificationMessage)
      })

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1)
        expect(result.current.notifications[0].title).toBe('Custom Notification')
        expect(result.current.notifications[0].type).toBe('info')
      })
    })
  })

  describe('Performance and Throttling', () => {
    it('should throttle frequent updates', async () => {
      const { result } = renderHook(() => useRealtimeQuotes(TEST_RFQ_ID))
      
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      })

      // Send multiple rapid price updates
      const rapidUpdates = Array.from({ length: 10 }, (_, i) => 
        createMockPriceUpdate({
          rfq_id: TEST_RFQ_ID,
          data: {
            material_id: TEST_MATERIAL_ID,
            supplier_id: TEST_SUPPLIER_ID,
            old_price: 100 + i,
            new_price: 90 + i
          }
        })
      )

      // Send all updates rapidly
      act(() => {
        rapidUpdates.forEach(update => {
          mockWebSocketServer.sendMessage(update)
        })
      })

      // Wait for throttling to settle
      await new Promise(resolve => setTimeout(resolve, 600))

      // Should have limited number of notifications due to throttling
      expect(result.current.notifications.length).toBeLessThan(10)
      
      // But price history should contain the latest entry
      const materialHistory = result.current.priceHistory.get(TEST_MATERIAL_ID)
      expect(materialHistory).toBeDefined()
      expect(materialHistory!.length).toBeGreaterThan(0)
    })

    it('should limit price history entries to max capacity', async () => {
      const { result } = renderHook(() => 
        useRealtimeQuotes(TEST_RFQ_ID, { maxPriceHistoryEntries: 3 })
      )
      
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      })

      // Send more price updates than max capacity
      const priceUpdates = Array.from({ length: 5 }, (_, i) => 
        createMockPriceUpdate({
          rfq_id: TEST_RFQ_ID,
          data: {
            material_id: TEST_MATERIAL_ID,
            supplier_id: TEST_SUPPLIER_ID,
            old_price: 100 + i,
            new_price: 90 + i
          }
        })
      )

      for (const update of priceUpdates) {
        act(() => {
          mockWebSocketServer.sendMessage(update)
        })
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      await waitFor(() => {
        const materialHistory = result.current.priceHistory.get(TEST_MATERIAL_ID)
        expect(materialHistory).toHaveLength(3) // Limited to max capacity
      })
    })

    it('should limit notifications to max capacity', async () => {
      const { result } = renderHook(() => 
        useRealtimeQuotes(TEST_RFQ_ID, { maxNotifications: 2 })
      )
      
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      })

      // Send multiple notifications
      const notifications = Array.from({ length: 4 }, (_, i) => 
        createMockNotification({
          rfq_id: TEST_RFQ_ID,
          data: {
            type: 'info',
            title: `Notification ${i}`,
            message: `Message ${i}`,
            duration: 5000
          }
        })
      )

      for (const notification of notifications) {
        act(() => {
          mockWebSocketServer.sendMessage(notification)
        })
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      await waitFor(() => {
        expect(result.current.notifications.length).toBeLessThanOrEqual(2)
      })
    })
  })

  describe('Connection Management', () => {
    it('should handle connection errors gracefully', async () => {
      // Mock WebSocket to throw error
      const mockWebSocketError = vi.fn().mockImplementation(() => {
        throw new Error('Connection failed')
      })
      global.WebSocket = mockWebSocketError as any

      const { result } = renderHook(() => useRealtimeQuotes(TEST_RFQ_ID))
      
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('error')
      })
    })

    it('should support auto-refresh toggle', async () => {
      const { result } = renderHook(() => useRealtimeQuotes(TEST_RFQ_ID))
      
      expect(result.current.autoRefreshEnabled).toBe(true)
      
      act(() => {
        result.current.toggleAutoRefresh()
      })
      
      expect(result.current.autoRefreshEnabled).toBe(false)
    })

    it('should ignore messages when auto-refresh is disabled', async () => {
      const { result } = renderHook(() => useRealtimeQuotes(TEST_RFQ_ID))
      
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      })

      // Disable auto-refresh
      act(() => {
        result.current.toggleAutoRefresh()
      })

      // Send message
      act(() => {
        mockWebSocketServer.sendMessage(createMockQuoteReceived({
          rfq_id: TEST_RFQ_ID,
          supplier_id: TEST_SUPPLIER_ID
        }))
      })

      // Should not create notification when disabled
      expect(result.current.notifications).toHaveLength(0)
    })
  })

  describe('Notification Management', () => {
    it('should dismiss notifications correctly', async () => {
      const { result } = renderHook(() => useRealtimeQuotes(TEST_RFQ_ID))
      
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      })

      // Add notification
      act(() => {
        mockWebSocketServer.sendMessage(createMockNotification({
          rfq_id: TEST_RFQ_ID,
          data: {
            type: 'info',
            title: 'Test Notification',
            message: 'Test message',
            duration: 5000
          }
        }))
      })

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1)
      })

      const notificationId = result.current.notifications[0].id

      // Dismiss notification
      act(() => {
        result.current.dismissNotification(notificationId)
      })

      expect(result.current.notifications).toHaveLength(0)
    })

    it('should mark notifications as read', async () => {
      const { result } = renderHook(() => useRealtimeQuotes(TEST_RFQ_ID))
      
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      })

      // Add notification
      act(() => {
        mockWebSocketServer.sendMessage(createMockNotification({
          rfq_id: TEST_RFQ_ID,
          data: {
            type: 'info',
            title: 'Test Notification',
            message: 'Test message',
            duration: 5000
          }
        }))
      })

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1)
      })

      const notification = result.current.notifications[0]
      expect(notification.read).toBe(false)

      // Mark as read
      act(() => {
        result.current.markNotificationRead(notification.id)
      })

      expect(result.current.notifications[0].read).toBe(true)
    })

    it('should clear all notifications', async () => {
      const { result } = renderHook(() => useRealtimeQuotes(TEST_RFQ_ID))
      
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      })

      // Add multiple notifications
      for (let i = 0; i < 3; i++) {
        act(() => {
          mockWebSocketServer.sendMessage(createMockNotification({
            rfq_id: TEST_RFQ_ID,
            data: {
              type: 'info',
              title: `Notification ${i}`,
              message: `Message ${i}`,
              duration: 5000
            }
          }))
        })
      }

      await waitFor(() => {
        expect(result.current.notifications.length).toBeGreaterThan(0)
      })

      // Clear all notifications
      act(() => {
        result.current.clearNotifications()
      })

      expect(result.current.notifications).toHaveLength(0)
    })
  })

  describe('Cleanup', () => {
    it('should cleanup WebSocket connection on unmount', async () => {
      const { result, unmount } = renderHook(() => useRealtimeQuotes(TEST_RFQ_ID))
      
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      })

      // Unmount should close WebSocket
      unmount()

      // Connection should be cleaned up
      expect(mockWebSocketServer.getConnectionCount()).toBe(0)
    })
  })
})