/**
 * Cliente HTTP da API do Portal. Base configurável via VITE_API_URL (default
 * http://localhost:4000). Injeta o e-mail do cliente logado em `x-user-email`
 * (auth mock, como no suporte-nairuz).
 */
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

const SESSION_KEY = 'nairuz-portal:client-session'
const COMPANY_TOKEN_KEY = 'nairuz-portal:company-token'

function authHeader(): Record<string, string> {
  const headers: Record<string, string> = {}
  try {
    // Empresa: JWT (Bearer) — usado na visão interna protegida.
    const token = localStorage.getItem(COMPANY_TOKEN_KEY)
    if (token) headers['Authorization'] = `Bearer ${token}`
    // Cliente: identidade por e-mail (portal externo, mock).
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      const u = JSON.parse(raw) as { email?: string }
      if (u?.email) headers['x-user-email'] = u.email
    }
  } catch {
    // ignora
  }
  return headers
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let message = `Erro ${res.status}`
    try {
      const data = (await res.json()) as { error?: string }
      if (data?.error) message = data.error
    } catch {
      // corpo não-JSON
    }
    const err = new Error(message) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
}
