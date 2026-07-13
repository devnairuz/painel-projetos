const mongoose = require("mongoose");

// Documento de projeto. Mantemos um `id` string próprio (o mesmo usado no
// frontend) como chave de negócio, e deixamos as estruturas aninhadas
// (phases, history, finalization, nps) flexíveis via Mixed — o domínio é
// controlado pelas operações puras em domain/ops.js.
const projectSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    code: { type: String, index: true },
    clientName: String,
    organizationId: String,
    platform: String,
    type: String,
    product: String,
    status: { type: String, index: true },
    currentPhaseId: String,
    startDate: String,
    goLiveDate: String,
    progress: Number,
    risk: String,
    nextAction: String,
    updatedAt: String,
    owners: mongoose.Schema.Types.Mixed,
    phases: mongoose.Schema.Types.Mixed,
    clientEmails: { type: [String], default: [], index: true },
    // IDs de usuários da empresa que recebem notificações deste projeto.
    collaborators: { type: [String], default: [] },
    tasks: mongoose.Schema.Types.Mixed,
    charges: mongoose.Schema.Types.Mixed,
    scopeFiles: mongoose.Schema.Types.Mixed,
    timeEntries: mongoose.Schema.Types.Mixed,
    attachments: mongoose.Schema.Types.Mixed,
    tracking: mongoose.Schema.Types.Mixed,
    security: mongoose.Schema.Types.Mixed,
    linksUteis: mongoose.Schema.Types.Mixed,
    templateNotes: String,
    history: mongoose.Schema.Types.Mixed,
    nps: mongoose.Schema.Types.Mixed,
    supportHours: mongoose.Schema.Types.Mixed,
    finalization: mongoose.Schema.Types.Mixed
  },
  { timestamps: true, minimize: false }
);

projectSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Project", projectSchema);
