name: "Dashboard de Cotações em Tempo Real com WebSocket Avançado"
description: |

## Goal
Transformar o componente `quote-dashboard.tsx` existente em uma interface estilo "mercado financeiro" com atualizações em tempo real de preços, notificações push quando fornecedores submetem propostas, histórico de flutuações de preço por material, e funcionalidades avançadas de WebSocket que reduza ciclos de cotação de dias para horas.

## Why
- **Business Impact**: Criar urgência nos fornecedores através de transparência competitiva, reduzindo tempo de cotação de dias para horas
- **User Experience**: Eliminar ansiedade e abandono durante processos de cotação longos
- **Competitive Advantage**: Interface diferenciada que posiciona AEC-Axis como líder tecnológico no setor
- **Integration**: Aproveita arquitetura WebSocket já existente em `project-detail.tsx` e expande para casos de uso avançados

## What
Interface em tempo real que transforma dados de cotação em experiência imersiva com:
- Notificações push instantâneas para novas cotações
- Indicadores visuais de fornecedores online/offline
- Histórico de flutuações de preço com mini-gráficos
- Sistema de filtros e ordenação dinâmica
- Contador de deadline com urgência visual
- Auto-refresh controlável pelo usuário

### Success Criteria
- [ ] Dashboard atualiza automaticamente quando nova cotação é recebida via WebSocket
- [ ] Notificações toast aparecem para eventos relevantes (nova cotação, fornecedor online, deadline próximo)
- [ ] Indicadores visuais mostram status em tempo real de fornecedores
- [ ] Mini-gráficos de histórico funcionam para materiais com múltiplas cotações
- [ ] Filtros e ordenação funcionam com dados em tempo real
- [ ] Performance mantida com updates frequentes (throttling/debouncing)
- [ ] Reconexão automática após perda de conectividade
- [ ] Memory management previne vazamentos em sessões longas

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://fastapi.tiangolo.com/advanced/websockets/
  why: ConnectionManager pattern for broadcasting to multiple clients
  section: "Connection Manager" - shows proper connect/disconnect/broadcast methods
  critical: In-memory connections only work with single process, use Redis for production
  
- url: https://www.npmjs.com/package/react-use-websocket  
  why: Best practices for React WebSocket integration with automatic reconnection
  section: "shouldReconnect" and "reconnectAttempts" configuration
  critical: Use useRef for WebSocket instances, avoid in useEffect dependencies

- url: https://medium.com/@SanchezAllanManuel/optimizing-real-time-performance-websockets-and-react-js-integration-part-ii-4a3ada319630
  why: Performance optimization for high-frequency WebSocket updates
  section: Memory management with capped arrays, throttling patterns
  critical: Use Array.prototype.slice() to maintain fixed-size data arrays

- url: https://carbondesignsystem.com/components/notification/usage/
  why: Toast notification UX patterns for financial interfaces  
  section: Fixed width, two-line text limitation, time-based display
  critical: Non-modal design that doesn't interrupt workflow

- file: D:\AEC Axis\backend\app\api\websockets.py
  why: Existing WebSocket implementation patterns to extend
  critical: ConnectionManager class with project-based subscriptions already implemented

- file: D:\AEC Axis\frontend\src\components\quote-dashboard.tsx  
  why: Current dashboard structure to transform into real-time interface
  critical: Existing state management patterns and API integration

- file: D:\AEC Axis\frontend\src\pages\project-detail.tsx
  why: WebSocket client implementation patterns (lines 49-85)
  critical: setupWebSocket() function and handleWebSocketMessage() patterns

- file: D:\AEC Axis\backend\app\api\quotes.py
  why: Quote submission workflow for triggering real-time notifications
  critical: submit_quote() function where we'll add WebSocket broadcasting

- docfile: INITIAL_realtime_dashboard.md
  why: Complete feature specifications and implementation details
