const mongoose = require("mongoose");

// Bytes efêmeros e isolados do job. O TTL é uma segunda linha de defesa; o
// serviço também remove o arquivo assim que a importação é confirmada/cancelada.
const projectImportFileSchema = new mongoose.Schema(
  {
    importId: { type: String, required: true, index: true },
    tipo: { type: String, enum: ["briefing", "escopo"], required: true, default: "briefing" },
    conteudo: { type: Buffer, required: true, select: false },
    mimeType: { type: String, required: true },
    tamanhoBytes: { type: Number, required: true },
    expiraEm: { type: Date, required: true, expires: 0 }
  },
  { timestamps: true }
);

projectImportFileSchema.index(
  { importId: 1, tipo: 1 },
  { unique: true, name: "arquivo_importacao_documento" }
);

module.exports = mongoose.model("ProjectImportFile", projectImportFileSchema);
