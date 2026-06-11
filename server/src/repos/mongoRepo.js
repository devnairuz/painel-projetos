// Repositório MongoDB (Mongoose). Mesma interface do memoryRepo.
const Project = require("../models/Project");
const Organization = require("../models/Organization");
const { seedProjects, ORGANIZATIONS } = require("../data/seed");

function toPlain(doc) {
  if (!doc) return null;
  const obj = doc.toJSON ? doc.toJSON() : doc;
  return JSON.parse(JSON.stringify(obj));
}

const mongoRepo = {
  kind: "mongo",
  async init() {
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
  async listOrganizations() {
    const docs = await Organization.find().sort({ name: 1 }).lean();
    return docs.map(toPlain);
  },
  async insertOrganization(org) {
    await Organization.create(org);
  }
};

module.exports = { mongoRepo };
