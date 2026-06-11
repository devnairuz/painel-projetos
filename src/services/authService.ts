import type { ClientUser } from '@/types'
import { api } from './api'

/**
 * Autenticação de cliente via API. O backend valida o e-mail (liberado em
 * algum projeto ou no registro). A sessão é guardada no localStorage e
 * reenviada como header `x-user-email` pelo cliente HTTP.
 */
const SESSION_KEY = 'nairuz-portal:client-session'

export async function clientLogin(email: string): Promise<ClientUser> {
  const user = await api.post<ClientUser>('/api/auth/client-login', { email })
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  } catch {
    // segue em memória
  }
  return user
}

export function getClientSession(): ClientUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as ClientUser) : null
  } catch {
    return null
  }
}

export function clientLogout(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // noop
  }
}
