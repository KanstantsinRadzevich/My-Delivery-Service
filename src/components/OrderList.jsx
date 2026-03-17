import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function OrderList() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
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
      console.error('Ошибка загрузки:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={styles.loading}>Загрузка заказов...</div>

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Список заказов</h2>
      {orders.length === 0 ? (
        <p style={styles.empty}>Нет заказов. Создайте первый заказ!</p>
      ) : (
        <div style={styles.grid}>
          {orders.map(order => (
            <div key={order.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.orderId}>#{order.order_id}</span>
                <span style={getStatusStyle(order.status)}>{order.status}</span>
              </div>
              <div style={styles.cardBody}>
                <p><strong>Товар:</strong> {order.product_name}</p>
                <p><strong>Покупатель:</strong> {order.customer_name}</p>
                <p><strong>Адрес:</strong> {order.delivery_address}</p>
                <p><strong>Телефон:</strong> {order.contact_phone}</p>
                <p><strong>Сумма:</strong> {order.total_amount} ₽</p>
                <p><strong>Дата:</strong> {new Date(order.delivery_date).toLocaleDateString('ru-RU')}</p>
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
    padding: '20px'
  },
  title: {
    marginBottom: '20px',
    color: '#333'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#666'
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '16px',
    color: '#999',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  card: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer'
  },
  cardHeader: {
    padding: '12px 16px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  orderId: {
    fontWeight: 'bold',
    color: '#007bff',
    fontSize: '16px'
  },
  cardBody: {
    padding: '16px'
  }
}

function getStatusStyle(status) {
  const baseStyle = {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  }
  
  switch(status) {
    case 'delivered':
      return { ...baseStyle, backgroundColor: '#d4edda', color: '#155724' }
    case 'in_delivery':
      return { ...baseStyle, backgroundColor: '#fff3cd', color: '#856404' }
    case 'new':
      return { ...baseStyle, backgroundColor: '#cce5ff', color: '#004085' }
    case 'cancelled':
      return { ...baseStyle, backgroundColor: '#f8d7da', color: '#721c24' }
    default:
      return { ...baseStyle, backgroundColor: '#e2e3e5', color: '#383d41' }
  }
}