import { orderLogger } from '../lib/logger'
import { getCurrentUser } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { useState, useEffect } from 'react'
import OrderHistory from './OrderHistory'
import CourierSelect from './CourierSelect'
import CourierConfirmation from './CourierConfirmation'
import './Button.css'

export default function OrderDetails({ order, items, onUpdate }) {
    const [editing, setEditing] = useState(false)
    const [editedOrder, setEditedOrder] = useState(order)
    const [editedItems, setEditedItems] = useState(items)
    const [newItem, setNewItem] = useState({
        product_name: '',
        product_code: '',
        quantity: 1,
        price: 0
    })
    const [showHistory, setShowHistory] = useState(false)
    const [couriersMap, setCouriersMap] = useState({})
    const [showConfirmation, setShowConfirmation] = useState(false)
    const [user, setUser] = useState(null) // Initialize user
    const [userRole, setUserRole] = useState(null)
  
    
    useEffect(() => {
        loadCouriers()
    }, [])

    async function loadUser() {
        try {
            const user = await getCurrentUser()
            setUser(user)
        } catch (error) {
            console.error('Ошибка загрузки пользователя:', error)
        }
    }

    useEffect(() => {
        loadUser()
    }, [])

    useEffect(() => {
        if (user) {
            getUserRole()
        }
    }, [user])

    async function getUserRole() {
        try {
            console.log("user", user.id)
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)

            if (error) throw error
            setUserRole(data[0].role)
            console.log("userRole", data[0].role)
        } catch (error) {
            console.error('Ошибка загрузки пользователя:', error)
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
        if (!courierId) return 'Не назначен'
        return couriersMap[courierId] || 'Неизвестный курьер'
    }

    const calculateTotal = (items) => {
        if (order.prepaid_amount > 0) return items.reduce((sum, item) => sum + (item.quantity * item.price), 0) - order.prepaid_amount
        return items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    }

    //Если изменился курьер Не назначен, то Изменить статус
    useEffect(() => {
        if (editedOrder.courier_id !== order.courier_id) {
            setEditedOrder({ ...editedOrder, status: 'in_delivery' })
        }
    }, [editedOrder.courier_id])



    
    const handleSave = async () => {
        try {
            
            // const user = await getCurrentUser()
            const changes = {}

            // Сравниваем поля заказа
            if (editedOrder.customer_name !== order.customer_name) {
                changes.customer_name = { old: order.customer_name, new: editedOrder.customer_name }
            }
            if (editedOrder.delivery_address !== order.delivery_address) {
                changes.delivery_address = { old: order.delivery_address, new: editedOrder.delivery_address }
            }
            if (editedOrder.status !== order.status) {
                // Специальное логирование для статуса
                const user = await supabase.auth.getUser()
                await orderLogger.logStatusChanged(
                    order.id,
                    order.status,
                    editedOrder.status,
                    user.data?.user?.id
                )
            }

            // Обновляем основной заказ
            const totalAmount = calculateTotal(editedItems)

            const { error: orderError } = await supabase
                .from('orders')
                .update({
                    ...editedOrder,
                    total_amount: totalAmount
                })
                .eq('id', order.id)

            if (orderError) throw orderError

            // Логируем остальные изменения
            if (Object.keys(changes).length > 0) {
                await orderLogger.logOrderUpdated(order.id, changes, user?.id)
            }

            // Обновляем товары (удаляем старые и добавляем новые)
            const { error: deleteError } = await supabase
                .from('order_items')
                .delete()
                .eq('order_id', order.id)

            if (deleteError) throw deleteError

            if (editedItems.length > 0) {
                const { error: insertError } = await supabase
                    .from('order_items')
                    .insert(editedItems.map(item => ({
                        order_id: order.id,
                        product_name: item.product_name,
                        product_code: item.product_code,
                        quantity: item.quantity,
                        price: item.price
                    })))

                if (insertError) throw insertError
            }

            setEditing(false)
            onUpdate()
            alert('✅ Заказ обновлен')
        } catch (error) {
            console.error('Ошибка обновления:', error)
            alert('❌ Ошибка: ' + error.message)
        }
    }

    const addItem = () => {
        if (!newItem.product_name || !newItem.price) {
            alert('Заполните название товара и цену')
            return
        }
        setEditedItems([...editedItems, { ...newItem, id: Date.now() }])
        setNewItem({ product_name: '', product_code: '', quantity: 1, price: 0 })
    }

    const removeItem = (index) => {
        setEditedItems(editedItems.filter((_, i) => i !== index))
    }

    const handleDelete = async () => {
        try {
            const { error } = await supabase
                .from('orders')
                .delete()
                .eq('id', order.id)

            if (error) throw error

            onUpdate()
            alert('✅ Заказ удален')
        } catch (error) {
            console.error('Ошибка удаления:', error)
            alert('❌ Ошибка: ' + error.message)
        }
    }

    const updateItem = (index, field, value) => {
        const updated = [...editedItems]
        updated[index][field] = field === 'quantity' || field === 'price' ? parseFloat(value) || 0 : value
        setEditedItems(updated)
    }

    //Поле статус доставки заполнять на русском не как в базе
    const statuses = {
        'new': 'Новый',
        'in_delivery': 'В работе',
        'delivered': 'Доставлен',
        'cancelled': 'Отменен'
    };

    const paymentMethods = {
        'cash': 'Наличные',
        'card': 'Карта'
    };

    console.log("userRole", userRole)


    if (!editing) {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h3 style={styles.sectionTitle}>Детали заказа</h3>
                    <button onClick={() => setEditing(true)} style={styles.editButton}>
                        ✏️ Редактировать
                    </button>
                </div>

                <div style={styles.infoGrid}>
                    <div style={styles.infoItem}>
                        <strong>Покупатель:</strong> {order.customer_name}
                    </div>
                    <div style={styles.infoItem}>
                        <strong>Телефон:</strong> {order.contact_phone}
                    </div>
                    <div style={styles.infoItem}>
                        <strong>Адрес:</strong> {order.delivery_address}
                    </div>
                    <div style={styles.infoItem}>
                        <strong>Дата и время доставки:</strong>
                        {new Date(order.delivery_date).toLocaleDateString('ru-RU')} с {order.delivery_time_slot}
                    </div>
                    <div style={styles.infoItem}>
                        <strong>Статус доставки:</strong> {statuses[order.status] || order.status}
                    </div>
                    <div style={styles.infoItem}>
                        <strong>Курьер:</strong> {getCourierName(order.courier_id)}
                    </div>
                    <div style={styles.infoItem}>
                        <strong>Способ оплаты:</strong> {paymentMethods[order.payment_method] || order.payment_method}
                    </div>
                </div>

                <h4 style={styles.subtitle}>Товары в заказе:</h4>
                <table style={styles.itemsTable}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Товар</th>
                            <th style={styles.th}>Код</th>
                            <th style={styles.th}>Кол-во</th>
                            <th style={styles.th}>Цена</th>
                            <th style={styles.th}>Сумма</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index}>
                                <td style={styles.td}>{item.product_name}</td>
                                <td style={styles.td}>{item.product_code}</td>
                                <td style={styles.td}>{item.quantity}</td>
                                <td style={styles.td}>{item.price} руб</td>
                                <td style={styles.td}>{item.quantity * item.price} руб</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan="4" style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>Сумма предоплаты:</td>
                            <td style={{ ...styles.td, fontWeight: 'bold' }}>{order.prepaid_amount} руб</td>

                        </tr>
                        <tr>
                            <td colSpan="4" style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>Итого с учетом предоплаты:</td>
                            <td style={{ ...styles.td, fontWeight: 'bold' }}>{calculateTotal(items)} руб</td>
                        </tr>
                    </tfoot>
                </table>

                {order.notes && (
                    <div style={styles.notes}>
                        <strong>Примечание:</strong> {order.notes}
                    </div>
                )}
            </div>
        )
    }
 
    return (

        <div style={styles.container}>
            {order.status === 'in_delivery' && userRole === 'courier' && (
                <button
                    onClick={() => setShowConfirmation(!showConfirmation)}
                    style={styles.confirmButton}
                >
                    {showConfirmation ? '✕ Скрыть' : '✅ Подтвердить получение'}
                </button>
            )}

            {showConfirmation && (
                <CourierConfirmation
                    order={order}
                    onConfirmed={() => {
                        setShowConfirmation(false)
                        onUpdate()
                    }}
                />
            )}


            <div style={styles.header}>
                <h3 style={styles.sectionTitle}>Редактирование заказа</h3>

            </div>

            <div style={styles.editForm}>
                <div style={styles.row}>
                    <div style={styles.field}>
                        <label>Покупатель</label>
                        <input
                            type="text"
                            value={editedOrder.customer_name}
                            onChange={(e) => setEditedOrder({ ...editedOrder, customer_name: e.target.value })}
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.field}>
                        <label>Телефон</label>
                        <input
                            type="text"
                            value={editedOrder.contact_phone}
                            onChange={(e) => setEditedOrder({ ...editedOrder, contact_phone: e.target.value })}
                            style={styles.input}
                        />
                    </div>
                </div>

                <div style={styles.field}>
                    <label>Адрес</label>
                    <input
                        type="text"
                        value={editedOrder.delivery_address}
                        onChange={(e) => setEditedOrder({ ...editedOrder, delivery_address: e.target.value })}
                        style={styles.input}
                    />
                </div>

                <div style={styles.row}>
                    <div style={styles.field}>
                        <label>Дата доставки</label>
                        <input
                            type="date"
                            value={editedOrder.delivery_date}
                            onChange={(e) => setEditedOrder({ ...editedOrder, delivery_date: e.target.value })}
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.field}>
                        <label>Время доставки</label>
                        <select
                            value={editedOrder.delivery_time_slot}
                            onChange={(e) => setOrderData({ ...editedOrder, delivery_time_slot: e.target.value })}
                            style={styles.input}
                        >
                            <option value="09:00-12:00">09:00 - 12:00</option>
                            <option value="12:00-15:00">12:00 - 15:00</option>
                            <option value="15:00-18:00">15:00 - 18:00</option>
                            <option value="18:00-21:00">18:00 - 21:00</option>
                        </select>
                    </div>

                    <div style={styles.field}>
                        <label>Статус</label>
                        <select
                            value={editedOrder.status}
                            onChange={(e) => setEditedOrder({ ...editedOrder, status: e.target.value })}
                            style={styles.input}
                        >
                            <option value="new">Новый</option>
                            <option value="assigned">Назначен</option>
                            <option value="in_delivery">В доставке</option>
                            <option value="delivered">Доставлен</option>
                            <option value="cancelled">Отменен</option>
                        </select>
                    </div>
                    <div style={styles.field}>
                        <label>Курьер</label>
                        <CourierSelect
                            value={editedOrder.courier_id}
                            onChange={(value) => setEditedOrder({ ...editedOrder, courier_id: value })}
                        />
                    </div>
                    <div style={styles.field}>
                        <label>Сумма предоплаты, руб</label>
                        <input
                            type="number"
                            value={editedOrder.prepaid_amount}
                            onChange={(e) => setEditedOrder({ ...editedOrder, prepaid_amount: e.target.value })}
                            style={styles.input}
                        />
                    </div>
                </div>
                {/* Товары к доставке */}
                <hr style={styles.hr} />
                <h4 style={styles.subtitle}>Товары к доставке:</h4>

                <table style={styles.itemsTable}>
                    <thead >
                        <tr style={styles.thead}>
                            <th style={styles.th}>Товар</th>
                            <th style={styles.th}>Код</th>
                            <th style={styles.th}>Кол-во</th>
                            <th style={styles.th}>Цена за единицу</th>
                            <th style={styles.th}>Сумма, руб</th>
                            <th style={styles.th}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {editedItems.map((item, index) => (
                            <tr key={index}>
                                <td style={styles.td}>
                                    <input
                                        type="text"
                                        value={item.product_name}
                                        onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                                        style={styles.smallInput}
                                    />
                                </td>
                                <td style={styles.td}>
                                    <input
                                        type="text"
                                        value={item.product_code}
                                        onChange={(e) => updateItem(index, 'product_code', e.target.value)}
                                        style={styles.smallInput}
                                    />
                                </td>
                                <td style={styles.td}>
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                        style={{ ...styles.smallInput, width: '60px' }}
                                        min="1"
                                    />
                                </td>
                                <td style={styles.td}>
                                    <input
                                        type="number"
                                        value={item.price}
                                        onChange={(e) => updateItem(index, 'price', e.target.value)}
                                        style={{ ...styles.smallInput, width: '80px' }}
                                        step="0.01"
                                        min="0"
                                    />
                                </td>
                                <td style={styles.td}>{(item.quantity * item.price).toFixed(2)}</td>
                                <td style={styles.td}>
                                    <button onClick={() => removeItem(index)} style={styles.removeButton}>✕</button>
                                </td>
                            </tr>
                        ))}
                
                    </tbody>
                    <tfoot style={styles.tfoot}>
                        <tr>
                            <td colSpan="4" style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>Итого с учетом предоплаты:</td>
                            <td colSpan="2" style={{ ...styles.td, fontWeight: 'bold' }}>{calculateTotal(editedItems)} руб</td>
                        </tr>
                    </tfoot>
                </table>
                        {/* Новый товар */}
                <hr style={styles.hr} />
                <div style={styles.addItemForm}>
                    <label htmlFor='product_name' style={styles.label}>Новый товар:</label>
                    <input
                        id='product_name'
                        type="text"
                        placeholder="Название товара"
                        value={newItem.product_name}
                        onChange={(e) => setNewItem({ ...newItem, product_name: e.target.value })}
                        style={styles.input}
                    />
                    <label htmlFor='product_code' style={styles.label}>Код:</label>
                    <input
                        id='product_code'
                        type="text"
                        placeholder="Код"
                        value={newItem.product_code}
                        onChange={(e) => setNewItem({ ...newItem, product_code: e.target.value })}
                        style={{ ...styles.input, width: '100px' }}
                    />
                    <label htmlFor='quantity' style={styles.label}>Кол-во:</label>
                    <input
                        id='quantity'
                        type="number"
                        placeholder="Кол-во"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                        style={{ ...styles.input, width: '80px' }}
                        min="1"
                    />
                    <label htmlFor='price' style={styles.label}>Цена:</label>
                    <input
                        type="number"
                        placeholder="Цена"
                        value={newItem.price}
                        onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                        style={{ ...styles.input, width: '100px' }}
                        step="0.01"
                        min="0"
                    />
                    <button
                        type="button"
                        onClick={addItem}
                        style={{
                            ...styles.addButton,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        <span style={{ fontSize: '1em', lineHeight: 1.3 }}>Добавить товар</span>
                    </button>
                </div>

                {showHistory && (
                    <div style={styles.modal}>
                        <div style={styles.modalContent}>
                            <OrderHistory
                                orderId={order.id}
                                onClose={() => setShowHistory(false)}
                            />
                        </div>
                    </div>
                )}


                <div style={styles.field}>
                    <label>Примечание</label>
                    <textarea
                        value={editedOrder.notes || ''}
                        onChange={(e) => setEditedOrder({ ...editedOrder, notes: e.target.value })}
                        style={styles.textarea}
                    />
                </div>
                <div style={styles.header}>
                    <div>
                        <button onClick={() => setShowHistory(true)} className='btn-info' style={styles.historyButton}>
                            📋 История
                        </button>
                        <button onClick={handleSave} style={styles.saveButton} className='btn-success' >💾 Сохранить</button>
                        <button onClick={() => setEditing(false)} className='btn-cancel'  style={styles.cancelButton}>✕ Отмена</button>
                        <button onClick={handleDelete} className='btn-danger' style={styles.deleteButton}>🗑 Удалить</button>
                    </div>
                </div>

            </div>
        </div>
    )
}

