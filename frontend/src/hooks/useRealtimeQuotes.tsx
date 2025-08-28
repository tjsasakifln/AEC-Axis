import { useState, useEffect, useRef, useCallback } from 'react'

// TypeScript interfaces for real-time features
interface RealtimeMessage {
  type: 'quote_received' | 'price_update' | 'supplier_online' | 'supplier_offline' | 'deadline_warning' | 'notification'
  rfq_id: string
  timestamp: string
  data: any
}

interface PriceHistoryEntry {
  price: number
  timestamp: string
  supplier_id: string
}

interface NotificationToast {
  id: string
  type: 'success' | 'warning' | 'info' | 'error'
  title: string
  message: string
  timestamp: string
  duration: number
  read: boolean
}

interface RealtimeQuoteState {
  priceHistory: Map<string, PriceHistoryEntry[]>
  onlineSuppliers: Set<string>
  notifications: NotificationToast[]
  lastUpdateTime: string
  autoRefreshEnabled: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  reconnectAttempt: number
}

interface UseRealtimeQuotesConfig {
  maxPriceHistoryEntries?: number
  maxNotifications?: number
  reconnectAttempts?: number
  reconnectDelay?: number
  heartbeatInterval?: number
}

const DEFAULT_CONFIG: UseRealtimeQuotesConfig = {
  maxPriceHistoryEntries: 50,
  maxNotifications: 10,
  reconnectAttempts: 10,
  reconnectDelay: 3000,
  heartbeatInterval: 30000
}

/**
 * Custom hook for managing real-time quote updates via WebSocket
 * 
 * @param rfqId - RFQ identifier to subscribe to
 * @param config - Configuration options
 * @returns Real-time quote state and connection methods
 */
