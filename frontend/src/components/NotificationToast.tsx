import { useState, useEffect } from 'react'

interface NotificationToastProps {
  notification: {
    id: string
    type: 'success' | 'warning' | 'info' | 'error'
    title: string
    message: string
    timestamp: string
    duration: number
    read: boolean
  }
  onDismiss?: (id: string) => void
  onMarkRead?: (id: string) => void
}

const NotificationToast = ({ notification, onDismiss, onMarkRead }: NotificationToastProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  // Animation timing
  useEffect(() => {
    // Enter animation
    const enterTimer = setTimeout(() => setIsVisible(true), 50)
    
    // Auto-dismiss timer
    const dismissTimer = setTimeout(() => {
      handleDismiss()
    }, notification.duration)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(dismissTimer)
    }
  }, [notification.duration])

  // Handle dismiss with exit animation
  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      onDismiss?.(notification.id)
    }, 300) // Match exit animation duration
  }

  // Handle click to mark as read
  const handleClick = () => {
    if (!notification.read) {
      onMarkRead?.(notification.id)
    }
  }

  // Get notification colors based on type
  const getNotificationColors = () => {
    switch (notification.type) {
      case 'success':
        return {
          backgroundColor: '#d1f2eb',
          borderColor: '#bee5eb',
          textColor: '#0c5460',
          iconColor: '#28a745'
        }
      case 'error':
        return {
          backgroundColor: '#f8d7da',
          borderColor: '#f5c6cb',
          textColor: '#721c24',
          iconColor: '#dc3545'
        }
      case 'warning':
        return {
          backgroundColor: '#fff3cd',
          borderColor: '#ffeeba',
          textColor: '#856404',
          iconColor: '#ffc107'
        }
      case 'info':
      default:
        return {
          backgroundColor: '#d4f4dd',
          borderColor: '#c3e6cb',
          textColor: '#155724',
          iconColor: '#17a2b8'
        }
    }
  }

  const colors = getNotificationColors()

  // Get notification icon
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✓'
      case 'error':
        return '✕'
      case 'warning':
        return '⚠'
      case 'info':
      default:
        return 'ℹ'
    }
  }

  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const baseStyle: React.CSSProperties = {
    position: 'relative',
    width: '320px',
    minHeight: '80px',
    maxHeight: '120px',
    marginBottom: '12px',
    padding: '14px 16px',
    backgroundColor: colors.backgroundColor,
    border: `1px solid ${colors.borderColor}`,
    borderRadius: '6px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    overflow: 'hidden',
    transform: isExiting 
      ? 'translateX(100%) scale(0.95)' 
      : isVisible 
        ? 'translateX(0) scale(1)' 
        : 'translateX(100%) scale(0.95)',
    opacity: isExiting ? 0 : isVisible ? 1 : 0,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'inherit'
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '8px'
  }

  const iconStyle: React.CSSProperties = {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: colors.iconColor,
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    flexShrink: 0,
    marginRight: '12px'
  }

  const contentStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 'bold',
    color: colors.textColor,
    margin: '0 0 4px 0',
    lineHeight: '1.2',
    wordBreak: 'break-word'
  }

  const messageStyle: React.CSSProperties = {
    fontSize: '13px',
    color: colors.textColor,
    margin: 0,
    lineHeight: '1.3',
    opacity: 0.9,
    wordBreak: 'break-word',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  }

  const timeStyle: React.CSSProperties = {
    fontSize: '11px',
    color: colors.textColor,
    opacity: 0.7,
    marginTop: '6px'
  }

  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '20px',
    height: '20px',
    border: 'none',
    backgroundColor: 'transparent',
    color: colors.textColor,
    cursor: 'pointer',
    fontSize: '14px',
    opacity: 0.6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    padding: 0
  }

  const readIndicatorStyle: React.CSSProperties = {
    position: 'absolute',
    left: '0',
    top: '0',
    bottom: '0',
    width: '3px',
    backgroundColor: notification.read ? 'transparent' : colors.iconColor,
    transition: 'background-color 0.2s ease'
  }

  return (
    <div 
      style={baseStyle} 
      onClick={handleClick}
      role="alert"
      aria-live="polite"
    >
      {/* Read indicator */}
      <div style={readIndicatorStyle} />
      
      {/* Close button */}
      <button
        style={closeButtonStyle}
        onClick={(e) => {
          e.stopPropagation()
          handleDismiss()
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.opacity = '1'
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.opacity = '0.6'
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
        aria-label="Fechar notificação"
      >
        ×
      </button>

      {/* Content */}
      <div style={headerStyle}>
        <div style={iconStyle}>
          {getIcon()}
        </div>
        <div style={contentStyle}>
          <h4 style={titleStyle}>{notification.title}</h4>
          <p style={messageStyle}>{notification.message}</p>
          <div style={timeStyle}>
            {formatTime(notification.timestamp)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotificationToast