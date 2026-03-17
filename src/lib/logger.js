import { supabase } from './supabase'

class OrderLogger {
  // Логирование создания заказа
  async logOrderCreated(orderId, orderData, userId) {
    try {
      console.log('📝 Логируем создание заказа:', { orderId, userId })

      const { data, error } = await supabase
        .from('order_history')
        .insert([{
          order_id: orderId,
          action_type: 'created',
          field_name: 'order',
          new_value: `Заказ на сумму ${orderData.total_amount} ₽`,
          changed_by: userId,
          metadata: {
            total_amount: orderData.total_amount,
            items_count: orderData.items_count || 0,
            customer_name: orderData.customer_name,
            delivery_address: orderData.delivery_address
          }
        }])
        .select()

      if (error) {
        console.error('❌ Ошибка логирования создания:', error)
      } else {
        console.log('✅ История создания записана:', data)
      }
    } catch (error) {
      console.error('❌ Ошибка логирования создания:', error)
    }
  }

  // Логирование изменения статуса
  async logStatusChanged(orderId, oldStatus, newStatus, userId) {
    try {
      console.log('📝 Логируем изменение статуса:', { orderId, oldStatus, newStatus, userId })

      const { data, error } = await supabase
        .from('order_history')
        .insert([{
          order_id: orderId,
          action_type: 'status_changed',
          field_name: 'status',
          old_value: oldStatus,
          new_value: newStatus,
          changed_by: userId
        }])
        .select()

      if (error) {
        console.error('❌ Ошибка логирования статуса:', error)
      } else {
        console.log('✅ История статуса записана:', data)
      }
    } catch (error) {
      console.error('❌ Ошибка логирования статуса:', error)
    }
  }

  // Логирование добавления товара
  async logItemAdded(orderId, item, userId) {
    try {
      console.log('📝 Логируем добавление товара:', { orderId, item, userId })

      const { data, error } = await supabase
        .from('order_history')
        .insert([{
          order_id: orderId,
          action_type: 'item_added',
          field_name: 'item',
          new_value: JSON.stringify(item),
          changed_by: userId,
          metadata: {
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price
          }
        }])
        .select()

      if (error) {
        console.error('❌ Ошибка логирования добавления товара:', error)
      } else {
        console.log('✅ История добавления товара записана:', data)
      }
    } catch (error) {
      console.error('❌ Ошибка логирования добавления товара:', error)
    }
  }

  // Логирование удаления товара
  async logItemRemoved(orderId, item, userId) {
    try {
      console.log('📝 Логируем удаление товара:', { orderId, item, userId })

      const { data, error } = await supabase
        .from('order_history')
        .insert([{
          order_id: orderId,
          action_type: 'item_removed',
          field_name: 'item',
          old_value: JSON.stringify(item),
          changed_by: userId,
          metadata: {
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price
          }
        }])
        .select()

      if (error) {
        console.error('❌ Ошибка логирования удаления товара:', error)
      } else {
        console.log('✅ История удаления товара записана:', data)
      }
    } catch (error) {
      console.error('❌ Ошибка логирования удаления товара:', error)
    }
  }

  // Логирование обновления заказа
  async logOrderUpdated(orderId, changes, userId) {
    try {
      console.log('📝 Логируем обновление заказа:', { orderId, changes, userId })

      const historyEntries = Object.entries(changes).map(([field, value]) => ({
        order_id: orderId,
        action_type: 'updated',
        field_name: field,
        old_value: String(value.old),
        new_value: String(value.new),
        changed_by: userId
      }))

      if (historyEntries.length > 0) {
        const { data, error } = await supabase
          .from('order_history')
          .insert(historyEntries)
          .select()

        if (error) {
          console.error('❌ Ошибка логирования обновления:', error)
        } else {
          console.log('✅ История обновления записана:', data)
        }
      }
    } catch (error) {
      console.error('❌ Ошибка логирования обновления:', error)
    }
  }

  // Получение истории заказа
  async getOrderHistory(orderId) {
    try {
      console.log('📥 Запрашиваем историю для заказа:', orderId)

      const { data, error } = await supabase
        .from('order_history')
        .select(`
          *,
          changed_by:profiles(full_name)
        `)
        .eq('order_id', orderId)
        .order('changed_at', { ascending: false })

      if (error) {
        console.error('❌ Ошибка получения истории:', error)
        return []
      }

      console.log('✅ Получена история:', data)
      return data || []
    } catch (error) {
      console.error('❌ Ошибка получения истории:', error)
      return []
    }
  }

  async logCourierAssigned(orderId, oldCourierId, newCourierId, userId) {
    try {
      console.log('📝 Логируем назначение курьера:', { orderId, oldCourierId, newCourierId, userId })

      const { data, error } = await supabase
        .from('order_history')
        .insert([{
          order_id: orderId,
          action_type: 'courier_assigned',
          field_name: 'courier_id',
          old_value: oldCourierId,
          new_value: newCourierId,
          changed_by: userId,
          metadata: {
            old_courier: oldCourierId,
            new_courier: newCourierId
          }
        }])
        .select()

      if (error) {
        console.error('❌ Ошибка логирования назначения курьера:', error)
      } else {
        console.log('✅ История назначения курьера записана:', data)
      }
    } catch (error) {
      console.error('❌ Ошибка логирования назначения курьера:', error)
    }
  }

  async logDeliveryConfirmed(orderId, method, userId) {
    try {
      await supabase
        .from('order_history')
        .insert([{
          order_id: orderId,
          action_type: 'delivery_confirmed',
          field_name: 'confirmation',
          new_value: method,
          changed_by: userId,
          metadata: {
            method: method,
            confirmed_at: new Date().toISOString()
          }
        }])
    } catch (error) {
      console.error('Ошибка логирования подтверждения:', error)
    }
  }
}

export const orderLogger = new OrderLogger()