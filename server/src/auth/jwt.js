const jwt = require("jsonwebtoken");
const { config } = require("../config");

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

/** Token do CLIENTE (portal externo): identidade por e-mail, escopo limitado. */
function signClientToken({ email, name }) {
  return jwt.sign(
    { sub: email, email, name, kind: "client" },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

module.exports = { signToken, signClientToken, verifyToken };
