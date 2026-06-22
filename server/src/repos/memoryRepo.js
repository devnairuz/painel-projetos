// Repositório em memória (fallback sem MongoDB). Semeado uma vez no boot.
const { seedProjects, ORGANIZATIONS } = require("../data/seed");

let projects = [];
let organizations = [];
let users = [];
let notifications = [];
let runningTimers = {}; // userId -> timer

const clone = (v) => JSON.parse(JSON.stringify(v));

const memoryRepo = {
  kind: "memory",
  async init() {
    projects = seedProjects();
    organizations = clone(ORGANIZATIONS);
    // usuários NÃO são semeados: o primeiro cadastro vira admin.
  },
  async listProjects() {
    return projects.map(clone);
  },
  async getProject(id) {
    const found = projects.find((p) => p.id === id);
    return found ? clone(found) : null;
  },
  async insertProject(project) {
    projects.unshift(clone(project));
  },
  async updateProject(project) {
    const idx = projects.findIndex((p) => p.id === project.id);
    if (idx >= 0) projects[idx] = clone(project);
  },
  async countProjects() {
    return projects.length;
  },
  async deleteProject(id) {
    projects = projects.filter((p) => p.id !== id);
  },
  async listOrganizations() {
    return organizations.map(clone);
  },
  async insertOrganization(org) {
    organizations.push(clone(org));
  },
  // ───── usuários ─────
  async createUser(user) {
    users.push(clone(user));
    return clone(user);
  },
  async findUserByEmail(email) {
    const f = users.find((u) => u.email === email);
    return f ? clone(f) : null;
  },
  async findUserById(id) {
    const f = users.find((u) => u.id === id);
    return f ? clone(f) : null;
  },
  async listUsers() {
    return users.map(clone);
  },
  async updateUser(id, patch) {
    const i = users.findIndex((u) => u.id === id);
    if (i < 0) return null;
    users[i] = { ...users[i], ...patch };
    return clone(users[i]);
  },
  async countUsers() {
    return users.length;
  },
  // ───── notificações ─────
  async insertNotifications(items) {
    items.forEach((n) => notifications.push(clone(n)));
  },
  async listNotifications(userId, limit = 30) {
    return notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map(clone);
  },
  async countUnread(userId) {
    return notifications.filter((n) => n.userId === userId && !n.read).length;
  },
  async markNotificationRead(id, userId) {
    const n = notifications.find((x) => x.id === id && x.userId === userId);
    if (n) n.read = true;
  },
  async markAllNotificationsRead(userId) {
    notifications.forEach((n) => {
      if (n.userId === userId) n.read = true;
    });
  },
  // ───── cronômetro em andamento (1 por usuário) ─────
  async getRunningTimer(userId) {
    return runningTimers[userId] ? clone(runningTimers[userId]) : null;
  },
  async setRunningTimer(timer) {
    runningTimers[timer.userId] = clone(timer);
    return clone(timer);
  },
  async clearRunningTimer(userId) {
    delete runningTimers[userId];
  }
};

module.exports = { memoryRepo };
