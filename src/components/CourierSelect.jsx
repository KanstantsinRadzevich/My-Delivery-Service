import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function CourierSelect({ value, onChange, disabled = false }) {
  const [couriers, setCouriers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCouriers()
  }, [])

  async function fetchCouriers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .eq('role', 'courier')
        .order('full_name')

      if (error) throw error
      setCouriers(data || [])
    } catch (error) {
      console.error('Ошибка загрузки курьеров:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <select style={styles.select} disabled><option>Загрузка курьеров...</option></select>

  return (
    <select 
      value={value || ''} 
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={styles.select}
    >
      <option value="">— Не назначен —</option>
      {couriers.map(courier => (
        <option key={courier.id} value={courier.id}>
          {courier.full_name} {courier.phone ? `(${courier.phone})` : ''}
        </option>
      ))}
    </select>
  )
}

const styles = {
  select: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white'
  }
}