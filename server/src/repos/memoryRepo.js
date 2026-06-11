// Repositório em memória (fallback sem MongoDB). Semeado uma vez no boot.
const { seedProjects, ORGANIZATIONS } = require("../data/seed");

let projects = [];
let organizations = [];

const clone = (v) => JSON.parse(JSON.stringify(v));

const memoryRepo = {
  kind: "memory",
  async init() {
    projects = seedProjects();
    organizations = clone(ORGANIZATIONS);
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
  async listOrganizations() {
    return organizations.map(clone);
  },
  async insertOrganization(org) {
    organizations.push(clone(org));
  }
};

module.exports = { memoryRepo };
