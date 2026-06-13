/**
 * Clientes HTTP da API. Base configurável via VITE_API_URL (default
 * http://localhost:4000).
 * - `api`     → visão da empresa (token JWT de usuário interno).
 * - `clientApi` → portal do cliente (token de cliente).
 */
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

const COMPANY_TOKEN_KEY = 'nairuz-portal:company-token'
const CLIENT_TOKEN_KEY = 'nairuz-portal:client-token'

function bearer(key: string): Record<string, string> {
  try {
    const t = localStorage.getItem(key)
    if (t) return { Authorization: `Bearer ${t}` }
  } catch {
    // ignora
  }
  return {}
}

async function request<T>(
  method: string,
  path: string,
  body: unknown,
  headers: Record<string, string>,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
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

function makeApi(tokenKey: string) {
  return {
    get: <T>(path: string) => request<T>('GET', path, undefined, bearer(tokenKey)),
    post: <T>(path: string, body?: unknown) => request<T>('POST', path, body, bearer(tokenKey)),
    patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body, bearer(tokenKey)),
    del: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body, bearer(tokenKey)),
  }
}

export const api = makeApi(COMPANY_TOKEN_KEY)
export const clientApi = makeApi(CLIENT_TOKEN_KEY)
