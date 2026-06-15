import { listUsers } from '@/services/usersService'
import { useAsync } from './useAsync'

/** Sem poll de fundo; ainda revalida após mutações (ex.: novo usuário). */
export function useUsers() {
  return useAsync(() => listUsers(), [], { poll: false })
}