```

### Current Codebase Tree
```bash
D:\AEC Axis\
├── backend\
│   ├── app\
│   │   ├── api\
│   │   │   ├── websockets.py          # Current WebSocket implementation
│   │   │   ├── quotes.py              # Quote submission endpoints
│   │   │   └── rfqs.py                # RFQ management
│   │   ├── db\models\
│   │   │   ├── quote.py               # Quote data model
│   │   │   └── rfq.py                 # RFQ data model
│   │   └── services\
│   │       └── rfq_service.py         # Business logic
├── frontend\
│   └── src\
│       ├── components\
│       │   └── quote-dashboard.tsx    # Current dashboard (MODIFY)
│       ├── pages\
│       │   └── project-detail.tsx     # WebSocket integration (MODIFY)
│       └── services\
│           └── api.ts                 # API service layer
```

### Desired Codebase Tree with New Files
```bash
D:\AEC Axis\
├── backend\
│   ├── app\
│   │   ├── api\
│   │   │   ├── websockets.py          # MODIFY: Add RFQ broadcasting
│   │   │   └── quotes.py              # MODIFY: Add WebSocket notifications
│   │   └── services\
│   │       └── websocket_service.py   # CREATE: Advanced broadcasting logic
├── frontend\
│   └── src\
│       ├── components\
│       │   ├── quote-dashboard.tsx    # MODIFY: Add real-time features  
│       │   ├── NotificationToast.tsx  # CREATE: Toast notification system
│       │   ├── PriceTrendMini.tsx     # CREATE: Mini price history charts
│       │   └── CountdownTimer.tsx     # CREATE: Deadline countdown component
│       ├── hooks\
│       │   └── useRealtimeQuotes.tsx  # CREATE: Custom WebSocket hook
│       └── utils\
│           └── websocket-throttle.ts  # CREATE: Performance utilities
```

### Known Gotchas & Library Quirks
```python
# CRITICAL: FastAPI WebSocket ConnectionManager pattern
# The existing ConnectionManager in websockets.py uses project-based subscriptions
# We need to extend this for RFQ-specific subscriptions without breaking existing functionality

# CRITICAL: React WebSocket Memory Management  
# Each WebSocket message triggers React re-render
# MUST implement throttling and use useCallback/useMemo extensively

# CRITICAL: WebSocket Reconnection
# Browser WebSocket doesn't auto-reconnect, must implement exponential backoff
# Use react-use-websocket or custom reconnection logic

# CRITICAL: Performance with Frequent Updates
# Financial-style dashboards can receive 100+ updates/second
# MUST use throttling (500ms), array slicing for history (max 50 entries)

# GOTCHA: SQLAlchemy Async in WebSocket context
# Current codebase uses sync SQLAlchemy, WebSocket notifications need async context
# May need threading or async adapter for database queries in notifications

# GOTCHA: CORS and WebSocket Ports
# Development uses different ports (frontend:5173, backend:8000) 
# WebSocket URL must match backend port exactly

# GOTCHA: TypeScript Strict Mode
# Current codebase uses strict TypeScript, all WebSocket message types must be properly typed
# Missing type definitions will cause build failures
```

## Implementation Blueprint

### Data Models and Structure
```typescript
// New TypeScript interfaces for real-time features
interface RealtimeMessage {
  type: 'quote_received' | 'price_update' | 'supplier_online' | 'supplier_offline' | 'deadline_warning'
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
  type: 'success' | 'warning' | 'info'  
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
}
```

### List of Tasks in Implementation Order

```yaml
Task 1 - Backend WebSocket Service Enhancement:
MODIFY backend/app/api/websockets.py:
  - FIND: class ConnectionManager  
  - INJECT after disconnect method: subscribe_to_rfq() method for RFQ-specific subscriptions
  - INJECT after notify_project method: notify_rfq() method for targeted broadcasting
  - PRESERVE existing project subscription functionality

CREATE backend/app/services/websocket_service.py:
  - MIRROR pattern from: backend/app/services/rfq_service.py (error handling, async patterns)
  - IMPLEMENT: broadcast_quote_received(), broadcast_supplier_status() functions
  - INTEGRATE with existing ConnectionManager via dependency injection

