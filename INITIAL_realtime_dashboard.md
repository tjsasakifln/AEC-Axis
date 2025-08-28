# INITIAL: Dashboard de Cotações em Tempo Real com WebSocket Avançado

## FEATURE

Transformar o componente `quote-dashboard.tsx` em uma interface estilo "mercado financeiro" com atualizações em tempo real de preços, notificações push quando fornecedores submetem propostas, histórico de flutuações de preço por material, e funcionalidades avançadas de WebSocket.

### Contexto e Justificativa
O dashboard atual (`frontend/src/components/quote-dashboard.tsx`) já possui uma estrutura sólida de comparação de cotações, mas carece de dinamismo e urgência. A arquitetura WebSocket já está implementada em `project-detail.tsx` (linhas 49-85), sendo necessário apenas expandir suas funcionalidades para criar uma experiência imersiva que reduza ciclos de cotação de dias para horas.

### Objetivos de Negócio
- Criar urgência nos fornecedores através de transparência competitiva
- Reduzir tempo de cotação de dias para horas
- Aumentar taxa de resposta dos fornecedores
- Proporcionar decisões mais ágeis e estratégicas

## REQUISITOS TÉCNICOS

### 1. Expansão do Sistema WebSocket Existente

**Arquivo Base:** `frontend/src/pages/project-detail.tsx` (linhas 49-85)

**Novos Tipos de Mensagem WebSocket:**
```typescript
// Adicionar ao existing handleWebSocketMessage function
interface WebSocketMessage {
  // Existing types...
  | { type: 'quote_received'; rfq_id: string; supplier_id: string; material_id: string; price: number; timestamp: string }
  | { type: 'price_update'; rfq_id: string; material_id: string; old_price: number; new_price: number; supplier_id: string }
  | { type: 'supplier_online'; rfq_id: string; supplier_id: string }
  | { type: 'supplier_offline'; rfq_id: string; supplier_id: string }
  | { type: 'quote_deadline_warning'; rfq_id: string; hours_remaining: number }
}
```

**Implementação:**
- Expandir `handleWebSocketMessage` em `project-detail.tsx` para processar novos tipos de mensagem
- Propagar atualizações para `QuoteDashboard` via props ou Context API
- Implementar reconexão automática com exponential backoff

### 2. Modificações no Componente QuoteDashboard

**Arquivo Principal:** `frontend/src/components/quote-dashboard.tsx`

**Novos Estados React:**
```typescript
const [priceHistory, setPriceHistory] = useState<Map<string, PriceHistoryEntry[]>>(new Map())
const [onlineSuppliers, setOnlineSuppliers] = useState<Set<string>>(new Set())
const [recentUpdates, setRecentUpdates] = useState<RealtimeUpdate[]>([])
const [notifications, setNotifications] = useState<Notification[]>([])
const [autoRefresh, setAutoRefresh] = useState<boolean>(true)

interface PriceHistoryEntry {
  price: number
  timestamp: string
  supplier_id: string
}

interface RealtimeUpdate {
  id: string
  type: 'quote_received' | 'price_update' | 'supplier_online'
  message: string
  timestamp: string
  material_id?: string
  supplier_id?: string
}

interface Notification {
  id: string
  type: 'success' | 'warning' | 'info'
  title: string
  message: string
  timestamp: string
  read: boolean
}
```

**Componentes Visuais Novos:**

1. **Painel de Notificações em Tempo Real:**
```typescript
// Adicionar após header (linha 116)
<div style={{ 
  position: 'fixed', 
  top: '20px', 
  right: '20px', 
  zIndex: 1000, 
  maxWidth: '300px' 
}}>
  {notifications.filter(n => !n.read).slice(0, 3).map(notification => (
    <NotificationToast key={notification.id} notification={notification} />
  ))}
</div>
```

2. **Indicadores de Status em Tempo Real:**
```typescript
// Modificar cabeçalho da tabela para incluir status online
{suppliers.map(supplier => (
  <th key={supplier.id} style={{ /* existing styles */ }}>
    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
      {supplier.name}
      <div style={{ 
        width: '8px', 
        height: '8px', 
        borderRadius: '50%', 
        backgroundColor: onlineSuppliers.has(supplier.id) ? '#28a745' : '#6c757d' 
      }} />
    </div>
    <div style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>
      {supplier.cnpj}
    </div>
  </th>
))}
```

