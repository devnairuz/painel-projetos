const express = require("express");
const svc = require("../services/companyAuthService");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();
const h = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => {
  res.status(e.status || 500).json({ error: e.message || "server_error" });
});

router.post("/register", h(async (req, res) => res.status(201).json(await svc.register(req.body))));
router.post("/verify", h(async (req, res) => res.json(await svc.verifyEmail(req.body))));
router.post("/resend-code", h(async (req, res) => res.json(await svc.resendVerification(req.body))));
router.post("/login", h(async (req, res) => res.json(await svc.login(req.body))));
router.post("/forgot-password", h(async (req, res) => res.json(await svc.requestPasswordReset(req.body))));
router.post("/reset-password", h(async (req, res) => res.json(await svc.resetPassword(req.body))));
router.get("/me", requireAuth, (req, res) => res.json(req.authUser));

module.exports = { router };
