// Envio de e-mail via Resend (API HTTP). Escolhido porque o Render BLOQUEIA
// portas SMTP de saída — então qualquer SMTP (Gmail etc.) dá timeout lá. O
// Resend envia por HTTPS (porta 443), que não é bloqueada.
//
// Configuração (variáveis de ambiente):
//   RESEND_API_KEY = chave da conta Resend (resend.com)
//   MAIL_FROM      = remetente. Sem domínio verificado, use
//                    "Portal Nairuz <onboarding@resend.dev>" (só entrega para o
//                    e-mail da sua conta Resend). Para enviar a qualquer um,
//                    verifique o domínio nairuz.com.br no Resend.

function mailFrom() {
  return process.env.MAIL_FROM || "Portal Nairuz <onboarding@resend.dev>";
}

/** Há provedor de e-mail configurado? */
function isMailerConfigured() {
  return !!process.env.RESEND_API_KEY;
}

async function sendEmail({ to, subject, html, text }) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[mailer] RESEND_API_KEY ausente — e-mail não enviado:", subject, "→", to);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ from: mailFrom(), to, subject, html, text })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(data)}`);
  console.log(`[mailer] OK | to=${to} | id=${data && data.id}`);
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

/** Testa se a chave do Resend é válida (sem enviar e-mail). Para diagnóstico. */
async function verifyMailer() {
  if (!process.env.RESEND_API_KEY) {
    return { configured: false, ok: false, error: "RESEND_API_KEY ausente" };
  }
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }
    });
    if (res.ok) return { configured: true, ok: true, from: mailFrom() };
    const data = await res.json().catch(() => ({}));
    return { configured: true, ok: false, error: `Resend ${res.status}: ${JSON.stringify(data)}` };
  } catch (e) {
    return { configured: true, ok: false, error: String(e && e.message ? e.message : e) };
  }
}

module.exports = { sendEmail, sendVerificationCode, sendPasswordResetCode, isMailerConfigured, verifyMailer };
