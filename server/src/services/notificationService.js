const { getRepo } = require("../repos");

const uid = () => `ntf-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * Cria uma notificação para CADA usuário ativo da empresa (fan-out).
 * É assim que o time fica sabendo, na hora, do que o cliente fez.
 */
async function createForAllCompany({ type = "info", title, body = "", link = "" }) {
  const repo = getRepo();
  const users = await repo.listUsers();
  const recipients = users.filter((u) => u.active !== false);
  if (recipients.length === 0) return;
  const now = new Date().toISOString();
  const items = recipients.map((u) => ({
    id: uid(),
    userId: u.id,
    type,
    title,
    body,
    link,
    read: false,
    createdAt: now
  }));
  await repo.insertNotifications(items);
}

async function list(userId, limit) {
  return getRepo().listNotifications(userId, limit);
}
async function unreadCount(userId) {
  return getRepo().countUnread(userId);
}
async function markRead(id, userId) {
  await getRepo().markNotificationRead(id, userId);
}
async function markAllRead(userId) {
  await getRepo().markAllNotificationsRead(userId);
}

module.exports = { createForAllCompany, list, unreadCount, markRead, markAllRead };
