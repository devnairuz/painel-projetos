import { listUsers } from '@/services/usersService'
import { useAsync } from './useAsync'

export function useUsers() {
  return useAsync(() => listUsers(), [])
}
