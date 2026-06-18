import { api } from './api'

/** Usuário interno da Nairuz. */
export interface CompanyUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
  active: boolean
  emailVerified: boolean
}

const TOKEN_KEY = 'nairuz-portal:company-token'
const USER_KEY = 'nairuz-portal:company-user'

interface AuthResult {
  token: string
  user: CompanyUser
}

function persist(result: AuthResult): CompanyUser {
  try {
    localStorage.setItem(TOKEN_KEY, result.token)
    localStorage.setItem(USER_KEY, JSON.stringify(result.user))
  } catch {
    // segue em memória
  }
  return result.user
}

/** Cadastro aberto. Retorna o código (modo dev) para a tela de verificação. */
export async function registerCompany(input: {
  name: string
  email: string
  password: string
}): Promise<{ email: string; role: string; devCode?: string }> {
  return api.post('/api/auth/register', input)
}

/** Confirma o e-mail pelo código e já autentica (salva token). */
export async function verifyCompany(email: string, code: string): Promise<CompanyUser> {
  const result = await api.post<AuthResult>('/api/auth/verify', { email, code })
  return persist(result)
}

export async function loginCompany(email: string, password: string): Promise<CompanyUser> {
  const result = await api.post<AuthResult>('/api/auth/login', { email, password })
  return persist(result)
}

/** Solicita o código de redefinição de senha por e-mail. */
export async function requestPasswordReset(email: string): Promise<{ email: string; devCode?: string }> {
  return api.post('/api/auth/forgot-password', { email })
}

/** Redefine a senha com o código e já autentica (salva token). */
export async function resetPasswordCompany(
  email: string,
  code: string,
  password: string,
): Promise<CompanyUser> {
  const result = await api.post<AuthResult>('/api/auth/reset-password', { email, code, password })
  return persist(result)
}

export function getCompanySession(): CompanyUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as CompanyUser) : null
  } catch {
    return null
  }
}

export function companyLogout(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {
    // noop
  }
}
