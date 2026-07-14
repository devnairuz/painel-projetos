// Repositório MongoDB (Mongoose). Mesma interface do memoryRepo.
const Project = require("../models/Project");
const Organization = require("../models/Organization");
const User = require("../models/User");
const Notification = require("../models/Notification");
const ProjectImport = require("../models/ProjectImport");
const ProjectImportFile = require("../models/ProjectImportFile");
const Counter = require("../models/Counter");
const { seedProjects, ORGANIZATIONS } = require("../data/seed");
const { config } = require("../config");

function toPlain(doc) {
  if (!doc) return null;
  const obj = doc.toJSON ? doc.toJSON() : doc;
  const plain = JSON.parse(JSON.stringify(obj));
  // Consultas com .lean() não executam o transform do schema. Nunca devolvemos
  // chaves internas para serviços que depois usam o objeto em um `$set`.
  delete plain._id;
  delete plain.__v;
  return plain;
}

const mongoRepo = {
  kind: "mongo",
  async init() {
    // Em produção/Mongo, só semeia dados de exemplo se SEED_DEMO=true.
    if (config.seedDemo) {
      if ((await Project.countDocuments()) === 0) {
        await Project.insertMany(seedProjects());
      }
      if ((await Organization.countDocuments()) === 0) {
        await Organization.insertMany(ORGANIZATIONS);
      }
    }
    const codigos = await Project.find({ code: /^PRJ-\d+$/ }, { code: 1, _id: 0 }).lean();
    const maiorCodigo = codigos.reduce((maior, item) => {
      const numero = Number(String(item.code || "").slice(4)) || 0;
      return Math.max(maior, numero);
    }, 0);
    await Counter.updateOne({ _id: "project" }, { $max: { seq: maiorCodigo } }, { upsert: true });
  },
  async listProjects() {
    // Exclui o conteúdo (base64) do escopo já na consulta: não é usado nas
    // listagens e pesava MUITO no transfer do Atlas (M0 free). O detalhe
    // (getProject) ainda traz o conteúdo completo para download.
    const docs = await Project.find({}, { "scopeFiles.url": 0 }).sort({ updatedAt: -1 }).lean();
    return docs.map(toPlain);
  },
  async getProject(id) {
    return toPlain(await Project.findOne({ id }).lean());
  },
  async insertProject(project) {
    await Project.create(project);
  },
  async updateProject(project) {
    await Project.updateOne({ id: project.id }, { $set: project });
  },
  async countProjects() {
    return Project.countDocuments();
  },
  async nextProjectSequence() {
    const contador = await Counter.findOneAndUpdate(
      { _id: "project" },
      { $inc: { seq: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    return contador.seq;
  },
  async deleteProject(id) {
    await Project.deleteOne({ id });
  },
  async listOrganizations() {
    const docs = await Organization.find().sort({ name: 1 }).lean();
    return docs.map(toPlain);
  },
  async insertOrganization(org) {
    await Organization.create(org);
  },
  // ───── usuários ─────
  async createUser(user) {
    return toPlain(await User.create(user));
  },
  async findUserByEmail(email) {
    return toPlain(await User.findOne({ email }).lean());
  },
  async findUserById(id) {
    return toPlain(await User.findOne({ id }).lean());
  },
  async listUsers() {
    return (await User.find().sort({ createdAt: 1 }).lean()).map(toPlain);
  },
  async updateUser(id, patch) {
    await User.updateOne({ id }, { $set: patch });
    return toPlain(await User.findOne({ id }).lean());
  },
  async countUsers() {
    return User.countDocuments();
  },
  // ───── notificações ─────
  async insertNotifications(items) {
    if (items.length) await Notification.insertMany(items);
  },
  async listNotifications(userId, limit = 30) {
    const docs = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
    return docs.map(toPlain);
  },
  async countUnread(userId) {
    return Notification.countDocuments({ userId, read: false });
  },
  async markNotificationRead(id, userId) {
    await Notification.updateOne({ id, userId }, { $set: { read: true } });
  },
  async markAllNotificationsRead(userId) {
    await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
  },
  // ───── importações de projeto ─────
  async listProjectImports() {
    return (await ProjectImport.find().sort({ criadoEm: -1 }).lean()).map(toPlain);
  },
  async getProjectImport(id) {
    return toPlain(await ProjectImport.findOne({ id }).lean());
  },
  async findProjectImportByIdempotency(criadoPor, chave) {
    return toPlain(await ProjectImport.findOne({ criadoPor, chaveIdempotencia: chave }).lean());
  },
  async insertProjectImport(importacao) {
    return toPlain(await ProjectImport.create(importacao));
  },
  async updateProjectImport(importacao, versaoEsperada) {
    const filtro = { id: importacao.id };
    if (versaoEsperada !== undefined) filtro.versao = versaoEsperada;
    const resultado = await ProjectImport.updateOne(filtro, { $set: importacao });
    if (!resultado.matchedCount) return null;
    return toPlain(await ProjectImport.findOne({ id: importacao.id }).lean());
  },
  async putProjectImportFile(importId, arquivo) {
    await ProjectImportFile.deleteOne({ importId, expiraEm: { $lte: new Date() } });
    try {
      await ProjectImportFile.updateOne(
        { importId },
        { $setOnInsert: { ...arquivo, importId } },
        { upsert: true }
      );
    } catch (erro) {
      // Dois uploads podem disputar o upsert; o índice único escolhe um blob.
      if (!erro || erro.code !== 11000) throw erro;
    }
    const armazenado = await ProjectImportFile.findOne({ importId }).select("+conteudo").lean();
    return armazenado ? { ...armazenado, conteudo: Buffer.from(armazenado.conteudo) } : null;
  },
  async getProjectImportFile(importId) {
    const arquivo = await ProjectImportFile.findOne({ importId }).select("+conteudo").lean();
    return arquivo ? { ...arquivo, conteudo: Buffer.from(arquivo.conteudo) } : null;
  },
  async deleteProjectImportFile(importId) {
    await ProjectImportFile.deleteOne({ importId });
  }
};

module.exports = { mongoRepo };
