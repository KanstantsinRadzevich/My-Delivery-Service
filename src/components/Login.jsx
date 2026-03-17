import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('manager@test.com')
  const [password, setPassword] = useState('password123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      // Очищаем email и пароль от лишних символов
      const cleanEmail = email.trim().replace(/[^\x00-\x7F]/g, '')
      const cleanPassword = password.trim().replace(/[^\x00-\x7F]/g, '')
      
      console.log('Попытка входа с email:', cleanEmail)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      })

      if (error) throw error
      
      console.log('Успешный вход:', data)
      
      if (data.session) {
        // Небольшая задержка перед вызовом onLogin
        setTimeout(() => {
          onLogin()
        }, 100)
      }
    } catch (error) {
      console.error('Детали ошибки:', error)
      setError(error.message || 'Ошибка при входе')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Вход в систему</h2>
        <p style={styles.subtitle}>Менеджер</p>
        
        {error && (
          <div style={styles.error}>
            ❌ {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              placeholder="введите email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Пароль</label>
            <input
              type="password"
              placeholder="введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            style={loading ? {...styles.button, ...styles.buttonDisabled} : styles.button}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        
        <div style={styles.demo}>
          <p style={styles.demoText}>Демо-доступ:</p>
          <p style={styles.demoCredentials}>Email: manager@test.com</p>
          <p style={styles.demoCredentials}>Пароль: password123</p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px'
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px'
  },
  title: {
    margin: '0 0 8px',
    fontSize: '24px',
    color: '#333',
    textAlign: 'center'
  },
  subtitle: {
    margin: '0 0 24px',
    color: '#666',
    textAlign: 'center',
    fontSize: '14px'
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '20px',
    fontSize: '14px',
    textAlign: 'center'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  label: {
    fontSize: '14px',
    color: '#555',
    fontWeight: '500'
  },
  input: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px',
    transition: 'border-color 0.2s',
    ':focus': {
      outline: 'none',
      borderColor: '#007bff'
    }
  },
  button: {
    padding: '12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#0056b3'
    }
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed'
  },
  demo: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    textAlign: 'center'
  },
  demoText: {
    margin: '0 0 8px',
    color: '#666',
    fontSize: '14px',
    fontWeight: '500'
  },
  demoCredentials: {
    margin: '4px 0',
    color: '#999',
    fontSize: '13px',
    fontFamily: 'monospace'
  }
}