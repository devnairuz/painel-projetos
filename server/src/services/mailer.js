const dns = require("dns");
const dnsp = dns.promises;
const nodemailer = require("nodemailer");

dns.setDefaultResultOrder("ipv4first");

function smtpEnv() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return {
    host,
    port: Number(process.env.SMTP_PORT || 587),
    user,
    pass,
    secure: String(process.env.SMTP_SECURE || "false") === "true"
  };
}

/** Há SMTP configurado? */
function isMailerConfigured() {
  return !!smtpEnv();
}

/**
 * Transporter SMTP conectando num IP **IPv4** resolvido do host. O Render não
 * roteia IPv6 (ENETUNREACH), e o nodemailer ignora `family`/`ipv4first`; então
 * resolvemos o IPv4 aqui e mantemos o `servername` para validar o certificado.
 */
async function getTransporter() {
  const env = smtpEnv();
  if (!env) return null;
  let connectHost = env.host;
  try {
    const [ipv4] = await dnsp.resolve4(env.host);
    if (ipv4) connectHost = ipv4;
  } catch {
    // se a resolução falhar, mantém o hostname
  }
  return nodemailer.createTransport({
    host: connectHost,
    port: env.port,
    secure: env.secure,
    auth: { user: env.user, pass: env.pass },
    tls: { servername: env.host },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
}

/** Testa conexão + autenticação no SMTP, sem enviar e-mail. Para diagnóstico. */
async function verifyMailer() {
  // Resend (HTTP) — preferido no Render, que bloqueia SMTP.
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }
      });
      if (res.ok) return { configured: true, mode: "resend", ok: true };
      const data = await res.json().catch(() => ({}));
      return { configured: true, mode: "resend", ok: false, error: `Resend ${res.status}: ${JSON.stringify(data)}` };
    } catch (e) {
      return { configured: true, mode: "resend", ok: false, error: String(e && e.message ? e.message : e) };
    }
  }
  const transporter = await getTransporter();
  if (!transporter) {
    return { configured: false, ok: false, error: "Nenhum provedor configurado (RESEND_API_KEY ou SMTP_*)" };
  }
  try {
    await transporter.verify();
    return { configured: true, mode: "smtp", ok: true };
  } catch (e) {
    return { configured: true, mode: "smtp", ok: false, error: String(e && e.message ? e.message : e) };
  }
}

async function sendEmail({ to, subject, html, text }) {
  const from = process.env.MAIL_FROM || process.env.SMTP_FROM || "Portal Nairuz <onboarding@resend.dev>";

  // 1) Resend (HTTP/HTTPS) — funciona no Render, que bloqueia portas SMTP.
  if (process.env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from, to, subject, html, text })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(data)}`);
    console.log(`[mailer] OK (Resend) | from="${from}" to=${to} | id=${data && data.id}`);
    return true;
  }

  // 2) SMTP (fallback; tende a ser bloqueado no Render).
  const transporter = await getTransporter();
  if (!transporter) {
    console.log("[mailer] Nenhum provedor configurado (RESEND_API_KEY ou SMTP_*):", subject, "→", to);
    return false;
  }
  const info = await transporter.sendMail({ from, to, subject, html, text });
  console.log(`[mailer] OK (SMTP) | from="${from}" to=${to} | response="${info.response}"`);
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

module.exports = { sendEmail, sendVerificationCode, sendPasswordResetCode, isMailerConfigured, verifyMailer };
