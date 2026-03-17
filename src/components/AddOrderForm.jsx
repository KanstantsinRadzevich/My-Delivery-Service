import { useState } from 'react'
import { orderLogger } from '../lib/logger'
import { supabase, getCurrentUser } from '../lib/supabase'
import CourierSelect from './CourierSelect'


export default function AddOrderForm({ onOrderAdded }) {
    const [orderData, setOrderData] = useState({
        customer_name: '',
        delivery_address: '',
        contact_phone: '',
        delivery_date: '',
        delivery_time_slot: '09:00-12:00', // значение по умолчанию
        payment_method: 'cash',
        prepaid_amount: 0,
        courier_id: '',
        notes: ''
    })

    const [items, setItems] = useState([])
    const [newItem, setNewItem] = useState({
        product_name: '',
        product_code: '',
        quantity: 1,
        price: 0
    })

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    }

    const addItem = () => {
        if (!newItem.product_name || !newItem.price) {
            alert('Заполните название товара и цену')
            return
        }
        setItems([...items, { ...newItem }])
        setNewItem({ product_name: '', product_code: '', quantity: 1, price: 0 })
    }

    const removeItem = (index) => {
        setItems(items.filter((_, i) => i !== index))
    }



    const handleSubmit = async (e) => {
        e.preventDefault()

        if (items.length === 0) {
            alert('Добавьте хотя бы один товар')
            return
        }

        try {
            console.log('1. Начинаем создание заказа')
            console.log('2. Данные заказа:', orderData)
            console.log('3. Товары:', items)

            const orderId = `ORD-${Date.now().toString().slice(-6)}`
            const confirmationCode = Math.random().toString(36).substring(2, 8).toUpperCase()
            const totalAmount = calculateTotal()
            
            console.log('4. Генерируем ID заказа:', orderId)
            
            const generateQRCode = () => {
                const timestamp = Date.now().toString(36)
                const random = Math.random().toString(36).substring(2, 8).toUpperCase()
                const orderNum = orderId.slice(-4)
                return `DEL-${timestamp}-${random}-${orderNum}`
            }
            
            const qrCode = generateQRCode()


            // Создаем заказ
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    order_id: orderId,
                    delivery_qr_code: qrCode,
                    confirmation_code: confirmationCode,
                    customer_name: orderData.customer_name,
                    delivery_address: orderData.delivery_address,
                    contact_phone: orderData.contact_phone,
                    delivery_date: orderData.delivery_date,
                    delivery_time_slot: orderData.delivery_time_slot, 
                    payment_method: orderData.payment_method,
                    notes: orderData.notes || '',
                    prepaid_amount: orderData.prepaid_amount,
                    total_amount: totalAmount,
                    status: 'new',
                    payment_status: 'pending',
                    is_paid: false,
                    amount_to_return: 0,
                    has_return: false
                }])
                .select()

            if (orderError) {
                console.error('5. Ошибка создания заказа:', orderError)
                throw orderError
            }

            console.log('6. Заказ создан успешно:', order)

            // Добавляем товары
            if (order && order[0]) {
                console.log('7. ID созданного заказа:', order[0].id)
                const user = await supabase.auth.getUser()
                await orderLogger.logOrderCreated(
                    order[0].id,
                    {
                        ...orderData,
                        total_amount: totalAmount,
                        items_count: items.length
                    },
                    user.data?.user?.id
                )

                // Логируем каждый добавленный товар
                for (const item of items) {
                    await orderLogger.logItemAdded(order[0].id, item, user.data?.user?.id)
                }

                console.log('🎉 Заказ и история созданы')

                const itemsToInsert = items.map(item => ({
                    order_id: order[0].id,
                    product_name: item.product_name,
                    product_code: item.product_code || '',
                    quantity: item.quantity,
                    price: item.price
                }))

                console.log('8. Подготовлены товары для вставки:', itemsToInsert)

                const { data: itemsData, error: itemsError } = await supabase
                    .from('order_items')
                    .insert(itemsToInsert)
                    .select()

                if (itemsError) {
                    console.error('9. Ошибка вставки товаров:', itemsError)
                    throw itemsError
                }

                console.log('10. Товары успешно добавлены:', itemsData)
            }

            alert(`✅ Заказ создан!\n\nID: ${orderId}\nQR-код: ${qrCode}\nКод подтверждения: ${confirmationCode}`)

            // Очищаем форму
            setOrderData({
                customer_name: '',
                delivery_address: '',
                contact_phone: '',
                delivery_date: '',
                delivery_time: '',
                payment_method: 'cash',
                notes: ''
            })
            setItems([])

            if (onOrderAdded) onOrderAdded()
        } catch (error) {
            console.error('❌ Ошибка в процессе:', error)
            alert('❌ Ошибка: ' + error.message)
        }
    }

    const handleChange = (e) => {
        setOrderData({
            ...orderData,
            [e.target.name]: e.target.value
        })
    }

    return (
        <div style={styles.container} className="add-order-form">
            <h2 style={styles.title}>➕ Создать новый заказ</h2>
            <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.row}>
                    <div style={styles.field}>
                        <label style={styles.label}>Покупатель *</label>
                        <input
                            type="text"
                            name="customer_name"
                            value={orderData.customer_name}
                            onChange={handleChange}
                            required
                            style={styles.input}
                            placeholder="ФИО покупателя"
                        />
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>Телефон *</label>
                        <input
                            type="tel"
                            name="contact_phone"
                            value={orderData.contact_phone}
                            onChange={handleChange}
                            required
                            style={styles.input}
                            placeholder="+375 (29) 123-45-67"
                        />
                    </div>
                </div>

                <div style={styles.field}>
                    <label style={styles.label}>Адрес доставки *</label>
                    <input
                        type="text"
                        name="delivery_address"
                        value={orderData.delivery_address}
                        onChange={handleChange}
                        required
                        style={styles.input}
                        placeholder="Улица, дом, квартира"
                    />
                </div>

                <div style={styles.row}>
                    <div style={styles.field}>
                        <label style={styles.label}>Дата доставки *</label>
                        <input
                            type="date"
                            name="delivery_date"
                            value={orderData.delivery_date}
                            onChange={handleChange}
                            required
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>Время доставки</label>
                        <select
                            name="delivery_time_slot"
                            value={orderData.delivery_time_slot}
                            onChange={handleChange}
                            style={styles.input}
                        >
                            <option value="09:00-12:00">09:00 - 12:00</option>
                            <option value="12:00-15:00">12:00 - 15:00</option>
                            <option value="15:00-18:00">15:00 - 18:00</option>
                            <option value="18:00-21:00">18:00 - 21:00</option>
                        </select>
                    </div>
                </div>
                <div style={styles.row}>
                    <div style={styles.field}>
                        <label style={styles.label}>Способ оплаты</label>
                        <select
                            name="payment_method"
                            value={orderData.payment_method}
                            onChange={handleChange}
                            style={styles.input}
                        >
                            <option value="cash">Наличные</option>
                            <option value="card">Карта</option>
                            <option value="online">Онлайн</option>
                        </select>
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>Предоплата (₽)</label>
                        <input
                            type="number"
                            name="prepaid_amount"
                            value={orderData.prepaid_amount}
                            onChange={handleChange}
                            style={styles.input}
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                        />
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label}>Курьер</label>
                        <CourierSelect
                            value={orderData.courier_id}
                            onChange={(value) => setOrderData({ ...orderData, courier_id: value })}
                        />
                    </div>
                </div>

                <h4 style={styles.subtitle}>Товары в заказе:</h4>

                {items.length > 0 && (
                    <table style={styles.itemsTable}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Товар</th>
                                <th style={styles.th}>Код</th>
                                <th style={styles.th}>Кол-во</th>
                                <th style={styles.th}>Цена</th>
                                <th style={styles.th}>Сумма</th>
                                <th style={styles.th}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={item.id || index}>
                                    <td style={styles.td}>{item.product_name}</td>
                                    <td style={styles.td}>{item.product_code}</td>
                                    <td style={styles.td}>{item.quantity}</td>
                                    <td style={styles.td}>{item.price} ₽</td>
                                    <td style={styles.td}>{(item.quantity * item.price).toFixed(2)} ₽</td>
                                    <td style={styles.td}>
                                        <button type="button" onClick={() => removeItem(index)} style={styles.removeButton}>✕</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan="4" style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>Итого:</td>
                                <td colSpan="2" style={{ ...styles.td, fontWeight: 'bold' }}>{calculateTotal()} ₽</td>
                            </tr>
                        </tfoot>
                    </table>
                )}

                <div style={styles.addItemForm}>
                    <label htmlFor="product_name" style={styles.label}>Название товара:</label>
                    <input
                        id='product_name'
                        type="text"
                        placeholder="Название товара"
                        value={newItem.product_name}
                        onChange={(e) => setNewItem({ ...newItem, product_name: e.target.value })}
                        style={{ ...styles.input, width: '100%' }}
                    />
                    <label htmlFor="product_code" style={styles.label}>Код товара:</label>
                    <input
                        id='product_code'
                        type="text"
                        placeholder="Код"
                        value={newItem.product_code}
                        onChange={(e) => setNewItem({ ...newItem, product_code: e.target.value })}
                        style={{ ...styles.input, width: '140px' }}
                    />
                    <label htmlFor="quantity" style={styles.label}>Кол-во:</label>
                    <input
                        id='quantity'
                        name="quantity"
                        type="number"
                        placeholder="Кол-во"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                        style={{ ...styles.input, width: '80px' }}
                        min="1"
                    />
                    <label htmlFor="price" style={styles.label}>Цена за единицу:</label>
                    <input
                        id='price'
                        name="price"
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

                <div style={styles.field}>
                    <label style={styles.label}>Примечание</label>
                    <textarea
                        name="notes"
                        value={orderData.notes}
                        onChange={handleChange}
                        style={styles.textarea}
                        placeholder="Дополнительная информация"
                    />
                </div>

                <button type="submit" style={styles.submitButton}>
                    Создать заказ ({items.length} товаров, {calculateTotal()} )
                </button>
            </form>
        </div>
    )
}

const styles = {
    container: {
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        marginBottom: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    title: {
        marginBottom: '20px',
        color: '#333',
        fontSize: '20px'
    },
    form: {
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
    label: {
        fontSize: '14px',
        fontWeight: '500',
        color: '#555'
    },
    input: {
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '14px'
    },
    textarea: {
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '14px',
        minHeight: '60px',
        resize: 'vertical'
    },
    subtitle: {
        margin: '10px 0',
        fontSize: '16px',
        color: '#555'
    },
    itemsTable: {
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '15px'
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
    addItemForm: {
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        marginBottom: '15px'
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
        cursor: 'pointer'
    },
    submitButton: {
        padding: '12px',
        backgroundColor: '#2196f3',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '16px',
        fontWeight: '500',
        cursor: 'pointer',
        marginTop: '10px'
    }
}