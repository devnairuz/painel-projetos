const mongoose = require("mongoose");

// Usuário interno da Nairuz. Acesso amplo (todos veem todos os projetos);
// papel separa quem gerencia usuários (admin) de quem só opera (member).
const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "member"], default: "member" },
    active: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    verifyCodeHash: { type: String, default: "" },
    verifyCodeExpires: { type: Date, default: null }
  },
  { timestamps: true, minimize: false }
);

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("User", userSchema);
