import { api } from './api'

export interface AppNotification {
  id: string
  type: string
  title: string
  body: string
  link: string
  read: boolean
  createdAt: string
}

export async function listNotifications(): Promise<{ items: AppNotification[]; unread: number }> {
  return api.get('/api/notifications')
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/api/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/api/notifications/read-all')
}