export function useRealtimeQuotes(rfqId: string, config: UseRealtimeQuotesConfig = {}) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }
  
  // WebSocket connection management
  const ws = useRef<WebSocket | null>(null)
  const clientId = useRef<string>(Math.random().toString(36).substring(7))
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isUnmounting = useRef(false)
  
  // State management
  const [state, setState] = useState<RealtimeQuoteState>({
    priceHistory: new Map(),
    onlineSuppliers: new Set(),
    notifications: [],
    lastUpdateTime: '',
    autoRefreshEnabled: true,
    connectionStatus: 'disconnected',
    reconnectAttempt: 0
  })

  // Throttled state updates to prevent excessive re-renders
  const updateStateThrottled = useCallback((updater: (prevState: RealtimeQuoteState) => RealtimeQuoteState) => {
    setState(prevState => {
      const newState = updater(prevState)
      return {
        ...newState,
        lastUpdateTime: new Date().toISOString()
      }
    })
  }, [])

  // Add notification with automatic cleanup
  const addNotification = useCallback((notification: Omit<NotificationToast, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: NotificationToast = {
      ...notification,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      read: false
    }

    updateStateThrottled(prevState => ({
      ...prevState,
      notifications: [
        newNotification,
        ...prevState.notifications.slice(0, fullConfig.maxNotifications! - 1)
      ]
    }))

    // Auto-dismiss notification after duration
    setTimeout(() => {
      dismissNotification(newNotification.id)
    }, notification.duration)
  }, [updateStateThrottled, fullConfig.maxNotifications])

  // Dismiss notification
  const dismissNotification = useCallback((notificationId: string) => {
    updateStateThrottled(prevState => ({
      ...prevState,
      notifications: prevState.notifications.filter(n => n.id !== notificationId)
    }))
  }, [updateStateThrottled])

  // Mark notification as read
  const markNotificationRead = useCallback((notificationId: string) => {
    updateStateThrottled(prevState => ({
      ...prevState,
      notifications: prevState.notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    }))
  }, [updateStateThrottled])

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: RealtimeMessage) => {
    if (!state.autoRefreshEnabled) return

    switch (message.type) {
      case 'quote_received':
        addNotification({
          type: 'success',
          title: 'Nova Cotação Recebida',
          message: `Cotação recebida para RFQ ${message.rfq_id}`,
          duration: 5000
        })
        break

      case 'price_update':
        // Update price history
        updateStateThrottled(prevState => {
          const newHistory = new Map(prevState.priceHistory)
          const materialId = message.data.material_id
          const currentHistory = newHistory.get(materialId) || []
          
          const newEntry: PriceHistoryEntry = {
            price: message.data.new_price,
            timestamp: message.timestamp,
            supplier_id: message.data.supplier_id
          }
          
          // Keep only the last N entries
          const updatedHistory = [newEntry, ...currentHistory]
            .slice(0, fullConfig.maxPriceHistoryEntries!)
          
          newHistory.set(materialId, updatedHistory)
          
          return {
            ...prevState,
            priceHistory: newHistory
          }
        })

        addNotification({
          type: 'info',
          title: 'Preço Atualizado',
          message: `Preço atualizado: R$ ${message.data.new_price.toFixed(2)}`,
          duration: 3000
        })
        break

      case 'supplier_online':
        updateStateThrottled(prevState => {
          const newOnlineSuppliers = new Set(prevState.onlineSuppliers)
          newOnlineSuppliers.add(message.data.supplier_id)
          
          return {
            ...prevState,
            onlineSuppliers: newOnlineSuppliers
          }
        })
        break

      case 'supplier_offline':
        updateStateThrottled(prevState => {
          const newOnlineSuppliers = new Set(prevState.onlineSuppliers)
          newOnlineSuppliers.delete(message.data.supplier_id)
          
          return {
            ...prevState,
            onlineSuppliers: newOnlineSuppliers
          }
        })
        break

      case 'deadline_warning':
        const urgencyType = message.data.urgency_level === 'critical' ? 'error' : 'warning'
        addNotification({
          type: urgencyType,
          title: 'Prazo de Cotação',
          message: `${message.data.hours_remaining}h restantes para o prazo`,
          duration: 8000
        })
        break

      case 'notification':
        addNotification({
          type: message.data.type,
          title: message.data.title,
          message: message.data.message,
          duration: message.data.duration || 5000
        })
        break
    }
  }, [state.autoRefreshEnabled, addNotification, updateStateThrottled, fullConfig.maxPriceHistoryEntries])

  // Setup WebSocket connection with automatic reconnection
  const setupWebSocket = useCallback(() => {
    if (isUnmounting.current || !rfqId) return

    try {
      const wsUrl = `ws://localhost:8000/ws/${clientId.current}`
      ws.current = new WebSocket(wsUrl)

      ws.current.onopen = () => {
        console.log('WebSocket connected for RFQ:', rfqId)
        setState(prevState => ({
          ...prevState,
          connectionStatus: 'connected',
          reconnectAttempt: 0
        }))

        // Subscribe to RFQ updates
        if (ws.current) {
          ws.current.send(JSON.stringify({
            type: 'subscribe_rfq',
            rfq_id: rfqId
          }))
        }

        // Setup heartbeat
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current)
        }
        
        const sendHeartbeat = () => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'ping' }))
            heartbeatTimeoutRef.current = setTimeout(sendHeartbeat, fullConfig.heartbeatInterval)
          }
        }
        
        heartbeatTimeoutRef.current = setTimeout(sendHeartbeat, fullConfig.heartbeatInterval)
      }

      ws.current.onmessage = (event) => {
        try {
          const message: RealtimeMessage = JSON.parse(event.data)
          handleWebSocketMessage(message)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.current.onclose = () => {
        console.log('WebSocket disconnected')
        setState(prevState => ({
          ...prevState,
          connectionStatus: 'disconnected'
        }))
        
        // Cleanup heartbeat
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current)
        }

        // Attempt reconnection with exponential backoff
        if (!isUnmounting.current && state.reconnectAttempt < fullConfig.reconnectAttempts!) {
          const delay = Math.min(fullConfig.reconnectDelay! * Math.pow(2, state.reconnectAttempt), 30000)
          console.log(`Reconnecting in ${delay}ms (attempt ${state.reconnectAttempt + 1})`)
          
          setState(prevState => ({
            ...prevState,
            reconnectAttempt: prevState.reconnectAttempt + 1
          }))
          
          reconnectTimeoutRef.current = setTimeout(setupWebSocket, delay)
        }
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setState(prevState => ({
          ...prevState,
          connectionStatus: 'error'
        }))
      }

    } catch (error) {
      console.error('Error setting up WebSocket:', error)
      setState(prevState => ({
        ...prevState,
        connectionStatus: 'error'
      }))
    }
  }, [rfqId, state.reconnectAttempt, fullConfig, handleWebSocketMessage])

  // Initialize WebSocket connection
  useEffect(() => {
    if (!rfqId) return

    setState(prevState => ({
      ...prevState,
      connectionStatus: 'connecting'
    }))

    setupWebSocket()

    return () => {
      isUnmounting.current = true
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current)
      }
      
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [rfqId, setupWebSocket])

  // Control methods
  const toggleAutoRefresh = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      autoRefreshEnabled: !prevState.autoRefreshEnabled
    }))
  }, [])

  const clearNotifications = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      notifications: []
    }))
  }, [])

  const reconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close()
    }
    setState(prevState => ({
      ...prevState,
      reconnectAttempt: 0
    }))
    setupWebSocket()
  }, [setupWebSocket])

  return {
    // State
    priceHistory: state.priceHistory,
    onlineSuppliers: state.onlineSuppliers,
    notifications: state.notifications,
    connectionStatus: state.connectionStatus,
    autoRefreshEnabled: state.autoRefreshEnabled,
    lastUpdateTime: state.lastUpdateTime,
    
    // Methods
    dismissNotification,
    markNotificationRead,
    toggleAutoRefresh,
    clearNotifications,
    reconnect
  }
}