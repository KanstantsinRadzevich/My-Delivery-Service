import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function UserMenu({ user, profile, onLogout }) {
  const [showMenu, setShowMenu] = useState(false)

  console.log( profile)
  const getUserDisplayName = () => {
    if (profile?.full_name) return profile.full_name
    if (user?.email) {
      const emailName = user.email.split('@')[0]
      return emailName.charAt(0).toUpperCase() + emailName.slice(1)
    }
    return 'Пользователь'
  }

  const getInitials = () => {
    const name = getUserDisplayName()
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div style={styles.container}>
      <button 
        onClick={() => setShowMenu(!showMenu)}
        style={styles.userButton}
      >
        <span style={styles.avatar}>
          {getInitials()}
        </span>
        <span style={styles.userName}>
          {getUserDisplayName()}
        </span>
        <span style={styles.arrow}>
          {showMenu ? '▲' : '▼'}
        </span>
      </button>

      {showMenu && (
        <div style={styles.dropdown}>
          <div style={styles.userInfo}>
            <div style={styles.userInfoName}>{getUserDisplayName()}</div>
            <div style={styles.userInfoEmail}>{user?.email}</div>
            {profile?.role && (
              <div style={styles.userInfoRole}>
                Роль: {profile.role === 'manager' ? 'Менеджер' : 'Курьер'}
              </div>
            )}
          </div>
          <div style={styles.divider}></div>
          <button onClick={onLogout} style={styles.logoutButton}>
            🚪 Выйти
          </button>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    position: 'relative',
    display: 'inline-block'
  },
  userButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '30px',
    color: 'white',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: 'rgba(255,255,255,0.2)'
    }
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#3498db',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  userName: {
    fontSize: '14px',
    fontWeight: '500'
  },
  arrow: {
    fontSize: '12px',
    marginLeft: '5px'
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '10px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    minWidth: '250px',
    zIndex: 1000
  },
  userInfo: {
    padding: '16px'
  },
  userInfoName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '4px'
  },
  userInfoEmail: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '4px'
  },
  userInfoRole: {
    fontSize: '12px',
    color: '#3498db',
    marginTop: '4px'
  },
  divider: {
    height: '1px',
    backgroundColor: '#eee',
    margin: '8px 0'
  },
  logoutButton: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left',
    fontSize: '14px',
    color: '#e74c3c',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderRadius: '0 0 8px 8px',
    ':hover': {
      backgroundColor: '#fef5f5'
    }
  }
}