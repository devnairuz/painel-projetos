const bcrypt = require("bcryptjs");
const { getRepo } = require("../repos");
const { signToken } = require("../auth/jwt");
const { config } = require("../config");
const { sendVerificationCode } = require("./mailer");

const norm = (s) => String(s || "").trim().toLowerCase();
const uid = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const sixDigits = () => String(Math.floor(100000 + Math.random() * 900000));

function sanitize(user) {
  if (!user) return null;
  const u = { ...user };
  delete u.passwordHash;
  delete u.verifyCodeHash;
  delete u.verifyCodeExpires;
  return u;
}

function fail(message, status = 400) {
  const e = new Error(message);
  e.status = status;
  return e;
}

/** Cadastro aberto. Gera código de verificação (modo dev: retornado/logado). */
async function register({ name, email, password }) {
  const repo = getRepo();
  const cleanEmail = norm(email);
  if (!name || !cleanEmail || !password) throw fail("Nome, e-mail e senha são obrigatórios.");
  if (password.length < 6) throw fail("A senha deve ter ao menos 6 caracteres.");
  if (await repo.findUserByEmail(cleanEmail)) throw fail("E-mail já cadastrado.", 409);

  const code = sixDigits();
  const user = {
    id: uid("usr"),
    name: String(name).trim(),
    email: cleanEmail,
    passwordHash: await bcrypt.hash(password, 10),
    // Primeiro usuário do sistema vira admin; demais, membros.
    role: (await repo.countUsers()) === 0 ? "admin" : "member",
    active: true,
    emailVerified: false,
    verifyCodeHash: await bcrypt.hash(code, 10),
    verifyCodeExpires: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  };
  await repo.createUser(user);

  // Envia o código por e-mail (SMTP). Não derruba o cadastro se o envio falhar;
  // o código fica logado e, em dev, é retornado para facilitar o teste.
  console.log(`[auth] Código de verificação para ${cleanEmail}: ${code}`);
  try {
    await sendVerificationCode(cleanEmail, code, user.name);
  } catch (e) {
    console.warn(`[mailer] Falha ao enviar código para ${cleanEmail}: ${e.message}`);
  }
  return { email: cleanEmail, role: user.role, devCode: config.isDev ? code : undefined };
}

/** Confirma o e-mail pelo código e já devolve o token (auto-login). */
async function verifyEmail({ email, code }) {
  const repo = getRepo();
  const user = await repo.findUserByEmail(norm(email));
  if (!user) throw fail("Usuário não encontrado.", 404);
  if (user.emailVerified) {
    const token = signToken(user);
    return { token, user: sanitize(user) };
  }
  const expired = !user.verifyCodeExpires || new Date(user.verifyCodeExpires).getTime() < Date.now();
  if (expired) throw fail("Código expirado. Solicite um novo cadastro.");
  const ok = await bcrypt.compare(String(code || ""), user.verifyCodeHash || "");
  if (!ok) throw fail("Código inválido.");

  const updated = await repo.updateUser(user.id, {
    emailVerified: true,
    verifyCodeHash: "",
    verifyCodeExpires: null
  });
  return { token: signToken(updated), user: sanitize(updated) };
}

async function login({ email, password }) {
  const repo = getRepo();
  const user = await repo.findUserByEmail(norm(email));
  if (!user) throw fail("E-mail ou senha inválidos.", 401);
  if (!user.active) throw fail("Conta desativada. Fale com um administrador.", 403);
  if (!user.emailVerified) throw fail("Confirme seu e-mail antes de entrar.", 403);
  const ok = await bcrypt.compare(String(password || ""), user.passwordHash || "");
  if (!ok) throw fail("E-mail ou senha inválidos.", 401);
  return { token: signToken(user), user: sanitize(user) };
}

async function getById(id) {
  return sanitize(await getRepo().findUserById(id));
}

async function listUsers() {
  return (await getRepo().listUsers()).map(sanitize);
}

async function updateUser(id, patch) {
  const allowed = {};
  if (patch.role === "admin" || patch.role === "member") allowed.role = patch.role;
  if (typeof patch.active === "boolean") allowed.active = patch.active;
  return sanitize(await getRepo().updateUser(id, allowed));
}

module.exports = { register, verifyEmail, login, getById, listUsers, updateUser, sanitize };