3. **Mini-gráfico de Histórico de Preços:**
```typescript
// Adicionar em cada célula de cotação
const PriceTrendMini: React.FC<{ materialId: string; supplierId: string }> = ({ materialId, supplierId }) => {
  const history = priceHistory.get(`${materialId}_${supplierId}`) || []
  if (history.length < 2) return null
  
  return (
    <div style={{ height: '20px', width: '60px', marginTop: '4px' }}>
      {/* Implementar sparkline simples usando SVG */}
    </div>
  )
}
```

4. **Contador de Deadline:**
```typescript
// Adicionar após header do dashboard
<div style={{ 
  backgroundColor: '#fff3cd', 
  border: '1px solid #ffeaa7', 
  borderRadius: '6px', 
  padding: '10px', 
  marginBottom: '20px' 
}}>
  <CountdownTimer deadline={dashboardData.deadline} />
</div>
```

### 3. Funcionalidades de Interação Avançada

**Auto-refresh Toggle:**
```typescript
// Adicionar controle de auto-refresh
<div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
  <label>
    <input
      type="checkbox"
      checked={autoRefresh}
      onChange={(e) => setAutoRefresh(e.target.checked)}
    />
    Atualização automática
  </label>
  <span style={{ color: '#666', fontSize: '12px' }}>
    Última atualização: {lastUpdateTime}
  </span>
</div>
```

**Filtros e Ordenação:**
```typescript
const [sortBy, setSortBy] = useState<'price' | 'lead_time' | 'supplier' | 'timestamp'>('price')
const [filterBy, setFilterBy] = useState<{
  showOnlineOnly: boolean
  hideNoQuotes: boolean
  priceRange: [number, number] | null
}>({
  showOnlineOnly: false,
  hideNoQuotes: true,
  priceRange: null
})
```

### 4. Backend - Expansão da API WebSocket

**Arquivo:** `backend/app/websocket/connection_manager.py` (assumindo existe baseado na implementação atual)

**Novos Endpoints WebSocket:**
```python
# Adicionar aos tipos de mensagem existentes
@websocket.receive("text")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    # Existing connection logic...
    
    # Novos handlers para mensagens específicas de RFQ
    if message_data["type"] == "subscribe_rfq":
        await manager.subscribe_to_rfq(client_id, message_data["rfq_id"])
    elif message_data["type"] == "supplier_heartbeat":
        await manager.update_supplier_status(message_data["supplier_id"], "online")
```

**Notificações Push Automáticas:**
```python
# Função para disparar quando nova cotação é recebida
async def notify_quote_received(rfq_id: str, supplier_id: str, material_id: str, price: float):
    message = {
        "type": "quote_received",
        "rfq_id": rfq_id,
        "supplier_id": supplier_id,
        "material_id": material_id,
        "price": price,
        "timestamp": datetime.utcnow().isoformat()
    }
    await connection_manager.broadcast_to_rfq(rfq_id, message)
```

## DOCUMENTATION

### Guia de Implementação por Etapas

**Etapa 1: Expansão WebSocket (2-3 horas)**
1. Modificar `handleWebSocketMessage` em `project-detail.tsx`
2. Adicionar novos tipos TypeScript para mensagens WebSocket
3. Implementar propagação de dados para QuoteDashboard

**Etapa 2: Interface em Tempo Real (4-5 horas)**
1. Adicionar estados React para funcionalidades dinâmicas
2. Implementar componentes de notificação toast
3. Adicionar indicadores visuais de status online
4. Implementar contador de deadline

**Etapa 3: Funcionalidades Avançadas (3-4 horas)**
1. Mini-gráficos de histórico de preço (SVG simples)
2. Sistema de filtros e ordenação
3. Auto-refresh toggle
4. Persistência de notificações

**Etapa 4: Backend WebSocket (2-3 horas)**
1. Expandir connection manager para RFQ-specific subscriptions
2. Implementar supplier heartbeat system
3. Adicionar automatic notifications

### Considerações de Performance

**Throttling de Updates:**
```typescript
const throttledUpdateHandler = useCallback(
  throttle((updates: RealtimeUpdate[]) => {
    setRecentUpdates(prev => [...updates, ...prev].slice(0, 50))
  }, 500),
  []
)
```

**Memory Management:**
```typescript
// Cleanup de histórico antigo
useEffect(() => {
  const cleanup = setInterval(() => {
    setPriceHistory(prev => {
      const cleaned = new Map()
      const cutoff = Date.now() - (24 * 60 * 60 * 1000) // 24h
      prev.forEach((entries, key) => {
        const filtered = entries.filter(e => new Date(e.timestamp).getTime() > cutoff)
        if (filtered.length > 0) {
          cleaned.set(key, filtered)
        }
      })
      return cleaned
    })
  }, 60000) // Cleanup a cada minuto
  
  return () => clearInterval(cleanup)
}, [])
```

