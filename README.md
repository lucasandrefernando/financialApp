# Financial App

Aplicativo de controle financeiro pessoal desenvolvido com React, TypeScript e Supabase.

## Tecnologias

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Estado:** Zustand + TanStack Query
- **Gráficos:** Recharts
- **Formulários:** React Hook Form + Zod
- **IA:** Groq API (categorização e insights)

## Funcionalidades

- Dashboard com visão geral das finanças (patrimônio, receitas, despesas, saldo)
- Lançamento rápido de receitas e despesas
- Categorização automática via IA
- Controle de contas bancárias
- Orçamentos por categoria com alertas
- Histórico de transações com filtros

## Configuração

### Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)
- Chave de API do [Groq](https://console.groq.com)

### Variáveis de ambiente

Crie um arquivo `.env.local` na raiz com:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
VITE_GROQ_API_KEY=sua_chave_groq
```

### Instalação

```bash
npm install
npm run dev
```

### Build para produção

```bash
npm run build
```

## Banco de dados

O schema SQL está em `database/schema.sql`. Execute no SQL Editor do Supabase antes de iniciar.

## Estrutura

```
src/
├── components/     # Componentes reutilizáveis
├── screens/        # Telas da aplicação
├── hooks/          # Hooks customizados
├── services/       # Integração com APIs
├── stores/         # Estado global (Zustand)
├── types/          # Tipos TypeScript
└── utils/          # Utilitários
```

## Deploy na KingHost (Node.js + Git)

1. Gere o build para subpasta da aplica��o:

```bash
# Windows PowerShell
$env:VITE_APP_BASE_PATH="/financialApp/"
npm run build
```

2. Publique no GitHub e confirme que a pasta `dist/` existe no servidor da KingHost.

3. No painel Node.js da KingHost, use:
- Caminho da aplica��o: `/financialApp`
- Script: `server.js` (ou `financialApp/server.js` se o painel exigir caminho completo relativo)
- Acesso Web: `SIM`
- SSL: `SIM` (se o certificado j� estiver instalado)

4. Vari�veis de ambiente recomendadas:
- `APP_BASE_PATH=/financialApp`
- `PORT` (deixe o painel gerenciar, quando aplic�vel)
