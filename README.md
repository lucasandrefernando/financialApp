# Financial App

Aplicativo de controle financeiro pessoal com React, TypeScript e API Node.js.

## Tecnologias

- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Backend: Node.js + Express + MySQL
- Estado: Zustand + TanStack Query
- Graficos: Recharts
- Formularios: React Hook Form + Zod

## Setup local

### Pre-requisitos

- Node.js 18+

### Variaveis de ambiente

Crie um arquivo `.env.local` na raiz com os valores do frontend.

### Instalar e rodar

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```

## Banco de dados

O schema SQL esta em `database/schema.sql`.

## Deploy na KingHost (Node.js + Git)

1. Copie `.env.example` para `.env` e preencha os segredos reais.
2. Gere o build:

```bash
npm run build
```

3. No servidor KingHost:

```bash
npm install
npm run start:kinghost
```

4. Configuracao no painel Node.js:
- Caminho da aplicacao: `/financialApp`
- Script: `server.js`
- Acesso Web: `SIM`
- SSL: `SIM`

5. Variaveis recomendadas para KingHost:
- `PORT=21149`
- `HOST=0.0.0.0`
- `APP_BASE_PATH=/financialApp`
- `VITE_APP_BASE_PATH=/financialApp/`

6. Opcional com PM2:

```bash
npm run pm2:kinghost:start
npm run pm2:kinghost:logs
```