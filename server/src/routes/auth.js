const express = require("express");
const { clientLogin } = require("../services/authService");

const router = express.Router();

router.post("/client-login", async (req, res) => {
  try {
    const result = await clientLogin(req.body.email); // { user, token }
    res.json(result);
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message || "login_failed" });
  }
});

module.exports = { router };
