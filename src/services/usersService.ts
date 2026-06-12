import { api } from './api'
import { notifyChange } from './store'
import type { CompanyUser } from './companyAuthService'

/** Lista usuários internos (somente admin no backend). */
export async function listUsers(): Promise<CompanyUser[]> {
  return api.get<CompanyUser[]>('/api/users')
}

/** Atualiza papel e/ou status de um usuário (somente admin). */
export async function updateUser(
  id: string,
  patch: { role?: 'admin' | 'member'; active?: boolean },
): Promise<CompanyUser> {
  const user = await api.patch<CompanyUser>(`/api/users/${id}`, patch)
  notifyChange()
  return user
}
