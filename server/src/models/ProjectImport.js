const mongoose = require("mongoose");

const STATUS_IMPORTACAO = [
  "aguardando_arquivo",
  "na_fila",
  "enviando_naira",
  "processando_naira",
  "aguardando_revisao",
  "criando_projeto",
  "concluida",
  "falhou",
  "cancelada"
];

// O PDF fica em outra coleção. Este documento guarda somente estado, resultado
// normalizado e trilha de auditoria da automação.
const projectImportSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    chaveIdempotencia: { type: String, required: true },
    criadoPor: { type: String, required: true, index: true },
    origem: { type: String, enum: ["painel", "naira_m2m", "json_manual"], default: "painel" },
    assinaturaEntrada: String,
    assinaturaCriacaoJson: String,
    ultimaChaveAtualizacaoJson: String,
    status: { type: String, enum: STATUS_IMPORTACAO, required: true, index: true },
    versao: { type: Number, required: true, default: 1 },
    arquivo: mongoose.Schema.Types.Mixed,
    provedor: mongoose.Schema.Types.Mixed,
    rascunho: mongoose.Schema.Types.Mixed,
    campos: mongoose.Schema.Types.Mixed,
    fontes: mongoose.Schema.Types.Mixed,
    validacao: mongoose.Schema.Types.Mixed,
    erro: mongoose.Schema.Types.Mixed,
    projetoId: { type: String, index: true },
    auditoria: mongoose.Schema.Types.Mixed,
    criadoEm: { type: String, required: true },
    atualizadoEm: { type: String, required: true }
  },
  { minimize: false }
);

projectImportSchema.index(
  { criadoPor: 1, chaveIdempotencia: 1 },
  { unique: true, name: "importacao_criador_idempotencia" }
);

projectImportSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("ProjectImport", projectImportSchema);
module.exports.STATUS_IMPORTACAO = STATUS_IMPORTACAO;
