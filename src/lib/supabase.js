import { createClient } from '@supabase/supabase-js'

console.log('🚀 Supabase.js loaded')
console.log('📦 import.meta.env:', import.meta.env)
console.log('🔍 VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('🔍 VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY)
console.log('🌍 Node environment:', import.meta.env.MODE)
console.log('🏭 Is production:', import.meta.env.PROD)

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {  
  console.error('❌ Supabase credentials missing!')
  console.error('URL:', supabaseUrl ? '✅' : '❌')
  console.error('KEY:', supabaseKey ? '✅' : '❌')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {  
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  } catch (error) {
    console.error('Ошибка получения пользователя:', error)
    return null
  }
}