Task 2 - Backend Quote Submission Integration:
MODIFY backend/app/api/quotes.py:
  - FIND: submit_quote function (line 105-209)
  - INJECT after db.commit() (line 204): WebSocket notification broadcast
  - IMPORT websocket_service and call broadcast_quote_received()
  - PRESERVE existing transaction integrity

Task 3 - Frontend Realtime Hook Creation:
CREATE frontend/src/hooks/useRealtimeQuotes.tsx:
  - MIRROR pattern from: frontend/src/contexts/auth-context.tsx (custom hook structure)
  - IMPLEMENT: WebSocket connection with automatic reconnection using react-use-websocket
  - HANDLE: All realtime message types with proper TypeScript typing
  - MANAGE: State for price history, online suppliers, notifications

Task 4 - Frontend Toast Notification System:
CREATE frontend/src/components/NotificationToast.tsx:
  - MIRROR pattern from: existing styled components in quote-dashboard.tsx
  - IMPLEMENT: Auto-dismiss after 5 seconds, click-to-dismiss, animation enter/exit
  - STYLE: Match existing design system (colors, spacing, typography)

CREATE frontend/src/components/PriceTrendMini.tsx:
  - IMPLEMENT: Simple SVG sparkline chart for price history
  - HANDLE: Empty state when insufficient data points
  - OPTIMIZE: Use React.memo to prevent unnecessary re-renders

CREATE frontend/src/components/CountdownTimer.tsx:
  - IMPLEMENT: Real-time countdown with visual urgency indicators
  - HANDLE: Expired state, different time formats (hours, minutes, seconds)
  - INTEGRATE: With notification system for deadline warnings

Task 5 - Frontend Dashboard Enhancement:
MODIFY frontend/src/components/quote-dashboard.tsx:
  - FIND: useState declarations (lines 10-12)
  - INJECT: New state variables for realtime features using useRealtimeQuotes hook
  - FIND: supplier header rendering (lines 134-149)  
  - INJECT: Online status indicators in supplier columns
  - FIND: quote cell rendering (lines 169-212)
  - INJECT: Price trend mini-charts and update animations
  - PRESERVE: Existing table structure and styling patterns

Task 6 - Frontend Project Detail Integration:  
MODIFY frontend/src/pages/project-detail.tsx:
  - FIND: handleWebSocketMessage function (line 87-99)
  - INJECT: New message type handlers for RFQ-specific messages
  - FIND: WebSocket subscription (line 60-62)
  - MODIFY: Add RFQ subscription when QuoteDashboard is open
  - PRESERVE: Existing IFC file status update functionality

Task 7 - Performance Optimization:
CREATE frontend/src/utils/websocket-throttle.ts:
  - IMPLEMENT: Throttling utilities for high-frequency WebSocket updates  
  - IMPLEMENT: Memory management for price history (max 50 entries per supplier)
  - IMPLEMENT: Batch state updates to prevent excessive re-renders

Task 8 - Integration Testing:
TEST: Complete workflow from quote submission to dashboard update
  - Start WebSocket connection in QuoteDashboard
  - Submit quote via public quote submission page
  - Verify real-time update appears in dashboard
  - Verify notification toast displays correctly
  - Verify price history updates and mini-chart renders
```

### Per Task Pseudocode

```python
# Task 1 - Backend WebSocket Enhancement
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.project_subscriptions: Dict[str, Set[str]] = {}  # existing
        self.rfq_subscriptions: Dict[str, Set[str]] = {}      # NEW
    
    def subscribe_to_rfq(self, client_id: str, rfq_id: str):
        """Subscribe client to RFQ-specific notifications"""
        if rfq_id not in self.rfq_subscriptions:
            self.rfq_subscriptions[rfq_id] = set()
        self.rfq_subscriptions[rfq_id].add(client_id)
    
    async def notify_rfq(self, rfq_id: str, message: dict):
        """Broadcast message to all clients subscribed to specific RFQ"""
        if rfq_id in self.rfq_subscriptions:
            subscribers = self.rfq_subscriptions[rfq_id].copy()
            for client_id in subscribers:
                if client_id in self.active_connections:
                    try:
                        websocket = self.active_connections[client_id]
                        await websocket.send_text(json.dumps(message))
                    except Exception:
                        self.disconnect(client_id)

