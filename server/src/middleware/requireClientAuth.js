const { verifyToken } = require("../auth/jwt");

/** Exige um token de CLIENTE válido. Injeta req.clientEmail. */
function requireClientAuth(req, res, next) {
  try {
    const header = req.header("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Não autenticado." });
    const payload = verifyToken(token);
    if (payload.kind !== "client" || !payload.email) {
      return res.status(401).json({ error: "Sessão inválida." });
    }
    req.clientEmail = String(payload.email).trim().toLowerCase();
    req.clientName = payload.name || "Cliente";
    next();
  } catch {
    res.status(401).json({ error: "Sessão inválida ou expirada." });
  }
}

module.exports = { requireClientAuth };
