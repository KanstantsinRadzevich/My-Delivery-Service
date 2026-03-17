import { useState, useEffect } from 'react'
import { orderLogger } from '../lib/logger'

export default function OrderHistory({ orderId, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [orderId])

  async function loadHistory() {
    setLoading(true)
    const data = await orderLogger.getOrderHistory(orderId)
    setHistory(data)
    setLoading(false)
  }

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActionIcon = (action) => {
    switch (action) {
      case 'created': return '🆕'
      case 'updated': return '✏️'
      case 'status_changed': return '🔄'
      case 'item_added': return '➕'
      case 'item_removed': return '➖'
      case 'courier_assigned': return '👤'
      default: return '📝'
    }
  }

  const getActionText = (entry) => {
    switch (entry.action_type) {
      case 'created':
        return '🆕 Заказ создан'
      case 'status_changed':
        return `🔄 Статус изменён: ${entry.old_value || '?'} → ${entry.new_value || '?'}`
      case 'item_added':
        return `➕ Добавлен товар`
      case 'item_removed':
        return `➖ Удалён товар`
      case 'updated':
        return `✏️ Изменено поле: ${entry.field_name || '?'}`
      case 'courier_assigned':
        return `👤 Назначен курьер`
      default:
        return '📝 Действие с заказом'
    }
  }

  const renderMetadata = (entry) => {
    if (!entry.metadata) return null

    const metadata = entry.metadata

    // Для создания заказа
    if (entry.action_type === 'created') {
      return (
        <div style={styles.metadata}>
          <div style={styles.metadataItem}>
            <span style={styles.metadataLabel}>Сумма заказа:</span>
            <span style={styles.metadataValue}>{metadata.total_amount} ₽</span>
          </div>
          <div style={styles.metadataItem}>
            <span style={styles.metadataLabel}>Количество товаров:</span>
            <span style={styles.metadataValue}>{metadata.items_count}</span>
          </div>
        </div>
      )
    }

    // Для добавления/удаления товара
    if (entry.action_type === 'item_added' || entry.action_type === 'item_removed') {
      return (
        <div style={styles.metadata}>
          <div style={styles.metadataItem}>
            <span style={styles.metadataLabel}>Товар:</span>
            <span style={styles.metadataValue}>{metadata.product_name}</span>
          </div>
          <div style={styles.metadataRow}>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>Кол-во:</span>
              <span style={styles.metadataValue}>{metadata.quantity} шт.</span>
            </div>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>Цена:</span>
              <span style={styles.metadataValue}>{metadata.price} ₽</span>
            </div>
          </div>
        </div>
      )
    }

    // Для изменения статуса
    if (entry.action_type === 'status_changed') {
      return (
        <div style={styles.metadata}>
          <div style={styles.metadataRow}>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>Было:</span>
              <span style={styles.metadataValue}>{entry.old_value}</span>
            </div>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>Стало:</span>
              <span style={styles.metadataValue}>{entry.new_value}</span>
            </div>
          </div>
        </div>
      )
    }

    // Для обновления полей
    if (entry.action_type === 'updated') {
      return (
        <div style={styles.metadata}>
          <div style={styles.metadataRow}>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>Поле:</span>
              <span style={styles.metadataValue}>{entry.field_name}</span>
            </div>
          </div>
          <div style={styles.metadataRow}>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>Было:</span>
              <span style={styles.metadataValue}>{entry.old_value}</span>
            </div>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>Стало:</span>
              <span style={styles.metadataValue}>{entry.new_value}</span>
            </div>
          </div>
        </div>
      )
    }

    if (entry.action_type === 'courier_assigned') {
      return (
        <div style={styles.metadata}>
          <div style={styles.metadataItem}>
            <span style={styles.metadataLabel}>Курьер:</span>
            <span style={styles.metadataValue}>
              {entry.new_value ? 'Назначен' : 'Снят'}
            </span>
          </div>
        </div>
      )
    }

    return null
  }

  const getUserName = (entry) => {
    if (!entry.changed_by) return 'Система'
    return entry.changed_by.full_name || 'Пользователь'
  }

  if (loading) return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>📋 История изменений</h3>
        <button onClick={onClose} style={styles.closeButton}>✕</button>
      </div>
      <div style={styles.loading}>Загрузка истории...</div>
    </div>
  )

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>📋 История изменений</h3>
        <button onClick={onClose} style={styles.closeButton}>✕</button>
      </div>

      {history.length === 0 ? (
        <p style={styles.empty}>История пуста</p>
      ) : (
        <div style={styles.timeline}>
          {history.map((entry, index) => (
            <div key={entry.id} style={styles.entry}>
              <div style={styles.entryIcon}>{getActionIcon(entry.action_type)}</div>
              <div style={styles.entryContent}>
                <div style={styles.entryHeader}>
                  <span style={styles.entryAction}>{getActionText(entry)}</span>
                  <span style={styles.entryTime}>{formatDateTime(entry.changed_at)}</span>
                </div>
                <div style={styles.entryUser}>
                  👤 {getUserName(entry)}
                </div>
                {renderMetadata(entry)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    maxHeight: '600px',
    overflow: 'auto',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '2px solid #f0f0f0'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    color: '#333',
    fontWeight: '600'
  },
  closeButton: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#666',
    borderRadius: '8px',
    ':hover': {
      backgroundColor: '#f5f5f5'
    }
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  entry: {
    display: 'flex',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '10px',
    transition: 'transform 0.2s',
    border: '1px solid #eee',
    ':hover': {
      transform: 'translateX(4px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
    }
  },
  entryIcon: {
    fontSize: '24px',
    minWidth: '40px',
    height: '40px',
    backgroundColor: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  entryContent: {
    flex: 1
  },
  entryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  entryAction: {
    fontWeight: '600',
    color: '#333',
    fontSize: '16px'
  },
  entryTime: {
    fontSize: '13px',
    color: '#999',
    backgroundColor: 'white',
    padding: '4px 8px',
    borderRadius: '20px'
  },
  entryUser: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  metadata: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '8px',
    border: '1px solid #e0e0e0'
  },
  metadataRow: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap'
  },
  metadataItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  metadataLabel: {
    fontSize: '12px',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  metadataValue: {
    fontSize: '14px',
    color: '#333',
    fontWeight: '500',
    backgroundColor: '#f5f5f5',
    padding: '2px 8px',
    borderRadius: '12px'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    fontSize: '16px'
  },
  empty: {
    textAlign: 'center',
    padding: '60px 40px',
    color: '#999',
    fontStyle: 'italic',
    fontSize: '16px',
    backgroundColor: '#fafafa',
    borderRadius: '8px'
  }
}