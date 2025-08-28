import React, { memo, useMemo } from 'react'

interface PriceDataPoint {
  price: number
  timestamp: string
  supplier_id: string
}

interface PriceTrendMiniProps {
  priceHistory: PriceDataPoint[]
  width?: number
  height?: number
  strokeWidth?: number
  color?: string
  currentPrice?: number
  showCurrentPrice?: boolean
  className?: string
}

const PriceTrendMini = memo<PriceTrendMiniProps>(({
  priceHistory,
  width = 60,
  height = 20,
  strokeWidth = 1.5,
  color = '#007bff',
  currentPrice,
  showCurrentPrice = false,
  className
}) => {
  // Calculate chart data and dimensions
  const chartData = useMemo(() => {
    if (!priceHistory || priceHistory.length < 2) {
      return null
    }

    // Sort by timestamp to ensure proper order
    const sortedHistory = [...priceHistory].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    const prices = sortedHistory.map(point => point.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    
    // Avoid division by zero if all prices are the same
    const priceRange = maxPrice - minPrice || 1
    
    // Calculate SVG path points with padding
    const padding = 2
    const chartWidth = width - (padding * 2)
    const chartHeight = height - (padding * 2)
    
    const points = sortedHistory.map((point, index) => {
      const x = padding + (index / (sortedHistory.length - 1)) * chartWidth
      const y = padding + ((maxPrice - point.price) / priceRange) * chartHeight
      return { x, y, price: point.price }
    })

    // Generate SVG path
    const pathData = points.reduce((path, point, index) => {
      const command = index === 0 ? 'M' : 'L'
      return `${path} ${command} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
    }, '')

    // Calculate trend direction
    const firstPrice = prices[0]
    const lastPrice = prices[prices.length - 1]
    const trend = lastPrice > firstPrice ? 'up' : lastPrice < firstPrice ? 'down' : 'flat'
    const trendPercentage = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0

    return {
      pathData,
      points,
      minPrice,
      maxPrice,
      trend,
      trendPercentage,
      dataPoints: sortedHistory.length
    }
  }, [priceHistory, width, height])

  // Handle empty state
  if (!chartData) {
    return (
      <div
        className={className}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          fontSize: '10px',
          border: '1px dashed #ddd',
          borderRadius: '2px',
          backgroundColor: '#fafafa'
        }}
      >
        <span>---</span>
      </div>
    )
  }

  // Get trend color
  const getTrendColor = () => {
    switch (chartData.trend) {
      case 'up':
        return '#28a745' // Green for upward trend
      case 'down':
        return '#dc3545' // Red for downward trend
      default:
        return '#6c757d' // Gray for flat trend
    }
  }

  const trendColor = getTrendColor()
  
  // Tooltip content
  const getTooltipContent = () => {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
      }).format(value)
    }

    const trendSymbol = chartData.trend === 'up' ? '↗' : chartData.trend === 'down' ? '↘' : '→'
    const trendText = `${trendSymbol} ${chartData.trendPercentage.toFixed(1)}%`
    
    return `Variação: ${trendText}\nMín: ${formatCurrency(chartData.minPrice)}\nMáx: ${formatCurrency(chartData.maxPrice)}\nPontos: ${chartData.dataPoints}`
  }

  return (
    <div 
      className={className}
      style={{ 
        position: 'relative',
        display: 'inline-block',
        cursor: 'help'
      }}
      title={getTooltipContent()}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          overflow: 'visible',
          display: 'block'
        }}
      >
        {/* Background */}
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="transparent"
          stroke="none"
        />
        
        {/* Price trend line */}
        <path
          d={chartData.pathData}
          fill="none"
          stroke={trendColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.8}
        />
        
        {/* Data points */}
        {chartData.points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={1}
            fill={trendColor}
            opacity={0.7}
          />
        ))}
        
        {/* Current price indicator */}
        {showCurrentPrice && currentPrice !== undefined && (
          <g>
            <line
              x1={2}
              y1={height - 2}
              x2={width - 2}
              y2={height - 2}
              stroke={trendColor}
              strokeWidth={0.5}
              strokeDasharray="2,2"
              opacity={0.5}
            />
          </g>
        )}
      </svg>
      
      {/* Trend indicator */}
      <div
        style={{
          position: 'absolute',
          top: '-2px',
          right: '-2px',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: trendColor,
          opacity: 0.8,
          fontSize: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold'
        }}
      >
        {chartData.trend === 'up' && '↑'}
        {chartData.trend === 'down' && '↓'}
        {chartData.trend === 'flat' && '→'}
      </div>
    </div>
  )
})

PriceTrendMini.displayName = 'PriceTrendMini'

export default PriceTrendMini