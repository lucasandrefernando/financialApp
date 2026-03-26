# ðŸŽ¯ GUIA RÃPIDO - Como Rodar o Projeto

## âš¡ InÃ­cio RÃ¡pido (30 segundos)

```bash
npm run dev
```

Pronto! Abra http://localhost:5173

---

## ðŸ”„ Fluxo de Funcionamento

### Antes (Erro):
```
Frontend (React)
    â†“
Tenta conectar em http://localhost:3000
    â†“
âŒ ERR_CONNECTION_REFUSED (Backend nÃ£o estÃ¡ rodando)
```

### Depois (Funcionando):
```
Frontend (React)
    â†“
Verifica VITE_USE_BACKEND
    â†“
Se false â†’ Chama API Groq diretamente âœ…
Se true  â†’ Chama Backend local âœ…
```

---

## ðŸ“‹ Checklist de Setup

- [ ] Node.js instalado? (`node --version`)
- [ ] DependÃªncias instaladas? (`npm install`)
- [ ] `.env.local` configurado? (Supabase + Groq keys)
- [ ] Frontend rodando? (`npm run dev`)
- [ ] Abrir http://localhost:5173

---

## ðŸŽ® Testando a SoluÃ§Ã£o

### Passo 1: Iniciar Frontend
```bash
npm run dev
```

### Passo 2: Abrir DevTools
```
F12 â†’ Console
```

### Passo 3: Adicionar TransaÃ§Ã£o
```
Dashboard â†’ + â†’ Preencher dados â†’ Enviar
```

### Passo 4: Verificar Logs
```
Deve aparecer:
ðŸ¤– Chamando Groq API diretamente
âœ… Resposta recebida do Groq
```

---

## ðŸš€ TrÃªs Formas de Rodar

### 1ï¸âƒ£ Frontend Apenas (Recomendado)
```bash
npm run dev
```
- âœ… Mais rÃ¡pido
- âœ… Sem dependÃªncias
- âœ… Ideal para desenvolvimento

### 2ï¸âƒ£ Frontend + Backend
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
npm run dev
```
- âœ… Mais seguro
- âœ… Ideal para produÃ§Ã£o
- âœ… Chave Groq protegida

### 3ï¸âƒ£ Script AutomÃ¡tico
```bash
# Windows
start.bat

# Linux/Mac
./start.sh
```

---

## ðŸ”§ ConfiguraÃ§Ã£o

### `.env.local` - Modo API Direta (PadrÃ£o)
```
VITE_USE_BACKEND=false
VITE_GROQ_API_KEY=gsk_SUA_CHAVE_AQUI
```

### `.env.local` - Modo Backend
```
VITE_USE_BACKEND=true
VITE_BACKEND_URL=http://localhost:3000
```

---

## ðŸ› Troubleshooting

| Erro | SoluÃ§Ã£o |
|------|---------|
| `ERR_CONNECTION_REFUSED` | Use `VITE_USE_BACKEND=false` |
| `Chave API nÃ£o configurada` | Adicione `VITE_GROQ_API_KEY` em `.env.local` |
| `Insights nÃ£o aparecem` | Adicione 3+ transaÃ§Ãµes e recarregue |
| `SugestÃ£o de categoria nÃ£o aparece` | Verifique console (F12) para erros |

---

## ðŸ“Š Arquitetura Atual

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚     Frontend (React + Vite)         â”‚
â”‚  http://localhost:5173              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                 â”‚
         â”Œâ”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”
         â”‚                â”‚
    â”Œâ”€â”€â”€â”€â–¼â”€â”€â”€â”€â”      â”Œâ”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
    â”‚ Groq    â”‚      â”‚ Backend       â”‚
    â”‚ API     â”‚      â”‚ (Opcional)    â”‚
    â”‚ Direta  â”‚      â”‚ Port 3000     â”‚
    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## âœ… VerificaÃ§Ã£o Final

ApÃ³s rodar `npm run dev`, vocÃª deve ver:

```
âœ“ built in 2.5s

  âžœ  Local:   http://localhost:5173/
  âžœ  press h to show help
```

Se vir isso, estÃ¡ funcionando! ðŸŽ‰

---

## ðŸ“ž Precisa de Ajuda?

1. **Leia:** `SOLUCAO_CONNECTION_REFUSED.md`
2. **Verifique:** `SETUP_IA.md`
3. **Consulte:** `backend/README.md`

---

**Tudo pronto! Bom desenvolvimento! ðŸš€**
