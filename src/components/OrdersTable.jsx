import { useState, useEffect, Fragment } from 'react'
import { supabase } from '../lib/supabase'
import OrderDetails from './OrderDetails'

export default function OrdersTable() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [orderItems, setOrderItems] = useState({})
  const [loadingItems, setLoadingItems] = useState({})
  const [couriersMap, setCouriersMap] = useState({})
  const [filterCourier, setFilterCourier] = useState('')


  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    fetchOrders()
    loadCouriers()
  }, [])

  async function fetchOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Ошибка загрузки заказов:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadCouriers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'courier')

      if (error) throw error

      const map = {}
      data.forEach(c => map[c.id] = c.full_name)
      setCouriersMap(map)
    } catch (error) {
      console.error('Ошибка загрузки курьеров:', error)
    }
  }

  const getCourierName = (courierId) => {
    if (!courierId) return '—'
    return couriersMap[courierId] || '—'
  }

  async function fetchOrderItems(orderId) {
    if (orderItems[orderId] || loadingItems[orderId]) return

    setLoadingItems(prev => ({ ...prev, [orderId]: true }))

    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)

      if (error) throw error

      setOrderItems(prev => ({ ...prev, [orderId]: data || [] }))
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error)
    } finally {
      setLoadingItems(prev => ({ ...prev, [orderId]: false }))
    }
  }

  const toggleOrder = (orderId) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null)
    } else {
      setExpandedOrder(orderId)
      fetchOrderItems(orderId)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': return '#4caf50'
      case 'in_delivery': return '#ff9800'
      case 'new': return '#2196f3'
      case 'cancelled': return '#f44336'
      default: return '#999'
    }
  }

  const formatDate = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatTime = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateTime = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCourierStyle = (courierId) => {
    if (!courierId) {
      return {
        fontSize: '12px',
        color: '#999',
        fontStyle: 'italic'
      }
    }
    return {
      fontSize: '13px',
      color: '#2c3e50',
      fontWeight: '500'
    }
  }

  const filteredOrders = orders.filter(order => {
    console.log(order.courier_id, filterCourier)
    if (!filterCourier) return true
    if (filterCourier === 'unassigned') return !order.courier_id
    return order.courier_id === filterCourier
  })

  const orderStatus = {
    new: 'Новый',
    in_delivery: 'В работе',
    delivered: 'Доставлен',
    cancelled: 'Отменен'
  }

  if (loading) return <div style={styles.loading}>Загрузка заказов для курьера...</div>

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Активные доставки</h2>

      <div style={styles.filterCourier}>
        <select
          value={filterCourier}
          onChange={(e) => setFilterCourier(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">Все курьеры</option>
          <option value="unassigned">Не назначены</option>
          {Object.entries(couriersMap).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID заказа</th>
            <th style={styles.th}>Покупатель</th>
            <th style={styles.th}>Адрес</th>
            <th style={styles.th}>Телефон</th>
            <th style={styles.th}>Сумма</th>
            <th style={styles.th}>Статус</th>
            <th style={styles.th}>Курьер</th>
            <th style={styles.th}>Создан</th>
            <th style={styles.th}>Доставка</th>
            <th style={styles.th}>Товары</th>
            <th style={styles.th}></th>
          </tr>
        </thead>
        <tbody>
          {      filteredOrders.map(order => (
            <Fragment key={order.id}>
              <tr
                style={styles.row}
                onClick={() => toggleOrder(order.id)}
              >
                <td style={styles.td}>
                  <strong>#{order.order_id}</strong>
                </td>
                <td style={styles.td}>{order.customer_name}</td>
                <td style={styles.td}>{order.delivery_address}</td>
                <td style={styles.td}>{order.contact_phone}</td>
                <td style={styles.td}>{order.total_amount} </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.status,
                    backgroundColor: getStatusColor(order.status),
                    color: 'white'
                  }}>
                    {orderStatus[order.status] || order.status}
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={getCourierStyle(order.courier_id)}>
                    {getCourierName(order.courier_id)}
                  </span>
                </td>
                <td style={styles.td}>
                  <div style={styles.dateTime}>
                    <div style={styles.date}>
                      {formatDate(order.created_at)}
                    </div>
                    <div style={styles.time}>
                      {formatTime(order.created_at)}
                    </div>
                  </div>
                </td>
                <td style={styles.td}>
                  <div style={styles.dateTime}>
                    <div style={styles.date}>
                      {formatDate(order.delivery_date)}
                    </div>
                    {order.delivery_time_slot && (
                      <div style={styles.time}>
                        {order.delivery_time_slot}
                      </div>
                    )}
                  </div>
                </td>
                <td style={styles.td}>
                  {orderItems[order.id] ? (
                    <span style={styles.itemCount}>
                      {orderItems[order.id].length} шт.
                    </span>
                  ) : loadingItems[order.id] ? (
                    <span style={styles.loadingItems}>⏳</span>
                  ) : (
                    <span style={styles.noItems}>0</span>
                  )}
                </td>
                <td style={styles.td}>
                  <span style={styles.expandIcon}>
                    {expandedOrder === order.id ? '▼' : '▶'}
                  </span>
                </td>
              </tr>
              {expandedOrder === order.id && (
                <tr key={`details-${order.id}`}>
                  <td colSpan="10" style={styles.expandedRow}>
                    {loadingItems[order.id] ? (
                      <div style={styles.loadingItemsMessage}>Загрузка товаров...</div>
                    ) : (
                      <OrderDetails
                        order={order}
                        items={orderItems[order.id] || []}
                        onUpdate={() => {
                          fetchOrders()
                          fetchOrderItems(order.id)
                        }}
                      />
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

      {orders.length === 0 && (
        <p style={styles.empty}>Нет активных заказов</p>
      )}
    </div>
  )
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  title: {
    marginBottom: '20px',
    color: '#333',
    fontSize: '20px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #dee2e6',
    fontWeight: '600',
    fontSize: '14px'
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #dee2e6',
    fontSize: '14px'
  },
  row: {
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#f5f5f5'
    }
  },
  status: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'inline-block'
  },
  dateTime: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  date: {
    fontSize: '13px',
    color: '#333'
  },
  time: {
    fontSize: '11px',
    color: '#666'
  },
  itemCount: {
    padding: '2px 6px',
    backgroundColor: '#e7f3ff',
    color: '#0066cc',
    borderRadius: '12px',
    fontSize: '12px'
  },
  loadingItems: {
    fontSize: '14px',
    color: '#999'
  },
  noItems: {
    fontSize: '12px',
    color: '#999'
  },
  expandIcon: {
    fontSize: '14px',
    color: '#666'
  },
  expandedRow: {
    backgroundColor: '#f8f9fa',
    padding: '20px'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#666'
  },
  loadingItemsMessage: {
    textAlign: 'center',
    padding: '20px',
    color: '#666'
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '16px',
    color: '#999'
  },
  confirmedIcon: {
  marginLeft: '5px',
  fontSize: '14px'
},
filterCourier: {
  width: '100%',
  padding: '10px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  fontSize: '14px',
  backgroundColor: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end'
},
filterSelect: {
  width: '15%',
  padding: '10px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  fontSize: '14px',
  backgroundColor: 'white',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
}
}