# Task 2 - Quote Submission Integration  
@router.post("/{token}", response_model=QuoteResponse)
async def submit_quote(token: str, quote_data: QuoteCreate, db: Session = Depends(get_db)):
    # ... existing validation logic ...
    
    db.commit()  # existing line 204
    db.refresh(db_quote)  # existing line 207
    
    # NEW: Real-time notification broadcast
    from app.services.websocket_service import broadcast_quote_received
    from app.api.websockets import manager
    
    await broadcast_quote_received(
        manager=manager,
        rfq_id=str(rfq_id),
        supplier_id=str(supplier_id), 
        quote_data=db_quote,
        materials=quote_items
    )
    
    return db_quote
```

```typescript
// Task 3 - Frontend Realtime Hook
const useRealtimeQuotes = (rfqId: string) => {
  const [priceHistory, setPriceHistory] = useState<Map<string, PriceHistoryEntry[]>>(new Map())
  const [onlineSuppliers, setOnlineSuppliers] = useState<Set<string>>(new Set())
  const [notifications, setNotifications] = useState<NotificationToast[]>([])
  
  // PATTERN: Use react-use-websocket for automatic reconnection
  const { sendMessage, lastMessage, connectionStatus } = useWebSocket(
    `ws://localhost:8000/ws/${clientId}`,
    {
      shouldReconnect: () => true,
      reconnectAttempts: 10,
      reconnectInterval: 3000,
    }
  )
  
  useEffect(() => {
    if (lastMessage !== null) {
      const message: RealtimeMessage = JSON.parse(lastMessage.data)
      
      // CRITICAL: Handle different message types
      switch (message.type) {
        case 'quote_received':
          handleQuoteReceived(message)
          break
        case 'supplier_online':
          setOnlineSuppliers(prev => new Set(prev).add(message.data.supplier_id))
          break
        // ... other handlers
      }
    }
  }, [lastMessage])
  
  // PERFORMANCE: Throttled state updates to prevent excessive re-renders  
  const throttledUpdateHandler = useCallback(
    throttle((updates: any[]) => {
      // Batch multiple updates into single state change
    }, 500),
    []
  )
  
  return { priceHistory, onlineSuppliers, notifications, connectionStatus }
}

// Task 5 - Dashboard Enhancement  
function QuoteDashboard({ rfqId, onClose }: QuoteDashboardProps) {
  // MODIFY: Add realtime hook
  const { priceHistory, onlineSuppliers, notifications } = useRealtimeQuotes(rfqId)
  
  // FIND existing suppliers.map (line 134)
  // INJECT: Online status indicator
  {suppliers.map(supplier => (
    <th key={supplier.id}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {supplier.name}
        <div style={{ 
          width: '8px', 
          height: '8px', 
          borderRadius: '50%', 
          backgroundColor: onlineSuppliers.has(supplier.id) ? '#28a745' : '#6c757d' 
        }} />
      </div>
    </th>
  ))}
  
  // INJECT: Fixed position notification area
  <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
    {notifications.filter(n => !n.read).slice(0, 3).map(notification => (
      <NotificationToast key={notification.id} notification={notification} />
    ))}
  </div>
}
```

### Integration Points
```yaml
DATABASE:
  - No schema changes required - uses existing Quote, RFQ, Supplier tables
  - May need connection pooling adjustments for WebSocket load
  
CONFIG:  
  - Add to: frontend/vite.config.ts
  - Pattern: Ensure WebSocket proxy configuration for development
  
WEBSOCKET:
  - Extend: backend/app/api/websockets.py ConnectionManager  
  - Pattern: Maintain backward compatibility with existing project subscriptions
  
FRONTEND:
  - Integrate: New hooks and components into existing quote-dashboard.tsx
  - Pattern: Follow existing error handling and loading state patterns
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Backend validation
cd backend
ruff check app/ --fix
mypy app/

