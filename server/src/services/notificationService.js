const { getRepo } = require("../repos");

const uid = () => `ntf-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Cria uma notificação para cada userId informado (dedup). */
async function createForUsers(userIds, { type = "info", title, body = "", link = "" }) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (ids.length === 0) return;
  const now = new Date().toISOString();
  const items = ids.map((userId) => ({
    id: uid(),
    userId,
    type,
    title,
    body,
    link,
    read: false,
    createdAt: now
  }));
  await getRepo().insertNotifications(items);
}

/** Todos os usuários ativos da empresa. */
async function activeUserIds() {
  const users = await getRepo().listUsers();
  return users.filter((u) => u.active !== false).map((u) => u.id);
}

async function createForAllCompany(payload) {
  await createForUsers(await activeUserIds(), payload);
}

/**
 * Notifica os COLABORADORES do projeto. Se nenhum estiver definido, cai para
 * todos os usuários ativos (default seguro) — assim nada deixa de avisar.
 */
async function notifyProject(project, payload) {
  const collaborators = (project && project.collaborators) || [];
  const recipients = collaborators.length > 0 ? collaborators : await activeUserIds();
  await createForUsers(recipients, payload);
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

module.exports = {
  createForUsers,
  createForAllCompany,
  notifyProject,
  list,
  unreadCount,
  markRead,
  markAllRead
};
