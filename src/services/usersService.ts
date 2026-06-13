import { api } from './api'
import { notifyChange } from './store'
import type { CompanyUser } from './companyAuthService'

/** Usuário "mencionável"/colaborador (lista enxuta, qualquer usuário logado vê). */
export interface MentionableUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
}

/** Lista usuários internos (somente admin no backend). */
export async function listUsers(): Promise<CompanyUser[]> {
  return api.get<CompanyUser[]>('/api/users')
}

/** Lista enxuta para menções e colaboradores (qualquer usuário logado). */
export async function listMentionableUsers(): Promise<MentionableUser[]> {
  return api.get<MentionableUser[]>('/api/users/mentionable')
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
