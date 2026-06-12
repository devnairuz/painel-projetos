// Repositório em memória (fallback sem MongoDB). Semeado uma vez no boot.
const { seedProjects, ORGANIZATIONS } = require("../data/seed");

let projects = [];
let organizations = [];
let users = [];

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
  }
};

module.exports = { memoryRepo };
