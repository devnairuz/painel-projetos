# Rastreio de Projetos

Painel interno da Nairuz para acompanhar projetos, etapas, pendências, responsáveis, acessos e comunicação com o cliente. O frontend usa React, TypeScript, Vite e Tailwind; a API usa Express e MongoDB, com repositório em memória apenas para desenvolvimento e testes.

## Rodar localmente

Instale as dependências dos dois projetos:

```powershell
npm.cmd install
npm.cmd --prefix server install
```

Em dois terminais, inicie API e frontend:

```powershell
npm.cmd run dev:api
```

```powershell
npm.cmd run dev
```

- Painel: `http://localhost:4321`
- API: `http://localhost:4000`
- Saúde da API: `http://localhost:4000/health`

Copie as variáveis documentadas em `server/.env.example` para `server/.env`. Sem `MONGODB_URI`, dados do ambiente local não persistem após reiniciar a API.

## Automação com a Naira

O fluxo de criação aceita briefing em PDF, cria um trabalho persistido, envia o documento pelo adaptador da Naira, apresenta um rascunho para revisão humana e só então cria o projeto.

Em desenvolvimento, o modo padrão é um simulador claramente identificado na interface. Ele percorre o fluxo completo sem se passar pela Naira real. Em produção, a automação permanece desabilitada até `NAIRA_MODE=http` e as credenciais privadas serem configuradas.

O contrato, as variáveis, os exemplos de integração e as regras de segurança estão em [docs/integracao-naira.md](docs/integracao-naira.md).

## Verificação

```powershell
npm.cmd run verify
```

O comando executa typecheck, lint, testes do servidor e build de produção.

## Publicação

Consulte [DEPLOY.md](DEPLOY.md) para publicar o frontend na Vercel e a API no Render com MongoDB Atlas.
