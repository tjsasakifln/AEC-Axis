import { useState, useEffect } from 'react'
import { rfqsApi, QuoteDashboardData, DashboardMaterial, DashboardQuoteItem } from '../services/api'
import { useRealtimeQuotes } from '../hooks/useRealtimeQuotes'
import NotificationToast from './NotificationToast'
import PriceTrendMini from './PriceTrendMini'
import CountdownTimer from './CountdownTimer'

interface QuoteDashboardProps {
  rfqId: string
  onClose: () => void
}

function QuoteDashboard({ rfqId, onClose }: QuoteDashboardProps) {
  const [dashboardData, setDashboardData] = useState<QuoteDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Real-time features
  const { 
    priceHistory, 
    onlineSuppliers, 
    notifications, 
    connectionStatus,
    autoRefreshEnabled,
    dismissNotification,
    markNotificationRead,
    toggleAutoRefresh 
  } = useRealtimeQuotes(rfqId)

  useEffect(() => {
    loadDashboardData()
  }, [rfqId])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      setError('')
      const data = await rfqsApi.getDashboardData(rfqId)
      setDashboardData(data)
    } catch (err) {
      setError('Erro ao carregar dados do dashboard')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const getUniqueSuppliers = () => {
    if (!dashboardData) return []
    
    const supplierMap = new Map()
    dashboardData.materials.forEach(material => {
      material.quotes.forEach(quote => {
        if (!supplierMap.has(quote.supplier.id)) {
          supplierMap.set(quote.supplier.id, quote.supplier)
        }
      })
    })
    
    return Array.from(supplierMap.values())
  }

  const getQuoteForMaterialAndSupplier = (material: DashboardMaterial, supplierId: string): DashboardQuoteItem | null => {
    return material.quotes.find(quote => quote.supplier.id === supplierId) || null
  }

  const getLowestPriceForMaterial = (material: DashboardMaterial): number | null => {
    if (material.quotes.length === 0) return null
    return Math.min(...material.quotes.map(quote => quote.price))
  }

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Carregando dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ color: '#dc3545', marginBottom: '15px' }}>{error}</div>
        <button onClick={onClose} className="btn btn-secondary">
          Voltar
        </button>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div style={{ padding: '20px' }}>
        <div>Nenhum dado encontrado</div>
        <button onClick={onClose} className="btn btn-secondary">
          Voltar
        </button>
      </div>
    )
  }

  const suppliers = getUniqueSuppliers()

  return (
    <div style={{ padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h2 style={{ margin: 0 }}>Dashboard Comparativo de Cotações</h2>
            
            {/* Connection Status Indicator */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              fontSize: '12px',
              color: connectionStatus === 'connected' ? '#28a745' : '#6c757d'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: connectionStatus === 'connected' ? '#28a745' : '#6c757d'
              }} />
              {connectionStatus === 'connected' ? 'Tempo Real' : connectionStatus === 'connecting' ? 'Conectando...' : 'Desconectado'}
            </div>
          </div>
          
          <p style={{ margin: '5px 0', color: '#666' }}>
            Projeto: {dashboardData.project.name}
          </p>
          {dashboardData.project.address && (
            <p style={{ margin: '0', color: '#888', fontSize: '14px' }}>
              {dashboardData.project.address}
            </p>
          )}
          
          {/* Countdown Timer for RFQ deadline */}
          <div style={{ marginTop: '8px' }}>
            <CountdownTimer 
              deadline={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)} // 7 days from now as example
              size="small"
              onWarning={(hours) => {
                console.log(`Deadline warning: ${hours} hours remaining`)
              }}
              onExpired={() => {
                console.log('RFQ deadline expired')
              }}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Auto-refresh Toggle */}
          <button
            onClick={toggleAutoRefresh}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              backgroundColor: autoRefreshEnabled ? '#28a745' : '#f8f9fa',
              color: autoRefreshEnabled ? 'white' : '#666',
              cursor: 'pointer'
            }}
          >
            {autoRefreshEnabled ? '⏸ Pausar' : '▶ Retomar'}
          </button>
          
          <button onClick={onClose} className="btn btn-secondary">
            ✕ Fechar
          </button>
        </div>
      </header>

      {/* Fixed Position Notification Area */}
      <div style={{ 
        position: 'fixed', 
        top: '20px', 
        right: '20px', 
        zIndex: 1000,
        pointerEvents: 'none'
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          {notifications.filter(n => !n.read).slice(0, 3).map(notification => (
            <NotificationToast 
              key={notification.id} 
              notification={notification}
              onDismiss={dismissNotification}
              onMarkRead={markNotificationRead}
            />
          ))}
        </div>
      </div>

      {suppliers.length === 0 ? (
        <div className="empty-state">
          <h4>Nenhuma cotação recebida ainda</h4>
          <p>Aguardando resposta dos fornecedores convidados.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ minWidth: '800px', border: '1px solid #dee2e6' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', border: '1px solid #dee2e6', minWidth: '200px' }}>
                  Material
                </th>
                <th style={{ padding: '12px', border: '1px solid #dee2e6', minWidth: '100px' }}>
                  Quantidade
                </th>
                {suppliers.map(supplier => (
                  <th 
                    key={supplier.id}
                    style={{ 
                      padding: '12px', 
                      border: '1px solid #dee2e6', 
                      minWidth: '180px',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 'bold' }}>{supplier.name}</span>
                      {/* Online Status Indicator */}
                      <div 
                        style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          backgroundColor: onlineSuppliers.has(supplier.id) ? '#28a745' : '#6c757d',
                          flexShrink: 0
                        }}
                        title={onlineSuppliers.has(supplier.id) ? 'Fornecedor online' : 'Fornecedor offline'}
                      />
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>
                      {supplier.cnpj}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dashboardData.materials.map(material => {
                const lowestPrice = getLowestPriceForMaterial(material)
                
                return (
                  <tr key={material.id}>
                    <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: '500' }}>{material.description}</div>
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>
                      <div>{material.quantity.toLocaleString('pt-BR')} {material.unit}</div>
                    </td>
                    {suppliers.map(supplier => {
                      const quote = getQuoteForMaterialAndSupplier(material, supplier.id)
                      const isLowestPrice = quote && lowestPrice !== null && quote.price === lowestPrice
                      
                      return (
                        <td 
                          key={supplier.id}
                          style={{ 
                            padding: '12px', 
                            border: '1px solid #dee2e6', 
                            verticalAlign: 'top',
                            backgroundColor: isLowestPrice ? '#d4edda' : 'transparent',
                            textAlign: 'center'
                          }}
                        >
                          {quote ? (
                            <div>
                              <div style={{ 
                                fontSize: '16px', 
                                fontWeight: 'bold', 
                                color: isLowestPrice ? '#155724' : '#333',
                                marginBottom: '4px'
                              }}>
                                {formatCurrency(quote.price)}
                              </div>
                              
                              {/* Price Trend Mini Chart */}
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                marginBottom: '6px' 
                              }}>
                                <PriceTrendMini
                                  priceHistory={priceHistory.get(material.id) || []}
                                  currentPrice={quote.price}
                                  width={60}
                                  height={20}
                                />
                              </div>
                              
                              <div style={{ 
                                fontSize: '12px', 
                                color: '#666',
                                marginBottom: '4px'
                              }}>
                                {quote.lead_time_days} dias
                              </div>
                              <div style={{ fontSize: '11px', color: '#888' }}>
                                {formatDate(quote.submitted_at)}
                              </div>
                            </div>
                          ) : (
                            <div style={{ 
                              color: '#6c757d', 
                              fontStyle: 'italic',
                              fontSize: '14px'
                            }}>
                              Aguardando resposta
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {suppliers.length > 0 && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
          <h4 style={{ marginTop: '0', marginBottom: '10px' }}>Legenda:</h4>
          <ul style={{ margin: '0', paddingLeft: '20px' }}>
            <li style={{ marginBottom: '5px' }}>
              <span style={{ backgroundColor: '#d4edda', padding: '2px 8px', borderRadius: '3px' }}>
                Verde
              </span> = Menor preço para cada material
            </li>
            <li>Valores em <strong>negrito</strong> indicam o preço cotado</li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default QuoteDashboard