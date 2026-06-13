import type { ClientUser } from '@/types'
import { api } from './api'
import { CLIENT_USERS, seedProjects } from './mockData'

/**
 * Autenticação de cliente via API. O backend valida o e-mail (liberado em
 * algum projeto ou no registro). A sessão é guardada no localStorage e
 * o token de cliente é reenviado como Bearer pelo cliente HTTP do portal.
 */
const SESSION_KEY = 'nairuz-portal:client-session'
const CLIENT_TOKEN_KEY = 'nairuz-portal:client-token'
const PROJECTS_KEY = 'nairuz-portal:fallback-projects'

function localClientLogin(email: string): ClientUser {
  const normalized = email.trim().toLowerCase()
  const knownUser = CLIENT_USERS.find((user) => user.email.toLowerCase() === normalized)
  if (knownUser) return knownUser

  try {
    const raw = localStorage.getItem(PROJECTS_KEY)
    const projects = raw ? JSON.parse(raw) as Array<{ organizationId: string; clientEmails?: string[] }> : seedProjects()
    const project = projects.find((item) =>
      item.clientEmails?.some((clientEmail) => clientEmail.toLowerCase() === normalized),
    )
    if (project) {
      return {
        id: `client-${normalized}`,
        name: normalized.split('@')[0],
        email: normalized,
        organizationId: project.organizationId,
      }
    }
  } catch {
    // Se o storage falhar, cai no erro amigavel abaixo.
  }

  throw new Error('E-mail nao liberado para o portal do cliente.')
}

export async function clientLogin(email: string): Promise<ClientUser> {
  let user: ClientUser
  try {
    const res = await api.post<{ user: ClientUser; token: string }>('/api/auth/client-login', { email })
    user = res.user
    try {
      localStorage.setItem(CLIENT_TOKEN_KEY, res.token)
    } catch {
      // ignora
    }
  } catch (err) {
    // Se a API respondeu (401/403/etc.), respeita a negativa do backend.
    if (err instanceof Error && 'status' in err) throw err
    // Sem API: cai no fallback local (somente leitura, sem token).
    user = localClientLogin(email)
    try {
      localStorage.removeItem(CLIENT_TOKEN_KEY)
    } catch {
      // ignora
    }
  }
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
    localStorage.removeItem(CLIENT_TOKEN_KEY)
  } catch {
    // noop
  }
}
