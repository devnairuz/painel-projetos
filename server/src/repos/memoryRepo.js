// Repositório em memória (fallback sem MongoDB). Semeado uma vez no boot.
const { seedProjects, ORGANIZATIONS } = require("../data/seed");

let projects = [];
let organizations = [];
let users = [];
let notifications = [];
let projectImports = [];
let projectImportFiles = new Map();
let projectSequence = 0;

const clone = (v) => JSON.parse(JSON.stringify(v));

const memoryRepo = {
  kind: "memory",
  async init() {
    projects = seedProjects();
    organizations = clone(ORGANIZATIONS);
    projectImports = [];
    projectImportFiles = new Map();
    projectSequence = projects.reduce((maior, projeto) => {
      const numero = Number(String(projeto.code || "").match(/^PRJ-(\d+)$/)?.[1] || 0);
      return Math.max(maior, numero);
    }, 0);
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
    if (projects.some((item) => item.id === project.id || (project.code && item.code === project.code))) {
      const erro = new Error("Projeto duplicado.");
      erro.code = 11000;
      throw erro;
    }
    projects.unshift(clone(project));
  },
  async updateProject(project) {
    const idx = projects.findIndex((p) => p.id === project.id);
    if (idx >= 0) projects[idx] = clone(project);
  },
  async countProjects() {
    return projects.length;
  },
  async nextProjectSequence() {
    projectSequence += 1;
    return projectSequence;
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
  // ───── importações de projeto ─────
  async listProjectImports() {
    return projectImports
      .slice()
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      .map(clone);
  },
  async getProjectImport(id) {
    const item = projectImports.find((importacao) => importacao.id === id);
    return item ? clone(item) : null;
  },
  async findProjectImportByIdempotency(criadoPor, chave) {
    const item = projectImports.find(
      (importacao) => importacao.criadoPor === criadoPor && importacao.chaveIdempotencia === chave
    );
    return item ? clone(item) : null;
  },
  async insertProjectImport(importacao) {
    if (projectImports.some((item) =>
      item.id === importacao.id ||
      (item.criadoPor === importacao.criadoPor && item.chaveIdempotencia === importacao.chaveIdempotencia)
    )) {
      const erro = new Error("Importação duplicada.");
      erro.code = 11000;
      throw erro;
    }
    projectImports.unshift(clone(importacao));
    return clone(importacao);
  },
  async updateProjectImport(importacao, versaoEsperada) {
    const indice = projectImports.findIndex((item) => item.id === importacao.id);
    if (indice < 0) return null;
    if (versaoEsperada !== undefined && projectImports[indice].versao !== versaoEsperada) return null;
    projectImports[indice] = clone(importacao);
    return clone(projectImports[indice]);
  },
  async putProjectImportFile(importId, tipoOuArquivo, arquivoInformado) {
    const tipo = typeof tipoOuArquivo === "string" ? tipoOuArquivo : "briefing";
    const arquivo = typeof tipoOuArquivo === "string" ? arquivoInformado : tipoOuArquivo;
    const chave = `${importId}:${tipo}`;
    const existente = projectImportFiles.get(chave);
    if (existente && new Date(existente.expiraEm).getTime() > Date.now()) {
      return { ...existente, conteudo: Buffer.from(existente.conteudo) };
    }
    const armazenado = {
      conteudo: Buffer.from(arquivo.conteudo),
      mimeType: arquivo.mimeType,
      tamanhoBytes: arquivo.tamanhoBytes,
      expiraEm: new Date(arquivo.expiraEm).toISOString()
    };
    projectImportFiles.set(chave, armazenado);
    return { ...armazenado, conteudo: Buffer.from(armazenado.conteudo) };
  },
  async getProjectImportFile(importId, tipo = "briefing") {
    const chave = `${importId}:${tipo}`;
    const arquivo = projectImportFiles.get(chave);
    if (!arquivo) return null;
    if (new Date(arquivo.expiraEm).getTime() <= Date.now()) {
      projectImportFiles.delete(chave);
      return null;
    }
    return { ...arquivo, conteudo: Buffer.from(arquivo.conteudo) };
  },
  async deleteProjectImportFile(importId, tipo) {
    if (tipo) {
      projectImportFiles.delete(`${importId}:${tipo}`);
      return;
    }
    for (const chave of projectImportFiles.keys()) {
      if (chave.startsWith(`${importId}:`)) projectImportFiles.delete(chave);
    }
  }
};

module.exports = { memoryRepo };
