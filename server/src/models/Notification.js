const mongoose = require("mongoose");

// Notificação por destinatário (fan-out: uma por usuário da empresa).
const notificationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    type: { type: String, default: "info" }, // nps | comentario | aprovacao | info
    title: { type: String, required: true },
    body: { type: String, default: "" },
    link: { type: String, default: "" },
    read: { type: Boolean, default: false, index: true },
    createdAt: { type: String, required: true }
  },
  { minimize: false }
);

notificationSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Notification", notificationSchema);
