import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { orderLogger } from '../lib/logger'

export default function CourierConfirmation({ order, onConfirmed }) {
  const [step, setStep] = useState('qr') // qr, phone, signature, complete
  const [phoneLast4, setPhoneLast4] = useState('')
  const [signature, setSignature] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Получаем последние 4 цифры телефона из заказа
  const getPhoneLast4 = () => {
    if (!order.contact_phone) return ''
    const phone = order.contact_phone.replace(/\D/g, '')
    return phone.slice(-4)
  }

  const handleQRScanned = () => {
    // В реальном приложении здесь будет сканер QR-кода
    // Сейчас просто переходим к следующему шагу
    setStep('phone')
  }

  const handlePhoneConfirm = async () => {
    setError('')
    setLoading(true)

    try {
      const expectedLast4 = getPhoneLast4()
      
      if (phoneLast4 === expectedLast4) {
        // Подтверждение по телефону успешно
        await confirmDelivery('qr_phone')
      } else {
        setError('Неверные последние 4 цифры телефона')
      }
    } catch (error) {
      console.error('Ошибка:', error)
      setError('Ошибка подтверждения')
    } finally {
      setLoading(false)
    }
  }

  const handleSignatureConfirm = async () => {
    setError('')
    setLoading(true)

    try {
      if (signature) {
        // Подпись получена
        await confirmDelivery('qr_signature')
      } else {
        setError('Необходима подпись')
      }
    } catch (error) {
      console.error('Ошибка:', error)
      setError('Ошибка подтверждения')
    } finally {
      setLoading(false)
    }
  }

  const confirmDelivery = async (method) => {
    try {
      // Обновляем статус заказа
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'delivered',
          delivery_confirmed_at: new Date().toISOString(),
          confirmed_by_phone_last4: method === 'qr_phone' ? phoneLast4 : null,
          customer_signature: method === 'qr_signature' ? signature : null,
          confirmation_method: method
        })
        .eq('id', order.id)

      if (updateError) throw updateError

      // Логируем подтверждение
      const user = await supabase.auth.getUser()
      await orderLogger.logStatusChanged(
        order.id,
        'in_delivery',
        'delivered',
        user.data?.user?.id
      )

      setStep('complete')
      setTimeout(() => {
        onConfirmed()
      }, 2000)
    } catch (error) {
      console.error('Ошибка подтверждения:', error)
      setError('Ошибка при подтверждении доставки')
    }
  }

  const renderQRStep = () => (
    <div style={styles.step}>
      <div style={styles.qrIcon}>📱</div>
      <h3 style={styles.stepTitle}>Шаг 1: Покажите QR-код клиенту</h3>
      <p style={styles.stepDescription}>
        Попросите клиента отсканировать QR-код с вашего экрана
      </p>
      
      <div style={styles.qrContainer}>
        <div style={styles.qrCode}>
          {/* Здесь будет QR-код */}
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${order.delivery_qr_code}`}
            alt="QR-код доставки"
            style={styles.qrImage}
          />
        </div>
        <p style={styles.qrHint}>
          Код: <strong>{order.delivery_qr_code}</strong>
        </p>
      </div>

      <button 
        onClick={handleQRScanned}
        style={styles.button}
      >
        Клиент отсканировал QR-код →
      </button>
    </div>
  )

  const renderPhoneStep = () => (
    <div style={styles.step}>
      <div style={styles.phoneIcon}>📞</div>
      <h3 style={styles.stepTitle}>Шаг 2: Подтверждение по телефону</h3>
      <p style={styles.stepDescription}>
        Попросите клиента ввести последние 4 цифры его телефона из заказа
      </p>

      <div style={styles.inputGroup}>
        <input
          type="text"
          maxLength="4"
          pattern="[0-9]*"
          value={phoneLast4}
          onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, ''))}
          placeholder="****"
          style={styles.phoneInput}
          autoFocus
        />
        <p style={styles.phoneHint}>
          Ожидается: {getPhoneLast4().replace(/./g, '*')}
        </p>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.buttonGroup}>
        <button 
          onClick={() => setStep('signature')}
          style={styles.secondaryButton}
        >
          Альтернативный способ
        </button>
        <button 
          onClick={handlePhoneConfirm}
          disabled={phoneLast4.length !== 4 || loading}
          style={styles.button}
        >
          {loading ? 'Проверка...' : 'Подтвердить'}
        </button>
      </div>
    </div>
  )

  const renderSignatureStep = () => (
    <div style={styles.step}>
      <div style={styles.signatureIcon}>✍️</div>
      <h3 style={styles.stepTitle}>Шаг 2: Подпись клиента</h3>
      <p style={styles.stepDescription}>
        Попросите клиента поставить подпись
      </p>

      <div style={styles.signaturePad}>
        <textarea
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="Клиент может написать свою подпись здесь"
          style={styles.signatureInput}
          rows={3}
        />
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.buttonGroup}>
        <button 
          onClick={() => setStep('phone')}
          style={styles.secondaryButton}
        >
          Назад
        </button>
        <button 
          onClick={handleSignatureConfirm}
          disabled={!signature || loading}
          style={styles.button}
        >
          {loading ? 'Сохранение...' : 'Подтвердить подпись'}
        </button>
      </div>
    </div>
  )

  const renderCompleteStep = () => (
    <div style={styles.step}>
      <div style={styles.successIcon}>✅</div>
      <h3 style={styles.stepTitle}>Доставка подтверждена!</h3>
      <p style={styles.stepDescription}>
        Заказ успешно доставлен и получен клиентом
      </p>
      <div style={styles.successDetails}>
        <p>Время: {new Date().toLocaleString('ru-RU')}</p>
        <p>Метод: {step === 'complete' ? (phoneLast4 ? 'По телефону' : 'По подписи') : ''}</p>
      </div>
    </div>
  )

  return (
    <div style={styles.container}>
      {step === 'qr' && renderQRStep()}
      {step === 'phone' && renderPhoneStep()}
      {step === 'signature' && renderSignatureStep()}
      {step === 'complete' && renderCompleteStep()}
    </div>
  )
}

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    maxWidth: '500px',
    margin: '0 auto'
  },
  step: {
    textAlign: 'center'
  },
  qrIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  phoneIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  signatureIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  successIcon: {
    fontSize: '64px',
    marginBottom: '16px',
    color: '#4caf50'
  },
  stepTitle: {
    fontSize: '20px',
    color: '#333',
    marginBottom: '8px'
  },
  stepDescription: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '24px'
  },
  qrContainer: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  qrImage: {
    width: '200px',
    height: '200px',
    margin: '0 auto'
  },
  qrHint: {
    fontSize: '12px',
    color: '#999',
    marginTop: '10px'
  },
  inputGroup: {
    marginBottom: '20px'
  },
  phoneInput: {
    width: '120px',
    padding: '15px',
    fontSize: '24px',
    textAlign: 'center',
    border: '2px solid #ddd',
    borderRadius: '8px',
    margin: '0 auto',
    display: 'block',
    letterSpacing: '8px'
  },
  phoneHint: {
    fontSize: '12px',
    color: '#999',
    marginTop: '8px'
  },
  signaturePad: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  signatureInput: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px',
    fontFamily: 'cursive'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center'
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    minWidth: '150px'
  },
  secondaryButton: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  error: {
    color: '#f44336',
    fontSize: '14px',
    marginBottom: '16px',
    padding: '8px',
    backgroundColor: '#ffebee',
    borderRadius: '4px'
  },
  successDetails: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#666'
  }
}