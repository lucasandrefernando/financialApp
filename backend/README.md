# Backend - Proxy Groq AI

Servidor Node.js com Express que faz proxy das requisições para a API do Groq.

## 🚀 Instalação

1. **Instale as dependências:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure as variáveis de ambiente:**
   - Copie `.env.example` para `.env`
   - Adicione sua chave do Groq API em `GROQ_API_KEY`

## 🏃 Como Rodar

### Desenvolvimento (com hot reload):
```bash
npm run dev
```

### Produção:
```bash
npm start
```

O servidor iniciará em `http://localhost:3000`

## 📡 Endpoints Disponíveis

### Health Check
- **GET** `/health`
- Verifica se o servidor está rodando

### Gerar conteúdo
- **POST** `/api/ai/generate`
- Body:
  ```json
  {
    "prompt": "Sua pergunta aqui",
    "temperature": 0.2,
    "maxTokens": 256
  }
  ```

### Gerar Insights
- **POST** `/api/ai/insights`
- Body:
  ```json
  {
    "data": {/* seus dados financeiros */},
    "period": "monthly"
  }
  ```

### Detectar Anomalias
- **POST** `/api/ai/anomalies`
- Body:
  ```json
  {
    "transactions": [/* array de transações */]
  }
  ```

## ⚠️ Importante

- Certifique-se de que o backend está rodando na porta 3000 antes de iniciar o frontend
- o frontend faz requisições para `http://localhost:3000`
- A chave do Groq API deve estar configurada em `.env`

## 🔧 Troubleshooting

**Erro de conexão recusada:**
- Verifique se o backend está rodando
- Verifique se você está na pasta `backend`
- Tente `npm install` novamente

**Erro de API Key inválida:**
- Verifique se a chave está correta em `.env`
- Gere uma nova chave em https://console.groq.com/keys
