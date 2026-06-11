// Login de cliente: valida o e-mail contra os acessos liberados nos projetos
// ou contra o registro de clientes. (Mock de auth; troca por bcrypt/JWT depois.)
const { getRepo } = require("../repos");
const { CLIENT_USERS } = require("../data/seed");

const norm = (s) => String(s || "").trim().toLowerCase();

function resolveName(email) {
  const known = CLIENT_USERS.find((u) => norm(u.email) === norm(email));
  if (known) return known.name;
  const local = email.split("@")[0].replace(/[._-]+/g, " ");
  return local.replace(/\b\w/g, (c) => c.toUpperCase());
}

async function clientLogin(email) {
  const clean = norm(email);
  if (!clean) throw new Error("E-mail obrigatório.");
  const known = CLIENT_USERS.find((u) => norm(u.email) === clean);
  const projects = await getRepo().listProjects();
  const granted = projects.some((p) => (p.clientEmails || []).some((e) => norm(e) === clean));
  if (!known && !granted) {
    const err = new Error("E-mail sem acesso liberado. Solicite a liberação à equipe Nairuz.");
    err.status = 403;
    throw err;
  }
  return {
    id: (known && known.id) || `client-${clean}`,
    name: resolveName(clean),
    email: clean,
    organizationId: known && known.organizationId
  };
}

module.exports = { clientLogin };
