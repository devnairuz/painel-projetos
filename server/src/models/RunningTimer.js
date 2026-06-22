const mongoose = require("mongoose");

// Cronômetro em andamento — no máximo um por usuário (chave única userId).
// Guarda o vínculo (projeto/fase/subtarefa/tarefa) e o início; ao parar, vira
// um TimeEntry no projeto e o documento é removido.
const runningTimerSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, required: true },
    phaseId: String,
    checklistItemId: String,
    taskId: String,
    label: String,
    startedAt: { type: String, required: true }
  },
  { timestamps: true, minimize: false }
);

runningTimerSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("RunningTimer", runningTimerSchema);
