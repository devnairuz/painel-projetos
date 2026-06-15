import { listMentionableUsers } from '@/services/usersService'
import { useAsync } from './useAsync'

/** Usuários para menções (@) e colaboradores. Referência: busca ao abrir/focar,
 *  sem poll nem refetch a cada clique. */
export function useMentionableUsers() {
  return useAsync(() => listMentionableUsers(), [], { poll: false, revalidateOnChange: false })
}