const styles = {
    container: {
        padding: '20px',
        backgroundColor: '#e0f1fd',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'

    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
    },
    sectionTitle: {
        margin: 0,
        fontSize: '18px',
        color: '#333'
    },


    infoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '10px',
        marginBottom: '20px'
    },
    infoItem: {
        padding: '8px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px'
    },
    subtitle: {
        margin: '20px 0 10px',
        fontSize: '16px',
        color: '#555'
    },
    itemsTable: {
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '20px'
    },
    th: {
        textAlign: 'left',
        padding: '8px',
        backgroundColor: '#f0f0f0',
        borderBottom: '1px solid #ddd',
        fontSize: '13px'
    },
    td: {
        padding: '8px',
        borderBottom: '1px solid #eee',
        fontSize: '13px'
    },
    tfoot : {
        borderTop: '1px solid #ddd',
        fontWeight: 'bold',
        fontSize: '14px',
        backgroundColor: '#cce0fb'
    },

    notes: {
        padding: '10px',
        backgroundColor: '#fff3cd',
        borderLeft: '4px solid #ffc107',
        marginTop: '20px'
    },
    editForm: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
    },
    row: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '15px'
    },
    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px'
    },
    input: {
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '14px'
    },
    smallInput: {
        padding: '4px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '12px',
        width: '100%'
    },
    addItemForm: {
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: '#c3ee7e',
    },
    textarea: {
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '14px',
        minHeight: '60px',
        resize: 'vertical'
    },
    hr: {
        border: 'none',
        borderTop: '1px solid #ddd',
        marginBottom: '10px 0'
    },
    editButton: {
        padding: '8px 16px',
        backgroundColor: '#2196f3',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        marginRight: '10px'
    },
    saveButton: {
        padding: '8px 16px',
        backgroundColor: '#4caf50',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        marginRight: '10px',

    },
    cancelButton: {
        padding: '8px 16px',
        backgroundColor: '#cfe909',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        marginRight: '10px'
    },
    deleteButton: {
        padding: '8px 16px',
        backgroundColor: '#f44336',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    },
    
    addButton: {
        padding: '10px 16px',
        backgroundColor: '#4caf50',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: '14px',
        fontWeight: '500',
        whiteSpace: 'nowrap'
    },
    removeButton: {
        padding: '4px 8px',
        backgroundColor: '#f44336',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px'
    }
    ,
    historyButton: {
        padding: '8px 16px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        marginRight: '10px'
    },
    modal: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    },
    modalContent: {
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto'
    },
    confirmButton: {
        width: '100%',
        padding: '15px',
        backgroundColor: '#4caf50',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginBottom: '20px'
    }


}