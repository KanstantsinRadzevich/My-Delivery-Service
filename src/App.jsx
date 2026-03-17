import { useState, useEffect, useCallback } from 'react'
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


    const clearUserData = useCallback(() => {
        setProfile(null)
    }, [])



    useEffect(() => {
        if (session?.user) {
            fetchUserProfile(session.user.id)
        }
    }, [session])

    useEffect(() => {
        // Проверяем активную сессию при загрузке
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setLoading(false)
        })

        // Слушаем изменения сессии
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })

        return () => subscription.unsubscribe()
    }, [])



    const fetchUserProfile = useCallback(async (userId) => {
        if (!userId) {
            setProfile(null)
            return
        }
        try {
            console.log('Загрузка профиля для userId:', userId)
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()
                .maybeSingle() // проверка на наличие профиля

            if (error) throw error
            console.log('Профиль загружен:', data)
            setProfile(data)
        } catch (error) {
            console.error('Ошибка загрузки профиля:', error)
            setProfile(null)  // Важно: очищаем профиль при ошибке
        }
    }, [])

    const getInitialSession = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            console.log('Начальная сессия:', session)

            setSession(session)

            if (session?.user) {
                await fetchUserProfile(session.user.id)
            } else {
                setProfile(null)
            }
        } catch (error) {
            console.error('Ошибка получения сессии:', error)
        } finally {
            setLoading(false)
        }
    }, [fetchUserProfile])

    // Следим за изменениями аутентификации
    // useEffect(() => {
    //     getInitialSession()

    //     const { data: { subscription } } = supabase.auth.onAuthStateChange(
    //         async (event, session) => {
    //             console.log('Auth state changed:', event, session)

    //             setSession(session)

    //             if (event === 'SIGNED_IN' && session?.user) {
    //                 console.log('Событие входа, загружаем свежий профиль...')
    //                 await fetchUserProfile(session.user.id)
    //             } else if (event === 'SIGNED_OUT') {
    //                 // При выходе очищаем профиль
    //                 setProfile(null)
    //             } else if (event === 'TOKEN_REFRESHED' && session?.user) {
    //                 // При обновлении пользователя перезагружаем профиль
    //                 await fetchUserProfile(session.user.id)
    //             }
    //         }
    //     )

    //     return () => {
    //         subscription.unsubscribe()
    //         clearUserData()
    //     }
    // }, [getInitialSession, fetchUserProfile, clearUserData])

    const handleOrderAdded = () => {
        setRefreshKey(prev => prev + 1)
        setShowAddForm(false) // Скрываем форму после сохранения
    }

    const handleLogin = () => {
        getInitialSession()
    }

    const handleLogout = async () => {
        console.log('Выход из аккаунта...')
        setProfile(null)
        const response = await supabase.auth.signOut()
        console.log('Выход выполнен:', response)
        setSession(null)
        setProfile(null)
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
        console.log('Пользователь не авторизован')
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
                        {showAddForm ? '✕ Закрыть' : '➕ Создать новый заказ на доставку'}
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