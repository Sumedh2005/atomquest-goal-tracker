const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export async function signIn(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description || data.msg || 'Sign in failed')

  // Store session manually
  localStorage.setItem('atomtrack_token', data.access_token)
  localStorage.setItem('atomtrack_user_id', data.user.id)

  return data
}

export async function signOut() {
  const token = localStorage.getItem('atomtrack_token')

  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${token}`
    }
  })

  localStorage.removeItem('atomtrack_token')
  localStorage.removeItem('atomtrack_user_id')
}

export async function getCurrentUser() {
  const token = localStorage.getItem('atomtrack_token')
  const userId = localStorage.getItem('atomtrack_user_id')

  if (!token || !userId) return null

  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${token}`
    }
  })

  if (!res.ok) return null

  const data = await res.json()
  return data[0] || null
}

export function getToken() {
  return localStorage.getItem('atomtrack_token')
}