# Frontend validation  
cd frontend
npm run lint
npm run type-check

# Expected: No errors. If errors, READ the error message and fix code.
```

### Level 2: Unit Tests  
```python
# CREATE backend/tests/test_websocket_service.py
def test_broadcast_quote_received():
    """Test WebSocket broadcasting when quote is received"""
    # Mock ConnectionManager and WebSocket connections
    mock_manager = Mock()
    mock_websocket = Mock()
    mock_manager.active_connections = {"client1": mock_websocket}
    mock_manager.rfq_subscriptions = {"rfq_123": {"client1"}}
    
    # Test broadcast functionality
    await broadcast_quote_received(mock_manager, "rfq_123", quote_data)
    
    # Verify WebSocket message sent
    mock_websocket.send_text.assert_called_once()

def test_rfq_subscription():
    """Test RFQ-specific subscription management"""
    manager = ConnectionManager()
    manager.subscribe_to_rfq("client1", "rfq_123")
    
    assert "rfq_123" in manager.rfq_subscriptions
    assert "client1" in manager.rfq_subscriptions["rfq_123"]
```

```typescript  
// CREATE frontend/src/__tests__/useRealtimeQuotes.test.tsx
describe('useRealtimeQuotes', () => {
  test('should handle quote_received message', () => {
    const { result } = renderHook(() => useRealtimeQuotes('rfq_123'))
    
    // Simulate WebSocket message
    act(() => {
      // Trigger quote received event
    })
    
    expect(result.current.notifications).toHaveLength(1)
    expect(result.current.notifications[0].type).toBe('success')
  })
  
  test('should throttle frequent updates', () => {
    // Test throttling prevents excessive re-renders
  })
})
```

```bash
# Run backend tests  
cd backend
uv run pytest tests/test_websocket_service.py -v

# Run frontend tests
cd frontend  
npm test -- --testPathPattern=useRealtimeQuotes

# Expected: All tests pass. If failing, fix implementation before proceeding.
```

### Level 3: Integration Test
```bash
# Start backend server
cd backend
uvicorn app.main:app --reload --port 8000

# Start frontend server  
cd frontend
npm run dev

# Manual test workflow:
# 1. Navigate to http://localhost:5173/projects/1 
# 2. Open QuoteDashboard for an existing RFQ
# 3. In separate tab, submit a quote via public quote submission page
# 4. Verify dashboard updates in real-time without page refresh
# 5. Verify notification toast appears
# 6. Verify supplier online indicator updates

# WebSocket test:
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: test" \
     ws://localhost:8000/ws/test_client

# Expected: WebSocket connection established, subscription messages work
```

## Final Validation Checklist
- [ ] All tests pass: `uv run pytest backend/tests/ -v && npm test --watchAll=false`
- [ ] No linting errors: `ruff check backend/app/ && npm run lint`
- [ ] No type errors: `mypy backend/app/ && npm run type-check` 
- [ ] WebSocket connection establishes: Manual test with browser dev tools
- [ ] Real-time updates work: Submit quote and verify dashboard updates
- [ ] Notifications display correctly: Toast messages appear and dismiss
- [ ] Performance acceptable: No memory leaks in 30-minute test session
- [ ] Reconnection works: Disconnect/reconnect WebSocket maintains functionality
- [ ] Error cases handled: Network errors don't crash dashboard

---

## Anti-Patterns to Avoid  
- ❌ Don't create new WebSocket connection for each component - reuse existing
- ❌ Don't skip message throttling - financial dashboards need performance optimization  
- ❌ Don't ignore WebSocket reconnection - production networks are unreliable
- ❌ Don't store unlimited price history - implement memory management
- ❌ Don't update state after component unmount - causes memory leaks
- ❌ Don't break existing project-based WebSocket subscriptions
- ❌ Don't hardcode WebSocket URLs - use environment configuration

**Confidence Level: 9/10** - Comprehensive context provided with existing patterns, authoritative documentation, specific implementation steps, and executable validation gates. The only uncertainty is potential async/sync database integration complexity in WebSocket broadcasting context.