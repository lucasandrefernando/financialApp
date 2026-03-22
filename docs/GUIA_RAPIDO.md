# 🎯 GUIA RÁPIDO - Como Rodar o Projeto

## ⚡ Início Rápido (30 segundos)

```bash
npm run dev
```

Pronto! Abra http://localhost:5173

---

## 🔄 Fluxo de Funcionamento

### Antes (Erro):
```
Frontend (React)
    ↓
Tenta conectar em http://localhost:3000
    ↓
❌ ERR_CONNECTION_REFUSED (Backend não está rodando)
```

### Depois (Funcionando):
```
Frontend (React)
    ↓
Verifica VITE_USE_BACKEND
    ↓
Se false → Chama API Groq diretamente ✅
Se true  → Chama Backend local ✅
```

---

## 📋 Checklist de Setup

- [ ] Node.js instalado? (`node --version`)
- [ ] Dependências instaladas? (`npm install`)
- [ ] `.env.local` configurado? (Supabase + Groq keys)
- [ ] Frontend rodando? (`npm run dev`)
- [ ] Abrir http://localhost:5173

---

## 🎮 Testando a Solução

### Passo 1: Iniciar Frontend
```bash
npm run dev
```

### Passo 2: Abrir DevTools
```
F12 → Console
```

### Passo 3: Adicionar Transação
```
Dashboard → + → Preencher dados → Enviar
```

### Passo 4: Verificar Logs
```
Deve aparecer:
🤖 Chamando Groq API diretamente
✅ Resposta recebida do Groq
```

---

## 🚀 Três Formas de Rodar

### 1️⃣ Frontend Apenas (Recomendado)
```bash
npm run dev
```
- ✅ Mais rápido
- ✅ Sem dependências
- ✅ Ideal para desenvolvimento

### 2️⃣ Frontend + Backend
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
npm run dev
```
- ✅ Mais seguro
- ✅ Ideal para produção
- ✅ Chave Groq protegida

### 3️⃣ Script Automático
```bash
# Windows
start.bat

# Linux/Mac
./start.sh
```

---

## 🔧 Configuração

### `.env.local` - Modo API Direta (Padrão)
```
VITE_USE_BACKEND=false
VITE_GROQ_API_KEY=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
```

### `.env.local` - Modo Backend
```
VITE_USE_BACKEND=true
VITE_BACKEND_URL=http://localhost:3000
```

---

## 🐛 Troubleshooting

| Erro | Solução |
|------|---------|
| `ERR_CONNECTION_REFUSED` | Use `VITE_USE_BACKEND=false` |
| `Chave API não configurada` | Adicione `VITE_GROQ_API_KEY` em `.env.local` |
| `Insights não aparecem` | Adicione 3+ transações e recarregue |
| `Sugestão de categoria não aparece` | Verifique console (F12) para erros |

---

## 📊 Arquitetura Atual

```
┌─────────────────────────────────────┐
│     Frontend (React + Vite)         │
│  http://localhost:5173              │
└────────────────┬────────────────────┘
                 │
         ┌───────┴────────┐
         │                │
    ┌────▼────┐      ┌────▼──────────┐
    │ Groq    │      │ Backend       │
    │ API     │      │ (Opcional)    │
    │ Direta  │      │ Port 3000     │
    └─────────┘      └───────────────┘
```

---

## ✅ Verificação Final

Após rodar `npm run dev`, você deve ver:

```
✓ built in 2.5s

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

Se vir isso, está funcionando! 🎉

---

## 📞 Precisa de Ajuda?

1. **Leia:** `SOLUCAO_CONNECTION_REFUSED.md`
2. **Verifique:** `SETUP_IA.md`
3. **Consulte:** `backend/README.md`

---

**Tudo pronto! Bom desenvolvimento! 🚀**