## EXAMPLES

### Exemplo de Uso - Fluxo Completo

**1. Fornecedor submete cotação:**
```typescript
// Backend dispara automaticamente
await notify_quote_received("rfq_123", "supplier_456", "material_789", 1500.00)

// Frontend recebe via WebSocket
const message = {
  type: "quote_received",
  rfq_id: "rfq_123",
  supplier_id: "supplier_456", 
  material_id: "material_789",
  price: 1500.00,
  timestamp: "2025-08-28T14:30:00Z"
}
```

**2. Dashboard atualiza em tempo real:**
```typescript
// Atualização automática da tabela
setDashboardData(prev => ({
  ...prev,
  materials: prev.materials.map(material => 
    material.id === message.material_id
      ? {
          ...material,
          quotes: [...material.quotes, newQuoteFromMessage]
        }
      : material
  )
}))

// Notificação toast aparece
setNotifications(prev => [...prev, {
  id: uuid(),
  type: 'success',
  title: 'Nova Cotação Recebida!',
  message: `${supplierName} cotou ${formatCurrency(message.price)} para ${materialName}`,
  timestamp: message.timestamp,
  read: false
}])
```

**3. Histórico de preços é atualizado:**
```typescript
setPriceHistory(prev => {
  const key = `${message.material_id}_${message.supplier_id}`
  const existing = prev.get(key) || []
  const updated = [...existing, {
    price: message.price,
    timestamp: message.timestamp,
    supplier_id: message.supplier_id
  }].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  
  return new Map(prev).set(key, updated)
})
```

### Exemplo Visual - Célula da Tabela Aprimorada

```typescript
<td style={{ 
  padding: '12px', 
  border: '1px solid #dee2e6', 
  verticalAlign: 'top',
  backgroundColor: isLowestPrice ? '#d4edda' : 'transparent',
  textAlign: 'center',
  position: 'relative'
}}>
  {/* Indicador de atualização recente */}
  {wasRecentlyUpdated && (
    <div style={{
      position: 'absolute',
      top: '2px',
      right: '2px',
      width: '6px',
      height: '6px',
      backgroundColor: '#007bff',
      borderRadius: '50%',
      animation: 'pulse 2s infinite'
    }} />
  )}
  
  {quote ? (
    <div>
      {/* Preço principal com animação de mudança */}
      <div style={{ 
        fontSize: '16px', 
        fontWeight: 'bold', 
        color: isLowestPrice ? '#155724' : '#333',
        marginBottom: '4px',
        transition: 'all 0.3s ease'
      }}>
        {formatCurrency(quote.price)}
      </div>
      
      {/* Indicador de tendência de preço */}
      {getPriceTrend(materialId, supplierId) && (
        <div style={{ fontSize: '11px', color: getTrendColor() }}>
          {getTrendIcon()} {getTrendPercentage()}%
        </div>
      )}
      
      {/* Lead time e timestamp */}
      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
        {quote.lead_time_days} dias
      </div>
      <div style={{ fontSize: '11px', color: '#888' }}>
        {formatRelativeTime(quote.submitted_at)}
      </div>
      
      {/* Mini-gráfico de histórico */}
      <PriceTrendMini materialId={materialId} supplierId={supplierId} />
    </div>
  ) : (
    <div style={{ 
      color: onlineSuppliers.has(supplierId) ? '#007bff' : '#6c757d', 
      fontStyle: 'italic',
      fontSize: '14px'
    }}>
      {onlineSuppliers.has(supplierId) ? 'Analisando...' : 'Aguardando resposta'}
    </div>
  )}
</td>
```

## OTHER CONSIDERATIONS

### Segurança e Privacy
- Implementar rate limiting para WebSocket connections
- Validar permissões de acesso a RFQs específicos
- Não expor dados de outros fornecedores para fornecedores concorrentes

### Compatibilidade
- Fallback para polling caso WebSocket falhe
- Progressive enhancement - funcionalidades básicas funcionam sem WebSocket
- Mobile responsiveness para notificações

### Monitoramento
- Métricas de engagement: tempo médio na página, interações por sessão
- Performance metrics: latência de WebSocket, memory usage do cliente
- Business metrics: redução no tempo de resposta, aumento na taxa de cotação

### Futuras Expansões
- Integração com sistema de e-mail para notificações externas
- Chat em tempo real entre comprador e fornecedor
- Leilão reverso automatizado com countdown
- Analytics preditivos baseados em histórico de preços
- Mobile push notifications via PWA