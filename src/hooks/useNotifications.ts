import { listNotifications } from '@/services/notificationsService'
import { useAsync } from './useAsync'

/** Notificações do usuário logado (revalida no poll de ~20s e ao focar a aba). */
export function useNotifications() {
  return useAsync(() => listNotifications(), [])
}
