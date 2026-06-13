import { listMentionableUsers } from '@/services/usersService'
import { useAsync } from './useAsync'

/** Usuários para menções (@) e colaboradores. */
export function useMentionableUsers() {
  return useAsync(() => listMentionableUsers(), [])
}
