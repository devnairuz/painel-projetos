const { verifyToken } = require("../auth/jwt");
const { getById } = require("../services/companyAuthService");

/** Exige JWT válido de usuário da empresa. Injeta req.authUser. */
async function requireAuth(req, res, next) {
  try {
    const header = req.header("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Não autenticado." });
    const payload = verifyToken(token);
    const user = await getById(payload.sub);
    if (!user || !user.active) return res.status(401).json({ error: "Sessão inválida." });
    req.authUser = user;
    next();
  } catch {
    res.status(401).json({ error: "Sessão inválida ou expirada." });
  }
}

/** Exige um papel específico (admin). */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.authUser || req.authUser.role !== role) {
      return res.status(403).json({ error: "Acesso restrito." });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
