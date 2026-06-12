import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

const AuthContext = createContext({ user: null, profile: null, role: null, loading: true })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return }

    let active = true

    async function loadProfile(u) {
      if (!u) { if (active) setProfile(null); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      if (active) setProfile(data || null)
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      const u = data?.session?.user || null
      setUser(u)
      loadProfile(u).finally(() => active && setLoading(false))
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      const u = session?.user || null
      setUser(u)
      loadProfile(u)
    })

    return () => { active = false; sub?.subscription?.unsubscribe() }
  }, [])

  const value = {
    user,
    profile,
    role: profile?.role || null,
    loading,
    signOut: () => supabase?.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
