import React, { useState, useEffect, memo } from 'react'

interface CountdownTimerProps {
  deadline: string | Date
  onExpired?: () => void
  onWarning?: (hoursRemaining: number) => void
  warningThresholds?: {
    critical: number  // hours
    warning: number   // hours
  }
  size?: 'small' | 'medium' | 'large'
  showIcon?: boolean
  className?: string
}

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
  isExpired: boolean
  urgencyLevel: 'normal' | 'warning' | 'critical' | 'expired'
}

const CountdownTimer = memo<CountdownTimerProps>(({
  deadline,
  onExpired,
  onWarning,
  warningThresholds = { critical: 2, warning: 24 },
  size = 'medium',
  showIcon = true,
  className
}) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
    isExpired: false,
    urgencyLevel: 'normal'
  })

  // Calculate time remaining
  const calculateTimeRemaining = (): TimeRemaining => {
    const deadlineTime = new Date(deadline).getTime()
    const now = new Date().getTime()
    const difference = deadlineTime - now

    if (difference <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isExpired: true,
        urgencyLevel: 'expired'
      }
    }

    const totalSeconds = Math.floor(difference / 1000)
    const days = Math.floor(difference / (1000 * 60 * 60 * 24))
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((difference % (1000 * 60)) / 1000)

    // Calculate urgency level based on total hours remaining
    const totalHours = totalSeconds / 3600
    let urgencyLevel: 'normal' | 'warning' | 'critical' | 'expired' = 'normal'
    
    if (totalHours <= warningThresholds.critical) {
      urgencyLevel = 'critical'
    } else if (totalHours <= warningThresholds.warning) {
      urgencyLevel = 'warning'
    }

    return {
      days,
      hours,
      minutes,
      seconds,
      totalSeconds,
      isExpired: false,
      urgencyLevel
    }
  }

  // Update timer every second
  useEffect(() => {
    const updateTimer = () => {
      const newTimeRemaining = calculateTimeRemaining()
      setTimeRemaining(prevTime => {
        // Trigger callbacks if state changed
        if (newTimeRemaining.isExpired && !prevTime.isExpired && onExpired) {
          onExpired()
        }
        
        if (newTimeRemaining.urgencyLevel !== prevTime.urgencyLevel && onWarning) {
          const totalHours = Math.floor(newTimeRemaining.totalSeconds / 3600)
          onWarning(totalHours)
        }

        return newTimeRemaining
      })
    }

    // Initial calculation
    updateTimer()

    // Set up interval for updates
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [deadline, onExpired, onWarning, warningThresholds])

  // Get urgency colors and styles
  const getUrgencyStyle = () => {
    switch (timeRemaining.urgencyLevel) {
      case 'critical':
        return {
          backgroundColor: '#f8d7da',
          borderColor: '#dc3545',
          textColor: '#721c24',
          iconColor: '#dc3545'
        }
      case 'warning':
        return {
          backgroundColor: '#fff3cd',
          borderColor: '#ffc107',
          textColor: '#856404',
          iconColor: '#ffc107'
        }
      case 'expired':
        return {
          backgroundColor: '#f8d7da',
          borderColor: '#dc3545',
          textColor: '#721c24',
          iconColor: '#dc3545'
        }
      default:
        return {
          backgroundColor: '#d1f2eb',
          borderColor: '#28a745',
          textColor: '#0c5460',
          iconColor: '#28a745'
        }
    }
  }

  // Get size styles
  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return {
          fontSize: '11px',
          padding: '4px 6px',
          height: '20px'
        }
      case 'large':
        return {
          fontSize: '16px',
          padding: '12px 16px',
          height: '40px'
        }
      default:
        return {
          fontSize: '13px',
          padding: '6px 10px',
          height: '28px'
        }
    }
  }

  // Format time display
  const formatTime = () => {
    if (timeRemaining.isExpired) {
      return 'EXPIRADO'
    }

    const { days, hours, minutes, seconds } = timeRemaining

    // Show different formats based on time remaining
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  // Get icon based on urgency
  const getIcon = () => {
    if (timeRemaining.isExpired) {
      return '⏰'
    }
    
    switch (timeRemaining.urgencyLevel) {
      case 'critical':
        return '🚨'
      case 'warning':
        return '⚠️'
      default:
        return '⏱️'
    }
  }

  // Get pulse animation for critical state
  const getPulseAnimation = () => {
    if (timeRemaining.urgencyLevel === 'critical' || timeRemaining.isExpired) {
      return {
        animation: 'pulse 2s infinite'
      }
    }
    return {}
  }

  const urgencyStyle = getUrgencyStyle()
  const sizeStyle = getSizeStyle()

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: urgencyStyle.backgroundColor,
    border: `1px solid ${urgencyStyle.borderColor}`,
    borderRadius: '4px',
    color: urgencyStyle.textColor,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    whiteSpace: 'nowrap',
    ...sizeStyle,
    ...getPulseAnimation()
  }

  const iconStyle: React.CSSProperties = {
    marginRight: showIcon ? '6px' : '0',
    fontSize: sizeStyle.fontSize,
    display: showIcon ? 'inline' : 'none'
  }

  // Add CSS animation styles to document if not already present
  useEffect(() => {
    const styleId = 'countdown-timer-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  return (
    <div
      className={className}
      style={containerStyle}
      title={`Prazo: ${new Date(deadline).toLocaleString('pt-BR')}`}
      role="timer"
      aria-label={`Tempo restante: ${formatTime()}`}
    >
      {showIcon && (
        <span style={iconStyle} role="img" aria-hidden="true">
          {getIcon()}
        </span>
      )}
      <span>{formatTime()}</span>
    </div>
  )
})

CountdownTimer.displayName = 'CountdownTimer'

export default CountdownTimer