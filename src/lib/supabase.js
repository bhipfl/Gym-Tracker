import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = !!(url && anonKey)

// PKCE-Flow ist Pflicht: Auth-Redirects nutzen ?code= statt #fragment
// und kollidieren so nicht mit dem HashRouter.
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, { auth: { flowType: 'pkce' } })
  : null

/** User-ID der aktuellen Session (lokal, kein Netzwerk-Roundtrip). */
export async function currentUserId() {
  const { data } = await supabase.auth.getSession()
  const id = data?.session?.user?.id
  if (!id) throw new Error('Nicht angemeldet.')
  return id
}
