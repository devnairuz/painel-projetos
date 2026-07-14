# Deploy — Vercel (frontend) + Render (API) + MongoDB Atlas

Arquitetura: **frontend estático na Vercel** + **API Express no Render** + **banco no Atlas**.
A Vercel não roda servidor Express "sempre ligado", por isso a API vai no Render.

---

## Fluxo seguro para publicar

1. Trabalhe na branch `main` quando quiser publicar em produção.
2. Antes de subir, rode:

```bash
npm run verify
```

3. Confira o que vai ser enviado:

```bash
git status --short --branch
git diff --stat
```

4. Faça commit e push:

```bash
git add .
git commit -m "sua mensagem"
git push origin main
```

5. Depois do push:
   - mudanças em `src/`, `public/`, `index.html`, `vite.config.ts` e `vercel.json` dependem do deploy da **Vercel**;
   - mudanças em `server/` dependem do deploy do **Render**;
   - mudanças em ambos precisam dos dois deploys concluídos.

Se a tela não mudou, abra em aba anônima ou use `Ctrl + F5`. Se ainda não mudou, confira se o commit está em `origin/main` e se a Vercel publicou a branch `main`.

---

## 1. MongoDB Atlas (banco)
1. **Network Access** → Add IP Address → `0.0.0.0/0` (permite o Render conectar).
   - Em produção de verdade, depois restrinja aos IPs do Render.
2. Tenha a sua **connection string** (a mesma do `server/.env`), com o nome do banco
   antes do `?` (ex.: `.../portal-projetos?...`).

## 2. API no Render
1. Crie conta em https://render.com e conecte o repositório (GitHub).
2. O Render detecta o `render.yaml` (serviço `nairuz-portal-api`, rootDir `server`).
3. Em **Environment**, preencha:
   - `MONGODB_URI` = sua string do Atlas
   - `JWT_SECRET` = uma frase longa e aleatória (pode reaproveitar a do `.env`)
   - `ALLOWED_ORIGINS` = a URL do frontend na Vercel (preencha depois do passo 3),
     ex.: `https://nairuz-portal.vercel.app`
   - mantenha `NAIRA_MODE=disabled` até concluir a homologação descrita em
     `docs/integracao-naira.md`;
   - para ativar a automação real, configure `NAIRA_MODE=http`,
     `NAIRA_BASE_URL`, `NAIRA_API_KEY`, `NAIRA_CALLBACK_URL`,
     `NAIRA_CALLBACK_SECRET` e `NAIRA_M2M_TOKEN`.
4. Deploy. Anote a URL da API, ex.: `https://nairuz-portal-api.onrender.com`.
5. Teste: abrir `.../health` deve responder `{"status":"ok","repo":"mongo"}`.
   > Observação: no plano free o Render "dorme" após inatividade; a 1ª request
   > depois disso demora alguns segundos pra acordar.

## 3. Frontend na Vercel
1. Crie conta em https://vercel.com e importe o repositório.
2. A Vercel detecta o `vercel.json` (framework Vite, rewrites de SPA prontos).
3. Em **Environment Variables**, adicione:
   - `VITE_API_URL` = a URL da API do Render (ex.: `https://nairuz-portal-api.onrender.com`)
4. Deploy. Anote a URL, ex.: `https://nairuz-portal.vercel.app`.
5. **Volte ao Render** e ponha essa URL em `ALLOWED_ORIGINS` (CORS) → redeploy da API.

## 4. Primeiro acesso
- Abra a URL da Vercel → `/entrar` → **Criar conta** → **o primeiro cadastro vira Admin**.
- O código de verificação aparece na tela (modo dev). Para enviar por e-mail de
  verdade, integramos um provedor (Resend/SMTP) depois.

---

## Checklist rápido
- [ ] Atlas: Network Access `0.0.0.0/0`
- [ ] Render: `MONGODB_URI`, `JWT_SECRET`, `ALLOWED_ORIGINS`
- [ ] Render: `/health` responde `repo: mongo`
- [ ] Vercel: `VITE_API_URL` apontando pro Render
- [ ] Render `ALLOWED_ORIGINS` = URL da Vercel
- [ ] `/entrar` cria o primeiro admin
- [ ] Naira: modo visível na interface confere com o ambiente (`mock` só em desenvolvimento)
- [ ] Naira: PDF fictício percorre análise → revisão → criação sem duplicar projeto
- [ ] Naira: callback usa HTTPS e assinatura HMAC válida

## Variáveis de ambiente (resumo)
**API (Render):** `MONGODB_URI`, `JWT_SECRET`, `ALLOWED_ORIGINS`, `NODE_ENV=production`
(opcional) `PORT` (o Render define sozinho), `SEED_DEMO=true` só se quiser dados de exemplo.

**Automação Naira (API):** `NAIRA_MODE`, `NAIRA_BASE_URL`, `NAIRA_API_KEY`,
`NAIRA_CALLBACK_URL`, `NAIRA_CALLBACK_SECRET`, `NAIRA_M2M_TOKEN`. Limite,
timeout e retenção podem ser ajustados por `NAIRA_MAX_PDF_BYTES`,
`NAIRA_TIMEOUT_MS` e `NAIRA_FILE_RETENTION_HOURS`.

**Frontend (Vercel):** `VITE_API_URL`.
