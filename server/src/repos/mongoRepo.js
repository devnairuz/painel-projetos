// Repositório MongoDB (Mongoose). Mesma interface do memoryRepo.
const Project = require("../models/Project");
const Organization = require("../models/Organization");
const User = require("../models/User");
const { seedProjects, ORGANIZATIONS } = require("../data/seed");
const { config } = require("../config");

function toPlain(doc) {
  if (!doc) return null;
  const obj = doc.toJSON ? doc.toJSON() : doc;
  return JSON.parse(JSON.stringify(obj));
}

const mongoRepo = {
  kind: "mongo",
  async init() {
    // Em produção/Mongo, só semeia dados de exemplo se SEED_DEMO=true.
    if (!config.seedDemo) return;
    if ((await Project.countDocuments()) === 0) {
      await Project.insertMany(seedProjects());
    }
    if ((await Organization.countDocuments()) === 0) {
      await Organization.insertMany(ORGANIZATIONS);
    }
  },
  async listProjects() {
    const docs = await Project.find().sort({ updatedAt: -1 }).lean();
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
  }
};

module.exports = { mongoRepo };
