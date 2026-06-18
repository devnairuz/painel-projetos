const nodemailer = require("nodemailer");

// Envio de e-mail via SMTP (mesmo padrão do suporte-nairuz). As credenciais vêm
// de variáveis de ambiente; sem elas, o envio é apenas logado (modo dev).
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const secure = String(process.env.SMTP_SECURE || "false") === "true";
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

/** Há SMTP configurado? */
function isMailerConfigured() {
  return !!getTransporter();
}

async function sendEmail({ to, subject, html, text }) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || "Portal Nairuz <no-reply@nairuz.com.br>";
  if (!transporter) {
    console.log("[mailer] SMTP não configurado — e-mail não enviado:", subject, "→", to);
    return false;
  }
  await transporter.sendMail({ from, to, subject, html, text });
  return true;
}

/** E-mail com o código de verificação de cadastro (6 dígitos). */
async function sendVerificationCode(to, code, name) {
  const subject = "Seu código de verificação — Portal Nairuz";
  const text = `Olá ${name || ""}, seu código de verificação é ${code}. Ele expira em 15 minutos.`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1b2331">
      <h2 style="margin:0 0 8px">Confirme seu e-mail</h2>
      <p style="margin:0 0 16px;color:#475569">Olá ${name || ""}, use o código abaixo para concluir seu cadastro no Portal de Projetos da Nairuz.</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f1f4f8;border-radius:12px;padding:16px;text-align:center;color:#00175d">${code}</div>
      <p style="margin:16px 0 0;color:#94a3b8;font-size:13px">O código expira em 15 minutos. Se você não solicitou, ignore este e-mail.</p>
    </div>`;
  return sendEmail({ to, subject, html, text });
}

/** E-mail com o código para redefinir a senha. */
async function sendPasswordResetCode(to, code, name) {
  const subject = "Redefinição de senha — Portal Nairuz";
  const text = `Olá ${name || ""}, seu código para redefinir a senha é ${code}. Ele expira em 15 minutos. Se não foi você, ignore este e-mail.`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1b2331">
      <h2 style="margin:0 0 8px">Redefinir sua senha</h2>
      <p style="margin:0 0 16px;color:#475569">Olá ${name || ""}, use o código abaixo para criar uma nova senha no Portal de Projetos da Nairuz.</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f1f4f8;border-radius:12px;padding:16px;text-align:center;color:#00175d">${code}</div>
      <p style="margin:16px 0 0;color:#94a3b8;font-size:13px">O código expira em 15 minutos. Se você não solicitou, ignore este e-mail.</p>
    </div>`;
  return sendEmail({ to, subject, html, text });
}

module.exports = { sendEmail, sendVerificationCode, sendPasswordResetCode, isMailerConfigured };
