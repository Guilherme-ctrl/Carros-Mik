# web_app — Dashboard de operação (Carros Mik Dundee)

Console de operação ao vivo (React + Vite + TypeScript) usado pelos
operadores da **Gincana Mik Dundee**. É a aplicação web do sistema
[Carros Mik Dundee](../../README.md); os motoristas usam o app Flutter em
`apps/flutter_app/`.

## Para quem é

- **Mesa Central** — autoridade de coordenação: vê o quadro ao vivo,
  provisiona usuários, gerencia a frota de carros e os líderes, triagem de
  solicitações e conduz cada solicitação pelo seu ciclo de vida.
- **Líderes** — coordenadores de um subconjunto de equipes: criam e
  acompanham solicitações e seguem as atribuições de carro relevantes.

## O que faz

- **Autenticação e acesso por papel** — login e-mail/senha via Supabase Auth,
  papel resolvido de `user_roles`; rotas protegidas por `ProtectedRoute` e
  `RoleRoute`.
- **Ciclo de vida de solicitações** (domínio central) — criar, listar, quadro
  Kanban por status, timeline/histórico, comentários; transições de status
  via RPC governada `update_request_status`; cancelamento.
- **Atribuição de carros** — atribuir/reatribuir via RPCs
  `assign_car_to_request` / `reassign_car`.
- **Dashboard ao vivo** — mapa Google Maps com carros (`car_locations`) e
  destinos, atualizado em tempo real por Supabase Realtime.
- **Administração de frota e cadastro** — CRUD de carros e líderes;
  gestão de usuários via Edge Functions (`create-user`, `list-users`,
  `update-user-role`, `deactivate-user`).
- **Notificações** e **integração WhatsApp** (`wa.me`).

Toda a lógica de negócio, persistência e autorização vivem no Supabase
compartilhado — o `web_app` é um cliente de apresentação e orquestração.

## Stack

React 19 · Vite 8 · TypeScript · Tailwind CSS 4 · TanStack Query · Zustand ·
React Router · `@supabase/supabase-js` · `@react-google-maps/api` ·
`@sentry/react` · `react-hot-toast`.

## Pré-requisitos

- Node.js ^18 (ou superior) e npm
- Acesso ao projeto Supabase e uma API Key do Google Maps (Web)

## Configuração de ambiente

Copie `.env.example` para `.env.local` e preencha:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_GOOGLE_MAPS_API_KEY=<maps-key>
VITE_SENTRY_DSN=<sentry-dsn>          # opcional
```

> **Segurança:** o `.env.example` também lista
> `VITE_SUPABASE_SERVICE_ROLE_KEY`. **Não** preencha uma chave `service_role`
> aqui — qualquer variável com prefixo `VITE_` é embutida no bundle e fica
> exposta no navegador. Use apenas a chave `anon` no cliente.

## Scripts

| Comando | O que faz |
|---|---|
| `npm install` | Instala as dependências |
| `npm run dev` | Servidor de desenvolvimento (Vite + HMR) |
| `npm run lint` | Roda o ESLint |
| `npm run build` | Type-check (`tsc -b`) + build de produção (`vite build`) |
| `npm run preview` | Serve localmente o build de produção |

Não há framework de testes instalado no momento (sem script `test`).

## Deploy

O `web_app` é implantado continuamente pela integração Git da Vercel a cada
push em `main`. A configuração de **Root Directory** do projeto na Vercel
precisa apontar para `apps/web_app/` (ajuste manual no painel da Vercel após
esta reestruturação — não é versionado no repositório).

## Estrutura interna

Slices por feature em `src/features/<feature>/`, com hooks `use<Resource>.ts`
que acessam o Supabase diretamente (sem camada de repositório separada);
tratamento de erro com `try/catch` no limite do hook e feedback via
`react-hot-toast`. Cliente Supabase singleton em `src/lib/supabase.ts`.
