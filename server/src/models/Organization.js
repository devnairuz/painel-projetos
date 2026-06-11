const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    segment: { type: String, default: "" }
  },
  { timestamps: true, minimize: false }
);

organizationSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Organization", organizationSchema);
