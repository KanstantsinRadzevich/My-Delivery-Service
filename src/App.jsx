import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import OrdersTable from './components/OrdersTable'
import AddOrderForm from './components/AddOrderForm'
import UserMenu from './components/UserMenu'
import './App.css'

function App() {
    const [session, setSession] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [refreshKey, setRefreshKey] = useState(0)
    const [showAddForm, setShowAddForm] = useState(false)

    useEffect(() => {
        getInitialSession()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })

        return () => subscription.unsubscribe()
    }, [])

    async function getInitialSession() {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            setSession(session)
            if (session?.user) {
                await fetchUserProfile(session.user.id)
            }
        } catch (error) {
            console.error('Ошибка получения сессии:', error)
        } finally {
            setLoading(false)
        }
    }

    async function fetchUserProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) throw error
            setProfile(data)
        } catch (error) {
            console.error('Ошибка загрузки профиля:', error)
        }
    }

    const handleOrderAdded = () => {
        setRefreshKey(prev => prev + 1)
        setShowAddForm(false) // Скрываем форму после сохранения
    }

    const handleLogin = () => {
        getInitialSession()
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        setSession(null)
        setProfile(null)
    }

    const getUserDisplayName = () => {
        if (profile?.full_name) return profile.full_name
        if (session?.user?.email) {
            // Берем часть email до @
            const emailName = session.user.email.split('@')[0]
            return emailName.charAt(0).toUpperCase() + emailName.slice(1)
        }
        return 'Пользователь'
    }

    const getUserRole = () => {
        if (profile?.role === 'manager') return 'Менеджер'
        if (profile?.role === 'courier') return 'Курьер'
        return ''
    }

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingSpinner}></div>
                <p>Загрузка...</p>
            </div>
        )
    }

    if (!session) {
        return <Login onLogin={handleLogin} />
    }

    return (
        <div className="app">
            <header style={styles.header}>
                <div style={styles.headerContent}>
                    <h1 style={styles.title}>📦 Своя доставка</h1>
                    <div style={styles.userInfo}>
                        <UserMenu
                            user={session.user}
                            profile={profile}
                            onLogout={handleLogout}
                        />
                    </div>
                </div>
            </header>

            <main style={styles.main}>
                <div style={styles.toolbar}>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        style={styles.addButton}
                    >
                        {showAddForm ? '✕ Закрыть' : '➕ Создать новый заказ'}
                    </button>
                </div>

                {showAddForm && (
                    <AddOrderForm onOrderAdded={handleOrderAdded} />
                )}

                <OrdersTable key={refreshKey} />
            </main>
        </div>
    )
}

const styles = {
    header: {
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    headerContent: {
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    title: {
        margin: 0,
        fontSize: '28px',
        fontWeight: '300'
    },
    userInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px'
    },
    userDetails: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '4px'
    },
    userName: {
        fontSize: '16px',
        fontWeight: '500',
        color: '#fff'
    },
    userRole: {
        fontSize: '12px',
        backgroundColor: '#3498db',
        padding: '2px 8px',
        borderRadius: '12px',
        color: 'white'
    },
    userEmail: {
        fontSize: '12px',
        color: '#95a5a6'
    },
    logoutButton: {
        padding: '8px 16px',
        backgroundColor: 'transparent',
        color: 'white',
        border: '1px solid #e74c3c',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        transition: 'all 0.2s'
    },
    main: {
        maxWidth: '1200px',
        margin: '30px auto',
        padding: '0 20px'
    },
    toolbar: {
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'flex-start'
    },
    addButton: {
        padding: '12px 24px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '16px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5'
    },
    loadingSpinner: {
        width: '40px',
        height: '40px',
        border: '3px solid #f3f3f3',
        borderTop: '3px solid #3498db',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '10px'
    }
}

// Добавляем анимацию
const styleSheet = document.createElement("style")
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`
document.head.appendChild(styleSheet)

export default App